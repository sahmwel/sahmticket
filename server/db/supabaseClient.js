// db/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Use Node.js environment variables, not Vite-specific ones
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables. Make sure SUPABASE_URL and SUPABASE_KEY are set in your .env");
}

// Create a single Supabase client for backend use
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
