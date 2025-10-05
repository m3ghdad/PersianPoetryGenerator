import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Poem {
  id: number;
  title: string;
  text: string;
  htmlText: string;
  poet: {
    id: number;
    name: string;
    fullName: string;
  };
}

interface FavoriteButtonProps {
  poem: Poem;
  onAuthRequired: () => void;
}

export function FavoriteButton({ poem, onAuthRequired }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if poem is favorited when component mounts or poem changes
  useEffect(() => {
    if (!user || !poem?.id) return;

    const checkFavoriteStatus = async () => {
      try {
        const { projectId } = await import('../utils/supabase/info');
        const { data: { session } } = await (await import('../utils/supabase/client')).createClient().auth.getSession();
        
        if (!session?.access_token) return;

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/favorites/${poem.id}/status`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsFavorited(data.isFavorited);
        }
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [user, poem?.id]);

  const handleFavorite = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    if (!poem || !poem.id) {
      toast.error('خطا در دریافت اطلاعات شعر');
      return;
    }

    setIsLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const { data: { session } } = await (await import('../utils/supabase/client')).createClient().auth.getSession();
      
      if (!session?.access_token) {
        toast.error('لطفاً دوباره وارد شوید');
        onAuthRequired();
        return;
      }
      
      if (!isFavorited) {
        // Add to favorites
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            poem: {
              id: poem.id,
              title: poem.title,
              text: poem.text,
              htmlText: poem.htmlText,
              poet: poem.poet
            }
          }),
        });

        if (response.ok) {
          setIsFavorited(true);
          toast.success('شعر به علاقه‌مندی‌ها اضافه شد', {
            description: `اثر ${poem.poet.name}`,
            duration: 3000,
          });
        } else {
          const errorData = await response.json();
          if (response.status === 409) {
            toast.warning('این شعر قبلاً به علاقه‌مندی‌ها اضافه شده است');
            setIsFavorited(true);
          } else {
            throw new Error(errorData.error || 'Failed to add favorite');
          }
        }
      } else {
        // Remove from favorites
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/favorites/${poem.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          setIsFavorited(false);
          toast.success('شعر از علاقه‌مندی‌ها حذف شد');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove favorite');
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('خطا در انجام عملیات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleFavorite}
      disabled={isLoading}
      className={`
        w-10 h-10 rounded-full
        backdrop-blur-2xl
        border
        shadow-lg
        transition-all duration-300
        ${isFavorited 
          ? 'bg-red-500/30 text-red-500 border-red-500/50 hover:bg-red-500/40' 
          : 'bg-muted/30 text-foreground/70 hover:bg-muted/50 hover:text-foreground border-border'
        }
        ${isLoading ? 'opacity-50' : ''}
        active:scale-95
        flex items-center justify-center
      `}
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isFavorited
          ? `0 4px 16px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
          : `0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Heart 
          size={16} 
          className={`transition-all duration-300 ${
            isFavorited ? 'fill-current' : ''
          }`}
        />
      )}
    </motion.button>
  );
}