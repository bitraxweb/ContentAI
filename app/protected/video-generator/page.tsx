import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  deleteVideoAsset,
  deleteVideoBrief,
  saveVideoBrief,
} from "./actions";

export const instant = false;

type IntegrationState = {
  enabled: boolean;
  provider_name: string | null;
  model_name: string | null;
  credential_status: string;
};

type WorkspaceState = {
  default_platform: string;
};

type ImageAsset = {
  id: string;
  title: string | null;
};

type VideoBrief = {
  id: string;
  title: string;
  prompt: string;
  source_image_asset_id: string | null;
  platform: string;
  aspect_ratio: string;
  desired_duration_seconds: number | null;
  visual_style: string | null;
  camera_motion: string | null;
  scene_instructions: string | null;
  audio_instructions: string | null;
  negative_instructions: string | null;
  status: string;
  generated_asset_id: string | null;
  last_error: string | null;
  created_at: string;
};

type VideoJob = {
  id: string;
  brief_id: string;
  status: string;
  progress: number | null;
  provider_job_id: string | null;
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
  created_at: string;
};

type MediaWithUrl =
  MediaAsset & {
    signedUrl:
      | string
      | null;
  };

const errorMessages: Record<
  string,
  string
> = {
  title:
    "Escribe un nombre interno para el video.",
  prompt:
    "Describe con más detalle el video que necesitas.",
  platform:
    "La red social seleccionada no es válida.",
  aspect:
    "El formato seleccionado no es válido.",
  duration:
    "La duración deseada debe estar entre 1 y 120 segundos.",
  "source-image":
    "La imagen de referencia seleccionada no es válida.",
  "brief-save":
    "No se pudo guardar el brief de video.",
  "brief-has-video":
    "Este brief ya tiene un video asociado.",
  "brief-delete":
    "No se pudo eliminar el brief.",
  "asset-not-found":
    "No se encontró el video.",
  "asset-storage-delete":
    "No se pudo eliminar el archivo de video.",
  "asset-database-delete":
    "El archivo fue eliminado, pero no se pudieron borrar sus metadatos.",
};

const noticeMessages: Record<
  string,
  string
> = {
  "brief-saved":
    "Brief de video guardado. El conector se activará cuando el cliente defina su proveedor de video.",
  "brief-deleted":
    "Brief eliminado correctamente.",
  "video-deleted":
    "Video eliminado correctamente.",
};

function statusLabel(
  status: string
) {
  if (status === "prepared") {
    return "Preparado";
  }

  if (status === "queued") {
    return "En cola";
  }

  if (status === "processing") {
    return "Procesando";
  }

  if (status === "generated") {
    return "Generado";
  }

  if (status === "failed") {
    return "Error";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  return status;
}

function statusClasses(
  status: string
) {
  if (status === "generated") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "queued" ||
    status === "processing"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "failed") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "cancelled") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-indigo-50 text-indigo-700";
}

function aspectLabel(
  value: string
) {
  if (value === "landscape") {
    return "Horizontal";
  }

  if (value === "portrait") {
    return "Vertical";
  }

  if (value === "square") {
    return "Cuadrado";
  }

  return value;
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

export default async function VideoGeneratorPage({
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
    imageAssetsResult,
    recentBriefsResult,
    recentJobsResult,
    recentVideosResult,
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
        "video_ai"
      )
      .maybeSingle(),

    supabase
      .from(
        "workspace_settings"
      )
      .select(
        "default_platform"
      )
      .eq("id", 1)
      .maybeSingle(),

    supabase
      .from(
        "media_assets"
      )
      .select(
        "id, title"
      )
      .eq(
        "asset_type",
        "image"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(30),

    supabase
      .from(
        "ai_video_briefs"
      )
      .select(
        "id, title, prompt, source_image_asset_id, platform, aspect_ratio, desired_duration_seconds, visual_style, camera_motion, scene_instructions, audio_instructions, negative_instructions, status, generated_asset_id, last_error, created_at"
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
        "video_generation_jobs"
      )
      .select(
        "id, brief_id, status, progress, provider_job_id, created_at"
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
        "id, title, storage_bucket, storage_path, mime_type, file_size, model_name, created_at"
      )
      .eq(
        "asset_type",
        "video"
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

  const workspace =
    (workspaceResult.data as
      | WorkspaceState
      | null) ?? {
      default_platform:
        "linkedin",
    };

  const imageAssets =
    (imageAssetsResult.data as
      | ImageAsset[]
      | null) ?? [];

  const recentBriefs =
    (recentBriefsResult.data as
      | VideoBrief[]
      | null) ?? [];

  const recentJobs =
    (recentJobsResult.data as
      | VideoJob[]
      | null) ?? [];

  const recentVideos =
    (recentVideosResult.data as
      | MediaAsset[]
      | null) ?? [];

  let selectedBrief:
    | VideoBrief
    | null = null;

  if (briefId) {
    const {
      data,
    } = await supabase
      .from(
        "ai_video_briefs"
      )
      .select(
        "id, title, prompt, source_image_asset_id, platform, aspect_ratio, desired_duration_seconds, visual_style, camera_motion, scene_instructions, audio_instructions, negative_instructions, status, generated_asset_id, last_error, created_at"
      )
      .eq(
        "id",
        briefId
      )
      .maybeSingle();

    selectedBrief =
      data as
        | VideoBrief
        | null;
  }

  let selectedVideo:
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
        "id, title, storage_bucket, storage_path, mime_type, file_size, model_name, created_at"
      )
      .eq(
        "id",
        selectedBrief.generated_asset_id
      )
      .maybeSingle();

    selectedVideo =
      data as
        | MediaAsset
        | null;
  }

  const gallery =
    await withSignedUrls(
      recentVideos
    );

  const selectedSigned =
    selectedVideo
      ? (
          await withSignedUrls([
            selectedVideo,
          ])
        )[0] ??
        null
      : null;

  const hasCredentials =
    integration?.credential_status ===
    "configured";

  const hasProvider =
    Boolean(
      integration?.provider_name?.trim()
    );

  const hasModel =
    Boolean(
      integration?.model_name?.trim()
    );

  const isEnabled =
    Boolean(
      integration?.enabled
    );

  const configurationComplete =
    hasCredentials &&
    hasProvider &&
    hasModel &&
    isEnabled;

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

  const selectedJob =
    selectedBrief
      ? recentJobs.find(
          (job) =>
            job.brief_id ===
            selectedBrief?.id
        ) ?? null
      : null;

  const deleteBriefAction =
    selectedBrief &&
    !selectedBrief.generated_asset_id
      ? deleteVideoBrief.bind(
          null,
          selectedBrief.id
        )
      : null;

  const deleteVideoAction =
    selectedVideo
      ? deleteVideoAsset.bind(
          null,
          selectedVideo.id
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Producción audiovisual
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Video IA
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Prepara videos desde texto o una imagen de referencia sin atar
            ContentAI a un proveedor específico.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            Proveedor
          </p>

          <p className="mt-3 truncate text-sm font-semibold text-slate-800">
            {integration?.provider_name?.trim() ||
              "Pendiente"}
          </p>
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
            Conector
          </p>

          <p className="mt-3 text-sm font-semibold text-amber-700">
            Pendiente de proveedor
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-semibold text-sky-900">
          Arquitectura preparada para proveedor intercambiable
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-800">
          El cliente podrá definir proveedor y modelo desde Configuración.
          ContentAI ya tiene estructura para trabajos asíncronos, progreso,
          identificador externo, errores y resultado final, sin guardar
          secretos dentro de los trabajos.
        </p>
      </section>

      {configurationComplete && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Credenciales detectadas, conector todavía no activado
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            La configuración se conservará, pero ContentAI no enviará
            solicitudes hasta instalar el adaptador específico del proveedor
            elegido por el cliente.
          </p>
        </section>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <form
          action={
            saveVideoBrief
          }
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Brief de video
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define la idea creativa ahora; el mismo brief servirá para
                el proveedor que el cliente seleccione posteriormente.
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
                  placeholder="Ej: Video lanzamiento campaña agosto"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="prompt"
                  className="text-sm font-semibold text-slate-700"
                >
                  Descripción del video *
                </label>

                <textarea
                  id="prompt"
                  name="prompt"
                  rows={7}
                  required
                  minLength={8}
                  defaultValue={
                    selectedBrief?.prompt ??
                    ""
                  }
                  placeholder="Describe la acción, el entorno, los sujetos, la evolución de la escena y el resultado visual deseado..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="source_image_asset_id"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Imagen de referencia
                  </label>

                  <select
                    id="source_image_asset_id"
                    name="source_image_asset_id"
                    defaultValue={
                      selectedBrief?.source_image_asset_id ??
                      ""
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">
                      Sin imagen de referencia
                    </option>

                    {imageAssets.map(
                      (
                        asset
                      ) => (
                        <option
                          key={
                            asset.id
                          }
                          value={
                            asset.id
                          }
                        >
                          {asset.title ||
                            "Imagen sin título"}
                        </option>
                      )
                    )}
                  </select>

                  <p className="text-xs text-slate-400">
                    Las imágenes disponibles provienen de tu biblioteca
                    multimedia privada.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="platform"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Destino
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
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="aspect_ratio"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Orientación deseada
                  </label>

                  <select
                    id="aspect_ratio"
                    name="aspect_ratio"
                    defaultValue={
                      selectedBrief?.aspect_ratio ??
                      "landscape"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="landscape">
                      Horizontal
                    </option>

                    <option value="portrait">
                      Vertical
                    </option>

                    <option value="square">
                      Cuadrado
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="desired_duration_seconds"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Duración deseada
                  </label>

                  <input
                    id="desired_duration_seconds"
                    name="desired_duration_seconds"
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    defaultValue={
                      selectedBrief?.desired_duration_seconds ??
                      ""
                    }
                    placeholder="Ej: 10"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />

                  <p className="text-xs text-slate-400">
                    Es una preferencia del brief; el proveedor final
                    determinará qué duraciones admite.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="visual_style"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Estilo visual
                  </label>

                  <input
                    id="visual_style"
                    name="visual_style"
                    defaultValue={
                      selectedBrief?.visual_style ??
                      ""
                    }
                    placeholder="Ej: cinematográfico, corporativo, documental"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="camera_motion"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Movimiento de cámara
                  </label>

                  <input
                    id="camera_motion"
                    name="camera_motion"
                    defaultValue={
                      selectedBrief?.camera_motion ??
                      ""
                    }
                    placeholder="Ej: travelling lento hacia adelante"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="scene_instructions"
                  className="text-sm font-semibold text-slate-700"
                >
                  Desarrollo de escenas
                </label>

                <textarea
                  id="scene_instructions"
                  name="scene_instructions"
                  rows={4}
                  defaultValue={
                    selectedBrief?.scene_instructions ??
                    ""
                  }
                  placeholder="Describe cambios de plano, secuencia temporal, transiciones o acciones importantes..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="audio_instructions"
                  className="text-sm font-semibold text-slate-700"
                >
                  Audio / ambiente deseado
                </label>

                <textarea
                  id="audio_instructions"
                  name="audio_instructions"
                  rows={3}
                  defaultValue={
                    selectedBrief?.audio_instructions ??
                    ""
                  }
                  placeholder="Ej: ambiente de oficina suave, sin diálogo; música se añadirá en edición..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="negative_instructions"
                  className="text-sm font-semibold text-slate-700"
                >
                  Evitar
                </label>

                <input
                  id="negative_instructions"
                  name="negative_instructions"
                  defaultValue={
                    selectedBrief?.negative_instructions ??
                    ""
                  }
                  placeholder="Ej: logos inventados, texto ilegible, marcas de agua"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar brief
            </button>

            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl bg-slate-300 px-6 py-3 text-sm font-semibold text-white"
            >
              Proveedor de video pendiente
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          {selectedSigned?.signedUrl && (
            <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
                  Resultado
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {selectedSigned.title ||
                    "Video generado"}
                </h2>
              </div>

              <div className="bg-slate-950">
                <video
                  controls
                  preload="metadata"
                  src={
                    selectedSigned.signedUrl
                  }
                  className="aspect-video w-full bg-black object-contain"
                >
                  Tu navegador no puede reproducir este video.
                </video>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-2">
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

              {deleteVideoAction && (
                <form
                  action={
                    deleteVideoAction
                  }
                  className="px-5 pb-5"
                >
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Eliminar video
                  </button>
                </form>
              )}
            </section>
          )}

          {selectedBrief && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Brief seleccionado
                  </p>

                  <h2 className="mt-1 truncate font-semibold text-slate-950">
                    {selectedBrief.title}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {aspectLabel(
                      selectedBrief.aspect_ratio
                    )}
                    {selectedBrief.desired_duration_seconds
                      ? ` · ${selectedBrief.desired_duration_seconds}s`
                      : ""}
                  </p>
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

              {selectedJob && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Trabajo de generación
                  </p>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {statusLabel(
                        selectedJob.status
                      )}
                    </span>

                    <span>
                      {selectedJob.progress !==
                      null
                        ? `${selectedJob.progress}%`
                        : "Sin progreso"}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{
                        width: `${selectedJob.progress ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {deleteBriefAction &&
                !selectedBrief.generated_asset_id && (
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
                  Todavía no hay briefs de video.
                </p>
              ) : (
                recentBriefs.map(
                  (brief) => (
                    <Link
                      key={
                        brief.id
                      }
                      href={`/protected/video-generator?brief=${brief.id}`}
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
                            {aspectLabel(
                              brief.aspect_ratio
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

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Biblioteca multimedia
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Videos generados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              La galería ya está preparada para recibir archivos privados
              cuando exista un proveedor de video activo.
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
              Biblioteca de video preparada.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              No hay videos ficticios. Permanecerá vacía hasta que el
              cliente defina y conecte el proveedor.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {gallery.map(
              (
                asset
              ) => {
                const deleteAction =
                  deleteVideoAsset.bind(
                    null,
                    asset.id
                  );

                return (
                  <article
                    key={
                      asset.id
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200"
                  >
                    <div className="aspect-video bg-black">
                      {asset.signedUrl ? (
                        <video
                          controls
                          preload="metadata"
                          src={
                            asset.signedUrl
                          }
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-slate-400">
                          Vista previa no disponible
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {asset.title ||
                          "Video"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatFileSize(
                          asset.file_size
                        )}
                      </p>

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
                    </div>
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