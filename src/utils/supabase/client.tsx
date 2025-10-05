import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single Supabase client instance to avoid multiple GoTrueClient instances
export const supabase = createSupabaseClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      // Configure auth settings for better error handling
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable automatic session detection from URL
      flowType: 'pkce' // Use PKCE flow for better security
    },
    global: {
      headers: {
        'x-client-info': 'persian-poetry-app'
      }
    }
  }
);

// Export a function that returns the singleton instance
export function createClient() {
  return supabase;
}