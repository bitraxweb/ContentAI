import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  deleteImageBrief,
  deleteMediaAsset,
  generateAIImage,
  saveImageBrief,
} from "./actions";

export const instant = false;
export const maxDuration = 180;

type IntegrationState = {
  enabled: boolean;
  provider_name: string | null;
  model_name: string | null;
  credential_status: string;
};

type WorkspaceState = {
  default_platform: string;
};

type ImageBrief = {
  id: string;
  title: string;
  prompt: string;
  platform: string;
  visual_style: string | null;
  composition: string | null;
  brand_context: string | null;
  negative_instructions: string | null;
  image_size: string;
  image_quality: string;
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
  created_at: string;
};

type MediaWithUrl = MediaAsset & {
  signedUrl: string | null;
};

const errorMessages: Record<
  string,
  string
> = {
  title:
    "Escribe un nombre para identificar esta imagen.",
  prompt:
    "Describe con más detalle la imagen que necesitas.",
  platform:
    "La red seleccionada no es válida.",
  size:
    "El tamaño de imagen seleccionado no es válido.",
  quality:
    "La calidad seleccionada no es válida.",
  format:
    "El formato seleccionado no es válido.",
  "brief-save":
    "No se pudo guardar el brief de imagen.",
  "credential-read":
    "La credencial está configurada, pero el backend no pudo leerla.",
  "provider-network":
    "No se pudo conectar con el proveedor de imágenes.",
  "provider-response":
    "El proveedor devolvió una respuesta no válida.",
  "provider-error":
    "El proveedor rechazó la generación. Revisa la cuenta, clave, modelo o prompt.",
  "empty-output":
    "El proveedor no devolvió una imagen utilizable.",
  "storage-bucket":
    "No se pudo preparar el almacenamiento privado.",
  "storage-upload":
    "La imagen se generó, pero no pudo guardarse en Storage.",
  "asset-save":
    "La imagen se generó, pero no se pudieron guardar sus datos en la biblioteca multimedia.",
  "brief-has-image":
    "Este brief ya tiene una imagen generada. Elimina primero la imagen.",
  "brief-delete":
    "No se pudo eliminar el brief.",
  "asset-not-found":
    "No se encontró la imagen.",
  "asset-storage-delete":
    "No se pudo eliminar el archivo almacenado.",
  "asset-database-delete":
    "El archivo fue eliminado, pero no se pudieron borrar sus metadatos.",
};

const noticeMessages: Record<
  string,
  string
> = {
  "brief-saved":
    "Brief de imagen guardado. Podrás generarlo cuando el cliente configure el proveedor.",
  "credentials-missing":
    "Brief guardado. La generación permanece pendiente porque todavía no hay una API key.",
  "integration-disabled":
    "Brief guardado. La integración de imágenes está desactivada.",
  "model-missing":
    "Brief guardado. Falta configurar el modelo de imagen.",
  "provider-pending":
    "Brief guardado. El proveedor indicado todavía no tiene un conector implementado.",
  "model-unsupported":
    "Brief guardado. El conector actual está preparado para modelos GPT Image.",
  generated:
    "Imagen generada y guardada en el almacenamiento privado.",
  "brief-deleted":
    "Brief eliminado correctamente.",
  "image-deleted":
    "Imagen eliminada correctamente.",
};

function statusLabel(
  status: string
) {
  if (status === "prepared") {
    return "Preparado";
  }

  if (status === "generating") {
    return "Generando";
  }

  if (status === "generated") {
    return "Generado";
  }

  if (status === "failed") {
    return "Error";
  }

  return status;
}

function statusClasses(
  status: string
) {
  if (status === "generated") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "generating") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "failed") {
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

  if (bytes < 1024 * 1024) {
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
  if (assets.length === 0) {
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

export default async function ImageGeneratorPage({
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
        "image_ai"
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
        "ai_image_briefs"
      )
      .select(
        "id, title, prompt, platform, visual_style, composition, brand_context, negative_instructions, image_size, image_quality, output_format, status, generated_asset_id, last_error, created_at"
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
        "image"
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

  const recentBriefs =
    (recentBriefsResult.data as
      | ImageBrief[]
      | null) ?? [];

  const recentAssets =
    (recentAssetsResult.data as
      | MediaAsset[]
      | null) ?? [];

  let selectedBrief:
    | ImageBrief
    | null = null;

  if (briefId) {
    const {
      data,
    } = await supabase
      .from(
        "ai_image_briefs"
      )
      .select(
        "id, title, prompt, platform, visual_style, composition, brand_context, negative_instructions, image_size, image_quality, output_format, status, generated_asset_id, last_error, created_at"
      )
      .eq(
        "id",
        briefId
      )
      .maybeSingle();

    selectedBrief =
      data as
        | ImageBrief
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
        "id, title, storage_bucket, storage_path, mime_type, file_size, model_name, created_at"
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

  const providerName =
    integration?.provider_name?.trim() ??
    "";

  const providerSupported =
    providerName
      .toLowerCase()
      .includes("openai") ||
    (
      integration?.model_name
        ?.trim()
        .toLowerCase()
        .startsWith(
          "gpt-image"
        ) ??
      false
    );

  const aiReady =
    hasCredentials &&
    hasModel &&
    isEnabled &&
    providerSupported;

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
      ? deleteImageBrief.bind(
          null,
          selectedBrief.id
        )
      : null;

  const deleteSelectedAssetAction =
    selectedAsset
      ? deleteMediaAsset.bind(
          null,
          selectedAsset.id
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Creatividad visual
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Generador de imágenes
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Prepara prompts visuales y genera piezas cuando el cliente
            conecte su proveedor de imágenes.
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
            {integration?.model_name?.trim() ||
              "Pendiente"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Motor de imagen
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
            Todo está preparado, pero no se generará ninguna imagen todavía.
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Puedes guardar briefs desde ahora. La generación quedará activa
            cuando el cliente guarde la API key, indique el proveedor y
            modelo, y habilite la integración.
          </p>
        </section>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <form className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Brief visual
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Describe la pieza sin depender de datos que el cliente aún
                no ha proporcionado.
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
                  placeholder="Ej: Imagen campaña transformación digital"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="prompt"
                  className="text-sm font-semibold text-slate-700"
                >
                  Descripción de la imagen *
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
                  placeholder="Describe la escena, elementos principales, ambiente, iluminación y mensaje visual..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
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
                    placeholder="Ej: fotografía corporativa moderna"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="composition"
                  className="text-sm font-semibold text-slate-700"
                >
                  Composición
                </label>

                <input
                  id="composition"
                  name="composition"
                  defaultValue={
                    selectedBrief?.composition ??
                    ""
                  }
                  placeholder="Ej: sujeto a la izquierda y espacio libre a la derecha"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="brand_context"
                  className="text-sm font-semibold text-slate-700"
                >
                  Contexto de marca
                </label>

                <textarea
                  id="brand_context"
                  name="brand_context"
                  rows={4}
                  defaultValue={
                    selectedBrief?.brand_context ??
                    ""
                  }
                  placeholder="Cuando el cliente entregue sus lineamientos, colores, estilo y contexto, podrán colocarse aquí."
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
                  placeholder="Ej: texto pequeño, marcas de agua, estética caricaturesca"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    htmlFor="image_size"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Formato
                  </label>

                  <select
                    id="image_size"
                    name="image_size"
                    defaultValue={
                      selectedBrief?.image_size ??
                      "1024x1024"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="1024x1024">
                      Cuadrada · 1024×1024
                    </option>

                    <option value="1536x1024">
                      Horizontal · 1536×1024
                    </option>

                    <option value="1024x1536">
                      Vertical · 1024×1536
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="image_quality"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Calidad
                  </label>

                  <select
                    id="image_quality"
                    name="image_quality"
                    defaultValue={
                      selectedBrief?.image_quality ??
                      "medium"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="low">
                      Baja
                    </option>

                    <option value="medium">
                      Media
                    </option>

                    <option value="high">
                      Alta
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="output_format"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Archivo
                  </label>

                  <select
                    id="output_format"
                    name="output_format"
                    defaultValue={
                      selectedBrief?.output_format ??
                      "png"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="png">
                      PNG
                    </option>

                    <option value="jpeg">
                      JPEG
                    </option>

                    <option value="webp">
                      WebP
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="submit"
              formAction={
                saveImageBrief
              }
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Guardar brief
            </button>

            <button
              type="submit"
              formAction={
                generateAIImage
              }
              disabled={
                !aiReady
              }
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {aiReady
                ? "Generar imagen"
                : "IA pendiente de credenciales"}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          {selectedSigned?.signedUrl && (
            <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
                      Resultado
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      {selectedSigned.title ||
                        "Imagen generada"}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClasses(
                      selectedBrief?.status ??
                        "generated"
                    )}`}
                  >
                    {statusLabel(
                      selectedBrief?.status ??
                        "generated"
                    )}
                  </span>
                </div>
              </div>

              <div className="border-y border-slate-100 bg-slate-50 p-3">
                <img
                  src={
                    selectedSigned.signedUrl
                  }
                  alt={
                    selectedSigned.title ||
                    "Imagen generada"
                  }
                  className="mx-auto max-h-[520px] w-full rounded-xl object-contain"
                />
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
                    Tamaño del archivo
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
                  className="px-5 pb-5"
                >
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Eliminar imagen
                  </button>
                </form>
              )}
            </section>
          )}

          {selectedBrief &&
            !selectedBrief.generated_asset_id && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Brief seleccionado
                    </p>

                    <h2 className="mt-1 truncate font-semibold text-slate-950">
                      {selectedBrief.title}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClasses(
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
                  Todavía no hay briefs de imagen.
                </p>
              ) : (
                recentBriefs.map(
                  (brief) => (
                    <Link
                      key={
                        brief.id
                      }
                      href={`/protected/image-generator?brief=${brief.id}`}
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
                            {brief.image_size} ·{" "}
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
              Imágenes generadas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Los archivos se almacenan de forma privada en Supabase
              Storage.
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
              La biblioteca de imágenes está preparada.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Permanecerá vacía hasta que el cliente configure el proveedor
              y genere la primera imagen.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {gallery.map(
              (asset) => {
                const deleteAction =
                  deleteMediaAsset.bind(
                    null,
                    asset.id
                  );

                return (
                  <article
                    key={
                      asset.id
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="aspect-square bg-slate-100">
                      {asset.signedUrl ? (
                        <img
                          src={
                            asset.signedUrl
                          }
                          alt={
                            asset.title ||
                            "Imagen generada"
                          }
                          className="h-full w-full object-cover"
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
                          "Imagen"}
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
                        className="mt-3"
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