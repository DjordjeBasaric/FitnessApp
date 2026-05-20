import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function performLogout(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", req.url));
}

export async function POST(req: NextRequest) {
  return performLogout(req);
}

export async function GET(req: NextRequest) {
  return performLogout(req);
}
