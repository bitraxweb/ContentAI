"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MEDIA_BUCKET =
  "contentai-media";

const allowedVoices = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
];

const allowedFormats = [
  "mp3",
  "wav",
  "aac",
  "opus",
  "flac",
];

const supportedOpenAIModels = [
  "gpt-4o-mini-tts",
  "gpt-4o-mini-tts-2025-12-15",
  "tts-1",
  "tts-1-hd",
];

type AudioBriefInput = {
  title: string;
  inputText: string;
  voice: string;
  voiceInstructions: string;
  speed: number;
  outputFormat: string;
};

function audioGeneratorError(
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
    `/protected/audio-generator?${query.toString()}`
  );
}

function parseAudioBrief(
  formData: FormData
): AudioBriefInput {
  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const inputText = String(
    formData.get("input_text") ?? ""
  ).trim();

  const voice = String(
    formData.get("voice") ??
      "coral"
  );

  const voiceInstructions = String(
    formData.get(
      "voice_instructions"
    ) ?? ""
  ).trim();

  const speedText = String(
    formData.get("speed") ??
      "1"
  );

  const speed =
    Number(speedText);

  const outputFormat = String(
    formData.get(
      "output_format"
    ) ?? "mp3"
  );

  if (!title) {
    audioGeneratorError(
      "title"
    );
  }

  if (!inputText) {
    audioGeneratorError(
      "text"
    );
  }

  if (
    inputText.length >
    4096
  ) {
    audioGeneratorError(
      "text-long"
    );
  }

  if (
    !allowedVoices.includes(
      voice
    )
  ) {
    audioGeneratorError(
      "voice"
    );
  }

  if (
    !Number.isFinite(
      speed
    ) ||
    speed < 0.25 ||
    speed > 4
  ) {
    audioGeneratorError(
      "speed"
    );
  }

  if (
    !allowedFormats.includes(
      outputFormat
    )
  ) {
    audioGeneratorError(
      "format"
    );
  }

  return {
    title,
    inputText,
    voice,
    voiceInstructions,
    speed,
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

async function insertAudioBrief(
  input: AudioBriefInput
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
      "ai_audio_briefs"
    )
    .insert({
      user_id:
        userId,
      title:
        input.title,
      input_text:
        input.inputText,
      voice:
        input.voice,
      voice_instructions:
        input.voiceInstructions,
      speed:
        input.speed,
      output_format:
        input.outputFormat,
      provider_key:
        "audio_ai",
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
      "Error guardando brief de audio:",
      error
    );

    audioGeneratorError(
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
            "image/*",
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
    format === "wav"
  ) {
    return "audio/wav";
  }

  if (
    format === "aac"
  ) {
    return "audio/aac";
  }

  if (
    format === "opus"
  ) {
    return "audio/ogg";
  }

  if (
    format === "flac"
  ) {
    return "audio/flac";
  }

  return "audio/mpeg";
}

export async function saveAudioBrief(
  formData: FormData
) {
  const input =
    parseAudioBrief(
      formData
    );

  const {
    briefId,
  } =
    await insertAudioBrief(
      input
    );

  revalidatePath(
    "/protected/audio-generator"
  );

  redirect(
    `/protected/audio-generator?brief=${encodeURIComponent(
      briefId
    )}&notice=brief-saved`
  );
}

export async function generateAIAudio(
  formData: FormData
) {
  const input =
    parseAudioBrief(
      formData
    );

  const {
    supabase,
    userId,
    briefId,
  } =
    await insertAudioBrief(
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
      "audio_ai"
    )
    .maybeSingle();

  if (
    !integration ||
    integration.credential_status !==
      "configured"
  ) {
    redirect(
      `/protected/audio-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=credentials-missing`
    );
  }

  if (
    !integration.enabled
  ) {
    redirect(
      `/protected/audio-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=integration-disabled`
    );
  }

  const model =
    integration.model_name?.trim();

  if (!model) {
    redirect(
      `/protected/audio-generator?brief=${encodeURIComponent(
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
    supportedOpenAIModels.includes(
      model
    );

  if (
    !openAICompatible
  ) {
    redirect(
      `/protected/audio-generator?brief=${encodeURIComponent(
        briefId
      )}&notice=provider-pending`
    );
  }

  if (
    !supportedOpenAIModels.includes(
      model
    )
  ) {
    redirect(
      `/protected/audio-generator?brief=${encodeURIComponent(
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
        "audio_ai",
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
      "No se pudo leer la credencial de audio:",
      secretError
    );

    await supabase
      .from(
        "ai_audio_briefs"
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

    audioGeneratorError(
      "credential-read",
      briefId
    );
  }

  await supabase
    .from(
      "ai_audio_briefs"
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

  const requestBody:
    Record<
      string,
      string | number
    > = {
    model,
    input:
      input.inputText,
    voice:
      input.voice,
    response_format:
      input.outputFormat,
    speed:
      input.speed,
  };

  if (
    input.voiceInstructions &&
    model.startsWith(
      "gpt-4o-mini-tts"
    )
  ) {
    requestBody.instructions =
      input.voiceInstructions;
  }

  let response: Response;

  try {
    response =
      await fetch(
        "https://api.openai.com/v1/audio/speech",
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
            JSON.stringify(
              requestBody
            ),
          cache:
            "no-store",
        }
      );
  } catch (requestError) {
    console.error(
      "Error de red llamando al proveedor de audio:",
      requestError
    );

    await supabase
      .from(
        "ai_audio_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "No se pudo conectar con el proveedor de audio.",
      })
      .eq(
        "id",
        briefId
      );

    audioGeneratorError(
      "provider-network",
      briefId
    );
  }

  if (!response.ok) {
    let providerMessage =
      `HTTP ${response.status}`;

    try {
      const payload =
        await response.json() as {
          error?: {
            message?: string;
          };
        };

      providerMessage =
        payload.error?.message ||
        providerMessage;
    } catch {
      // Mantener el mensaje HTTP.
    }

    console.error(
      "Proveedor de audio devolvió un error:",
      providerMessage
    );

    await supabase
      .from(
        "ai_audio_briefs"
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

    audioGeneratorError(
      "provider-error",
      briefId
    );
  }

  let audioBuffer:
    Buffer;

  try {
    const arrayBuffer =
      await response.arrayBuffer();

    audioBuffer =
      Buffer.from(
        arrayBuffer
      );
  } catch {
    await supabase
      .from(
        "ai_audio_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "El proveedor devolvió un archivo de audio no válido.",
      })
      .eq(
        "id",
        briefId
      );

    audioGeneratorError(
      "provider-response",
      briefId
    );
  }

  if (
    audioBuffer.length ===
    0
  ) {
    audioGeneratorError(
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
        "ai_audio_briefs"
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

    audioGeneratorError(
      "storage-bucket",
      briefId
    );
  }

  const storagePath =
    `audio/${userId}/${briefId}.${input.outputFormat}`;

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
        audioBuffer,
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
      "Error subiendo audio a Storage:",
      uploadError
    );

    await supabase
      .from(
        "ai_audio_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "El audio se generó, pero no pudo guardarse en Storage.",
      })
      .eq(
        "id",
        briefId
      );

    audioGeneratorError(
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
        "audio",
      source:
        "ai",
      title:
        input.title,
      description:
        "Voz generada por IA",
      storage_bucket:
        MEDIA_BUCKET,
      storage_path:
        storagePath,
      mime_type:
        mimeType,
      file_size:
        audioBuffer.length,
      provider_key:
        "audio_ai",
      model_name:
        model,
      prompt:
        input.inputText,
      metadata: {
        voice:
          input.voice,
        voice_instructions:
          input.voiceInstructions,
        speed:
          input.speed,
        output_format:
          input.outputFormat,
        ai_voice_disclosure:
          true,
      },
    })
    .select("id")
    .single();

  if (
    assetError ||
    !asset?.id
  ) {
    console.error(
      "Error guardando metadatos de audio:",
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
        "ai_audio_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "El audio se generó, pero no se pudieron guardar sus metadatos.",
      })
      .eq(
        "id",
        briefId
      );

    audioGeneratorError(
      "asset-save",
      briefId
    );
  }

  const {
    error: briefUpdateError,
  } = await supabase
    .from(
      "ai_audio_briefs"
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
      "Error enlazando audio con brief:",
      briefUpdateError
    );
  }

  revalidatePath(
    "/protected/audio-generator"
  );

  redirect(
    `/protected/audio-generator?brief=${encodeURIComponent(
      briefId
    )}&notice=generated`
  );
}

export async function deleteAudioBrief(
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
      "ai_audio_briefs"
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
    audioGeneratorError(
      "brief-has-audio",
      briefId
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "ai_audio_briefs"
    )
    .delete()
    .eq(
      "id",
      briefId
    );

  if (error) {
    audioGeneratorError(
      "brief-delete",
      briefId
    );
  }

  revalidatePath(
    "/protected/audio-generator"
  );

  redirect(
    "/protected/audio-generator?notice=brief-deleted"
  );
}

export async function deleteAudioAsset(
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
      "audio"
  ) {
    audioGeneratorError(
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
      "Error eliminando archivo de audio:",
      storageDeleteError
    );

    audioGeneratorError(
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
      "Error eliminando metadatos de audio:",
      databaseDeleteError
    );

    audioGeneratorError(
      "asset-database-delete"
    );
  }

  revalidatePath(
    "/protected/audio-generator"
  );

  redirect(
    "/protected/audio-generator?notice=audio-deleted"
  );
}