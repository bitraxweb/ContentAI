"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createContent(formData: FormData) {
  const supabase = await createClient();

  const { data, error: authError } =
    await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (authError || !userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_active) {
    redirect("/pending");
  }

  if (!["editor", "admin", "super_admin"].includes(profile.role)) {
    redirect("/protected/library");
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const contentType = String(
    formData.get("content_type") ?? "post"
  );

  const platform = String(
    formData.get("platform") ?? "linkedin"
  );

  const objective = String(
    formData.get("objective") ?? ""
  ).trim();

  const targetAudience = String(
    formData.get("target_audience") ?? ""
  ).trim();

  const tone = String(
    formData.get("tone") ?? ""
  ).trim();

  const contentLength = String(
    formData.get("content_length") ?? ""
  ).trim();

  const hashtags = String(
    formData.get("hashtags") ?? ""
  ).trim();

  const callToAction = String(
    formData.get("call_to_action") ?? ""
  ).trim();

  const useEmojis =
    formData.get("use_emojis") === "on";

  const useHashtags =
    formData.get("use_hashtags") === "on";

  if (!title) {
    throw new Error("El título es obligatorio.");
  }

  if (!body) {
    throw new Error("El contenido es obligatorio.");
  }

  const { error } = await supabase
    .from("contents")
    .insert({
      user_id: userId,
      title,
      body,
      content_type: contentType,
      platform,
      objective,
      target_audience: targetAudience,
      tone,
      content_length: contentLength,
      use_emojis: useEmojis,
      use_hashtags: useHashtags,
      hashtags,
      call_to_action: callToAction,
      status: "draft",
      generated_by_ai: false,
    });

  if (error) {
    console.error("Error creando contenido:", error);

    throw new Error(
      `No se pudo guardar el contenido: ${error.message}`
    );
  }

  redirect("/protected");
}