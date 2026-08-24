import {
  randomBytes,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readIntegrationSecret,
  requireIntegrationManager,
} from "@/lib/social/server";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const actor =
    await requireIntegrationManager();

  if (!actor) {
    return NextResponse.redirect(
      new URL(
        "/protected",
        request.url
      )
    );
  }

  const clientId =
    await readIntegrationSecret(
      "linkedin",
      "client_id"
    );

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        "/protected/social?error=linkedin-credentials",
        request.url
      )
    );
  }

  const state =
    randomBytes(
      32
    ).toString("hex");

  const redirectUri =
    `${request.nextUrl.origin}/api/integrations/linkedin/callback`;

  const authorizationUrl =
    new URL(
      "https://www.linkedin.com/oauth/v2/authorization"
    );

  authorizationUrl.searchParams.set(
    "response_type",
    "code"
  );

  authorizationUrl.searchParams.set(
    "client_id",
    clientId
  );

  authorizationUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  authorizationUrl.searchParams.set(
    "state",
    state
  );

  authorizationUrl.searchParams.set(
    "scope",
    [
      "openid",
      "profile",
      "email",
      "w_member_social",
    ].join(" ")
  );

  const response =
    NextResponse.redirect(
      authorizationUrl
    );

  response.cookies.set(
    "contentai_linkedin_oauth_state",
    state,
    {
      httpOnly:
        true,
      sameSite:
        "lax",
      secure:
        request.nextUrl.protocol ===
        "https:",
      path:
        "/",
      maxAge:
        10 * 60,
    }
  );

  return response;
}