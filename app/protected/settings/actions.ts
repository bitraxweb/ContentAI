"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedPlatforms = [
  "linkedin",
  "facebook",
  "both",
];

const allowedTones = [
  "professional",
  "friendly",
  "informative",
  "persuasive",
  "inspirational",
];

const allowedLanguages = [
  "es",
  "en",
];

const allowedIntegrationKeys = [
  "openai_text",
  "image_ai",
  "audio_ai",
  "video_ai",
  "linkedin",
  "facebook",
];

async function getSettingsAccess() {
  const supabase = await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [
    canViewResult,
    canManageResult,
    canManageIntegrationsResult,
  ] = await Promise.all([
    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.view",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.manage",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "integrations.manage",
      }
    ),
  ]);

  if (!canViewResult.data) {
    redirect("/protected");
  }

  return {
    supabase,
    userId,
    canManage:
      Boolean(
        canManageResult.data
      ),
    canManageIntegrations:
      Boolean(
        canManageIntegrationsResult.data
      ),
  };
}

function sectionForIntegration(
  integrationKey: string
) {
  return [
    "linkedin",
    "facebook",
  ].includes(
    integrationKey
  )
    ? "social"
    : "ai";
}

function settingsError(
  section: string,
  code: string
): never {
  redirect(
    `/protected/settings?section=${encodeURIComponent(
      section
    )}&error=${encodeURIComponent(
      code
    )}`
  );
}

export async function saveWorkspaceSettings(
  formData: FormData
) {
  const {
    supabase,
    userId,
    canManage,
  } = await getSettingsAccess();

  if (!canManage) {
    settingsError(
      "general",
      "forbidden"
    );
  }

  const workspaceName = String(
    formData.get(
      "workspace_name"
    ) ?? ""
  ).trim();

  const language = String(
    formData.get(
      "language"
    ) ?? "es"
  );

  const timezone = String(
    formData.get(
      "timezone"
    ) ?? "UTC"
  ).trim();

  const defaultPlatform = String(
    formData.get(
      "default_platform"
    ) ?? "linkedin"
  );

  const defaultTone = String(
    formData.get(
      "default_tone"
    ) ?? "professional"
  );

  if (!workspaceName) {
    settingsError(
      "general",
      "name"
    );
  }

  if (
    !allowedLanguages.includes(
      language
    )
  ) {
    settingsError(
      "general",
      "language"
    );
  }

  if (!timezone) {
    settingsError(
      "general",
      "timezone"
    );
  }

  if (
    !allowedPlatforms.includes(
      defaultPlatform
    )
  ) {
    settingsError(
      "general",
      "platform"
    );
  }

  if (
    !allowedTones.includes(
      defaultTone
    )
  ) {
    settingsError(
      "general",
      "tone"
    );
  }

  const { error } =
    await supabase
      .from(
        "workspace_settings"
      )
      .update({
        workspace_name:
          workspaceName,
        language,
        timezone,
        default_platform:
          defaultPlatform,
        default_tone:
          defaultTone,
        updated_by:
          userId,
      })
      .eq("id", 1);

  if (error) {
    console.error(
      "Error guardando configuración:",
      error
    );

    settingsError(
      "general",
      "database"
    );
  }

  revalidatePath(
    "/protected",
    "layout"
  );

  revalidatePath(
    "/protected/settings"
  );

  redirect(
    "/protected/settings?section=general&saved=1"
  );
}

export async function saveIntegrationPreferences(
  integrationKey: string,
  formData: FormData
) {
  const {
    supabase,
    userId,
    canManageIntegrations,
  } = await getSettingsAccess();

  const section =
    sectionForIntegration(
      integrationKey
    );

  if (!canManageIntegrations) {
    settingsError(
      section,
      "integration-forbidden"
    );
  }

  if (
    !allowedIntegrationKeys.includes(
      integrationKey
    )
  ) {
    settingsError(
      section,
      "integration"
    );
  }

  const enabled =
    formData.get(
      "enabled"
    ) === "on";

  const providerName = String(
    formData.get(
      "provider_name"
    ) ?? ""
  ).trim();

  const modelName = String(
    formData.get(
      "model_name"
    ) ?? ""
  ).trim();

  const notes = String(
    formData.get(
      "notes"
    ) ?? ""
  ).trim();

  const { error } =
    await supabase
      .from(
        "integration_settings"
      )
      .update({
        enabled,
        provider_name:
          providerName ||
          null,
        model_name:
          modelName ||
          null,
        notes:
          notes ||
          null,
        updated_by:
          userId,
      })
      .eq(
        "integration_key",
        integrationKey
      );

  if (error) {
    console.error(
      "Error guardando integración:",
      error
    );

    settingsError(
      section,
      "database"
    );
  }

  revalidatePath(
    "/protected/settings"
  );

  redirect(
    `/protected/settings?section=${section}&saved_integration=${encodeURIComponent(
      integrationKey
    )}`
  );
}

export async function saveIntegrationCredential(
  integrationKey: string,
  credentialKey: string,
  formData: FormData
) {
  const {
    supabase,
    canManageIntegrations,
  } = await getSettingsAccess();

  const section =
    sectionForIntegration(
      integrationKey
    );

  if (!canManageIntegrations) {
    settingsError(
      section,
      "integration-forbidden"
    );
  }

  const secretValue = String(
    formData.get(
      "secret_value"
    ) ?? ""
  ).trim();

  if (
    secretValue.length < 4
  ) {
    settingsError(
      section,
      "credential-empty"
    );
  }

  const { error } =
    await supabase.rpc(
      "save_integration_credential",
      {
        p_integration_key:
          integrationKey,
        p_credential_key:
          credentialKey,
        p_secret_value:
          secretValue,
      }
    );

  if (error) {
    console.error(
      "Error guardando credencial en Vault:",
      error
    );

    settingsError(
      section,
      "credential-save"
    );
  }

  revalidatePath(
    "/protected/settings"
  );

  redirect(
    `/protected/settings?section=${section}&credential_saved=${encodeURIComponent(
      `${integrationKey}:${credentialKey}`
    )}`
  );
}

export async function deleteIntegrationCredential(
  integrationKey: string,
  credentialKey: string,
  _formData: FormData
) {
  const {
    supabase,
    canManageIntegrations,
  } = await getSettingsAccess();

  const section =
    sectionForIntegration(
      integrationKey
    );

  if (!canManageIntegrations) {
    settingsError(
      section,
      "integration-forbidden"
    );
  }

  const { error } =
    await supabase.rpc(
      "delete_integration_credential",
      {
        p_integration_key:
          integrationKey,
        p_credential_key:
          credentialKey,
      }
    );

  if (error) {
    console.error(
      "Error eliminando credencial de Vault:",
      error
    );

    settingsError(
      section,
      "credential-delete"
    );
  }

  revalidatePath(
    "/protected/settings"
  );

  redirect(
    `/protected/settings?section=${section}&credential_deleted=${encodeURIComponent(
      `${integrationKey}:${credentialKey}`
    )}`
  );
}