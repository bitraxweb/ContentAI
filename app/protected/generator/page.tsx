import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  deleteAIBrief,
  generateAIContent,
  saveAIBrief,
  saveGeneratedContent,
} from "./actions";

export const instant = false;

type IntegrationState = {
  enabled: boolean;
  provider_name: string | null;
  model_name: string | null;
  credential_status: string;
};

type WorkspaceState = {
  language: string;
  default_platform: string;
  default_tone: string;
};

type BriefRow = {
  id: string;
  title: string | null;
  content_type: string;
  platform: string;
  objective: string | null;
  target_audience: string | null;
  tone: string | null;
  content_length: string | null;
  context: string | null;
  call_to_action: string | null;
  use_emojis: boolean;
  use_hashtags: boolean;
  status: string;
  generated_title: string | null;
  generated_text: string | null;
  generated_content_id: string | null;
  last_error: string | null;
  created_at: string;
};

const errorMessages: Record<
  string,
  string
> = {
  title:
    "Escribe un tema o título para el contenido.",
  "content-type":
    "El tipo de contenido seleccionado no es válido.",
  platform:
    "La red social seleccionada no es válida.",
  "brief-save":
    "No se pudo guardar el brief.",
  "credential-read":
    "La credencial está marcada como configurada, pero el backend no pudo leerla.",
  "provider-network":
    "No se pudo conectar con el proveedor de IA.",
  "provider-response":
    "El proveedor devolvió una respuesta no válida.",
  "provider-error":
    "El proveedor de IA rechazó la solicitud. Revisa la clave, el modelo o la cuenta.",
  "empty-output":
    "La IA respondió sin texto utilizable.",
  "result-save":
    "Se generó el texto, pero no se pudo guardar el resultado.",
  "content-permission":
    "Puedes usar la IA, pero no tienes permiso para crear contenidos en la biblioteca.",
  "brief-not-found":
    "No se encontró el brief.",
  "no-generated-text":
    "Este brief todavía no tiene un texto generado.",
  "library-save":
    "No se pudo guardar el resultado en la biblioteca.",
  "brief-delete":
    "No se pudo eliminar el brief.",
};

const noticeMessages: Record<
  string,
  string
> = {
  "brief-saved":
    "Brief guardado. Podrás volver a utilizarlo cuando la IA esté configurada.",
  "credentials-missing":
    "Brief guardado. La IA permanece pendiente porque todavía no hay una API key configurada.",
  "integration-disabled":
    "Brief guardado. La integración de IA está desactivada en Configuración.",
  "model-missing":
    "Brief guardado. Falta seleccionar el modelo de IA en Configuración.",
  generated:
    "Contenido generado correctamente. Revísalo antes de guardarlo en la biblioteca.",
  "brief-deleted":
    "Brief eliminado correctamente.",
};

function statusLabel(
  status: string
) {
  if (
    status === "prepared"
  ) {
    return "Preparado";
  }

  if (
    status === "generating"
  ) {
    return "Generando";
  }

  if (
    status === "generated"
  ) {
    return "Generado";
  }

  if (
    status === "saved"
  ) {
    return "Guardado";
  }

  if (
    status === "failed"
  ) {
    return "Error";
  }

  return status;
}

function statusClasses(
  status: string
) {
  if (
    status === "generated"
  ) {
    return "bg-indigo-50 text-indigo-700";
  }

  if (
    status === "saved"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "failed"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    status === "generating"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function contentTypeLabel(
  value: string
) {
  if (value === "post") return "Publicación";
  if (value === "video_script") return "Guion de video";
  if (value === "title") return "Título";
  if (value === "description") return "Descripción";
  if (value === "promotional_phrase") return "Frase promocional";
  if (value === "idea") return "Idea";

  return value;
}

export default async function GeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{
    brief?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const {
    brief: briefId,
    notice,
    error,
  } = await searchParams;

  const supabase =
    await createClient();

  const [
    integrationResult,
    workspaceResult,
    canCreateResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("integration_settings")
      .select(
        "enabled, provider_name, model_name, credential_status"
      )
      .eq(
        "integration_key",
        "openai_text"
      )
      .maybeSingle(),

    supabase
      .from("workspace_settings")
      .select(
        "language, default_platform, default_tone"
      )
      .eq("id", 1)
      .maybeSingle(),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "content.create",
      }
    ),

    supabase
      .from("ai_content_briefs")
      .select(
        "id, title, content_type, platform, objective, target_audience, tone, content_length, context, call_to_action, use_emojis, use_hashtags, status, generated_title, generated_text, generated_content_id, last_error, created_at"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(8),
  ]);

  const integration =
    integrationResult.data as
      | IntegrationState
      | null;

  const workspace =
    (workspaceResult.data as
      | WorkspaceState
      | null) ?? {
      language: "es",
      default_platform:
        "linkedin",
      default_tone:
        "professional",
    };

  let selectedBrief:
    | BriefRow
    | null = null;

  if (briefId) {
    const {
      data: selected,
    } = await supabase
      .from("ai_content_briefs")
      .select(
        "id, title, content_type, platform, objective, target_audience, tone, content_length, context, call_to_action, use_emojis, use_hashtags, status, generated_title, generated_text, generated_content_id, last_error, created_at"
      )
      .eq(
        "id",
        briefId
      )
      .maybeSingle();

    selectedBrief =
      selected as
        | BriefRow
        | null;
  }

  const recentBriefs =
    (recentResult.data as
      | BriefRow[]
      | null) ?? [];

  const hasCredentials =
    integration?.credential_status ===
    "configured";

  const hasModel =
    Boolean(
      integration?.model_name?.trim()
    );

  const isEnabled =
    Boolean(
      integration?.enabled
    );

  const aiReady =
    hasCredentials &&
    hasModel &&
    isEnabled;

  const canCreate =
    Boolean(
      canCreateResult.data
    );

  const errorMessage =
    error
      ? errorMessages[
          error
        ] ||
        "No se pudo completar la operación."
      : null;

  const noticeMessage =
    notice
      ? noticeMessages[
          notice
        ]
      : null;

  const defaultTitle =
    selectedBrief?.title ??
    "";

  const saveGeneratedAction =
    selectedBrief
      ? saveGeneratedContent.bind(
          null,
          selectedBrief.id
        )
      : null;

  const deleteBriefAction =
    selectedBrief
      ? deleteAIBrief.bind(
          null,
          selectedBrief.id
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Asistente de creación
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Generador IA
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Prepara un brief completo y genera contenido cuando el cliente
            conecte su proveedor de IA.
          </p>
        </div>

        <Link
          href="/protected/settings?section=ai"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Configuración de IA
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {noticeMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {noticeMessage}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            API Key
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hasCredentials
                  ? "bg-emerald-500"
                  : "bg-slate-300"
              }`}
            />

            <p className="text-sm font-semibold text-slate-800">
              {hasCredentials
                ? "Configurada"
                : "Pendiente"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Modelo
          </p>

          <p className="mt-3 truncate text-sm font-semibold text-slate-800">
            {integration?.model_name?.trim() ||
              "Pendiente"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Motor IA
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                aiReady
                  ? "bg-emerald-500"
                  : "bg-amber-400"
              }`}
            />

            <p className="text-sm font-semibold text-slate-800">
              {aiReady
                ? "Listo para generar"
                : "Pendiente de credenciales"}
            </p>
          </div>
        </div>
      </section>

      {!aiReady && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            El módulo está preparado, pero no hará llamadas externas.
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Puedes completar y guardar briefs desde ahora. El botón de
            generación se activará cuando exista una API key, un modelo y
            la integración de IA esté habilitada.
          </p>
        </section>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <form
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Brief de contenido
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cuanto más claro sea el brief, más útil será el resultado.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-semibold text-slate-700"
                >
                  Tema o título base *
                </label>

                <input
                  id="title"
                  name="title"
                  required
                  defaultValue={
                    defaultTitle
                  }
                  placeholder="Ej: Cómo la IA mejora el trabajo del equipo comercial"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    htmlFor="content_type"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Tipo
                  </label>

                  <select
                    id="content_type"
                    name="content_type"
                    defaultValue={
                      selectedBrief?.content_type ??
                      "post"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="post">
                      Publicación
                    </option>

                    <option value="video_script">
                      Guion de video
                    </option>

                    <option value="title">
                      Título
                    </option>

                    <option value="description">
                      Descripción
                    </option>

                    <option value="promotional_phrase">
                      Frase promocional
                    </option>

                    <option value="idea">
                      Idea
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="platform"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Red
                  </label>

                  <select
                    id="platform"
                    name="platform"
                    defaultValue={
                      selectedBrief?.platform ??
                      workspace.default_platform
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="linkedin">
                      LinkedIn
                    </option>

                    <option value="facebook">
                      Facebook
                    </option>

                    <option value="both">
                      LinkedIn y Facebook
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="tone"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Tono
                  </label>

                  <select
                    id="tone"
                    name="tone"
                    defaultValue={
                      selectedBrief?.tone ??
                      workspace.default_tone
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="professional">
                      Profesional
                    </option>

                    <option value="friendly">
                      Amigable
                    </option>

                    <option value="informative">
                      Informativo
                    </option>

                    <option value="persuasive">
                      Persuasivo
                    </option>

                    <option value="inspirational">
                      Inspirador
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="objective"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Objetivo
                  </label>

                  <input
                    id="objective"
                    name="objective"
                    defaultValue={
                      selectedBrief?.objective ??
                      ""
                    }
                    placeholder="Ej: generar interés y conversación"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="target_audience"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Público objetivo
                  </label>

                  <input
                    id="target_audience"
                    name="target_audience"
                    defaultValue={
                      selectedBrief?.target_audience ??
                      ""
                    }
                    placeholder="Ej: gerentes comerciales de empresas B2B"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="content_length"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Longitud
                  </label>

                  <select
                    id="content_length"
                    name="content_length"
                    defaultValue={
                      selectedBrief?.content_length ??
                      "medium"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="short">
                      Corta
                    </option>

                    <option value="medium">
                      Media
                    </option>

                    <option value="long">
                      Larga
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="call_to_action"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Llamado a la acción
                  </label>

                  <input
                    id="call_to_action"
                    name="call_to_action"
                    defaultValue={
                      selectedBrief?.call_to_action ??
                      ""
                    }
                    placeholder="Ej: Escríbenos para conocer más"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="context"
                  className="text-sm font-semibold text-slate-700"
                >
                  Contexto y datos que sí puede utilizar la IA
                </label>

                <textarea
                  id="context"
                  name="context"
                  rows={7}
                  defaultValue={
                    selectedBrief?.context ??
                    ""
                  }
                  placeholder="Incluye aquí información de la empresa, producto, campaña, datos comprobados, beneficios, restricciones o mensajes clave..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6"
                />

                <p className="text-xs leading-5 text-slate-400">
                  El prompt está preparado para evitar que la IA invente
                  estadísticas, testimonios, enlaces o datos empresariales
                  que no hayas proporcionado aquí.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    name="use_emojis"
                    type="checkbox"
                    defaultChecked={
                      selectedBrief
                        ? selectedBrief.use_emojis
                        : true
                    }
                  />
                  Permitir emojis
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    name="use_hashtags"
                    type="checkbox"
                    defaultChecked={
                      selectedBrief
                        ? selectedBrief.use_hashtags
                        : true
                    }
                  />
                  Incluir hashtags
                </label>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="submit"
              formAction={
                saveAIBrief
              }
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Guardar brief
            </button>

            <button
              type="submit"
              formAction={
                generateAIContent
              }
              disabled={
                !aiReady
              }
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {aiReady
                ? "Generar con IA"
                : "IA pendiente de credenciales"}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          {selectedBrief?.generated_text && (
            <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
                    Resultado IA
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {selectedBrief.generated_title ||
                      selectedBrief.title ||
                      "Contenido generado"}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                    selectedBrief.status
                  )}`}
                >
                  {statusLabel(
                    selectedBrief.status
                  )}
                </span>
              </div>

              <div className="mt-5 max-h-[520px] overflow-y-auto rounded-xl bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {selectedBrief.generated_text}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {selectedBrief.generated_content_id ? (
                  <Link
                    href={`/protected/library/${selectedBrief.generated_content_id}`}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Abrir en biblioteca
                  </Link>
                ) : canCreate &&
                  saveGeneratedAction ? (
                  <form
                    action={
                      saveGeneratedAction
                    }
                  >
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Guardar en biblioteca
                    </button>
                  </form>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                    No tienes permiso para guardar contenidos en la
                    biblioteca.
                  </div>
                )}

                {deleteBriefAction &&
                  !selectedBrief.generated_content_id && (
                    <form
                      action={
                        deleteBriefAction
                      }
                    >
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Eliminar brief
                      </button>
                    </form>
                  )}
              </div>
            </section>
          )}

          {selectedBrief?.last_error && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                Último error técnico
              </p>

              <p className="mt-2 text-sm leading-6 text-rose-700">
                {selectedBrief.last_error}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Historial
                </p>

                <h2 className="mt-1 font-semibold text-slate-950">
                  Briefs recientes
                </h2>
              </div>

              <span className="text-xs text-slate-400">
                {recentBriefs.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {recentBriefs.length ===
              0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">
                  Todavía no hay briefs guardados.
                </p>
              ) : (
                recentBriefs.map(
                  (brief) => (
                    <Link
                      key={
                        brief.id
                      }
                      href={`/protected/generator?brief=${brief.id}`}
                      className={`block rounded-xl border p-3 transition hover:border-indigo-200 hover:bg-indigo-50/30 ${
                        brief.id ===
                        selectedBrief?.id
                          ? "border-indigo-200 bg-indigo-50/50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {brief.title ||
                              "Sin título"}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {contentTypeLabel(
                              brief.content_type
                            )}{" "}
                            ·{" "}
                            {brief.platform}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${statusClasses(
                            brief.status
                          )}`}
                        >
                          {statusLabel(
                            brief.status
                          )}
                        </span>
                      </div>
                    </Link>
                  )
                )
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}