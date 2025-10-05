import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use("*", cors({
  origin: "*",
  allowHeaders: ["*"],
  allowMethods: ["*"],
}));
app.use("*", logger(console.log));

// Supabase client with service role key for admin operations
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Health check
app.get("/make-server-c192d0ee/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Sign up route
app.post("/make-server-c192d0ee/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    console.log(`Creating user account for: ${email}`);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error("Signup error:", error);
      
      // Handle specific Supabase auth errors
      if (error.code === 'email_exists' || error.message.includes('already been registered')) {
        return c.json({ error: 'email_exists' }, 422);
      } else if (error.code === 'weak_password') {
        return c.json({ error: 'weak_password' }, 400);
      } else if (error.code === 'invalid_email') {
        return c.json({ error: 'invalid_email' }, 400);
      } else {
        return c.json({ error: error.message }, 400);
      }
    }

    console.log(`User created successfully: ${data.user.id}`);

    return c.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Failed to create user account" }, 500);
  }
});

// Profile routes
app.get("/make-server-c192d0ee/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Supabase client instance with the user's access token
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get profile data from KV store
    const profileKey = `profile:${user.id}`;
    const profileData = await kv.get(profileKey);

    return c.json({ 
      profile: profileData || {
        name: user.user_metadata?.name || '',
        profileImage: '',
        userId: user.id
      }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

app.put("/make-server-c192d0ee/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Supabase client instance with the user's access token
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, profileImage } = await c.req.json();

    // Store profile data in KV store
    const profileKey = `profile:${user.id}`;
    const profileData = {
      name: name || user.user_metadata?.name || '',
      profileImage: profileImage || '',
      userId: user.id,
      updatedAt: new Date().toISOString()
    };

    await kv.set(profileKey, profileData);

    console.log(`Profile updated for user ${user.id}`);

    return c.json({ success: true, profile: profileData });

  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Favorites routes
app.get("/make-server-c192d0ee/favorites", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.error("No access token provided");
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Supabase client instance with the user's access token
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!, // Use anon key for user operations
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    // Get user info using the user's token
    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user?.id) {
      console.error("Auth error:", error);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`Loading favorites for user ${user.id}`);

    // Get user's favorites from KV store
    const favoritesKey = `favorites:${user.id}`;
    const favorites = await kv.get(favoritesKey);

    console.log(`Found ${favorites?.length || 0} favorites for user ${user.id}`);

    return c.json({ favorites: favorites || [] });

  } catch (error) {
    console.error("Get favorites error:", error);
    return c.json({ error: "Failed to get favorites" }, 500);
  }
});

app.post("/make-server-c192d0ee/favorites", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Supabase client instance with the user's access token
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { poem } = await c.req.json();

    if (!poem || !poem.id) {
      return c.json({ error: "Complete poem data is required" }, 400);
    }

    // Get existing favorites
    const favoritesKey = `favorites:${user.id}`;
    const existingFavorites = await kv.get(favoritesKey) || [];

    // Check if already favorited
    const isAlreadyFavorited = existingFavorites.some((fav: any) => fav.id === poem.id);
    if (isAlreadyFavorited) {
      return c.json({ error: "Poem already favorited" }, 409);
    }

    // Add poem to favorites with metadata
    const favoritePoem = {
      ...poem,
      favoritedAt: new Date().toISOString(),
      userId: user.id
    };

    const updatedFavorites = [...existingFavorites, favoritePoem];
    await kv.set(favoritesKey, updatedFavorites);

    console.log(`Added poem ${poem.id} to favorites for user ${user.id}`);

    return c.json({ success: true, favorites: updatedFavorites });

  } catch (error) {
    console.error("Add favorite error:", error);
    return c.json({ error: "Failed to add favorite" }, 500);
  }
});

app.delete("/make-server-c192d0ee/favorites/:poemId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Supabase client instance with the user's access token
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const poemId = parseInt(c.req.param('poemId'));

    // Get existing favorites
    const favoritesKey = `favorites:${user.id}`;
    const existingFavorites = await kv.get(favoritesKey) || [];

    // Remove poem from favorites
    const updatedFavorites = existingFavorites.filter((fav: any) => fav.id !== poemId);
    await kv.set(favoritesKey, updatedFavorites);

    console.log(`Removed poem ${poemId} from favorites for user ${user.id}`);

    return c.json({ success: true, favorites: updatedFavorites });

  } catch (error) {
    console.error("Remove favorite error:", error);
    return c.json({ error: "Failed to remove favorite" }, 500);
  }
});

// Check if poem is favorited
app.get("/make-server-c192d0ee/favorites/:poemId/status", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Supabase client instance with the user's access token
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const poemId = parseInt(c.req.param('poemId'));

    // Get user's favorites
    const favoritesKey = `favorites:${user.id}`;
    const favorites = await kv.get(favoritesKey) || [];

    const isFavorited = favorites.some((fav: any) => fav.id === poemId);

    return c.json({ isFavorited });

  } catch (error) {
    console.error("Check favorite status error:", error);
    return c.json({ error: "Failed to check favorite status" }, 500);
  }
});

Deno.serve(app.fetch);