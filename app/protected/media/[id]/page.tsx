import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  deleteMediaAsset,
  updateMediaAsset,
} from "../actions";

export const instant = false;

type MediaAsset = {
  id: string;
  user_id: string;
  asset_type: string;
  source: string;
  title: string | null;
  description: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  provider_key: string | null;
  model_name: string | null;
  prompt: string | null;
  metadata: Record<
    string,
    unknown
  > | null;
  tags: string[];
  is_favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  profiles:
    | {
        full_name: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | null;
};

const errorMessages: Record<
  string,
  string
> = {
  "forbidden-update":
    "No tienes permiso para modificar este archivo.",
  "forbidden-delete":
    "No tienes permiso para eliminar este archivo.",
  database:
    "No se pudieron guardar los cambios.",
  "database-delete":
    "No se pudo eliminar el archivo.",
};

function ownerName(
  value: MediaAsset["profiles"]
) {
  if (!value) {
    return "Usuario";
  }

  const profile =
    Array.isArray(value)
      ? value[0]
      : value;

  return (
    profile?.full_name?.trim() ||
    profile?.email?.trim() ||
    "Usuario"
  );
}

function typeLabel(
  value: string
) {
  if (
    value === "image"
  ) {
    return "Imagen";
  }

  if (
    value === "audio"
  ) {
    return "Audio";
  }

  if (
    value === "video"
  ) {
    return "Video";
  }

  return value;
}

function sourceLabel(
  value: string
) {
  if (
    value === "ai"
  ) {
    return "Generado con IA";
  }

  if (
    value === "upload"
  ) {
    return "Carga manual";
  }

  return value;
}

function formatFileSize(
  bytes:
    | number
    | null
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

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
  }

  const [
    assetResult,
    manageOwnResult,
    manageAllResult,
    deleteOwnResult,
    deleteAllResult,
  ] = await Promise.all([
    supabase
      .from("media_assets")
      .select(
        "id, user_id, asset_type, source, title, description, storage_bucket, storage_path, mime_type, file_size, provider_key, model_name, prompt, metadata, tags, is_favorite, archived, created_at, updated_at, profiles(full_name, email)"
      )
      .eq(
        "id",
        id
      )
      .maybeSingle(),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.manage_own",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.manage_all",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.delete_own",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.delete_all",
      }
    ),
  ]);

  const asset =
    assetResult.data as
      | MediaAsset
      | null;

  if (!asset) {
    redirect(
      "/protected/media?error=not-found"
    );
  }

  const canManage =
    Boolean(
      manageAllResult.data
    ) ||
    (
      asset.user_id ===
        userId &&
      Boolean(
        manageOwnResult.data
      )
    );

  const canDelete =
    Boolean(
      deleteAllResult.data
    ) ||
    (
      asset.user_id ===
        userId &&
      Boolean(
        deleteOwnResult.data
      )
    );

  const admin =
    createAdminClient();

  const {
    data: signedData,
  } =
    await admin.storage
      .from(
        asset.storage_bucket
      )
      .createSignedUrl(
        asset.storage_path,
        60 * 60
      );

  const signedUrl =
    signedData?.signedUrl ??
    null;

  const updateAction =
    updateMediaAsset.bind(
      null,
      asset.id
    );

  const deleteAction =
    deleteMediaAsset.bind(
      null,
      asset.id
    );

  const errorMessage =
    query.error
      ? errorMessages[
          query.error
        ] ||
        "No se pudo completar la operación."
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/protected/media"
            className="text-sm font-semibold text-indigo-600"
          >
            ← Biblioteca multimedia
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {asset.title ||
              `${typeLabel(
                asset.asset_type
              )} sin título`}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {typeLabel(
              asset.asset_type
            )}{" "}
            ·{" "}
            {sourceLabel(
              asset.source
            )}{" "}
            ·{" "}
            {ownerName(
              asset.profiles
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {asset.is_favorite && (
            <span className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
              ★ Favorito
            </span>
          )}

          {asset.archived && (
            <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600">
              Archivado
            </span>
          )}
        </div>
      </div>

      {query.saved ===
        "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Metadatos guardados correctamente.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Vista previa privada
            </p>
          </div>

          {!signedUrl ? (
            <div className="grid min-h-96 place-items-center bg-slate-50 p-8 text-center text-sm text-slate-400">
              No se pudo crear la vista previa temporal.
            </div>
          ) : asset.asset_type ===
            "image" ? (
            <div className="bg-slate-100 p-4">
              <img
                src={
                  signedUrl
                }
                alt={
                  asset.title ||
                  "Imagen multimedia"
                }
                className="mx-auto max-h-[720px] w-full rounded-xl object-contain"
              />
            </div>
          ) : asset.asset_type ===
            "audio" ? (
            <div className="grid min-h-80 place-items-center bg-slate-950 p-8">
              <div className="w-full max-w-2xl">
                <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-white/10 text-4xl text-white">
                  ♪
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={
                    signedUrl
                  }
                  className="w-full"
                />

                {asset.source ===
                  "ai" && (
                  <p className="mt-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Voz / audio generado por IA
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-black">
              <video
                controls
                preload="metadata"
                src={
                  signedUrl
                }
                className="mx-auto max-h-[720px] w-full object-contain"
              />
            </div>
          )}

          <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Tipo",
                typeLabel(
                  asset.asset_type
                ),
              ],
              [
                "Tamaño",
                formatFileSize(
                  asset.file_size
                ),
              ],
              [
                "Proveedor",
                asset.provider_key ||
                  "—",
              ],
              [
                "Modelo",
                asset.model_name ||
                  "—",
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={
                    label
                  }
                  className="rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>

                  <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                    {value}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Organización
            </h2>

            <form
              action={
                updateAction
              }
              className="mt-5 space-y-4"
            >
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-semibold text-slate-700"
                >
                  Título
                </label>

                <input
                  id="title"
                  name="title"
                  defaultValue={
                    asset.title ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  maxLength={180}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-semibold text-slate-700"
                >
                  Descripción
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={
                    asset.description ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  maxLength={2000}
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="tags"
                  className="text-sm font-semibold text-slate-700"
                >
                  Etiquetas
                </label>

                <input
                  id="tags"
                  name="tags"
                  defaultValue={
                    asset.tags.join(
                      ", "
                    )
                  }
                  disabled={
                    !canManage
                  }
                  placeholder="campaña, producto, agosto"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50"
                />

                <p className="text-xs text-slate-400">
                  Separa las etiquetas con comas.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                  <input
                    name="is_favorite"
                    type="checkbox"
                    defaultChecked={
                      asset.is_favorite
                    }
                    disabled={
                      !canManage
                    }
                  />
                  Favorito
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                  <input
                    name="archived"
                    type="checkbox"
                    defaultChecked={
                      asset.archived
                    }
                    disabled={
                      !canManage
                    }
                  />
                  Archivado
                </label>
              </div>

              {canManage && (
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar cambios
                </button>
              )}
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Información técnica
            </h2>

            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  MIME
                </dt>

                <dd className="mt-1 break-all text-sm text-slate-700">
                  {asset.mime_type ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Creado
                </dt>

                <dd className="mt-1 text-sm text-slate-700">
                  {new Intl.DateTimeFormat(
                    "es",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    }
                  ).format(
                    new Date(
                      asset.created_at
                    )
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Ruta privada
                </dt>

                <dd className="mt-1 break-all rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-500">
                  {asset.storage_path}
                </dd>
              </div>
            </dl>
          </section>

          {asset.prompt && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                Prompt de origen
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {asset.prompt}
              </p>
            </section>
          )}

          {canDelete && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="font-semibold text-rose-900">
                Eliminar archivo
              </h2>

              <p className="mt-2 text-xs leading-5 text-rose-700">
                Elimina el registro y después intenta borrar también el
                archivo almacenado en Storage.
              </p>

              <form
                action={
                  deleteAction
                }
                className="mt-4"
              >
                <button
                  type="submit"
                  className="w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Eliminar definitivamente
                </button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}