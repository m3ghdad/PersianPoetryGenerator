import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Heart,
  ArrowRight,
  X,
  Trash2,
  List,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";

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

interface FavoritesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesSheet({
  open,
  onOpenChange,
}: FavoritesSheetProps) {
  const [favoritePoems, setFavoritePoems] = useState<
    FavoritePoem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState<
    number | null
  >(null);
  const [viewMode, setViewMode] = useState<"sheet" | "list">(
    "sheet",
  ); // New state for view toggle
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch handling for swipe navigation
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);

  useEffect(() => {
    if (open && user) {
      loadFavorites();
    }
  }, [open, user]);

  const loadFavorites = async () => {
    if (!user) return;

    setLoading(true);
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
        toast.error("لطفاً دوباره وارد شوید");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/favorites`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setFavoritePoems(data.favorites || []);
      } else {
        const errorData = await response.json();
        console.error(
          "Failed to load favorites:",
          errorData.error,
        );
        toast.error("خطا در بارگذاری علاقه‌مندی‌ها");
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
      toast.error("خطا در بارگذاری علاقه‌مندی‌ها");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (poemId: number) => {
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
        toast.error("لطفاً دوباره وارد شوید");
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
        const removedIndex = favoritePoems.findIndex(
          (p) => p.id === poemId,
        );
        setFavoritePoems((prev) =>
          prev.filter((poem) => poem.id !== poemId),
        );

        // Adjust current index if needed
        if (removedIndex <= currentIndex && currentIndex > 0) {
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        } else if (favoritePoems.length === 1) {
          // If this was the last poem, close the sheet
          onOpenChange(false);
        }

        setShowConfirmDelete(null);
        toast.success("شعر از علاقه‌مندی‌ها حذف شد");
      } else {
        const errorData = await response.json();
        console.error(
          "Failed to remove favorite:",
          errorData.error,
        );
        toast.error("خطا در حذف شعر");
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      toast.error("خطا در حذف شعر");
    }
  };

  // Navigation functions
  const navigateToPoem = useCallback(
    (index: number) => {
      if (index >= 0 && index < favoritePoems.length) {
        setCurrentIndex(index);
      }
    },
    [favoritePoems.length],
  );

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      y: touch.clientY,
      time: Date.now(),
    });
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const deltaY = touchStart.y - touch.clientY;
      const deltaTime = Date.now() - touchStart.time;
      const velocity = Math.abs(deltaY) / deltaTime;

      const minSwipeDistance = 50;
      const minVelocity = 0.3;

      if (
        Math.abs(deltaY) > minSwipeDistance ||
        velocity > minVelocity
      ) {
        if (deltaY > 0) {
          // Swipe up - next poem
          const nextIndex = Math.min(
            currentIndex + 1,
            favoritePoems.length - 1,
          );
          navigateToPoem(nextIndex);
        } else {
          // Swipe down - previous poem
          const prevIndex = Math.max(currentIndex - 1, 0);
          navigateToPoem(prevIndex);
        }
      }

      setTouchStart(null);
    },
    [
      touchStart,
      currentIndex,
      favoritePoems.length,
      navigateToPoem,
    ],
  );

  // Reset current index when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setShowConfirmDelete(null);
    }
  }, [open]);

  // Component for list view card
  const ListViewCard = ({
    poem,
    onDelete,
  }: {
    poem: FavoritePoem;
    onDelete: () => void;
  }) => (
    <Card className="bg-black/30 border-white/10 backdrop-blur-sm mb-4">
      <CardHeader className="pb-3">
        <div
          className="flex items-center justify-between"
          dir="rtl"
        >
          <div className="flex items-center space-x-2 space-x-reverse">
            <Heart
              size={16}
              className="text-red-400 fill-current"
            />
            <span className="text-muted-foreground text-sm">
              {poem.poet.name}
            </span>
          </div>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-1"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="text-foreground leading-relaxed text-base font-light whitespace-pre-wrap"
          dir="rtl"
          style={{ lineHeight: "1.7" }}
          dangerouslySetInnerHTML={{
            __html:
              poem.htmlText ||
              poem.text.replace(/\n/g, "<br/>"),
          }}
        />
        <div className="mt-4 pt-3 border-t border-border">
          <span className="text-muted-foreground text-xs" dir="rtl">
            اضافه شده در{" "}
            {new Date(poem.favoritedAt).toLocaleDateString(
              "fa-IR",
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // Add touch event listeners (only for sheet mode)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !open || viewMode !== "sheet") return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      container.removeEventListener(
        "touchstart",
        handleTouchStart,
      );
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, open, viewMode]);

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] bg-background/95 border-border backdrop-blur-xl p-12 rounded-t-xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>بارگذاری علاقه‌مندی‌ها</SheetTitle>
            <SheetDescription>
              در حال بارگذاری لیست اشعار علاقه‌مند
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin mx-auto px-[8px] py-[0px] m-[0px]"></div>
              <p className="text-muted-foreground" dir="rtl">
                در حال بارگذاری علاقه‌مندی‌ها...
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (favoritePoems.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] bg-background/95 border-border backdrop-blur-xl p-12 rounded-t-xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>اشعار علاقه‌مندی خالی</SheetTitle>
            <SheetDescription>
              هیچ شعری در لیست علاقه‌مندی‌ها موجود نیست
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Heart
                size={64}
                className="text-muted-foreground/30 mx-auto mb-6"
              />
              <h3 className="text-foreground text-xl mb-2" dir="rtl">
                هنوز شعری علاقه‌مند نشده‌اید
              </h3>
              <p className="text-muted-foreground mb-8" dir="rtl">
                اشعار مورد علاقه‌تان را با ضربه بر قلب اضافه
                کنید
              </p>
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ArrowRight size={16} className="ml-2" />
                بازگشت
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] bg-background/95 border-border backdrop-blur-xl p-0 overflow-hidden rounded-t-xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>اشعار علاقه‌مندی</SheetTitle>
          <SheetDescription>
            مرور و مدیریت اشعار علاقه‌مند
          </SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div className="relative z-20 p-6 pb-4 border-b border-white/10">
          <div
            className="flex items-center justify-between"
            dir="rtl"
          >
            <div className="flex items-center space-x-3 space-x-reverse">
              <div>
                <h2 className="text-foreground text-xl">
                  اشعار علاقه‌مندی
                </h2>
                <p className="text-muted-foreground text-sm text-right">
                  {viewMode === "sheet"
                    ? `${currentIndex + 1} از ${favoritePoems.length}`
                    : `${favoritePoems.length} شعر`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              {/* View Toggle */}
              <div className="flex items-center space-x-2 space-x-reverse bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-all duration-200 ${
                    viewMode === "list"
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="نمای لیست"
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
                  title="نمای کارت"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Content Container */}
        <div
          ref={viewMode === "sheet" ? containerRef : undefined}
          className="relative flex-1 overflow-hidden"
          style={{ height: "calc(90vh - 120px)" }}
        >
          {viewMode === "sheet" ? (
            /* Sheet View - Original swipeable card view */
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
                      <h3
                        className="text-foreground text-lg"
                        dir="rtl"
                      >
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
                          maxHeight: "calc(90vh - 280px)",
                        }}
                        dangerouslySetInnerHTML={{
                          __html:
                            favoritePoems[currentIndex]
                              .htmlText ||
                            favoritePoems[
                              currentIndex
                            ].text.replace(/\n/g, "<br/>"),
                        }}
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="p-6">
                      <div className="flex items-center justify-center space-x-4 space-x-reverse">
                        <Button
                          onClick={() =>
                            setShowConfirmDelete(
                              favoritePoems[currentIndex].id,
                            )
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

              {/* Navigation Dots */}
              {favoritePoems.length > 1 && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex space-x-2 space-x-reverse">
                    {favoritePoems.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => navigateToPoem(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentIndex
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Swipe Navigation Arrows */}
              {favoritePoems.length > 1 && (
                <>
                  {currentIndex > 0 && (
                    <Button
                      onClick={() =>
                        navigateToPoem(currentIndex - 1)
                      }
                      variant="ghost"
                      size="sm"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent z-10"
                    >
                      ↓
                    </Button>
                  )}
                  {currentIndex < favoritePoems.length - 1 && (
                    <Button
                      onClick={() =>
                        navigateToPoem(currentIndex + 1)
                      }
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
            /* List View - Scrollable card list */
            <ScrollArea className="h-full px-6">
              <div className="py-4 space-y-4">
                {favoritePoems.map((poem) => (
                  <ListViewCard
                    key={poem.id}
                    poem={poem}
                    onDelete={() =>
                      setShowConfirmDelete(poem.id)
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Confirm Delete Modal */}
        <AnimatePresence>
          {showConfirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 flex items-center justify-center z-30"
              onClick={() => setShowConfirmDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-6 mx-6 border border-white/20"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
              >
                <h3 className="text-foreground text-lg mb-4">
                  حذف از علاقه‌مندی‌ها
                </h3>
                <p className="text-muted-foreground mb-6">
                  آیا مطمئن هستید که می‌خواهید این شعر را از
                  علاقه‌مندی‌ها حذف کنید؟
                </p>
                <div className="flex space-x-3 space-x-reverse">
                  <Button
                    onClick={() =>
                      removeFavorite(showConfirmDelete)
                    }
                    variant="destructive"
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                  >
                    حذف
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDelete(null)}
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    لغو
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}