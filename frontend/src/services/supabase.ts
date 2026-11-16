import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null when the app is built without Supabase config: everything then works as a guest on this device. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
