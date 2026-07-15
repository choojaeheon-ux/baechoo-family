// 추추 회사 구글 캘린더 프록시 (읽기 전용)
// SA 키는 서버 환경변수(GOOGLE_SA_KEY)에만 존재 — 클라이언트에 절대 노출 금지.
// 보호: x-family-pin 헤더 == FAMILY_PIN (무작위 접근 차단 수준).
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const CALENDAR_ID = "jh.choo@mgrv.company";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CompanyEvent {
  id: string;
  title: string;
  date: string;
  endDate: string; // inclusive
  time: string | null;
  endTime: string | null;
}

// 모듈 레벨 캐시 (서버리스 인스턴스 생존 동안)
const cache = new Map<string, { ts: number; events: CompanyEvent[] }>();
let tokenCache: { token: string; exp: number } | null = null;

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function getAccessToken(key: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp > now + 60) return tokenCache.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("token exchange failed");
  tokenCache = { token: data.access_token, exp: now + 3500 };
  return data.access_token;
}

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate()
  ).padStart(2, "0")}`;
}

interface GoogleEvent {
  id?: string;
  summary?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function normalize(item: GoogleEvent): CompanyEvent | null {
  if (item.status === "cancelled") return null;
  const start = item.start ?? {};
  const end = item.end ?? {};
  const allDay = !!start.date;
  const date = start.date ?? start.dateTime?.slice(0, 10);
  if (!date) return null;
  // 구글 종일 일정의 end.date는 exclusive → inclusive로 보정
  const endDate = allDay
    ? addDaysISO(end.date ?? addDaysISO(date, 1), -1)
    : end.dateTime?.slice(0, 10) ?? date;
  return {
    id: item.id ?? `${date}-${item.summary ?? ""}`,
    title: item.summary ?? "(제목 없음)",
    date,
    endDate: endDate >= date ? endDate : date,
    time: allDay ? null : start.dateTime?.slice(11, 16) ?? null,
    endTime: allDay ? null : end.dateTime?.slice(11, 16) ?? null,
  };
}

export async function GET(req: NextRequest) {
  const expectedPin = process.env.FAMILY_PIN;
  const saRaw = process.env.GOOGLE_SA_KEY;
  if (!expectedPin || !saRaw) {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }
  if (req.headers.get("x-family-pin") !== expectedPin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ym = req.nextUrl.searchParams.get("ym") ?? "";
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return NextResponse.json({ error: "invalid ym" }, { status: 400 });
  }

  const hit = cache.get(ym);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json({ events: hit.events, cached: true });
  }

  try {
    const key = JSON.parse(saRaw) as { client_email: string; private_key: string };
    const token = await getAccessToken(key);

    // 월 양끝 7일 버퍼 (연박이 월 경계에 걸치는 경우)
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const timeMin = `${addDaysISO(`${ym}-01`, -7)}T00:00:00+09:00`;
    const timeMax = `${addDaysISO(`${ym}-${String(lastDay).padStart(2, "0")}`, 7)}T23:59:59+09:00`;

    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=250&timeZone=Asia/Seoul` +
      `&fields=items(id,summary,status,start,end)`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`calendar ${res.status}`);
    const data = (await res.json()) as { items?: GoogleEvent[] };

    const events = (data.items ?? [])
      .map(normalize)
      .filter((e): e is CompanyEvent => e !== null);

    cache.set(ym, { ts: Date.now(), events });
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "calendar fetch failed" }, { status: 502 });
  }
}
