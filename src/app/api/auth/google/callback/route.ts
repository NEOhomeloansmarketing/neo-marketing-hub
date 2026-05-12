import { NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/analytics?gsc=error", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Upsert — only one token row ever needed
    const existing = await db.googleToken.findFirst();
    if (existing) {
      await db.googleToken.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token ?? existing.refreshToken,
          expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
          scope: tokens.scope ?? "",
        },
      });
    } else {
      await db.googleToken.create({
        data: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
          scope: tokens.scope ?? "",
        },
      });
    }

    return NextResponse.redirect(new URL("/analytics?gsc=connected", process.env.NEXT_PUBLIC_SITE_URL!));
  } catch (e) {
    console.error("Google OAuth error:", e);
    return NextResponse.redirect(new URL("/analytics?gsc=error", process.env.NEXT_PUBLIC_SITE_URL!));
  }
}
