import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/unos";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", req.url));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, req.url),
    );
  }

  const safeNext = next.startsWith("/") ? next : "/unos";
  return NextResponse.redirect(new URL(safeNext, req.url));
}
