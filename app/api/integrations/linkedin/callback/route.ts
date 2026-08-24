import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  expiresAtFromSeconds,
  readIntegrationSecret,
  requireIntegrationManager,
  storeSocialConnection,
} from "@/lib/social/server";
import {
  discoverAndStoreLinkedInOrganizations,
} from "@/lib/social/linkedin-organizations";

export const dynamic =
  "force-dynamic";

type LinkedInTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type LinkedInUserInfo = {
  sub?: string;
  name?: string;
  picture?: string;
  email?: string;
  locale?: string;
};

function redirectToSocial(
  request: NextRequest,
  key: string,
  value: string
) {
  const url =
    new URL(
      "/protected/social",
      request.url
    );

  url.searchParams.set(
    key,
    value
  );

  return NextResponse.redirect(
    url
  );
}

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

  const providerError =
    request.nextUrl.searchParams.get(
      "error"
    );

  if (providerError) {
    return redirectToSocial(
      request,
      "error",
      "linkedin-cancelled"
    );
  }

  const code =
    request.nextUrl.searchParams.get(
      "code"
    );

  const state =
    request.nextUrl.searchParams.get(
      "state"
    );

  const expectedState =
    request.cookies.get(
      "contentai_linkedin_oauth_state"
    )?.value;

  if (
    !code ||
    !state ||
    !expectedState ||
    state !==
      expectedState
  ) {
    return redirectToSocial(
      request,
      "error",
      "linkedin-state"
    );
  }

  const [
    clientId,
    clientSecret,
  ] = await Promise.all([
    readIntegrationSecret(
      "linkedin",
      "client_id"
    ),

    readIntegrationSecret(
      "linkedin",
      "client_secret"
    ),
  ]);

  if (
    !clientId ||
    !clientSecret
  ) {
    return redirectToSocial(
      request,
      "error",
      "linkedin-credentials"
    );
  }

  const redirectUri =
    `${request.nextUrl.origin}/api/integrations/linkedin/callback`;

  const tokenBody =
    new URLSearchParams();

  tokenBody.set(
    "grant_type",
    "authorization_code"
  );

  tokenBody.set(
    "code",
    code
  );

  tokenBody.set(
    "client_id",
    clientId
  );

  tokenBody.set(
    "client_secret",
    clientSecret
  );

  tokenBody.set(
    "redirect_uri",
    redirectUri
  );

  let tokenResponse:
    Response;

  try {
    tokenResponse =
      await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body:
            tokenBody.toString(),
          cache:
            "no-store",
        }
      );
  } catch {
    return redirectToSocial(
      request,
      "error",
      "linkedin-network"
    );
  }

  let tokenPayload:
    LinkedInTokenResponse;

  try {
    tokenPayload =
      await tokenResponse.json() as LinkedInTokenResponse;
  } catch {
    return redirectToSocial(
      request,
      "error",
      "linkedin-token"
    );
  }

  if (
    !tokenResponse.ok ||
    !tokenPayload.access_token
  ) {
    console.error(
      "LinkedIn token error:",
      tokenPayload.error_description ||
      tokenPayload.error ||
      tokenResponse.status
    );

    return redirectToSocial(
      request,
      "error",
      "linkedin-token"
    );
  }

  let userInfoResponse:
    Response;

  try {
    userInfoResponse =
      await fetch(
        "https://api.linkedin.com/v2/userinfo",
        {
          headers: {
            Authorization:
              `Bearer ${tokenPayload.access_token}`,
          },
          cache:
            "no-store",
        }
      );
  } catch {
    return redirectToSocial(
      request,
      "error",
      "linkedin-profile"
    );
  }

  let userInfo:
    LinkedInUserInfo;

  try {
    userInfo =
      await userInfoResponse.json() as LinkedInUserInfo;
  } catch {
    return redirectToSocial(
      request,
      "error",
      "linkedin-profile"
    );
  }

  if (
    !userInfoResponse.ok ||
    !userInfo.sub
  ) {
    return redirectToSocial(
      request,
      "error",
      "linkedin-profile"
    );
  }

  const scopes =
    tokenPayload.scope
      ? tokenPayload.scope
          .split(
            /[\s,]+/
          )
          .filter(
            Boolean
          )
      : [
          "openid",
          "profile",
          "email",
          "w_member_social",
          "r_member_postAnalytics",
          "r_organization_social",
          "w_organization_social",
          "rw_organization_admin",
        ];

  try {
    await storeSocialConnection({
      platform:
        "linkedin",
      connectionType:
        "member",
      externalAccountId:
        userInfo.sub,
      accountName:
        userInfo.name ||
        "Cuenta de LinkedIn",
      accessToken:
        tokenPayload.access_token,
      refreshToken:
        tokenPayload.refresh_token ||
        null,
      expiresAt:
        expiresAtFromSeconds(
          tokenPayload.expires_in
        ),
      scopes,
      metadata: {
        picture:
          userInfo.picture ||
          null,
        locale:
          userInfo.locale ||
          null,
        email_available:
          Boolean(
            userInfo.email
          ),
        identity_source:
          "openid_connect",
      },
      connectedBy:
        actor.userId,
    });
  } catch (
    storageError
  ) {
    console.error(
      "LinkedIn Vault error:",
      storageError
    );

    return redirectToSocial(
      request,
      "error",
      "linkedin-store"
    );
  }

  try {
    await discoverAndStoreLinkedInOrganizations({
      accessToken:
        tokenPayload.access_token,
      scopes,
      connectedBy:
        actor.userId,
    });
  } catch (
    organizationError
  ) {
    console.error(
      "Descubrimiento de organizaciones LinkedIn:",
      organizationError
    );
  }
  const response =
    redirectToSocial(
      request,
      "notice",
      "linkedin-connected"
    );

  response.cookies.set(
    "contentai_linkedin_oauth_state",
    "",
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
        0,
    }
  );

  return response;
}