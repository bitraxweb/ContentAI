import { createAdminClient } from "@/lib/supabase/admin";

import {
  getSocialAccessToken,
  loadPublicationImage,
  publishToProvider,
} from "@/lib/social/publisher";

type SchedulerSource =
  | "cron"
  | "manual";

type ClaimRow = {
  publication_id: string;
  claim_token: string;
};

type PublicationRow = {
  id: string;
  status: string;
  platform: string;
  hashtags: string | null;
  call_to_action: string | null;
  external_url: string | null;
  contents:
    | {
        body: string | null;
      }
    | {
        body: string | null;
      }[]
    | null;
};

type ConnectionRow = {
  id: string;
  platform:
    | "linkedin"
    | "facebook";
  connection_type:
    | "member"
    | "organization"
    | "page";
  external_account_id: string;
  account_name: string | null;
  status: string;
  scopes: string[];
};

type TargetRow = {
  id: string;
  social_connection_id: string;
  platform:
    | "linkedin"
    | "facebook";
  media_asset_id: string | null;
  status: string;
  attempt_count: number;
  social_connections:
    | ConnectionRow
    | ConnectionRow[]
    | null;
};

type PublicationOutcome =
  | "published"
  | "partial"
  | "failed"
  | "skipped";

type PublishOneResult = {
  outcome:
    PublicationOutcome;
  error:
    | string
    | null;
};

export type SchedulerBatchResult = {
  runId:
    | string
    | null;
  source:
    SchedulerSource;
  claimedCount: number;
  publishedCount: number;
  partialCount: number;
  failedCount: number;
  skippedCount: number;
  disabled: boolean;
};

function getContent(
  value:
    PublicationRow["contents"]
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ??
        null
    : value;
}

function getConnection(
  value:
    TargetRow["social_connections"]
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ??
        null
    : value;
}

function buildMessage(
  publication:
    PublicationRow
) {
  const content =
    getContent(
      publication.contents
    );

  const parts: string[] = [];

  const body =
    content?.body?.trim();

  if (body) {
    parts.push(body);
  }

  const cta =
    publication
      .call_to_action
      ?.trim();

  if (cta) {
    parts.push(cta);
  }

  const hashtags =
    publication
      .hashtags
      ?.trim();

  if (hashtags) {
    parts.push(
      hashtags
    );
  }

  const externalUrl =
    publication
      .external_url
      ?.trim();

  if (externalUrl) {
    parts.push(
      externalUrl
    );
  }

  return parts
    .join("\n\n")
    .trim();
}

async function publishClaimedPublication({
  publicationId,
  actorUserId,
}: {
  publicationId: string;
  actorUserId:
    | string
    | null;
}): Promise<PublishOneResult> {
  const admin =
    createAdminClient();

  const {
    data: publicationData,
    error: publicationError,
  } = await admin
    .from("publications")
    .select(
      "id, status, platform, hashtags, call_to_action, external_url, contents(body)"
    )
    .eq(
      "id",
      publicationId
    )
    .maybeSingle();

  const publication =
    publicationData as
      | PublicationRow
      | null;

  if (
    publicationError ||
    !publication
  ) {
    return {
      outcome:
        "skipped",
      error:
        "Publicacion no encontrada.",
    };
  }

  if (
    publication.status !==
    "scheduled"
  ) {
    return {
      outcome:
        "skipped",
      error:
        "La publicacion ya no esta Programada.",
    };
  }

  const message =
    buildMessage(
      publication
    );

  if (!message) {
    await admin
      .from("publications")
      .update({
        delivery_status:
          "failed",
        last_delivery_error:
          "No hay texto disponible para publicar.",
      })
      .eq(
        "id",
        publicationId
      );

    return {
      outcome:
        "failed",
      error:
        "No hay texto disponible para publicar.",
    };
  }

  const {
    data: targetData,
    error: targetError,
  } = await admin
    .from(
      "publication_targets"
    )
    .select(
      "id, social_connection_id, platform, media_asset_id, status, attempt_count, social_connections(id, platform, connection_type, external_account_id, account_name, status, scopes)"
    )
    .eq(
      "publication_id",
      publicationId
    )
    .in(
      "status",
      [
        "ready",
        "failed",
      ]
    );

  if (targetError) {
    return {
      outcome:
        "failed",
      error:
        "No se pudieron cargar los destinos.",
    };
  }

  const targets =
    (targetData as
      | TargetRow[]
      | null) ??
    [];

  if (
    targets.length ===
    0
  ) {
    return {
      outcome:
        "skipped",
      error:
        "No hay destinos pendientes.",
    };
  }

  const failureMessages:
    string[] = [];

  for (
    const target
    of targets
  ) {
    const connection =
      getConnection(
        target.social_connections
      );

    const attemptNumber =
      target.attempt_count +
      1;

    const attemptStartedAt =
      new Date().toISOString();

    await admin
      .from(
        "publication_targets"
      )
      .update({
        status:
          "publishing",
        attempt_count:
          attemptNumber,
        last_attempt_at:
          attemptStartedAt,
        last_error:
          null,
      })
      .eq(
        "id",
        target.id
      );

    await admin
      .from(
        "publication_attempts"
      )
      .insert({
        publication_id:
          publicationId,
        target_id:
          target.id,
        actor_user_id:
          actorUserId,
        platform:
          target.platform,
        result:
          "started",
        metadata: {
          source:
            actorUserId
              ? "manual_scheduler"
              : "automatic_scheduler",
          attempt:
            attemptNumber,
          media:
            Boolean(
              target.media_asset_id
            ),
        },
      });

    if (
      !connection ||
      connection.status !==
        "connected"
    ) {
      const errorMessage =
        "La conexion social no esta disponible.";

      failureMessages.push(
        `${target.platform}: ${errorMessage}`
      );

      await admin
        .from(
          "publication_targets"
        )
        .update({
          status:
            "failed",
          last_error:
            errorMessage,
        })
        .eq(
          "id",
          target.id
        );

      await admin
        .from(
          "publication_attempts"
        )
        .insert({
          publication_id:
            publicationId,
          target_id:
            target.id,
          actor_user_id:
            actorUserId,
          platform:
            target.platform,
          result:
            "failed",
          provider_error_code:
            "connection",
          provider_error_message:
            errorMessage,
          metadata: {
            source:
              actorUserId
                ? "manual_scheduler"
                : "automatic_scheduler",
            attempt:
              attemptNumber,
          },
        });

      continue;
    }

    const accessToken =
      await getSocialAccessToken(
        connection.id
      );

    if (!accessToken) {
      const errorMessage =
        "No se pudo leer el access token protegido.";

      failureMessages.push(
        `${target.platform}: ${errorMessage}`
      );

      await admin
        .from(
          "publication_targets"
        )
        .update({
          status:
            "failed",
          last_error:
            errorMessage,
        })
        .eq(
          "id",
          target.id
        );

      await admin
        .from(
          "publication_attempts"
        )
        .insert({
          publication_id:
            publicationId,
          target_id:
            target.id,
          actor_user_id:
            actorUserId,
          platform:
            target.platform,
          result:
            "failed",
          provider_error_code:
            "token",
          provider_error_message:
            errorMessage,
          metadata: {
            source:
              actorUserId
                ? "manual_scheduler"
                : "automatic_scheduler",
            attempt:
              attemptNumber,
          },
        });

      continue;
    }

    let image:
      | Awaited<
          ReturnType<
            typeof loadPublicationImage
          >
        >
      | null = null;

    if (
      target.media_asset_id
    ) {
      try {
        image =
          await loadPublicationImage(
            target.media_asset_id
          );
      } catch (
        mediaError
      ) {
        const errorMessage =
          mediaError instanceof
          Error
            ? mediaError.message
            : "No se pudo leer la imagen.";

        failureMessages.push(
          `${target.platform}: ${errorMessage}`
        );

        await admin
          .from(
            "publication_targets"
          )
          .update({
            status:
              "failed",
            last_error:
              errorMessage.slice(
                0,
                500
              ),
          })
          .eq(
            "id",
            target.id
          );

        await admin
          .from(
            "publication_attempts"
          )
          .insert({
            publication_id:
              publicationId,
            target_id:
              target.id,
            actor_user_id:
              actorUserId,
            platform:
              target.platform,
            result:
              "failed",
            provider_error_code:
              "media",
            provider_error_message:
              errorMessage.slice(
                0,
                500
              ),
            metadata: {
              source:
                actorUserId
                  ? "manual_scheduler"
                  : "automatic_scheduler",
              attempt:
                attemptNumber,
            },
          });

        continue;
      }
    }

    const result =
      await publishToProvider({
        connection,
        accessToken,
        message,
        image,
      });

    if (
      result.success
    ) {
      const publishedAt =
        new Date().toISOString();

      await admin
        .from(
          "publication_targets"
        )
        .update({
          status:
            "published",
          external_post_id:
            result.externalPostId,
          external_url:
            result.externalUrl,
          published_at:
            publishedAt,
          last_error:
            null,
        })
        .eq(
          "id",
          target.id
        );

      await admin
        .from(
          "publication_attempts"
        )
        .insert({
          publication_id:
            publicationId,
          target_id:
            target.id,
          actor_user_id:
            actorUserId,
          platform:
            target.platform,
          result:
            "success",
          provider_http_status:
            result.httpStatus,
          external_post_id:
            result.externalPostId,
          metadata: {
            source:
              actorUserId
                ? "manual_scheduler"
                : "automatic_scheduler",
            attempt:
              attemptNumber,
            ...result.metadata,
          },
        });
    }
    else {
      const errorMessage =
        result.errorMessage ||
        "El proveedor rechazo la publicacion.";

      failureMessages.push(
        `${target.platform}: ${errorMessage}`
      );

      await admin
        .from(
          "publication_targets"
        )
        .update({
          status:
            "failed",
          last_error:
            errorMessage.slice(
              0,
              500
            ),
        })
        .eq(
          "id",
          target.id
        );

      await admin
        .from(
          "publication_attempts"
        )
        .insert({
          publication_id:
            publicationId,
          target_id:
            target.id,
          actor_user_id:
            actorUserId,
          platform:
            target.platform,
          result:
            "failed",
          provider_http_status:
            result.httpStatus,
          provider_error_code:
            result.errorCode,
          provider_error_message:
            errorMessage.slice(
              0,
              500
            ),
          metadata: {
            source:
              actorUserId
                ? "manual_scheduler"
                : "automatic_scheduler",
            attempt:
              attemptNumber,
            ...result.metadata,
          },
        });
    }
  }

  const {
    data: finalTargetsData,
  } = await admin
    .from(
      "publication_targets"
    )
    .select(
      "id, status, external_post_id, external_url"
    )
    .eq(
      "publication_id",
      publicationId
    )
    .neq(
      "status",
      "cancelled"
    );

  const finalTargets =
    finalTargetsData ??
    [];

  const allPublished =
    finalTargets.length >
      0 &&
    finalTargets.every(
      (
        item
      ) =>
        item.status ===
        "published"
    );

  const anyPublished =
    finalTargets.some(
      (
        item
      ) =>
        item.status ===
        "published"
    );

  const firstTarget =
    finalTargets[0] ??
    null;

  if (allPublished) {
    await admin
      .from(
        "publications"
      )
      .update({
        status:
          "published",
        delivery_status:
          "published",
        published_at:
          new Date().toISOString(),
        last_delivery_error:
          null,
        social_post_id:
          finalTargets.length ===
            1
            ? firstTarget?.external_post_id ||
              null
            : null,
      })
      .eq(
        "id",
        publicationId
      );

    return {
      outcome:
        "published",
      error:
        null,
    };
  }

  const combinedError =
    failureMessages
      .join(" | ")
      .slice(
        0,
        1000
      ) ||
    "La entrega no pudo completarse.";

  if (anyPublished) {
    await admin
      .from(
        "publications"
      )
      .update({
        delivery_status:
          "partial",
        last_delivery_error:
          combinedError,
      })
      .eq(
        "id",
        publicationId
      );

    return {
      outcome:
        "partial",
      error:
        combinedError,
    };
  }

  await admin
    .from(
      "publications"
    )
    .update({
      delivery_status:
        "failed",
      last_delivery_error:
        combinedError,
    })
    .eq(
      "id",
      publicationId
    );

  return {
    outcome:
      "failed",
    error:
      combinedError,
  };
}

export async function processScheduledBatch({
  source,
  actorUserId,
}: {
  source:
    SchedulerSource;
  actorUserId:
    | string
    | null;
}): Promise<SchedulerBatchResult> {
  const admin =
    createAdminClient();

  const {
    data: settings,
    error: settingsError,
  } = await admin
    .from(
      "automation_settings"
    )
    .select(
      "scheduler_enabled, batch_size"
    )
    .eq(
      "id",
      1
    )
    .maybeSingle();

  if (
    settingsError ||
    !settings
  ) {
    throw new Error(
      "No se pudo leer la configuracion del programador."
    );
  }

  if (
    source ===
      "cron" &&
    !settings.scheduler_enabled
  ) {
    return {
      runId:
        null,
      source,
      claimedCount:
        0,
      publishedCount:
        0,
      partialCount:
        0,
      failedCount:
        0,
      skippedCount:
        0,
      disabled:
        true,
    };
  }

  const {
    data: runData,
    error: runError,
  } = await admin
    .from(
      "scheduler_runs"
    )
    .insert({
      source,
      actor_user_id:
        actorUserId,
      status:
        "running",
    })
    .select("id")
    .single();

  if (
    runError ||
    !runData?.id
  ) {
    throw new Error(
      "No se pudo iniciar el registro del scheduler."
    );
  }

  const runId =
    String(
      runData.id
    );

  let claimedCount =
    0;

  let publishedCount =
    0;

  let partialCount =
    0;

  let failedCount =
    0;

  let skippedCount =
    0;

  try {
    const {
      data: claimData,
      error: claimError,
    } = await admin.rpc(
      "backend_claim_due_publications",
      {
        p_limit:
          settings.batch_size,
      }
    );

    if (claimError) {
      throw new Error(
        claimError.message
      );
    }

    const claims =
      (claimData as
        | ClaimRow[]
        | null) ??
      [];

    claimedCount =
      claims.length;

    for (
      const claim
      of claims
    ) {
      let result:
        PublishOneResult;

      try {
        result =
          await publishClaimedPublication({
            publicationId:
              claim.publication_id,
            actorUserId,
          });
      } catch (
        publicationError
      ) {
        result = {
          outcome:
            "failed",
          error:
            publicationError instanceof
            Error
              ? publicationError.message
              : "Error inesperado procesando la publicacion.",
        };
      }

      if (
        result.outcome ===
        "published"
      ) {
        publishedCount +=
          1;
      }
      else if (
        result.outcome ===
        "partial"
      ) {
        partialCount +=
          1;
      }
      else if (
        result.outcome ===
        "failed"
      ) {
        failedCount +=
          1;
      }
      else {
        skippedCount +=
          1;
      }

      const {
        error: finishError,
      } = await admin.rpc(
        "backend_finish_scheduler_claim",
        {
          p_publication_id:
            claim.publication_id,
          p_claim_token:
            claim.claim_token,
          p_outcome:
            result.outcome,
          p_error:
            result.error,
        }
      );

      if (finishError) {
        console.error(
          "No se pudo finalizar el claim:",
          finishError
        );
      }
    }

    const runStatus =
      failedCount >
        0 ||
      partialCount >
        0
        ? "completed_with_errors"
        : "completed";

    await admin
      .from(
        "scheduler_runs"
      )
      .update({
        status:
          runStatus,
        claimed_count:
          claimedCount,
        published_count:
          publishedCount,
        partial_count:
          partialCount,
        failed_count:
          failedCount,
        skipped_count:
          skippedCount,
        finished_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        runId
      );

    return {
      runId,
      source,
      claimedCount,
      publishedCount,
      partialCount,
      failedCount,
      skippedCount,
      disabled:
        false,
    };
  } catch (
    batchError
  ) {
    const message =
      batchError instanceof
      Error
        ? batchError.message
        : "Error inesperado del scheduler.";

    await admin
      .from(
        "scheduler_runs"
      )
      .update({
        status:
          "failed",
        claimed_count:
          claimedCount,
        published_count:
          publishedCount,
        partial_count:
          partialCount,
        failed_count:
          failedCount,
        skipped_count:
          skippedCount,
        error_message:
          message.slice(
            0,
            1000
          ),
        finished_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        runId
      );

    throw batchError;
  }
}