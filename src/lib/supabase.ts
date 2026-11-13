import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Treat blank values (e.g. `EXPO_PUBLIC_SUPABASE_URL=`) as missing, so the
// app shows the setup banner instead of createClient throwing on launch.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Create a .env file (see .env.example) and restart the Expo dev server."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Signs the device in anonymously (no visible account) if it isn't already.
 * The database and realtime policies use this user id to tell a classroom's
 * teacher apart from its students and from outsiders.
 */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  if (!session) {
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    session = signIn.session;
  }
  // Private channels authorize with the user's token, so hand it to realtime
  // before any channel subscribes.
  await supabase.realtime.setAuth(session?.access_token ?? null);
}
