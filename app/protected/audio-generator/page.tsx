import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  deleteAudioAsset,
  deleteAudioBrief,
  generateAIAudio,
  saveAudioBrief,
} from "./actions";

export const instant = false;
export const maxDuration = 180;

type IntegrationState = {
  enabled: boolean;
  provider_name: string | null;
  model_name: string | null;
  credential_status: string;
};

type AudioBrief = {
  id: string;
  title: string;
  input_text: string;
  voice: string;
  voice_instructions: string | null;
  speed: number;
  output_format: string;
  status: string;
  generated_asset_id: string | null;
  last_error: string | null;
  created_at: string;
};

type MediaAsset = {
  id: string;
  title: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  model_name: string | null;
  metadata: Record<
    string,
    unknown
  > | null;
  created_at: string;
};

type MediaWithUrl =
  MediaAsset & {
    signedUrl:
      | string
      | null;
  };

const supportedOpenAIModels = [
  "gpt-4o-mini-tts",
  "gpt-4o-mini-tts-2025-12-15",
  "tts-1",
  "tts-1-hd",
];

const voices = [
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

const errorMessages: Record<
  string,
  string
> = {
  title:
    "Escribe un nombre interno para el audio.",
  text:
    "Escribe el texto que se convertirá en voz.",
  "text-long":
    "El texto supera el límite de 4096 caracteres del conector actual.",
  voice:
    "La voz seleccionada no es válida.",
  speed:
    "La velocidad debe estar entre 0.25 y 4.00.",
  format:
    "El formato de audio seleccionado no es válido.",
  "brief-save":
    "No se pudo guardar el brief de audio.",
  "credential-read":
    "La credencial está configurada, pero el backend no pudo leerla.",
  "provider-network":
    "No se pudo conectar con el proveedor de audio.",
  "provider-response":
    "El proveedor devolvió un archivo de audio no válido.",
  "provider-error":
    "El proveedor rechazó la generación. Revisa la cuenta, clave, modelo o texto.",
  "empty-output":
    "El proveedor devolvió un archivo vacío.",
  "storage-bucket":
    "No se pudo preparar el almacenamiento privado.",
  "storage-upload":
    "El audio se generó, pero no pudo guardarse en Storage.",
  "asset-save":
    "El audio se generó, pero no se pudieron guardar sus metadatos.",
  "brief-has-audio":
    "Este brief ya tiene un audio generado. Elimina primero el audio.",
  "brief-delete":
    "No se pudo eliminar el brief.",
  "asset-not-found":
    "No se encontró el audio.",
  "asset-storage-delete":
    "No se pudo eliminar el archivo de audio.",
  "asset-database-delete":
    "El archivo fue eliminado, pero no se pudieron borrar sus metadatos.",
};

const noticeMessages: Record<
  string,
  string
> = {
  "brief-saved":
    "Brief de audio guardado. Podrás generarlo cuando el cliente configure el proveedor.",
  "credentials-missing":
    "Brief guardado. La generación permanece pendiente porque todavía no hay una API key.",
  "integration-disabled":
    "Brief guardado. La integración de audio está desactivada.",
  "model-missing":
    "Brief guardado. Falta configurar el modelo de audio.",
  "provider-pending":
    "Brief guardado. El proveedor indicado todavía no tiene un conector implementado.",
  "model-unsupported":
    "Brief guardado. El conector actual está preparado para modelos de voz de OpenAI compatibles.",
  generated:
    "Audio generado y guardado en el almacenamiento privado.",
  "brief-deleted":
    "Brief eliminado correctamente.",
  "audio-deleted":
    "Audio eliminado correctamente.",
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
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "generating"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    status === "failed"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

function formatFileSize(
  bytes: number | null
) {
  if (
    bytes === null ||
    bytes <= 0
  ) {
    return "—";
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${Math.round(
      bytes / 1024
    )} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

async function withSignedUrls(
  assets: MediaAsset[]
) {
  if (
    assets.length ===
    0
  ) {
    return [] as MediaWithUrl[];
  }

  const admin =
    createAdminClient();

  return Promise.all(
    assets.map(
      async (
        asset
      ): Promise<MediaWithUrl> => {
        const {
          data,
          error,
        } =
          await admin.storage
            .from(
              asset.storage_bucket
            )
            .createSignedUrl(
              asset.storage_path,
              60 * 60
            );

        return {
          ...asset,
          signedUrl:
            error
              ? null
              : data.signedUrl,
        };
      }
    )
  );
}

export default async function AudioGeneratorPage({
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
    recentBriefsResult,
    recentAssetsResult,
  ] = await Promise.all([
    supabase
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
      .maybeSingle(),

    supabase
      .from(
        "ai_audio_briefs"
      )
      .select(
        "id, title, input_text, voice, voice_instructions, speed, output_format, status, generated_asset_id, last_error, created_at"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(8),

    supabase
      .from(
        "media_assets"
      )
      .select(
        "id, title, storage_bucket, storage_path, mime_type, file_size, model_name, metadata, created_at"
      )
      .eq(
        "asset_type",
        "audio"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(12),
  ]);

  const integration =
    integrationResult.data as
      | IntegrationState
      | null;

  const recentBriefs =
    (recentBriefsResult.data as
      | AudioBrief[]
      | null) ?? [];

  const recentAssets =
    (recentAssetsResult.data as
      | MediaAsset[]
      | null) ?? [];

  let selectedBrief:
    | AudioBrief
    | null = null;

  if (briefId) {
    const {
      data,
    } = await supabase
      .from(
        "ai_audio_briefs"
      )
      .select(
        "id, title, input_text, voice, voice_instructions, speed, output_format, status, generated_asset_id, last_error, created_at"
      )
      .eq(
        "id",
        briefId
      )
      .maybeSingle();

    selectedBrief =
      data as
        | AudioBrief
        | null;
  }

  let selectedAsset:
    | MediaAsset
    | null = null;

  if (
    selectedBrief?.generated_asset_id
  ) {
    const {
      data,
    } = await supabase
      .from(
        "media_assets"
      )
      .select(
        "id, title, storage_bucket, storage_path, mime_type, file_size, model_name, metadata, created_at"
      )
      .eq(
        "id",
        selectedBrief.generated_asset_id
      )
      .maybeSingle();

    selectedAsset =
      data as
        | MediaAsset
        | null;
  }

  const gallery =
    await withSignedUrls(
      recentAssets
    );

  const selectedSigned =
    selectedAsset
      ? (
          await withSignedUrls([
            selectedAsset,
          ])
        )[0] ??
        null
      : null;

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

  const model =
    integration?.model_name?.trim() ??
    "";

  const providerName =
    integration?.provider_name
      ?.trim() ??
    "";

  const providerSupported =
    providerName
      .toLowerCase()
      .includes("openai") ||
    supportedOpenAIModels.includes(
      model
    );

  const modelSupported =
    supportedOpenAIModels.includes(
      model
    );

  const aiReady =
    hasCredentials &&
    hasModel &&
    isEnabled &&
    providerSupported &&
    modelSupported;

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

  const deleteBriefAction =
    selectedBrief &&
    !selectedBrief.generated_asset_id
      ? deleteAudioBrief.bind(
          null,
          selectedBrief.id
        )
      : null;

  const deleteSelectedAssetAction =
    selectedAsset
      ? deleteAudioAsset.bind(
          null,
          selectedAsset.id
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Producción de voz
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Generador de audio
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Convierte texto en narración cuando el cliente conecte su
            proveedor de voz.
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
            Credencial
          </p>

          <p className="mt-3 text-sm font-semibold text-slate-800">
            {hasCredentials
              ? "Configurada"
              : "Pendiente"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Modelo
          </p>

          <p className="mt-3 truncate text-sm font-semibold text-slate-800">
            {model ||
              "Pendiente"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Motor de voz
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
            El generador está instalado, pero permanece inactivo.
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Puedes guardar guiones de voz. No se hará ninguna llamada
            externa hasta que el cliente configure API key, proveedor,
            modelo y habilite la integración.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-semibold text-sky-900">
          Aviso obligatorio de voz IA
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-800">
          Los audios creados por este módulo deben presentarse al usuario
          final como voz generada por inteligencia artificial, no como una
          voz humana real.
        </p>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <form className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Brief de voz
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Prepara narraciones, locuciones, mensajes y versiones
                habladas de contenido.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-semibold text-slate-700"
                >
                  Nombre interno *
                </label>

                <input
                  id="title"
                  name="title"
                  required
                  defaultValue={
                    selectedBrief?.title ??
                    ""
                  }
                  placeholder="Ej: Narración campaña agosto"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="input_text"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Texto a narrar *
                  </label>

                  <span className="text-xs text-slate-400">
                    Máximo 4096 caracteres
                  </span>
                </div>

                <textarea
                  id="input_text"
                  name="input_text"
                  rows={12}
                  required
                  maxLength={4096}
                  defaultValue={
                    selectedBrief?.input_text ??
                    ""
                  }
                  placeholder="Pega o escribe aquí el texto que deseas convertir en voz..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    htmlFor="voice"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Voz
                  </label>

                  <select
                    id="voice"
                    name="voice"
                    defaultValue={
                      selectedBrief?.voice ??
                      "coral"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {voices.map(
                      (voice) => (
                        <option
                          key={
                            voice
                          }
                          value={
                            voice
                          }
                        >
                          {voice}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="speed"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Velocidad
                  </label>

                  <input
                    id="speed"
                    name="speed"
                    type="number"
                    min="0.25"
                    max="4"
                    step="0.05"
                    defaultValue={
                      selectedBrief?.speed ??
                      1
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="output_format"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Formato
                  </label>

                  <select
                    id="output_format"
                    name="output_format"
                    defaultValue={
                      selectedBrief?.output_format ??
                      "mp3"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="mp3">
                      MP3
                    </option>

                    <option value="wav">
                      WAV
                    </option>

                    <option value="aac">
                      AAC
                    </option>

                    <option value="opus">
                      Opus
                    </option>

                    <option value="flac">
                      FLAC
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="voice_instructions"
                  className="text-sm font-semibold text-slate-700"
                >
                  Instrucciones de locución
                </label>

                <textarea
                  id="voice_instructions"
                  name="voice_instructions"
                  rows={4}
                  defaultValue={
                    selectedBrief?.voice_instructions ??
                    ""
                  }
                  placeholder="Ej: tono profesional y cercano, pausas naturales, ritmo tranquilo, pronunciación clara..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6"
                />

                <p className="text-xs leading-5 text-slate-400">
                  Estas instrucciones se aplican cuando el modelo configurado
                  admite control de estilo de voz.
                </p>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="submit"
              formAction={
                saveAudioBrief
              }
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Guardar brief
            </button>

            <button
              type="submit"
              formAction={
                generateAIAudio
              }
              disabled={
                !aiReady
              }
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {aiReady
                ? "Generar audio"
                : "IA pendiente de credenciales"}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          {selectedSigned?.signedUrl && (
            <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
                    Resultado
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {selectedSigned.title ||
                      "Audio generado"}
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase text-emerald-700">
                  Generado
                </span>
              </div>

              <div className="mt-5 rounded-xl bg-slate-950 p-4">
                <audio
                  controls
                  preload="metadata"
                  className="w-full"
                  src={
                    selectedSigned.signedUrl
                  }
                >
                  Tu navegador no puede reproducir este audio.
                </audio>

                <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Voz generada por IA
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Modelo
                  </p>

                  <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                    {selectedSigned.model_name ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Tamaño
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {formatFileSize(
                      selectedSigned.file_size
                    )}
                  </p>
                </div>
              </div>

              {deleteSelectedAssetAction && (
                <form
                  action={
                    deleteSelectedAssetAction
                  }
                  className="mt-4"
                >
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Eliminar audio
                  </button>
                </form>
              )}
            </section>
          )}

          {selectedBrief &&
            !selectedBrief.generated_asset_id && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Brief seleccionado
                    </p>

                    <h2 className="mt-1 truncate font-semibold text-slate-950">
                      {selectedBrief.title}
                    </h2>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClasses(
                      selectedBrief.status
                    )}`}
                  >
                    {statusLabel(
                      selectedBrief.status
                    )}
                  </span>
                </div>

                {deleteBriefAction && (
                  <form
                    action={
                      deleteBriefAction
                    }
                    className="mt-5"
                  >
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Eliminar brief
                    </button>
                  </form>
                )}
              </section>
            )}

          {selectedBrief?.last_error && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                Último error
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
                  Todavía no hay briefs de audio.
                </p>
              ) : (
                recentBriefs.map(
                  (brief) => (
                    <Link
                      key={
                        brief.id
                      }
                      href={`/protected/audio-generator?brief=${brief.id}`}
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
                            {brief.title}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {brief.voice} ·{" "}
                            {brief.output_format.toUpperCase()}
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

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Biblioteca multimedia
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Audios generados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Los archivos permanecen privados y se reproducen mediante
              enlaces temporales.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {gallery.length} reciente(s)
          </span>
        </div>

        {gallery.length ===
        0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="font-semibold text-slate-700">
              La biblioteca de audio está preparada.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Permanecerá vacía hasta que el cliente configure el proveedor
              y genere el primer audio.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {gallery.map(
              (asset) => {
                const deleteAction =
                  deleteAudioAsset.bind(
                    null,
                    asset.id
                  );

                const voice =
                  typeof asset.metadata?.voice ===
                  "string"
                    ? asset.metadata.voice
                    : "—";

                return (
                  <article
                    key={
                      asset.id
                    }
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {asset.title ||
                            "Audio"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Voz {voice} ·{" "}
                          {formatFileSize(
                            asset.file_size
                          )}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">
                        Voz IA
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      {asset.signedUrl ? (
                        <audio
                          controls
                          preload="metadata"
                          src={
                            asset.signedUrl
                          }
                          className="w-full"
                        >
                          Tu navegador no puede reproducir este audio.
                        </audio>
                      ) : (
                        <p className="text-center text-xs text-slate-400">
                          Vista previa no disponible
                        </p>
                      )}
                    </div>

                    <form
                      action={
                        deleteAction
                      }
                      className="mt-3 text-right"
                    >
                      <button
                        type="submit"
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Eliminar
                      </button>
                    </form>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}