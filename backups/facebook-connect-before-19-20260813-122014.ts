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

const META_GRAPH_VERSION =
  "v24.0";

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

  const appId =
    await readIntegrationSecret(
      "facebook",
      "app_id"
    );

  if (!appId) {
    return NextResponse.redirect(
      new URL(
        "/protected/social?error=facebook-credentials",
        request.url
      )
    );
  }

  const state =
    randomBytes(
      32
    ).toString("hex");

  const redirectUri =
    `${request.nextUrl.origin}/api/integrations/facebook/callback`;

  const authorizationUrl =
    new URL(
      `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`
    );

  authorizationUrl.searchParams.set(
    "client_id",
    appId
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
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
    ].join(",")
  );

  const response =
    NextResponse.redirect(
      authorizationUrl
    );

  response.cookies.set(
    "contentai_facebook_oauth_state",
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