"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/auth/login");
  }

  return { supabase, userId };
}

export async function updateContent(
  id: string,
  formData: FormData
) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const platform = String(formData.get("platform") ?? "linkedin");
  const contentType = String(formData.get("content_type") ?? "post");
  const objective = String(formData.get("objective") ?? "").trim();
  const targetAudience = String(
    formData.get("target_audience") ?? ""
  ).trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const contentLength = String(
    formData.get("content_length") ?? ""
  ).trim();
  const hashtags = String(formData.get("hashtags") ?? "").trim();
  const callToAction = String(
    formData.get("call_to_action") ?? ""
  ).trim();
  const status = String(formData.get("status") ?? "draft");

  const useEmojis = formData.get("use_emojis") === "on";
  const useHashtags = formData.get("use_hashtags") === "on";

  if (!title) {
    throw new Error("El titulo es obligatorio.");
  }

  if (!body) {
    throw new Error("El contenido es obligatorio.");
  }

  const { error } = await supabase
    .from("contents")
    .update({
      title,
      body,
      platform,
      content_type: contentType,
      objective,
      target_audience: targetAudience,
      tone,
      content_length: contentLength,
      hashtags,
      call_to_action: callToAction,
      status,
      use_emojis: useEmojis,
      use_hashtags: useHashtags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error actualizando contenido:", error);
    throw new Error(
      `No se pudo actualizar el contenido: ${error.message}`
    );
  }

  revalidatePath("/protected");
  revalidatePath("/protected/library");
  revalidatePath(`/protected/library/${id}`);

  redirect(`/protected/library/${id}?saved=1`);
}

export async function deleteContent(
  id: string,
  _formData: FormData
) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("contents")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error eliminando contenido:", error);
    throw new Error(
      `No se pudo eliminar el contenido: ${error.message}`
    );
  }

  revalidatePath("/protected");
  revalidatePath("/protected/library");

  redirect("/protected/library?deleted=1");
}