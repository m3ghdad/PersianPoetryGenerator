import { useEffect } from 'react';
import { User } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';

interface SettingsButtonProps {
  onOpen: () => void;
}

export function SettingsButton({ onOpen }: SettingsButtonProps) {
  const { user } = useAuth();
  const { profileImage, setProfileImage } = useProfile();

  // Load profile image when user changes
  useEffect(() => {
    if (user && !profileImage) {
      loadProfileImage();
    }
  }, [user]);

  const loadProfileImage = async () => {
    if (!user) return;
    
    try {
      const { projectId } = await import('../utils/supabase/info');
      const { data: { session } } = await (await import('../utils/supabase/client')).createClient().auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile?.profileImage) {
          setProfileImage(data.profile.profileImage);
        }
      }
    } catch (error) {
      console.error('Failed to load profile image:', error);
    }
  };

  const getUserInitial = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <motion.button
      onClick={onOpen}
      className="
        fixed top-8 right-8 z-30
        w-10 h-10 rounded-full
        backdrop-blur-2xl
        bg-white/5 border border-white/10
        text-white/70 hover:text-white
        shadow-lg
        transition-all duration-300
        hover:bg-white/10
        active:scale-95
        flex items-center justify-center
        overflow-hidden
      "
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        boxShadow: `
          0 4px 16px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
    >
      {user ? (
        <Avatar className="w-8 h-8">
          <AvatarImage src={profileImage} />
          <AvatarFallback className="bg-transparent text-white text-xs">
            {getUserInitial()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <User size={16} />
      )}
    </motion.button>
  );
}