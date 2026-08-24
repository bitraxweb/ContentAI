"use server";

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

function goToError(code: string): never {
  redirect(
    `/protected/publications/create?error=${encodeURIComponent(
      code
    )}`
  );
}

export async function createPublication(
  formData: FormData
) {
  const supabase = await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

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
    goToError("forbidden");
  }

  const contentId = String(
    formData.get("content_id") ?? ""
  );

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

  if (!contentId) {
    goToError("content");
  }

  if (!allowedPlatforms.includes(platform)) {
    goToError("platform");
  }

  if (!allowedStatuses.includes(status)) {
    goToError("status");
  }

  if (
    status === "published" &&
    !canPublishResult.data
  ) {
    goToError("publish");
  }

  if (
    status === "scheduled" &&
    !publicationDate
  ) {
    goToError("schedule");
  }

  const { data: content } = await supabase
    .from("contents")
    .select("id")
    .eq("id", contentId)
    .maybeSingle();

  if (!content) {
    goToError("content");
  }

  const { error } = await supabase
    .from("publications")
    .insert({
      content_id: contentId,
      created_by: userId,
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
          ? new Date().toISOString()
          : null,
    });

  if (error) {
    console.error(
      "Error creando publicación:",
      error
    );

    goToError("database");
  }

  redirect(
    "/protected/publications?created=1"
  );
}