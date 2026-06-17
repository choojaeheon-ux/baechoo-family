import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 개인 Supabase 프로젝트 키 (없으면 localStorage 모드로 동작)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}
