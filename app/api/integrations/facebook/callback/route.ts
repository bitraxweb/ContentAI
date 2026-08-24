import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readIntegrationSecret,
  requireIntegrationManager,
  storeSocialConnection,
} from "@/lib/social/server";



const META_GRAPH_VERSION =
  "v26.0";

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
};

type FacebookPage = {
  id?: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
  picture?: {
    data?: {
      url?: string;
    };
  };
};

type FacebookAccountsResponse = {
  data?: FacebookPage[];
  error?: {
    message?: string;
  };
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
      "facebook-cancelled"
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
      "contentai_facebook_oauth_state"
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
      "facebook-state"
    );
  }

  const [
    appId,
    appSecret,
  ] = await Promise.all([
    readIntegrationSecret(
      "facebook",
      "app_id"
    ),

    readIntegrationSecret(
      "facebook",
      "app_secret"
    ),
  ]);

  if (
    !appId ||
    !appSecret
  ) {
    return redirectToSocial(
      request,
      "error",
      "facebook-credentials"
    );
  }

  const redirectUri =
    `${request.nextUrl.origin}/api/integrations/facebook/callback`;

  const tokenUrl =
    new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`
    );

  tokenUrl.searchParams.set(
    "client_id",
    appId
  );

  tokenUrl.searchParams.set(
    "client_secret",
    appSecret
  );

  tokenUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  tokenUrl.searchParams.set(
    "code",
    code
  );

  let tokenResponse:
    Response;

  try {
    tokenResponse =
      await fetch(
        tokenUrl,
        {
          cache:
            "no-store",
        }
      );
  } catch {
    return redirectToSocial(
      request,
      "error",
      "facebook-network"
    );
  }

  let tokenPayload:
    FacebookTokenResponse;

  try {
    tokenPayload =
      await tokenResponse.json() as FacebookTokenResponse;
  } catch {
    return redirectToSocial(
      request,
      "error",
      "facebook-token"
    );
  }

  if (
    !tokenResponse.ok ||
    !tokenPayload.access_token
  ) {
    console.error(
      "Facebook token error:",
      tokenPayload.error?.message ||
      tokenResponse.status
    );

    return redirectToSocial(
      request,
      "error",
      "facebook-token"
    );
  }

  const pagesUrl =
    new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts`
    );

  pagesUrl.searchParams.set(
    "fields",
    "id,name,access_token,tasks,picture{url}"
  );

  pagesUrl.searchParams.set(
    "access_token",
    tokenPayload.access_token
  );

  let pagesResponse:
    Response;

  try {
    pagesResponse =
      await fetch(
        pagesUrl,
        {
          cache:
            "no-store",
        }
      );
  } catch {
    return redirectToSocial(
      request,
      "error",
      "facebook-pages"
    );
  }

  let pagesPayload:
    FacebookAccountsResponse;

  try {
    pagesPayload =
      await pagesResponse.json() as FacebookAccountsResponse;
  } catch {
    return redirectToSocial(
      request,
      "error",
      "facebook-pages"
    );
  }

  if (!pagesResponse.ok) {
    console.error(
      "Facebook pages error:",
      pagesPayload.error?.message ||
      pagesResponse.status
    );

    return redirectToSocial(
      request,
      "error",
      "facebook-pages"
    );
  }

  const pages =
    (pagesPayload.data ?? [])
      .filter(
        (
          page
        ): page is FacebookPage & {
          id: string;
          access_token: string;
        } =>
          Boolean(
            page.id &&
            page.access_token
          )
      );

  if (
    pages.length ===
    0
  ) {
    return redirectToSocial(
      request,
      "error",
      "facebook-no-pages"
    );
  }

  try {
    for (
      const page
      of pages
    ) {
      await storeSocialConnection({
        platform:
          "facebook",
        connectionType:
          "page",
        externalAccountId:
          page.id,
        accountName:
          page.name ||
          "Página de Facebook",
        accessToken:
          page.access_token,
        refreshToken:
          null,
        expiresAt:
          null,
        scopes: [
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
        ],
        metadata: {
          tasks:
            page.tasks ??
            [],
          picture:
            page.picture?.data?.url ||
            null,
          graph_version:
            META_GRAPH_VERSION,
        },
        connectedBy:
          actor.userId,
      });
    }
  } catch (
    storageError
  ) {
    console.error(
      "Facebook Vault error:",
      storageError
    );

    return redirectToSocial(
      request,
      "error",
      "facebook-store"
    );
  }

  const url =
    new URL(
      "/protected/social",
      request.url
    );

  url.searchParams.set(
    "notice",
    "facebook-connected"
  );

  url.searchParams.set(
    "count",
    String(
      pages.length
    )
  );

  const response =
    NextResponse.redirect(
      url
    );

  response.cookies.set(
    "contentai_facebook_oauth_state",
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
