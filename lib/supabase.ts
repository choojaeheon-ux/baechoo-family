import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 개인 Supabase 프로젝트 키 (없으면 localStorage 모드로 동작)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anon);

// 디자인 미리보기용 — 실데이터는 읽되 쓰기 요청(POST·PATCH·DELETE)은 서버로 보내지 않는다
export const previewReadonly = process.env.NEXT_PUBLIC_PREVIEW_READONLY === "1";

const readonlyFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return fetch(input, init);
  return Promise.resolve(
    new Response(
      JSON.stringify({ message: "미리보기는 읽기 전용입니다", code: "PREVIEW_READONLY" }),
      { status: 403, headers: { "content-type": "application/json" } }
    )
  );
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: { persistSession: false },
      ...(previewReadonly ? { global: { fetch: readonlyFetch } } : {}),
    });
  }
  return client;
}
