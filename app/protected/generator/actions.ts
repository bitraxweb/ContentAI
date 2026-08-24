"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedContentTypes = [
  "post",
  "video_script",
  "title",
  "description",
  "promotional_phrase",
  "idea",
];

const allowedPlatforms = [
  "linkedin",
  "facebook",
  "both",
];

type BriefInput = {
  title: string;
  contentType: string;
  platform: string;
  objective: string;
  targetAudience: string;
  tone: string;
  contentLength: string;
  context: string;
  callToAction: string;
  useEmojis: boolean;
  useHashtags: boolean;
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function generatorError(
  code: string,
  briefId?: string
): never {
  const query = new URLSearchParams();

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
    `/protected/generator?${query.toString()}`
  );
}

function parseBrief(
  formData: FormData
): BriefInput {
  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const contentType = String(
    formData.get("content_type") ??
      "post"
  );

  const platform = String(
    formData.get("platform") ??
      "linkedin"
  );

  const objective = String(
    formData.get("objective") ?? ""
  ).trim();

  const targetAudience = String(
    formData.get("target_audience") ??
      ""
  ).trim();

  const tone = String(
    formData.get("tone") ?? ""
  ).trim();

  const contentLength = String(
    formData.get("content_length") ??
      ""
  ).trim();

  const context = String(
    formData.get("context") ?? ""
  ).trim();

  const callToAction = String(
    formData.get("call_to_action") ??
      ""
  ).trim();

  const useEmojis =
    formData.get("use_emojis") ===
    "on";

  const useHashtags =
    formData.get("use_hashtags") ===
    "on";

  if (!title) {
    generatorError("title");
  }

  if (
    !allowedContentTypes.includes(
      contentType
    )
  ) {
    generatorError(
      "content-type"
    );
  }

  if (
    !allowedPlatforms.includes(
      platform
    )
  ) {
    generatorError(
      "platform"
    );
  }

  return {
    title,
    contentType,
    platform,
    objective,
    targetAudience,
    tone,
    contentLength,
    context,
    callToAction,
    useEmojis,
    useHashtags,
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

async function insertBrief(
  input: BriefInput
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
      "ai_content_briefs"
    )
    .insert({
      user_id:
        userId,
      title:
        input.title,
      content_type:
        input.contentType,
      platform:
        input.platform,
      objective:
        input.objective,
      target_audience:
        input.targetAudience,
      tone:
        input.tone,
      content_length:
        input.contentLength,
      context:
        input.context,
      call_to_action:
        input.callToAction,
      use_emojis:
        input.useEmojis,
      use_hashtags:
        input.useHashtags,
      provider_key:
        "openai_text",
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
      "Error guardando brief:",
      error
    );

    generatorError(
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

function buildPrompt(
  input: BriefInput,
  language: string
) {
  const languageLabel =
    language === "en"
      ? "English"
      : "Spanish";

  const emojisRule =
    input.useEmojis
      ? "Use emojis only when they improve readability and fit the tone."
      : "Do not use emojis.";

  const hashtagsRule =
    input.useHashtags
      ? "Include a concise set of relevant hashtags at the end when appropriate."
      : "Do not include hashtags.";

  return `
Create professional social-media content in ${languageLabel}.

CONTENT TYPE:
${input.contentType}

PLATFORM:
${input.platform}

TOPIC / WORKING TITLE:
${input.title}

OBJECTIVE:
${input.objective || "Not specified"}

TARGET AUDIENCE:
${input.targetAudience || "Not specified"}

TONE:
${input.tone || "Professional"}

LENGTH:
${input.contentLength || "Medium"}

CONTEXT:
${input.context || "No additional context"}

CALL TO ACTION:
${input.callToAction || "No specific CTA"}

RULES:
- Produce only the final content ready for review.
- Do not describe your process.
- Do not invent statistics, testimonials, sources, links, company facts, or claims that were not supplied in the context.
- If essential factual information is missing, write conservatively and avoid fabricating details.
- ${emojisRule}
- ${hashtagsRule}
- Adapt structure and style to the selected platform and content type.
`.trim();
}

function extractOutputText(
  payload: OpenAIResponsePayload
) {
  if (
    payload.output_text?.trim()
  ) {
    return payload.output_text.trim();
  }

  const pieces: string[] = [];

  for (
    const item
    of payload.output ?? []
  ) {
    for (
      const content
      of item.content ?? []
    ) {
      if (
        content.type ===
          "output_text" &&
        content.text
      ) {
        pieces.push(
          content.text
        );
      }
    }
  }

  return pieces
    .join("\n")
    .trim();
}

export async function saveAIBrief(
  formData: FormData
) {
  const input =
    parseBrief(
      formData
    );

  const {
    briefId,
  } = await insertBrief(
    input
  );

  revalidatePath(
    "/protected/generator"
  );

  redirect(
    `/protected/generator?brief=${encodeURIComponent(
      briefId
    )}&notice=brief-saved`
  );
}

export async function generateAIContent(
  formData: FormData
) {
  const input =
    parseBrief(
      formData
    );

  const {
    supabase,
    briefId,
  } = await insertBrief(
    input
  );

  const [
    integrationResult,
    workspaceResult,
  ] = await Promise.all([
    supabase
      .from(
        "integration_settings"
      )
      .select(
        "enabled, model_name, credential_status"
      )
      .eq(
        "integration_key",
        "openai_text"
      )
      .maybeSingle(),

    supabase
      .from(
        "workspace_settings"
      )
      .select(
        "language"
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const integration =
    integrationResult.data;

  if (
    !integration ||
    integration.credential_status !==
      "configured"
  ) {
    redirect(
      `/protected/generator?brief=${encodeURIComponent(
        briefId
      )}&notice=credentials-missing`
    );
  }

  if (
    !integration.enabled
  ) {
    redirect(
      `/protected/generator?brief=${encodeURIComponent(
        briefId
      )}&notice=integration-disabled`
    );
  }

  const model =
    integration.model_name?.trim();

  if (!model) {
    redirect(
      `/protected/generator?brief=${encodeURIComponent(
        briefId
      )}&notice=model-missing`
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
        "openai_text",
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
      "No se pudo leer la credencial de OpenAI:",
      secretError
    );

    await supabase
      .from(
        "ai_content_briefs"
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

    generatorError(
      "credential-read",
      briefId
    );
  }

  await supabase
    .from(
      "ai_content_briefs"
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

  const prompt =
    buildPrompt(
      input,
      workspaceResult.data
        ?.language ??
        "es"
    );

  let response: Response;

  try {
    response =
      await fetch(
        "https://api.openai.com/v1/responses",
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
              store:
                false,
              input:
                prompt,
            }),
          cache:
            "no-store",
        }
      );
  } catch (requestError) {
    console.error(
      "Error de red llamando a OpenAI:",
      requestError
    );

    await supabase
      .from(
        "ai_content_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "No se pudo conectar con el proveedor de IA.",
      })
      .eq(
        "id",
        briefId
      );

    generatorError(
      "provider-network",
      briefId
    );
  }

  let payload: OpenAIResponsePayload;

  try {
    payload =
      await response.json() as OpenAIResponsePayload;
  } catch {
    await supabase
      .from(
        "ai_content_briefs"
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

    generatorError(
      "provider-response",
      briefId
    );
  }

  if (!response.ok) {
    const providerMessage =
      payload.error?.message ||
      `HTTP ${response.status}`;

    console.error(
      "OpenAI devolvió un error:",
      providerMessage
    );

    await supabase
      .from(
        "ai_content_briefs"
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

    generatorError(
      "provider-error",
      briefId
    );
  }

  const generatedText =
    extractOutputText(
      payload
    );

  if (!generatedText) {
    await supabase
      .from(
        "ai_content_briefs"
      )
      .update({
        status:
          "failed",
        last_error:
          "El proveedor no devolvió texto utilizable.",
      })
      .eq(
        "id",
        briefId
      );

    generatorError(
      "empty-output",
      briefId
    );
  }

  const generatedTitle =
    input.title;

  const {
    error: updateError,
  } = await supabase
    .from(
      "ai_content_briefs"
    )
    .update({
      status:
        "generated",
      generated_title:
        generatedTitle,
      generated_text:
        generatedText,
      last_error:
        null,
    })
    .eq(
      "id",
      briefId
    );

  if (updateError) {
    console.error(
      "No se pudo guardar el resultado IA:",
      updateError
    );

    generatorError(
      "result-save",
      briefId
    );
  }

  revalidatePath(
    "/protected/generator"
  );

  redirect(
    `/protected/generator?brief=${encodeURIComponent(
      briefId
    )}&notice=generated`
  );
}

export async function saveGeneratedContent(
  briefId: string,
  _formData: FormData
) {
  const {
    supabase,
    userId,
  } = await getActor();

  const {
    data: canCreate,
  } = await supabase.rpc(
    "has_permission",
    {
      p_permission:
        "content.create",
    }
  );

  if (!canCreate) {
    generatorError(
      "content-permission",
      briefId
    );
  }

  const {
    data: brief,
    error: briefError,
  } = await supabase
    .from(
      "ai_content_briefs"
    )
    .select(
      "id, user_id, title, content_type, platform, objective, target_audience, tone, content_length, call_to_action, use_emojis, use_hashtags, generated_title, generated_text, generated_content_id"
    )
    .eq(
      "id",
      briefId
    )
    .maybeSingle();

  if (
    briefError ||
    !brief ||
    brief.user_id !==
      userId
  ) {
    generatorError(
      "brief-not-found"
    );
  }

  if (
    brief.generated_content_id
  ) {
    redirect(
      `/protected/library/${brief.generated_content_id}`
    );
  }

  if (
    !brief.generated_text?.trim()
  ) {
    generatorError(
      "no-generated-text",
      briefId
    );
  }

  const {
    data: created,
    error: createError,
  } = await supabase
    .from(
      "contents"
    )
    .insert({
      user_id:
        userId,
      title:
        brief.generated_title ||
        brief.title ||
        "Contenido generado con IA",
      body:
        brief.generated_text,
      content_type:
        brief.content_type,
      platform:
        brief.platform,
      objective:
        brief.objective,
      target_audience:
        brief.target_audience,
      tone:
        brief.tone,
      content_length:
        brief.content_length,
      hashtags:
        "",
      call_to_action:
        brief.call_to_action,
      use_emojis:
        brief.use_emojis,
      use_hashtags:
        brief.use_hashtags,
      status:
        "draft",
      generated_by_ai:
        true,
    })
    .select("id")
    .single();

  if (
    createError ||
    !created?.id
  ) {
    console.error(
      "No se pudo guardar en biblioteca:",
      createError
    );

    generatorError(
      "library-save",
      briefId
    );
  }

  await supabase
    .from(
      "ai_content_briefs"
    )
    .update({
      status:
        "saved",
      generated_content_id:
        created.id,
    })
    .eq(
      "id",
      briefId
    );

  revalidatePath(
    "/protected"
  );

  revalidatePath(
    "/protected/library"
  );

  revalidatePath(
    "/protected/generator"
  );

  redirect(
    `/protected/library/${created.id}?ai=1`
  );
}

export async function deleteAIBrief(
  briefId: string,
  _formData: FormData
) {
  const {
    supabase,
  } = await getActor();

  const {
    error,
  } = await supabase
    .from(
      "ai_content_briefs"
    )
    .delete()
    .eq(
      "id",
      briefId
    );

  if (error) {
    generatorError(
      "brief-delete",
      briefId
    );
  }

  revalidatePath(
    "/protected/generator"
  );

  redirect(
    "/protected/generator?notice=brief-deleted"
  );
}