"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { processScheduledBatch } from "@/lib/social/scheduler-runner";
import { createAdminClient } from "@/lib/supabase/admin";
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
    settingsManageResult,
    publicationManageResult,
    publicationPublishResult,
  ] = await Promise.all([
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
          "publication.manage",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.publish",
      }
    ),
  ]);

  return {
    supabase,
    userId,
    canManageSettings:
      Boolean(
        settingsManageResult.data
      ),
    canManagePublications:
      Boolean(
        publicationManageResult.data
      ),
    canPublish:
      Boolean(
        publicationPublishResult.data
      ),
  };
}

export async function saveSchedulerSettings(
  formData: FormData
) {
  const {
    supabase,
    userId,
    canManageSettings,
  } =
    await getActor();

  if (
    !canManageSettings
  ) {
    redirect(
      "/protected/scheduler?error=forbidden-settings"
    );
  }

  const enabled =
    formData.get(
      "scheduler_enabled"
    ) === "on";

  const publicBaseUrl =
    String(
      formData.get(
        "public_base_url"
      ) ?? ""
    )
      .trim()
      .replace(
        /\/+$/,
        ""
      );

  const intervalMinutes =
    Number(
      formData.get(
        "interval_minutes"
      ) ?? "1"
    );

  const batchSize =
    Number(
      formData.get(
        "batch_size"
      ) ?? "5"
    );

  const retryMinutes =
    Number(
      formData.get(
        "retry_minutes"
      ) ?? "15"
    );

  const maxAttempts =
    Number(
      formData.get(
        "max_attempts"
      ) ?? "5"
    );

  if (
    enabled &&
    !publicBaseUrl
  ) {
    redirect(
      "/protected/scheduler?error=url-required"
    );
  }

  if (
    publicBaseUrl &&
    !publicBaseUrl
      .toLowerCase()
      .startsWith(
        "https://"
      )
  ) {
    redirect(
      "/protected/scheduler?error=https"
    );
  }

  if (
    ![
      1,
      5,
      10,
      15,
    ].includes(
      intervalMinutes
    )
  ) {
    redirect(
      "/protected/scheduler?error=interval"
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
      "/protected/scheduler?error=batch"
    );
  }

  if (
    !Number.isInteger(
      retryMinutes
    ) ||
    retryMinutes < 1 ||
    retryMinutes > 1440
  ) {
    redirect(
      "/protected/scheduler?error=retry"
    );
  }

  if (
    !Number.isInteger(
      maxAttempts
    ) ||
    maxAttempts < 1 ||
    maxAttempts > 20
  ) {
    redirect(
      "/protected/scheduler?error=attempts"
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "automation_settings"
    )
    .update({
      scheduler_enabled:
        enabled,
      public_base_url:
        publicBaseUrl ||
        null,
      interval_minutes:
        intervalMinutes,
      batch_size:
        batchSize,
      retry_minutes:
        retryMinutes,
      max_attempts:
        maxAttempts,
      last_dispatch_error:
        null,
      updated_by:
        userId,
    })
    .eq(
      "id",
      1
    );

  if (error) {
    console.error(
      "Error guardando scheduler:",
      error
    );

    redirect(
      "/protected/scheduler?error=save"
    );
  }

  revalidatePath(
    "/protected/scheduler"
  );

  redirect(
    "/protected/scheduler?notice=settings-saved"
  );
}

export async function runSchedulerNow() {
  const {
    userId,
    canPublish,
  } =
    await getActor();

  if (!canPublish) {
    redirect(
      "/protected/scheduler?error=forbidden-run"
    );
  }

  let result:
    Awaited<
      ReturnType<
        typeof processScheduledBatch
      >
    >;

  try {
    result =
      await processScheduledBatch({
        source:
          "manual",
        actorUserId:
          userId,
      });
  } catch (
    runError
  ) {
    console.error(
      "Error ejecutando scheduler manual:",
      runError
    );

    redirect(
      "/protected/scheduler?error=manual-run"
    );
  }

  revalidatePath(
    "/protected/scheduler"
  );

  revalidatePath(
    "/protected/publications"
  );

  const query =
    new URLSearchParams();

  query.set(
    "notice",
    "manual-run"
  );

  query.set(
    "claimed",
    String(
      result.claimedCount
    )
  );

  query.set(
    "published",
    String(
      result.publishedCount
    )
  );

  query.set(
    "failed",
    String(
      result.failedCount +
      result.partialCount
    )
  );

  redirect(
    `/protected/scheduler?${query.toString()}`
  );
}

export async function resetExhaustedRetries() {
  const {
    userId,
    canManagePublications,
    canPublish,
  } =
    await getActor();

  if (
    !canManagePublications ||
    !canPublish
  ) {
    redirect(
      "/protected/scheduler?error=forbidden-reset"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: settings,
  } = await admin
    .from(
      "automation_settings"
    )
    .select(
      "max_attempts"
    )
    .eq(
      "id",
      1
    )
    .maybeSingle();

  const maxAttempts =
    settings?.max_attempts ??
    5;

  const {
    error,
  } = await admin
    .from(
      "publications"
    )
    .update({
      scheduler_attempt_count:
        0,
      scheduler_claimed_at:
        null,
      scheduler_claim_token:
        null,
      next_retry_at:
        new Date().toISOString(),
      last_scheduler_error:
        null,
    })
    .eq(
      "status",
      "scheduled"
    )
    .gte(
      "scheduler_attempt_count",
      maxAttempts
    )
    .in(
      "delivery_status",
      [
        "failed",
        "partial",
      ]
    );

  if (error) {
    console.error(
      "Error reactivando reintentos:",
      error
    );

    redirect(
      "/protected/scheduler?error=reset"
    );
  }

  await admin
    .from(
      "scheduler_runs"
    )
    .insert({
      source:
        "manual",
      actor_user_id:
        userId,
      status:
        "completed",
      claimed_count:
        0,
      published_count:
        0,
      partial_count:
        0,
      failed_count:
        0,
      skipped_count:
        0,
      error_message:
        "Reintentos agotados reactivados manualmente.",
      finished_at:
        new Date().toISOString(),
    });

  revalidatePath(
    "/protected/scheduler"
  );

  redirect(
    "/protected/scheduler?notice=retries-reset"
  );
}