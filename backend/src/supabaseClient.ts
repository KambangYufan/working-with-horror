// local
import { createClient, SupabaseClient } from "../src/deps.ts";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE} from "../src/config/env.ts";

// client using the anon-key
export const publicAuthClient: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
);

// Admin client: ONLY for privileged ops (e.g., create user)
export const adminSupabase: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE,
);