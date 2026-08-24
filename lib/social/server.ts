import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type IntegrationActor = {
  userId: string;
};

export async function requireIntegrationManager():
  Promise<IntegrationActor | null> {
  const supabase =
    await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const {
    data: canManage,
  } = await supabase.rpc(
    "has_permission",
    {
      p_permission:
        "integrations.manage",
    }
  );

  if (!canManage) {
    return null;
  }

  return {
    userId,
  };
}

export async function readIntegrationSecret(
  integrationKey: string,
  credentialKey: string
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "backend_get_integration_secret",
    {
      p_integration_key:
        integrationKey,
      p_credential_key:
        credentialKey,
    }
  );

  if (
    error ||
    typeof data !==
      "string" ||
    !data.trim()
  ) {
    return null;
  }

  return data.trim();
}

export async function storeSocialConnection({
  platform,
  connectionType,
  externalAccountId,
  accountName,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
  metadata,
  connectedBy,
}: {
  platform:
    | "linkedin"
    | "facebook";
  connectionType:
    | "member"
    | "organization"
    | "page";
  externalAccountId: string;
  accountName: string;
  accessToken: string;
  refreshToken:
    | string
    | null;
  expiresAt:
    | string
    | null;
  scopes: string[];
  metadata:
    Record<
      string,
      unknown
    >;
  connectedBy: string;
}) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "backend_store_social_connection",
    {
      p_platform:
        platform,
      p_connection_type:
        connectionType,
      p_external_account_id:
        externalAccountId,
      p_account_name:
        accountName,
      p_access_token:
        accessToken,
      p_refresh_token:
        refreshToken,
      p_expires_at:
        expiresAt,
      p_scopes:
        scopes,
      p_metadata:
        metadata,
      p_connected_by:
        connectedBy,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

export function expiresAtFromSeconds(
  expiresIn: unknown
) {
  const seconds =
    Number(expiresIn);

  if (
    !Number.isFinite(
      seconds
    ) ||
    seconds <= 0
  ) {
    return null;
  }

  return new Date(
    Date.now() +
      seconds *
        1000
  ).toISOString();
}