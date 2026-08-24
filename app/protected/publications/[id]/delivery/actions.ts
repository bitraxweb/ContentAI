"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getSocialAccessToken,
  loadPublicationImage,
  publishToProvider,
} from "@/lib/social/publisher";

type PublicationRow = {
  id: string;
  platform: string;
  status: string;
  content_id: string;
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
  publication_id: string;
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

function deliveryError(
  publicationId: string,
  code: string
): never {
  redirect(
    `/protected/publications/${encodeURIComponent(
      publicationId
    )}/delivery?error=${encodeURIComponent(
      code
    )}`
  );
}

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
    manageResult,
    publishResult,
    mediaResult,
  ] = await Promise.all([
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

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.view",
      }
    ),
  ]);

  return {
    supabase,
    userId,
    canManage:
      Boolean(
        manageResult.data
      ),
    canPublish:
      Boolean(
        publishResult.data
      ),
    canViewMedia:
      Boolean(
        mediaResult.data
      ),
  };
}

export async function savePublicationTargets(
  publicationId: string,
  formData: FormData
) {
  const {
    supabase,
    userId,
    canManage,
    canViewMedia,
  } =
    await getActor();

  if (!canManage) {
    deliveryError(
      publicationId,
      "forbidden-manage"
    );
  }

  const {
    data: publication,
  } = await supabase
    .from("publications")
    .select(
      "id, platform, status"
    )
    .eq(
      "id",
      publicationId
    )
    .maybeSingle();

  if (!publication) {
    deliveryError(
      publicationId,
      "not-found"
    );
  }

  if (
    publication.status ===
    "published"
  ) {
    deliveryError(
      publicationId,
      "already-published"
    );
  }

  const selectedIds =
    formData
      .getAll(
        "connection_ids"
      )
      .map(
        (
          value
        ) =>
          String(
            value
          ).trim()
      )
      .filter(
        Boolean
      );

  const uniqueIds =
    Array.from(
      new Set(
        selectedIds
      )
    );

  let selectedConnections:
    ConnectionRow[] = [];

  if (
    uniqueIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "social_connections"
      )
      .select(
        "id, platform, connection_type, external_account_id, account_name, status, scopes"
      )
      .in(
        "id",
        uniqueIds
      )
      .eq(
        "status",
        "connected"
      );

    if (error) {
      deliveryError(
        publicationId,
        "connections"
      );
    }

    selectedConnections =
      (data as
        | ConnectionRow[]
        | null) ??
      [];
  }

  if (
    selectedConnections.length !==
    uniqueIds.length
  ) {
    deliveryError(
      publicationId,
      "connections"
    );
  }

  for (
    const connection
    of selectedConnections
  ) {
    if (
      publication.platform !==
        "both" &&
      publication.platform !==
        connection.platform
    ) {
      deliveryError(
        publicationId,
        "platform"
      );
    }
  }

  const {
    data: currentTargets,
  } = await supabase
    .from(
      "publication_targets"
    )
    .select(
      "id, social_connection_id, status"
    )
    .eq(
      "publication_id",
      publicationId
    );

  const current =
    (currentTargets as
      | {
          id: string;
          social_connection_id: string;
          status: string;
        }[]
      | null) ??
    [];

  const removableIds =
    current
      .filter(
        (
          item
        ) =>
          item.status !==
            "published" &&
          !uniqueIds.includes(
            item.social_connection_id
          )
      )
      .map(
        (
          item
        ) =>
          item.id
      );

  if (
    removableIds.length >
    0
  ) {
    const {
      error: deleteError,
    } = await supabase
      .from(
        "publication_targets"
      )
      .delete()
      .in(
        "id",
        removableIds
      );

    if (deleteError) {
      deliveryError(
        publicationId,
        "targets-save"
      );
    }
  }

  for (
    const connection
    of selectedConnections
  ) {
    const mediaField =
      `media_${connection.id}`;

    const mediaAssetId =
      canViewMedia
        ? String(
            formData.get(
              mediaField
            ) ?? ""
          ).trim()
        : "";

    if (mediaAssetId) {
      const {
        data: mediaAsset,
      } = await supabase
        .from(
          "media_assets"
        )
        .select(
          "id, asset_type"
        )
        .eq(
          "id",
          mediaAssetId
        )
        .eq(
          "asset_type",
          "image"
        )
        .maybeSingle();

      if (!mediaAsset) {
        deliveryError(
          publicationId,
          "media"
        );
      }
    }

    const existing =
      current.find(
        (
          item
        ) =>
          item.social_connection_id ===
          connection.id
      );

    if (
      existing?.status ===
      "published"
    ) {
      continue;
    }

    const {
      error: upsertError,
    } = await supabase
      .from(
        "publication_targets"
      )
      .upsert(
        {
          publication_id:
            publicationId,
          social_connection_id:
            connection.id,
          platform:
            connection.platform,
          media_asset_id:
            mediaAssetId ||
            null,
          status:
            "ready",
          last_error:
            null,
          created_by:
            userId,
        },
        {
          onConflict:
            "publication_id,social_connection_id",
        }
      );

    if (upsertError) {
      console.error(
        "Error guardando destino:",
        upsertError
      );

      deliveryError(
        publicationId,
        "targets-save"
      );
    }
  }

  const {
    count,
  } = await supabase
    .from(
      "publication_targets"
    )
    .select(
      "id",
      {
        count:
          "exact",
        head:
          true,
      }
    )
    .eq(
      "publication_id",
      publicationId
    )
    .neq(
      "status",
      "cancelled"
    );

  await supabase
    .from(
      "publications"
    )
    .update({
      delivery_status:
        (count ?? 0) >
        0
          ? "ready"
          : "not_ready",
      last_delivery_error:
        null,
    })
    .eq(
      "id",
      publicationId
    );

  revalidatePath(
    `/protected/publications/${publicationId}`
  );

  revalidatePath(
    `/protected/publications/${publicationId}/delivery`
  );

  redirect(
    `/protected/publications/${encodeURIComponent(
      publicationId
    )}/delivery?saved=1`
  );
}

export async function publishPublicationNow(
  publicationId: string,
  _formData: FormData
) {
  const {
    supabase,
    userId,
    canPublish,
  } =
    await getActor();

  if (!canPublish) {
    deliveryError(
      publicationId,
      "forbidden-publish"
    );
  }

  const {
    data: publicationData,
    error:
      publicationError,
  } = await supabase
    .from(
      "publications"
    )
    .select(
      "id, platform, status, content_id, hashtags, call_to_action, external_url, contents(body)"
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
    deliveryError(
      publicationId,
      "not-found"
    );
  }

  if (
    publication.status !==
    "approved"
  ) {
    deliveryError(
      publicationId,
      publication.status ===
        "scheduled"
        ? "scheduled"
        : "not-approved"
    );
  }

  const message =
    buildMessage(
      publication
    );

  if (!message) {
    deliveryError(
      publicationId,
      "empty-message"
    );
  }

  const {
    data: targetData,
    error:
      targetError,
  } = await supabase
    .from(
      "publication_targets"
    )
    .select(
      "id, publication_id, social_connection_id, platform, media_asset_id, status, attempt_count, social_connections(id, platform, connection_type, external_account_id, account_name, status, scopes)"
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
    deliveryError(
      publicationId,
      "targets"
    );
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
    deliveryError(
      publicationId,
      "no-targets"
    );
  }

  const {
    error: publishingStateError,
  } = await supabase.rpc(
    "set_publication_delivery_state",
    {
      p_publication_id:
        publicationId,
      p_delivery_status:
        "publishing",
      p_last_error:
        null,
      p_mark_published:
        false,
      p_social_post_id:
        null,
      p_external_url:
        null,
    }
  );

  if (publishingStateError) {
    console.error(
      "No se pudo iniciar el estado de entrega:",
      publishingStateError
    );

    deliveryError(
      publicationId,
      "delivery-state"
    );
  }

  const admin =
    createAdminClient();

  let successCount =
    0;

  let failureCount =
    0;

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

    if (!connection) {
      failureCount +=
        1;

      failureMessages.push(
        `${target.platform}: conexion no encontrada`
      );

      await supabase
        .from(
          "publication_targets"
        )
        .update({
          status:
            "failed",
          attempt_count:
            target.attempt_count +
            1,
          last_attempt_at:
            new Date().toISOString(),
          last_error:
            "Conexion social no encontrada.",
        })
        .eq(
          "id",
          target.id
        );

      continue;
    }

    const attemptNumber =
      target.attempt_count +
      1;

    await supabase
      .from(
        "publication_targets"
      )
      .update({
        status:
          "publishing",
        attempt_count:
          attemptNumber,
        last_attempt_at:
          new Date().toISOString(),
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
          userId,
        platform:
          target.platform,
        result:
          "started",
        metadata: {
          attempt:
            attemptNumber,
          media:
            Boolean(
              target.media_asset_id
            ),
        },
      });

    const accessToken =
      await getSocialAccessToken(
        connection.id
      );

    if (!accessToken) {
      failureCount +=
        1;

      const errorMessage =
        "No se pudo leer el access token protegido.";

      failureMessages.push(
        `${target.platform}: ${errorMessage}`
      );

      await supabase
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
            userId,
          platform:
            target.platform,
          result:
            "failed",
          provider_error_code:
            "token",
          provider_error_message:
            errorMessage,
          metadata: {
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
        failureCount +=
          1;

        const errorMessage =
          mediaError instanceof
          Error
            ? mediaError.message
            : "No se pudo leer la imagen.";

        failureMessages.push(
          `${target.platform}: ${errorMessage}`
        );

        await supabase
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
              userId,
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
      successCount +=
        1;

      const now =
        new Date().toISOString();

      await supabase
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
            now,
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
            userId,
          platform:
            target.platform,
          result:
            "success",
          provider_http_status:
            result.httpStatus,
          external_post_id:
            result.externalPostId,
          metadata: {
            attempt:
              attemptNumber,
            ...result.metadata,
          },
        });
    }
    else {
      failureCount +=
        1;

      const errorMessage =
        result.errorMessage ||
        "El proveedor rechazo la publicacion.";

      failureMessages.push(
        `${target.platform}: ${errorMessage}`
      );

      await supabase
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
            userId,
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
            attempt:
              attemptNumber,
            ...result.metadata,
          },
        });
    }
  }

  const {
    data: finalTargetsData,
  } = await supabase
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
    const singlePostId =
      finalTargets.length ===
        1
        ? firstTarget?.external_post_id ||
          null
        : null;

    const singleExternalUrl =
      finalTargets.length ===
        1
        ? firstTarget?.external_url ||
          publication.external_url ||
          null
        : publication.external_url ||
          null;

    const {
      error: finalStateError,
    } = await supabase.rpc(
      "set_publication_delivery_state",
      {
        p_publication_id:
          publicationId,
        p_delivery_status:
          "published",
        p_last_error:
          null,
        p_mark_published:
          true,
        p_social_post_id:
          singlePostId,
        p_external_url:
          singleExternalUrl,
      }
    );

    if (finalStateError) {
      console.error(
        "No se pudo cerrar la publicacion como publicada:",
        finalStateError
      );

      deliveryError(
        publicationId,
        "delivery-state"
      );
    }
  }
  else if (
    anyPublished
  ) {
    const {
      error: partialStateError,
    } = await supabase.rpc(
      "set_publication_delivery_state",
      {
        p_publication_id:
          publicationId,
        p_delivery_status:
          "partial",
        p_last_error:
          failureMessages
            .join(" | ")
            .slice(
              0,
              1000
            ),
        p_mark_published:
          false,
        p_social_post_id:
          null,
        p_external_url:
          null,
      }
    );

    if (partialStateError) {
      console.error(
        "No se pudo guardar el estado parcial:",
        partialStateError
      );
    }
  }
  else {
    const {
      error: failedStateError,
    } = await supabase.rpc(
      "set_publication_delivery_state",
      {
        p_publication_id:
          publicationId,
        p_delivery_status:
          "failed",
        p_last_error:
          failureMessages
            .join(" | ")
            .slice(
              0,
              1000
            ),
        p_mark_published:
          false,
        p_social_post_id:
          null,
        p_external_url:
          null,
      }
    );

    if (failedStateError) {
      console.error(
        "No se pudo guardar el estado fallido:",
        failedStateError
      );
    }
  }

  revalidatePath(
    "/protected/publications"
  );

  revalidatePath(
    `/protected/publications/${publicationId}`
  );

  revalidatePath(
    `/protected/publications/${publicationId}/delivery`
  );

  if (
    allPublished
  ) {
    redirect(
      `/protected/publications/${encodeURIComponent(
        publicationId
      )}/delivery?notice=published`
    );
  }

  if (
    successCount >
      0 &&
    failureCount >
      0
  ) {
    redirect(
      `/protected/publications/${encodeURIComponent(
        publicationId
      )}/delivery?notice=partial`
    );
  }

  redirect(
    `/protected/publications/${encodeURIComponent(
      publicationId
    )}/delivery?error=publish-failed`
  );
}