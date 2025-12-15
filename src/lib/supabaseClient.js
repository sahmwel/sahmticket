// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
// Make sure these environment variables are defined in your .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env");
}
// Create a single Supabase client for use throughout your app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: false, // important for Vite (not Next.js)
    },
});
