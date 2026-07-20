import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
    if (_client)
        return _client;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables");
    }
    _client = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return _client;
}
const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const client = getClient();
        const value = (client as unknown as Record<string | symbol, unknown>)[prop];
        return typeof value === "function" ? value.bind(client) : value;
    },
});
export default supabase;
