"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MEDIA_BUCKET =
  "contentai-media";

const allowedPlatforms = [
  "linkedin",
  "facebook",
  "both",
];

const allowedSizes = [
  "1024x1024",
  "1536x1024",
  "1024x1536",
];

const allowedQualities = [
  "low",
  "medium",
  "high",
];

const allowedFormats = [
  "png",
  "jpeg",
  "webp",
];

type ImageBriefInput = {
  title: string;
  prompt: string;
  platform: string;
  visualStyle: string;
  composition: string;
  brandContext: string;
  negativeInstructions: string;
  imageSize: string;
  imageQuality: string;
  outputFormat: string;
};

type OpenAIImagePayload = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

function imageGeneratorError(
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
    `/protected/image-generator?${query.toString()}`
  );
}

function parseImageBrief(
  formData: FormData
): ImageBriefInput {
  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const prompt = String(
    formData.get("prompt") ?? ""
  ).trim();

  const platform = String(
    formData.get("platform") ??
      "linkedin"
  );

  const visualStyle = String(
    formData.get("visual_style") ??
      ""
  ).trim();

  const composition = String(
    formData.get("composition") ??
      ""
  ).trim();

  const brandContext = String(
    formData.get("brand_context") ??
      ""
  ).trim();

  const negativeInstructions = String(
    formData.get(
      "negative_instructions"
    ) ?? ""
  ).trim();

  const imageSize = String(
    formData.get("image_size") ??
      "1024x1024"
  );

  const imageQuality = String(
    formData.get("image_quality") ??
      "medium"
  );

  const outputFormat = String(
    formData.get("output_format") ??
      "png"
  );

  if (!title) {
    imageGeneratorError(
      "title"
    );
  }

  if (prompt.length < 8) {
    imageGeneratorError(
      "prompt"
    );
  }

  if (
    !allowedPlatforms.includes(
      platform
    )
  ) {
    imageGeneratorError(
      "platform"
    );
  }

  if (
    !allowedSizes.includes(
      imageSize
    )
  ) {
    imageGeneratorError(
      "size"
    );
  }

  if (
    !allowedQualities.includes(
      imageQuality
    )
  ) {
    imageGeneratorError(
      "quality"
    );
  }

  if (
    !allowedFormats.includes(
      outputFormat
    )
  ) {
    imageGeneratorError(
      "format"
    );
  }

  return {
    title,
    prompt,
    platform,
    visualStyle,
    composition,
    brandContext,
    negativeInstructions,
    imageSize,
    imageQuality,
    outputFormat,
  };
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

async function insertImageBrief(
  input: ImageBriefInput
) {
  const {
    supabase,
    userId,
  } = await getActor();

  const {
    data,
    error,
  } = await supabase
    .from(
      "ai_image_briefs"
    )
    .insert({
      user_id:
        userId,
      title:
        input.title,
      prompt:
        input.prompt,
      platform:
        input.platform,
      visual_style:
        input.visualStyle,
      composition:
        input.composition,
      brand_context:
        input.brandContext,
      negative_instructions:
        input.negativeInstructions,
      image_size:
        input.imageSize,
      image_quality:
        input.imageQuality,
      output_format:
        input.outputFormat,
      provider_key:
        "image_ai",
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
      "Error guardando brief de imagen:",
      error
    );

    imageGeneratorError(
      "brief-save"
    );
  }

  return {
    supabase,
    userId,
    briefId:
      data.id as string,
  };
}

function buildImagePrompt(
  input: ImageBriefInput
) {
  const blocks = [
    input.prompt,
  ];

  if (
    input.visualStyle
  ) {
    blocks.push(
      `Visual style: ${input.visualStyle}.`
    );
  }

  if (
    input.composition
  ) {
    blocks.push(
      `Composition: ${input.composition}.`
    );
  }

  if (
    input.brandContext
  ) {
    blocks.push(
      `Brand context: ${input.brandContext}.`
    );
  }

  if (
    input.negativeInstructions
  ) {
    blocks.push(
      `Avoid: ${input.negativeInstructions}.`
    );
  }

  blocks.push(
    `Intended social platform: ${input.platform}.`
  );

  return blocks
    .join("\n\n")
    .trim();
}

async function ensurePrivateMediaBucket() {
  const admin =
    createAdminClient();

  const {
    data: buckets,
    error: listError,
  } =
    await admin.storage.listBuckets();

  if (listError) {
    throw new Error(
      `No se pudieron consultar los buckets: ${listError.message}`
    );
  }

  const exists =
    (buckets ?? []).some(
      (bucket) =>
        bucket.id ===
        MEDIA_BUCKET
    );

  if (!exists) {
    const {
      error: createError,
    } =
      await admin.storage.createBucket(
        MEDIA_BUCKET,
        {
          public:
            false,
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "audio/*",
            "video/*",
          ],
          fileSizeLimit:
            "50MB",
        }
      );

    if (createError) {
      throw new Error(
        `No se pudo crear el bucket privado: ${createError.message}`
      );
    }
  }

  return admin;
}

function mimeForFormat(
  format: string
) {
  if (
    format === "jpeg"
  ) {
    return "image/jpeg";
  }

  if (
    format === "webp"
  ) {
    return "image/webp";
  }

  return "image/png";
}

export async function saveImageBrief(
  formData: FormData
) {
  const input =
    parseImageBrief(
      formData
    );

  const {
    briefId,
  } =
    await insertImageBrief(
      input
    );

  revalidatePath(
    "/protected/image-generator"
  );

  redirect(
    `/protected/image-generator?brief=${encodeURIComponent(
      briefId
    )}&notice=brief-saved`
  );
}

export async function generateAIImage(
  formData: FormData
) {
  const input =
    parseImageBrief(
      formData
    );

  const {
    supabase,
    userId,
    briefId,
  } =
    await insertImageBrief(
      input
    );

  const {
    data: integration,
  } = await supabase
    .from(
      "integration_settings"
    )
    .select(
      "enabled, provider_name, model_name, credential_status"
    )
    .eq(
      "integration_key",
      "image_ai"
    )
    .maybeSingle();

  if (
    !integration ||
    integration.credential_status !==
      "configured"
  ) {
    redirect(
      `/protected/image-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=credentials-missing`
    );
  }

  if (
    !integration.enabled
  ) {
    redirect(
      `/protected/image-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=integration-disabled`
    );
  }

  const model =
    integration.model_name?.trim();

  if (!model) {
    redirect(
      `/protected/image-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=model-missing`
    );
  }

  const providerName =
    integration.provider_name
      ?.trim()
      .toLowerCase() ??
    "";

  const openAICompatible =
    providerName.includes(
      "openai"
    ) ||
    model
      .toLowerCase()
      .startsWith(
        "gpt-image"
      );

  if (
    !openAICompatible
  ) {
    redirect(
      `/protected/image-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=provider-pending`
    );
  }

  if (
    !model
      .toLowerCase()
      .startsWith(
        "gpt-image"
      )
  ) {
    redirect(
      `/protected/image-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=model-unsupported`
    );
  }

  const admin =
    createAdminClient();

  const {
    data: apiKey,
    error: secretError,
  } = await admin.rpc(
    "backend_get_integration_secret",
    {
      p_integration_key:
        "image_ai",
      p_credential_key:
        "api_key",
    }
  );

  if (
    secretError ||
    typeof apiKey !==
      "string" ||
    !apiKey.trim()
  ) {
    console.error(
      "No se pudo leer la credencial de imagen:",
      secretError
    );

    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "No se pudo leer la credencial configurada.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "credential-read",
      briefId
    );
  }

  await supabase
    .from(
      "ai_image_briefs"
    )
    .update({
      status:
        "generating",
      last_error:
        null,
    })
    .eq(
      "id",
      briefId
    );

  let response: Response;

  try {
    response =
      await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method:
            "POST",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              model,
              prompt:
                buildImagePrompt(
                  input
                ),
              n:
                1,
              size:
                input.imageSize,
              quality:
                input.imageQuality,
              output_format:
                input.outputFormat,
            }),
          cache:
            "no-store",
        }
      );
  } catch (requestError) {
    console.error(
      "Error de red llamando al proveedor de imagen:",
      requestError
    );

    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "No se pudo conectar con el proveedor de imagen.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "provider-network",
      briefId
    );
  }

  let payload:
    OpenAIImagePayload;

  try {
    payload =
      await response.json() as OpenAIImagePayload;
  } catch {
    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "El proveedor devolvió una respuesta no válida.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "provider-response",
      briefId
    );
  }

  if (!response.ok) {
    const providerMessage =
      payload.error?.message ||
      `HTTP ${response.status}`;

    console.error(
      "Proveedor de imagen devolvió un error:",
      providerMessage
    );

    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          providerMessage.slice(
            0,
            500
          ),
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "provider-error",
      briefId
    );
  }

  const imageBase64 =
    payload.data?.[0]
      ?.b64_json;

  if (!imageBase64) {
    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "El proveedor no devolvió una imagen utilizable.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "empty-output",
      briefId
    );
  }

  const imageBuffer =
    Buffer.from(
      imageBase64,
      "base64"
    );

  if (
    imageBuffer.length ===
    0
  ) {
    imageGeneratorError(
      "empty-output",
      briefId
    );
  }

  let storageAdmin;

  try {
    storageAdmin =
      await ensurePrivateMediaBucket();
  } catch (storageError) {
    console.error(
      "Error preparando Storage:",
      storageError
    );

    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "No se pudo preparar el almacenamiento privado.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "storage-bucket",
      briefId
    );
  }

  const extension =
    input.outputFormat;

  const storagePath =
    `images/${userId}/${briefId}.${extension}`;

  const mimeType =
    mimeForFormat(
      input.outputFormat
    );

  const {
    error: uploadError,
  } =
    await storageAdmin.storage
      .from(
        MEDIA_BUCKET
      )
      .upload(
        storagePath,
        imageBuffer,
        {
          contentType:
            mimeType,
          cacheControl:
            "3600",
          upsert:
            false,
        }
      );

  if (uploadError) {
    console.error(
      "Error subiendo imagen a Storage:",
      uploadError
    );

    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "La imagen se generó, pero no pudo guardarse en Storage.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "storage-upload",
      briefId
    );
  }

  const {
    data: asset,
    error: assetError,
  } = await supabase
    .from(
      "media_assets"
    )
    .insert({
      user_id:
        userId,
      asset_type:
        "image",
      source:
        "ai",
      title:
        input.title,
      description:
        input.brandContext ||
        null,
      storage_bucket:
        MEDIA_BUCKET,
      storage_path:
        storagePath,
      mime_type:
        mimeType,
      file_size:
        imageBuffer.length,
      provider_key:
        "image_ai",
      model_name:
        model,
      prompt:
        buildImagePrompt(
          input
        ),
      metadata: {
        platform:
          input.platform,
        visual_style:
          input.visualStyle,
        composition:
          input.composition,
        image_size:
          input.imageSize,
        image_quality:
          input.imageQuality,
        output_format:
          input.outputFormat,
      },
    })
    .select("id")
    .single();

  if (
    assetError ||
    !asset?.id
  ) {
    console.error(
      "Error guardando metadatos multimedia:",
      assetError
    );

    await storageAdmin.storage
      .from(
        MEDIA_BUCKET
      )
      .remove([
        storagePath,
      ]);

    await supabase
      .from(
        "ai_image_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "La imagen se generó, pero no se pudieron guardar sus metadatos.",
      })
      .eq(
        "id",
        briefId
      );

    imageGeneratorError(
      "asset-save",
      briefId
    );
  }

  const {
    error: briefUpdateError,
  } = await supabase
    .from(
      "ai_image_briefs"
    )
    .update({
      status:
        "generated",
      generated_asset_id:
        asset.id,
      last_error:
        null,
    })
    .eq(
      "id",
      briefId
    );

  if (briefUpdateError) {
    console.error(
      "Error enlazando imagen con brief:",
      briefUpdateError
    );
  }

  revalidatePath(
    "/protected/image-generator"
  );

  redirect(
    `/protected/image-generator?brief=${encodeURIComponent(
      briefId
    )}&notice=generated`
  );
}

export async function deleteImageBrief(
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
      "ai_image_briefs"
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
    imageGeneratorError(
      "brief-has-image",
      briefId
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "ai_image_briefs"
    )
    .delete()
    .eq(
      "id",
      briefId
    );

  if (error) {
    imageGeneratorError(
      "brief-delete",
      briefId
    );
  }

  revalidatePath(
    "/protected/image-generator"
  );

  redirect(
    "/protected/image-generator?notice=brief-deleted"
  );
}

export async function deleteMediaAsset(
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
      "id, user_id, storage_bucket, storage_path"
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
      userId
  ) {
    imageGeneratorError(
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
      "Error eliminando archivo:",
      storageDeleteError
    );

    imageGeneratorError(
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
      "Error eliminando metadatos:",
      databaseDeleteError
    );

    imageGeneratorError(
      "asset-database-delete"
    );
  }

  revalidatePath(
    "/protected/image-generator"
  );

  redirect(
    "/protected/image-generator?notice=image-deleted"
  );
}