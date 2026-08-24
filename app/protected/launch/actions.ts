"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function requireSettingsManager() {
  const supabase =
    await createClient();

  const {
    data: authData,
  } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
  }

  const {
    data: canManage,
  } = await supabase.rpc(
    "has_permission",
    {
      p_permission:
        "settings.manage",
    }
  );

  if (!canManage) {
    redirect(
      "/protected/launch?error=forbidden"
    );
  }

  return {
    supabase,
    userId,
  };
}

function firstHeaderValue(
  value:
    | string
    | null
) {
  if (!value) {
    return "";
  }

  return (
    value
      .split(",")[0] ??
    ""
  ).trim();
}

export async function registerCurrentProductionUrl() {
  const {
    supabase,
    userId,
  } =
    await requireSettingsManager();

  const headerStore =
    await headers();

  const forwardedProto =
    firstHeaderValue(
      headerStore.get(
        "x-forwarded-proto"
      )
    );

  const forwardedHost =
    firstHeaderValue(
      headerStore.get(
        "x-forwarded-host"
      )
    );

  const host =
    forwardedHost ||
    firstHeaderValue(
      headerStore.get(
        "host"
      )
    );

  const protocol =
    forwardedProto ||
    "https";

  if (!host) {
    redirect(
      "/protected/launch?error=host"
    );
  }

  const loweredHost =
    host.toLowerCase();

  if (
    loweredHost.includes(
      "localhost"
    ) ||
    loweredHost.startsWith(
      "127."
    ) ||
    loweredHost.startsWith(
      "[::1]"
    )
  ) {
    redirect(
      "/protected/launch?error=localhost"
    );
  }

  if (
    protocol.toLowerCase() !==
    "https"
  ) {
    redirect(
      "/protected/launch?error=https"
    );
  }

  const origin =
    `https://${host}`
      .replace(
        /\/+$/,
        ""
      );

  const {
    error,
  } = await supabase
    .from(
      "automation_settings"
    )
    .update({
      public_base_url:
        origin,
      updated_by:
        userId,
      last_dispatch_error:
        null,
      last_metrics_dispatch_error:
        null,
    })
    .eq(
      "id",
      1
    );

  if (error) {
    console.error(
      "No se pudo registrar URL de produccion:",
      error
    );

    redirect(
      "/protected/launch?error=url-save"
    );
  }

  revalidatePath(
    "/protected/launch"
  );

  revalidatePath(
    "/protected/scheduler"
  );

  revalidatePath(
    "/protected/analytics/sync"
  );

  redirect(
    "/protected/launch?notice=url-registered"
  );
}