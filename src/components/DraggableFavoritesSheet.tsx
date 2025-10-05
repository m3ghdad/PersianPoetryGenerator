import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Heart,
  ArrowRight,
  Trash2,
  List,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";

// Theme-aware iOS-style grabber component
const ThemedGrabber = ({ shouldPulse = false }: { shouldPulse?: boolean }) => (
  <div className="flex flex-col items-center py-1 px-0 relative">
    <div className={`bg-muted-foreground h-[6px] rounded-full shrink-0 w-[40px] shadow-lg border border-muted-foreground/20 ${
      shouldPulse ? 'animate-pulse' : ''
    }`} />
  </div>
);

interface FavoritePoem {
  id: number;
  title: string;
  text: string;
  htmlText?: string;
  poet: {
    id: number;
    name: string;
    fullName: string;
  };
  favoritedAt: string;
  userId: string;
}

interface DraggableFavoritesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Snap points as percentages of viewport height
const SNAP_POINTS = [40, 70, 90]; // 40%, 70%, 90%
const CLOSE_THRESHOLD = 20; // Close if dragged below 20%

export function DraggableFavoritesSheet({
  open,
  onOpenChange,
}: DraggableFavoritesSheetProps) {
  const [favoritePoems, setFavoritePoems] = useState<FavoritePoem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"sheet" | "list">("sheet");
  const { user, refreshSession } = useAuth();
  const { t, isRTL } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(90);
  const [currentHeight, setCurrentHeight] = useState(90); // Start at 90%
  const [showPulse, setShowPulse] = useState(true);

  // Touch handling for swipe navigation in sheet mode
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);

  useEffect(() => {
    if (open && user) {
      loadFavorites();
      setCurrentHeight(90); // Reset to max height when opening
      setInitialHeight(90);
      setShowPulse(true);
      
      // Stop pulsing after 3 seconds
      const timer = setTimeout(() => {
        setShowPulse(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowPulse(false);
    }
  }, [open, user]);

  const loadFavorites = async () => {
    if (!user) {
      console.log("No user found, cannot load favorites");
      return;
    }

    setLoading(true);
    try {
      console.log("=== DEBUG: Loading favorites ===");
      console.log("User object:", {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      });
      
      const { projectId } = await import("../utils/supabase/info");
      console.log("Project ID:", projectId);
      
      const supabaseClient = (await import("../utils/supabase/client")).createClient();
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      console.log("Session data:", {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenPreview: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'none',
        error: sessionError
      });

      if (sessionError) {
        console.error("Session error:", sessionError);
        
        // Handle refresh token errors specifically
        if (sessionError.message.includes('refresh_token_not_found') || 
            sessionError.message.includes('Invalid Refresh Token')) {
          console.log('Invalid refresh token detected, attempting session refresh');
          const refreshResult = await refreshSession();
          if (refreshResult.error) {
            toast.error('Session expired. Please sign in again.');
            onOpenChange(false); // Close the favorites sheet
            return;
          }
          // Retry loading favorites after refresh
          toast.success('Session refreshed successfully');
          setTimeout(() => loadFavorites(), 1000);
          return;
        }
        
        toast.error(t.pleaseLoginAgain);
        return;
      }

      if (!session?.access_token) {
        console.error("No access token found in session");
        
        // Try to refresh the session
        console.log('No access token, attempting session refresh');
        const refreshResult = await refreshSession();
        if (refreshResult.error) {
          toast.error('Session expired. Please sign in again.');
          onOpenChange(false); // Close the favorites sheet
          return;
        }
        // Retry loading favorites after refresh
        setTimeout(() => loadFavorites(), 1000);
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/favorites`;
      console.log("Making request to:", url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log("Favorites loaded successfully:", data.favorites?.length || 0, "items");
        setFavoritePoems(data.favorites || []);
      } else {
        const errorText = await response.text();
        console.error("Failed to load favorites - Response:", response.status, errorText);
        
        if (response.status === 401) {
          console.error("Authorization failed - attempting session refresh");
          const refreshResult = await refreshSession();
          if (refreshResult.error) {
            toast.error('Session expired. Please sign in again.');
            onOpenChange(false); // Close the favorites sheet
          } else {
            // Retry loading favorites after refresh
            setTimeout(() => loadFavorites(), 1000);
          }
        } else {
          toast.error(`Error loading favorites: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("Failed to load favorites - Network/Other error:", error);
      toast.error(`Network error loading favorites: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (poemId: number) => {
    if (!user) return;

    try {
      const { projectId } = await import("../utils/supabase/info");
      const { data: { session } } = await (await import("../utils/supabase/client"))
        .createClient()
        .auth.getSession();

      if (!session?.access_token) {
        toast.error(t.pleaseLoginAgain);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/favorites/${poemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (response.ok) {
        setFavoritePoems(prev => prev.filter(poem => poem.id !== poemId));
        toast.success(t.removedFromFavorites);
        
        // Adjust current index if needed
        if (currentIndex >= favoritePoems.length - 1) {
          setCurrentIndex(Math.max(0, favoritePoems.length - 2));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove favorite");
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      toast.error(t.removedFromFavorites.replace('Removed', 'Error removing'));
    } finally {
      setShowConfirmDelete(null);
    }
  };

  // Navigation functions
  const navigateToPoem = useCallback((index: number) => {
    if (index >= 0 && index < favoritePoems.length) {
      setCurrentIndex(index);
    }
  }, [favoritePoems.length]);

  // Touch handlers for sheet navigation (only when not dragging)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (viewMode !== "sheet" || isDragging) return;
    
    const touch = e.touches[0];
    setTouchStart({
      y: touch.clientY,
      time: Date.now(),
    });
  }, [viewMode, isDragging]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart || viewMode !== "sheet" || isDragging) return;

    const touch = e.changedTouches[0];
    const deltaY = touchStart.y - touch.clientY;
    const deltaTime = Date.now() - touchStart.time;
    const velocity = Math.abs(deltaY) / deltaTime;

    const minSwipeDistance = 30;
    const minVelocity = 0.3;

    if (Math.abs(deltaY) > minSwipeDistance || velocity > minVelocity) {
      if (deltaY > 0) {
        // Swipe up - next poem
        const nextIndex = Math.min(currentIndex + 1, favoritePoems.length - 1);
        navigateToPoem(nextIndex);
      } else {
        // Swipe down - previous poem
        const prevIndex = Math.max(currentIndex - 1, 0);
        navigateToPoem(prevIndex);
      }
    }

    setTouchStart(null);
  }, [touchStart, currentIndex, favoritePoems.length, navigateToPoem, viewMode, isDragging]);

  // Drag handlers for sheet resize
  const handleDragStart = useCallback((clientY: number) => {
    console.log('Drag start at:', clientY);
    setIsDragging(true);
    setDragStartY(clientY);
    setInitialHeight(currentHeight);
    
    // Disable body scroll during drag
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [currentHeight]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;

    const deltaY = clientY - dragStartY;
    const viewportHeight = window.innerHeight;
    const heightChange = (deltaY / viewportHeight) * 100;
    
    console.log('Drag move - deltaY:', deltaY, 'heightChange:', heightChange);
    
    // Calculate new height based on initial height and drag distance
    // Positive deltaY means dragging down, so reduce height
    const newHeight = Math.max(10, Math.min(95, initialHeight - heightChange));
    
    console.log('New height:', newHeight);
    
    // Apply the height immediately during drag
    if (sheetRef.current) {
      sheetRef.current.style.height = `${newHeight}vh`;
      sheetRef.current.style.transition = 'none'; // Disable transition during drag
    }
  }, [isDragging, dragStartY, initialHeight]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    console.log('Drag end');

    const currentSheetHeight = sheetRef.current ? 
      parseFloat(sheetRef.current.style.height) : currentHeight;

    setIsDragging(false);
    
    // Re-enable body scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    // Check if should close
    if (currentSheetHeight < CLOSE_THRESHOLD) {
      console.log('Closing sheet - height below threshold:', currentSheetHeight);
      onOpenChange(false);
      return;
    }

    // Find closest snap point
    const closestSnapPoint = SNAP_POINTS.reduce((prev, curr) => 
      Math.abs(curr - currentSheetHeight) < Math.abs(prev - currentSheetHeight) ? curr : prev
    );

    console.log('Snapping to:', closestSnapPoint);
    setCurrentHeight(closestSnapPoint);

    // Animate to snap point
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      sheetRef.current.style.height = `${closestSnapPoint}vh`;
      
      // Remove transition after animation
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = '';
        }
      }, 300);
    }
  }, [isDragging, currentHeight, onOpenChange]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Mouse down at:', e.clientY);
    handleDragStart(e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      handleDragMove(e.clientY);
    }
  }, [handleDragMove, isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      handleDragEnd();
    }
  }, [handleDragEnd, isDragging]);

  // Touch event handlers for drag
  const handleTouchStartDrag = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Touch start at:', e.touches[0].clientY);
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchMoveDrag = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      handleDragMove(e.touches[0].clientY);
    }
  }, [handleDragMove, isDragging]);

  const handleTouchEndDrag = useCallback((e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      handleDragEnd();
    }
  }, [handleDragEnd, isDragging]);

  // Global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      const options = { passive: false, capture: true };
      
      document.addEventListener('mousemove', handleMouseMove, options);
      document.addEventListener('mouseup', handleMouseUp, options);
      document.addEventListener('touchmove', handleTouchMoveDrag, options);
      document.addEventListener('touchend', handleTouchEndDrag, options);
      document.addEventListener('touchcancel', handleTouchEndDrag, options);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove, { capture: true });
        document.removeEventListener('mouseup', handleMouseUp, { capture: true });
        document.removeEventListener('touchmove', handleTouchMoveDrag, { capture: true });
        document.removeEventListener('touchend', handleTouchEndDrag, { capture: true });
        document.removeEventListener('touchcancel', handleTouchEndDrag, { capture: true });
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMoveDrag, handleTouchEndDrag]);

  // List view card component
  const ListViewCard = ({ poem, onDelete }: { poem: FavoritePoem; onDelete: () => void }) => (
    <Card className="bg-card border-border hover:bg-accent/50 transition-colors">
      <CardHeader className="pb-3">
        <div className={`flex items-start justify-between`} dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex-1">
            <h4 className={`text-foreground font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {poem.poet.name}
            </h4>
            <p className={`text-muted-foreground text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
              {poem.title}
            </p>
          </div>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="text-muted-foreground text-sm line-clamp-3 leading-relaxed text-right"
          dir="rtl"
          dangerouslySetInnerHTML={{
            __html: poem.htmlText || poem.text.replace(/\n/g, "<br/>"),
          }}
        />
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-muted-foreground text-xs" dir="rtl">
            افزوده شده در{" "}
            {new Date(poem.favoritedAt).toLocaleDateString("fa-IR")}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Draggable Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: "100%", height: "90vh" }}
        animate={{ y: 0, height: `${currentHeight}vh` }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background/95 border-t border-border backdrop-blur-xl rounded-t-xl overflow-hidden flex flex-col ${
          isDragging ? 'shadow-2xl' : ''
        }`}
        style={{ 
          height: `${currentHeight}vh`,
          maxHeight: '95vh',
          minHeight: '20vh',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
      >
        {/* iOS-style Drag Handle Area */}
        <div
          className={`flex-shrink-0 py-5 px-6 select-none transition-all duration-200 min-h-[56px] flex flex-col items-center justify-center border-b border-border/50 ${
            isDragging 
              ? 'cursor-grabbing bg-accent/40' 
              : 'cursor-grab hover:bg-accent/20 active:bg-accent/30'
          }`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStartDrag}
          style={{ 
            touchAction: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
        >
          {/* iOS-style Grabber with enhanced visibility */}
          <div className={`transition-all duration-200 ${isDragging ? 'opacity-70 scale-110' : 'opacity-100 hover:scale-105'}`}>
            <ThemedGrabber shouldPulse={showPulse && !isDragging} />
          </div>
          
          {/* Subtle hint text */}
          <div className={`text-muted-foreground/50 text-xs mt-2`} dir={isRTL ? "rtl" : "ltr"}>
            {isDragging ? t.dragging : t.dragToResize}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground" dir={isRTL ? "rtl" : "ltr"}>
                {t.loadingFavorites}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && favoritePoems.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Heart size={64} className="text-muted-foreground/30 mx-auto mb-6" />
              <h3 className="text-foreground text-xl mb-2" dir={isRTL ? "rtl" : "ltr"}>
                {t.noFavoritesYet}
              </h3>
              <p className="text-muted-foreground mb-8" dir={isRTL ? "rtl" : "ltr"}>
                {t.addFavoritesPrompt}
              </p>
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ArrowRight size={16} className={isRTL ? "ml-2" : "mr-2"} />
                {t.goBack}
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && favoritePoems.length > 0 && (
          <>
            {/* Header */}
            <div className="flex-shrink-0 p-6 pb-4 border-b border-border/50">
              <div className={`flex items-center justify-between`} dir={isRTL ? "rtl" : "ltr"}>
                <div className={`flex items-center ${isRTL ? 'space-x-3 space-x-reverse' : 'space-x-3'}`}>
                  <div>
                    <h2 className="text-foreground text-xl">{t.favoritePoems}</h2>
                    <p className={`text-muted-foreground text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {viewMode === "sheet"
                        ? `${currentIndex + 1} ${isRTL ? 'از' : 'of'} ${favoritePoems.length}`
                        : `${favoritePoems.length} ${t.poems}`}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center ${isRTL ? 'space-x-3 space-x-reverse' : 'space-x-3'}`}>
                  {/* View Toggle */}
                  <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} bg-muted/30 rounded-lg p-1`}>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === "list"
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={isRTL ? "نمای لیست" : "List View"}
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode("sheet")}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === "sheet"
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={isRTL ? "نمای کارت" : "Card View"}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div 
              className="flex-1 overflow-hidden relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ 
                touchAction: isDragging ? 'none' : 'auto',
                pointerEvents: isDragging ? 'none' : 'auto'
              }}
            >
              {viewMode === "sheet" ? (
                /* Sheet View - Card view */
                <>
                  <AnimatePresence mode="wait">
                    {favoritePoems[currentIndex] && (
                      <motion.div
                        key={`favorite-${favoritePoems[currentIndex].id}-${currentIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col"
                      >
                        {/* Poet Name */}
                        <div className="text-center px-8 pt-6 pb-4">
                          <h3 className="text-foreground text-lg" dir="rtl">
                            {favoritePoems[currentIndex].poet.name}
                          </h3>
                        </div>

                        {/* Poem Content */}
                        <div className="flex-1 flex items-center justify-center px-8">
                          <div
                            className="text-foreground text-xl leading-relaxed font-light text-center max-w-2xl overflow-y-auto scrollbar-hide"
                            dir="rtl"
                            style={{
                              lineHeight: "1.8",
                              maxHeight: `calc(${currentHeight}vh - 280px)`,
                            }}
                            dangerouslySetInnerHTML={{
                              __html:
                                favoritePoems[currentIndex].htmlText ||
                                favoritePoems[currentIndex].text.replace(/\n/g, "<br/>"),
                            }}
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="p-6">
                          <div className="flex items-center justify-center space-x-4 space-x-reverse">
                            <Button
                              onClick={() =>
                                setShowConfirmDelete(favoritePoems[currentIndex].id)
                              }
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center space-x-2 space-x-reverse"
                            >
                              <Trash2 size={16} />
                              <span>حذف از علاقه‌مندی‌ها</span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>



                  {/* Navigation Arrows */}
                  {favoritePoems.length > 1 && (
                    <>
                      {currentIndex > 0 && (
                        <Button
                          onClick={() => navigateToPoem(currentIndex - 1)}
                          variant="ghost"
                          size="sm"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent z-10"
                        >
                          ↓
                        </Button>
                      )}
                      {currentIndex < favoritePoems.length - 1 && (
                        <Button
                          onClick={() => navigateToPoem(currentIndex + 1)}
                          variant="ghost"
                          size="sm"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent z-10"
                        >
                          ↑
                        </Button>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* List View */
                <ScrollArea className="h-full px-6">
                  <div className="py-4 space-y-4">
                    {favoritePoems.map((poem) => (
                      <ListViewCard
                        key={poem.id}
                        poem={poem}
                        onDelete={() => setShowConfirmDelete(poem.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </>
        )}

        {/* Confirm Delete Modal */}
        <AnimatePresence>
          {showConfirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
              >
                <h3 className="text-foreground text-lg mb-4" dir="rtl">
                  حذف از علاقه‌مندی‌ها
                </h3>
                <p className="text-muted-foreground mb-6" dir="rtl">
                  آیا مطمئن هستید که می‌خواهید این شعر را از لیست علاقه‌مندی‌ها حذف کنید؟
                </p>
                <div className="flex space-x-3 space-x-reverse">
                  <Button
                    onClick={() => removeFavorite(showConfirmDelete)}
                    variant="destructive"
                    className="flex-1"
                  >
                    حذف
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDelete(null)}
                    variant="ghost"
                    className="flex-1"
                  >
                    انصراف
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}