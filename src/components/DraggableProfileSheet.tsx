import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import {
  User,
  Heart,
  LogOut,
  Camera,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useProfile } from "../contexts/ProfileContext";
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

interface DraggableProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowFavorites: () => void;
}

export function DraggableProfileSheet({
  open,
  onOpenChange,
  onShowFavorites,
}: DraggableProfileSheetProps) {
  const { user, signOut, refreshSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { profileImage, setProfileImage } = useProfile();
  const { t, isRTL } = useLanguage();
  const [uploading, setUploading] = useState(false);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(90);
  const [currentHeight, setCurrentHeight] = useState(90); // Start at 90%
  const [showPulse, setShowPulse] = useState(true);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // Snap points (as percentages of viewport height)
  const SNAP_POINTS = [40, 70, 90];
  const CLOSE_THRESHOLD = 20; // Below this percentage, the sheet closes

  // Load user profile when sheet opens
  useEffect(() => {
    if (open && user) {
      loadUserProfile();
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

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { projectId } = await import(
        "../utils/supabase/info"
      );
      const {
        data: { session },
      } = await (await import("../utils/supabase/client"))
        .createClient()
        .auth.getSession();

      if (!session?.access_token) {
        console.log('No access token in profile load, attempting refresh');
        const refreshResult = await refreshSession();
        if (refreshResult.error) {
          console.error('Session refresh failed in profile load');
          return;
        }
        // Retry after refresh
        setTimeout(() => loadUserProfile(), 1000);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/profile`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.profile?.profileImage) {
          setProfileImage(data.profile.profileImage);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

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

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.fileSizeError);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t.fileTypeError);
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;

        try {
          // Update profile image in backend
          const { projectId } = await import(
            "../utils/supabase/info"
          );
          const {
            data: { session },
          } = await (await import("../utils/supabase/client"))
            .createClient()
            .auth.getSession();

          if (!session?.access_token) {
            console.log('No access token in image upload, attempting refresh');
            const refreshResult = await refreshSession();
            if (refreshResult.error) {
              toast.error(t.pleaseLoginAgain);
              return;
            }
            // Retry after refresh
            setTimeout(() => handleImageUpload(event), 1000);
            return;
          }

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/profile`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                name: user.user_metadata?.name || "",
                profileImage: result,
              }),
            },
          );

          if (response.ok) {
            setProfileImage(result);
            toast.success(t.profileImageUpdated);
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to update profile",
            );
          }
        } catch (error) {
          console.error(
            "Failed to update profile image:",
            error,
          );
          toast.error(t.profileImageError);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to process image:", error);
      toast.error(t.imageProcessingError);
      setUploading(false);
    }
  };

  const getUserInitial = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

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

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border/50">
          <div className={isRTL ? "text-right" : "text-left"} dir={isRTL ? "rtl" : "ltr"}>
            <h2 className="text-foreground text-xl font-medium">
              {t.userProfile}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t.manageAccountSettings}
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div 
          className="flex-1 overflow-hidden relative"
          style={{ 
            touchAction: isDragging ? 'none' : 'auto',
            pointerEvents: isDragging ? 'none' : 'auto'
          }}
        >
          <ScrollArea className="h-full">
            <div className="space-y-6 p-6" dir={isRTL ? "rtl" : "ltr"}>
              {/* Profile Section */}
              <div className={`flex items-center ${isRTL ? 'space-x-4 space-x-reverse' : 'space-x-4'}`}>
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-border">
                    <AvatarImage src={profileImage} />
                    <AvatarFallback className="bg-muted text-foreground text-xl">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="profile-image"
                    className={`absolute -bottom-1 -right-1 bg-muted hover:bg-accent rounded-full p-1.5 cursor-pointer transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {uploading ? (
                      <div className="w-3 h-3 border border-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera
                        size={12}
                        className="text-foreground"
                      />
                    )}
                    <input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-medium">
                    {user?.user_metadata?.name || (isRTL ? "کاربر" : "User")}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div className={`flex items-center ${isRTL ? 'space-x-3 space-x-reverse' : 'space-x-3'}`}>
                  {theme === "dark" ? (
                    <Moon
                      size={20}
                      className="text-muted-foreground"
                    />
                  ) : (
                    <Sun
                      size={20}
                      className="text-muted-foreground"
                    />
                  )}
                  <span className="text-foreground">{t.darkMode}</span>
                </div>
                <div
                  className="w-16 h-8 cursor-pointer"
                  onClick={toggleTheme}
                >
                  <div
                    className={`relative w-full h-full rounded-full transition-all duration-300 ${
                      theme === "dark"
                        ? "bg-[#34c759]"
                        : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-[4px] w-7 h-6 bg-white rounded-full transition-all duration-300 ${
                        theme === "dark"
                          ? "right-[2px]"
                          : "right-[30px]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Favorites */}
              <Button
                onClick={onShowFavorites}
                variant="ghost"
                className={`w-full ${isRTL ? 'justify-start text-right' : 'justify-start text-left'} bg-muted/50 hover:bg-muted text-foreground border border-border`}
              >
                <Heart size={20} className={isRTL ? "ml-3" : "mr-3"} />
                {t.favoritePoems}
              </Button>

              {/* User Profile */}
              <Button
                variant="ghost"
                className={`w-full ${isRTL ? 'justify-start text-right' : 'justify-start text-left'} bg-muted/50 hover:bg-muted text-foreground border border-border`}
              >
                <User size={20} className={isRTL ? "ml-3" : "mr-3"} />
                {t.editProfile}
              </Button>

              {/* Sign Out */}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className={`w-full ${isRTL ? 'justify-start text-right' : 'justify-start text-left'} bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20`}
              >
                <LogOut size={20} className={isRTL ? "ml-3" : "mr-3"} />
                {t.signOutFromAccount}
              </Button>
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </>
  );
}