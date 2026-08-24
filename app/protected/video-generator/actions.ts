"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedPlatforms = [
  "linkedin",
  "facebook",
  "both",
];

const allowedAspectRatios = [
  "landscape",
  "portrait",
  "square",
];

function videoError(
  code: string,
  briefId?: string
): never {
  const query =
    new URLSearchParams();

  query.set(
    "error",
    code
  );

  if (briefId) {
    query.set(
      "brief",
      briefId
    );
  }

  redirect(
    `/protected/video-generator?${query.toString()}`
  );
}

async function getActor() {
  const supabase =
    await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: canUseAI } =
    await supabase.rpc(
      "has_permission",
      {
        p_permission:
          "ai.use",
      }
    );

  if (!canUseAI) {
    redirect("/protected");
  }

  return {
    supabase,
    userId,
  };
}

export async function saveVideoBrief(
  formData: FormData
) {
  const {
    supabase,
    userId,
  } = await getActor();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const prompt = String(
    formData.get("prompt") ?? ""
  ).trim();

  const sourceImageAssetId =
    String(
      formData.get(
        "source_image_asset_id"
      ) ?? ""
    ).trim();

  const platform = String(
    formData.get("platform") ??
      "linkedin"
  );

  const aspectRatio = String(
    formData.get("aspect_ratio") ??
      "landscape"
  );

  const durationText = String(
    formData.get(
      "desired_duration_seconds"
    ) ?? ""
  ).trim();

  const visualStyle = String(
    formData.get("visual_style") ??
      ""
  ).trim();

  const cameraMotion = String(
    formData.get("camera_motion") ??
      ""
  ).trim();

  const sceneInstructions = String(
    formData.get(
      "scene_instructions"
    ) ?? ""
  ).trim();

  const audioInstructions = String(
    formData.get(
      "audio_instructions"
    ) ?? ""
  ).trim();

  const negativeInstructions = String(
    formData.get(
      "negative_instructions"
    ) ?? ""
  ).trim();

  if (!title) {
    videoError("title");
  }

  if (prompt.length < 8) {
    videoError("prompt");
  }

  if (
    !allowedPlatforms.includes(
      platform
    )
  ) {
    videoError("platform");
  }

  if (
    !allowedAspectRatios.includes(
      aspectRatio
    )
  ) {
    videoError("aspect");
  }

  let desiredDuration:
    | number
    | null = null;

  if (durationText) {
    const parsed =
      Number(
        durationText
      );

    if (
      !Number.isInteger(
        parsed
      ) ||
      parsed < 1 ||
      parsed > 120
    ) {
      videoError(
        "duration"
      );
    }

    desiredDuration =
      parsed;
  }

  if (sourceImageAssetId) {
    const {
      data: imageAsset,
    } = await supabase
      .from("media_assets")
      .select(
        "id, user_id, asset_type"
      )
      .eq(
        "id",
        sourceImageAssetId
      )
      .maybeSingle();

    if (
      !imageAsset ||
      imageAsset.user_id !==
        userId ||
      imageAsset.asset_type !==
        "image"
    ) {
      videoError(
        "source-image"
      );
    }
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "ai_video_briefs"
    )
    .insert({
      user_id:
        userId,
      title,
      prompt,
      source_image_asset_id:
        sourceImageAssetId ||
        null,
      platform,
      aspect_ratio:
        aspectRatio,
      desired_duration_seconds:
        desiredDuration,
      visual_style:
        visualStyle ||
        null,
      camera_motion:
        cameraMotion ||
        null,
      scene_instructions:
        sceneInstructions ||
        null,
      audio_instructions:
        audioInstructions ||
        null,
      negative_instructions:
        negativeInstructions ||
        null,
      provider_key:
        "video_ai",
      status:
        "prepared",
    })
    .select("id")
    .single();

  if (
    error ||
    !data?.id
  ) {
    console.error(
      "Error guardando brief de video:",
      error
    );

    videoError(
      "brief-save"
    );
  }

  revalidatePath(
    "/protected/video-generator"
  );

  redirect(
    `/protected/video-generator?brief=${encodeURIComponent(
      data.id
    )}&notice=brief-saved`
  );
}

export async function deleteVideoBrief(
  briefId: string,
  _formData: FormData
) {
  const {
    supabase,
  } = await getActor();

  const {
    data: brief,
  } = await supabase
    .from(
      "ai_video_briefs"
    )
    .select(
      "generated_asset_id"
    )
    .eq(
      "id",
      briefId
    )
    .maybeSingle();

  if (
    brief?.generated_asset_id
  ) {
    videoError(
      "brief-has-video",
      briefId
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "ai_video_briefs"
    )
    .delete()
    .eq(
      "id",
      briefId
    );

  if (error) {
    videoError(
      "brief-delete",
      briefId
    );
  }

  revalidatePath(
    "/protected/video-generator"
  );

  redirect(
    "/protected/video-generator?notice=brief-deleted"
  );
}

export async function deleteVideoAsset(
  assetId: string,
  _formData: FormData
) {
  const {
    supabase,
    userId,
  } = await getActor();

  const {
    data: asset,
    error: assetReadError,
  } = await supabase
    .from(
      "media_assets"
    )
    .select(
      "id, user_id, asset_type, storage_bucket, storage_path"
    )
    .eq(
      "id",
      assetId
    )
    .maybeSingle();

  if (
    assetReadError ||
    !asset ||
    asset.user_id !==
      userId ||
    asset.asset_type !==
      "video"
  ) {
    videoError(
      "asset-not-found"
    );
  }

  const admin =
    createAdminClient();

  const {
    error: storageDeleteError,
  } =
    await admin.storage
      .from(
        asset.storage_bucket
      )
      .remove([
        asset.storage_path,
      ]);

  if (storageDeleteError) {
    console.error(
      "Error eliminando video de Storage:",
      storageDeleteError
    );

    videoError(
      "asset-storage-delete"
    );
  }

  const {
    error: databaseDeleteError,
  } = await supabase
    .from(
      "media_assets"
    )
    .delete()
    .eq(
      "id",
      assetId
    );

  if (databaseDeleteError) {
    console.error(
      "Error eliminando metadatos de video:",
      databaseDeleteError
    );

    videoError(
      "asset-database-delete"
    );
  }

  revalidatePath(
    "/protected/video-generator"
  );

  redirect(
    "/protected/video-generator?notice=video-deleted"
  );
}