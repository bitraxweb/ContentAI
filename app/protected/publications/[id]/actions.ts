"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedPlatforms = [
  "linkedin",
  "facebook",
  "both",
];

const allowedStatuses = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "cancelled",
];

function goToDetailError(
  publicationId: string,
  code: string
): never {
  redirect(
    `/protected/publications/${publicationId}?error=${encodeURIComponent(
      code
    )}`
  );
}

export async function updatePublication(
  publicationId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const [
    canManageResult,
    canPublishResult,
  ] = await Promise.all([
    supabase.rpc("has_permission", {
      p_permission: "publication.manage",
    }),

    supabase.rpc("has_permission", {
      p_permission: "publication.publish",
    }),
  ]);

  if (!canManageResult.data) {
    goToDetailError(
      publicationId,
      "forbidden"
    );
  }

  const platform = String(
    formData.get("platform") ?? "linkedin"
  );

  const status = String(
    formData.get("status") ?? "draft"
  );

  const publicationDate = String(
    formData.get("publication_date") ?? ""
  );

  const publicationTime = String(
    formData.get("publication_time") ?? ""
  );

  const internalNotes = String(
    formData.get("internal_notes") ?? ""
  ).trim();

  const hashtags = String(
    formData.get("hashtags") ?? ""
  ).trim();

  const callToAction = String(
    formData.get("call_to_action") ?? ""
  ).trim();

  const externalUrl = String(
    formData.get("external_url") ?? ""
  ).trim();

  if (!allowedPlatforms.includes(platform)) {
    goToDetailError(
      publicationId,
      "platform"
    );
  }

  if (!allowedStatuses.includes(status)) {
    goToDetailError(
      publicationId,
      "status"
    );
  }

  if (
    status === "published" &&
    !canPublishResult.data
  ) {
    goToDetailError(
      publicationId,
      "publish"
    );
  }

  if (
    status === "scheduled" &&
    !publicationDate
  ) {
    goToDetailError(
      publicationId,
      "schedule"
    );
  }

  const { data: current } = await supabase
    .from("publications")
    .select("status, published_at")
    .eq("id", publicationId)
    .maybeSingle();

  if (!current) {
    goToDetailError(
      publicationId,
      "not-found"
    );
  }

  if (
    current.status === "published" &&
    status !== "published" &&
    !canPublishResult.data
  ) {
    goToDetailError(
      publicationId,
      "publish"
    );
  }

  const { error } = await supabase
    .from("publications")
    .update({
      platform,
      status,
      publication_date:
        publicationDate || null,
      publication_time:
        publicationTime || null,
      internal_notes: internalNotes,
      hashtags,
      call_to_action: callToAction,
      external_url: externalUrl,
      published_at:
        status === "published"
          ? current.published_at ??
            new Date().toISOString()
          : current.published_at,
    })
    .eq("id", publicationId);

  if (error) {
    console.error(
      "Error actualizando publicación:",
      error
    );

    goToDetailError(
      publicationId,
      "database"
    );
  }

  revalidatePath(
    "/protected/publications"
  );

  revalidatePath(
    `/protected/publications/${publicationId}`
  );

  redirect(
    `/protected/publications/${publicationId}?saved=1`
  );
}

export async function deletePublication(
  publicationId: string,
  _formData: FormData
) {
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "publication.manage",
    }
  );

  if (!canManage) {
    goToDetailError(
      publicationId,
      "forbidden"
    );
  }

  const { error } = await supabase
    .from("publications")
    .delete()
    .eq("id", publicationId);

  if (error) {
    console.error(
      "Error eliminando publicación:",
      error
    );

    goToDetailError(
      publicationId,
      "delete"
    );
  }

  revalidatePath(
    "/protected/publications"
  );

  redirect(
    "/protected/publications?deleted=1"
  );
}