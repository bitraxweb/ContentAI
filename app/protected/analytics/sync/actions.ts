"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { processMetricsBatch } from "@/lib/social/metrics-sync";
import { createClient } from "@/lib/supabase/server";

async function getActor() {
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

  const [
    viewResult,
    syncResult,
    settingsResult,
  ] = await Promise.all([
    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "analytics.view",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "analytics.sync",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.manage",
      }
    ),
  ]);

  if (!viewResult.data) {
    redirect(
      "/protected"
    );
  }

  return {
    supabase,
    userId,
    canSync:
      Boolean(
        syncResult.data
      ),
    canManageSettings:
      Boolean(
        settingsResult.data
      ),
  };
}

export async function syncMetricsNow() {
  const {
    userId,
    canSync,
  } =
    await getActor();

  if (!canSync) {
    redirect(
      "/protected/analytics/sync?error=forbidden-sync"
    );
  }

  let result:
    Awaited<
      ReturnType<
        typeof processMetricsBatch
      >
    >;

  try {
    result =
      await processMetricsBatch({
        source:
          "manual",
        actorUserId:
          userId,
      });
  } catch (
    syncError
  ) {
    console.error(
      "Sincronización manual:",
      syncError
    );

    redirect(
      "/protected/analytics/sync?error=sync"
    );
  }

  revalidatePath(
    "/protected/analytics"
  );

  revalidatePath(
    "/protected/analytics/sync"
  );

  const query =
    new URLSearchParams();

  query.set(
    "notice",
    "sync"
  );

  query.set(
    "claimed",
    String(
      result.claimedCount
    )
  );

  query.set(
    "synced",
    String(
      result.syncedCount
    )
  );

  query.set(
    "issues",
    String(
      result.failedCount +
      result.unsupportedCount
    )
  );

  redirect(
    `/protected/analytics/sync?${query.toString()}`
  );
}

export async function saveMetricsSyncSettings(
  formData: FormData
) {
  const {
    supabase,
    canManageSettings,
  } =
    await getActor();

  if (
    !canManageSettings
  ) {
    redirect(
      "/protected/analytics/sync?error=forbidden-settings"
    );
  }

  const enabled =
    formData.get(
      "metrics_sync_enabled"
    ) === "on";

  const intervalHours =
    Number(
      formData.get(
        "metrics_interval_hours"
      ) ?? "6"
    );

  const batchSize =
    Number(
      formData.get(
        "metrics_batch_size"
      ) ?? "10"
    );

  if (
    ![
      1,
      3,
      6,
      12,
      24,
    ].includes(
      intervalHours
    )
  ) {
    redirect(
      "/protected/analytics/sync?error=interval"
    );
  }

  if (
    !Number.isInteger(
      batchSize
    ) ||
    batchSize < 1 ||
    batchSize > 25
  ) {
    redirect(
      "/protected/analytics/sync?error=batch"
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "automation_settings"
    )
    .update({
      metrics_sync_enabled:
        enabled,
      metrics_interval_hours:
        intervalHours,
      metrics_batch_size:
        batchSize,
      last_metrics_dispatch_error:
        null,
    })
    .eq(
      "id",
      1
    );

  if (error) {
    console.error(
      "Configuración de métricas:",
      error
    );

    redirect(
      "/protected/analytics/sync?error=settings-save"
    );
  }

  revalidatePath(
    "/protected/analytics/sync"
  );

  redirect(
    "/protected/analytics/sync?notice=settings-saved"
  );
}