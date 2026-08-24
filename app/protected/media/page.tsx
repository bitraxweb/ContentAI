import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type SearchParams = {
  type?: string;
  source?: string;
  favorite?: string;
  state?: string;
  q?: string;
  sort?: string;
  page?: string;
  notice?: string;
  error?: string;
};

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
  tags: string[];
  is_favorite: boolean;
  archived: boolean;
  created_at: string;
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

type MediaWithUrl =
  MediaAsset & {
    signedUrl:
      | string
      | null;
  };

const pageSize = 18;

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
  if (value === "image") {
    return "Imagen";
  }

  if (value === "audio") {
    return "Audio";
  }

  if (value === "video") {
    return "Video";
  }

  return value;
}

function sourceLabel(
  value: string
) {
  if (value === "ai") {
    return "IA";
  }

  if (value === "upload") {
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

function buildHref(
  params: {
    type: string;
    source: string;
    favorite: string;
    state: string;
    q: string;
    sort: string;
    page?: number;
  }
) {
  const query =
    new URLSearchParams();

  if (
    params.type !==
    "all"
  ) {
    query.set(
      "type",
      params.type
    );
  }

  if (
    params.source !==
    "all"
  ) {
    query.set(
      "source",
      params.source
    );
  }

  if (
    params.favorite ===
    "yes"
  ) {
    query.set(
      "favorite",
      "yes"
    );
  }

  if (
    params.state !==
    "active"
  ) {
    query.set(
      "state",
      params.state
    );
  }

  if (params.q) {
    query.set(
      "q",
      params.q
    );
  }

  if (
    params.sort !==
    "newest"
  ) {
    query.set(
      "sort",
      params.sort
    );
  }

  if (
    params.page &&
    params.page > 1
  ) {
    query.set(
      "page",
      String(
        params.page
      )
    );
  }

  const suffix =
    query.toString();

  return suffix
    ? `/protected/media?${suffix}`
    : "/protected/media";
}

async function addSignedUrls(
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

function Preview({
  asset,
}: {
  asset: MediaWithUrl;
}) {
  if (
    !asset.signedUrl
  ) {
    return (
      <div className="grid aspect-video place-items-center bg-slate-100 p-5 text-center text-xs text-slate-400">
        Vista previa no disponible
      </div>
    );
  }

  if (
    asset.asset_type ===
    "image"
  ) {
    return (
      <div className="aspect-video bg-slate-100">
        <img
          src={
            asset.signedUrl
          }
          alt={
            asset.title ||
            "Imagen multimedia"
          }
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (
    asset.asset_type ===
    "audio"
  ) {
    return (
      <div className="grid aspect-video place-items-center bg-slate-950 p-5">
        <div className="w-full">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/10 text-2xl text-white">
            ♪
          </div>

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
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black">
      <video
        controls
        preload="metadata"
        src={
          asset.signedUrl
        }
        className="h-full w-full object-contain"
      >
        Tu navegador no puede reproducir este video.
      </video>
    </div>
  );
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params =
    await searchParams;

  const type =
    ["image", "audio", "video"].includes(
      params.type ?? ""
    )
      ? params.type!
      : "all";

  const source =
    ["ai", "upload"].includes(
      params.source ?? ""
    )
      ? params.source!
      : "all";

  const favorite =
    params.favorite ===
    "yes"
      ? "yes"
      : "all";

  const state =
    ["all", "archived"].includes(
      params.state ?? ""
    )
      ? params.state!
      : "active";

  const sort =
    ["oldest", "name"].includes(
      params.sort ?? ""
    )
      ? params.sort!
      : "newest";

  const search =
    (params.q ?? "")
      .trim()
      .slice(
        0,
        80
      );

  const parsedPage =
    Number(
      params.page ?? "1"
    );

  const page =
    Number.isInteger(
      parsedPage
    ) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const offset =
    (page - 1) *
    pageSize;

  const supabase =
    await createClient();

  let mediaQuery =
    supabase
      .from("media_assets")
      .select(
        "id, user_id, asset_type, source, title, description, storage_bucket, storage_path, mime_type, file_size, provider_key, model_name, tags, is_favorite, archived, created_at, profiles(full_name, email)",
        {
          count: "exact",
        }
      );

  if (
    type !== "all"
  ) {
    mediaQuery =
      mediaQuery.eq(
        "asset_type",
        type
      );
  }

  if (
    source !== "all"
  ) {
    mediaQuery =
      mediaQuery.eq(
        "source",
        source
      );
  }

  if (
    favorite === "yes"
  ) {
    mediaQuery =
      mediaQuery.eq(
        "is_favorite",
        true
      );
  }

  if (
    state === "active"
  ) {
    mediaQuery =
      mediaQuery.eq(
        "archived",
        false
      );
  }
  else if (
    state === "archived"
  ) {
    mediaQuery =
      mediaQuery.eq(
        "archived",
        true
      );
  }

  if (search) {
    mediaQuery =
      mediaQuery.ilike(
        "title",
        `%${search}%`
      );
  }

  if (
    sort === "oldest"
  ) {
    mediaQuery =
      mediaQuery.order(
        "created_at",
        {
          ascending:
            true,
        }
      );
  }
  else if (
    sort === "name"
  ) {
    mediaQuery =
      mediaQuery.order(
        "title",
        {
          ascending:
            true,
          nullsFirst:
            false,
        }
      );
  }
  else {
    mediaQuery =
      mediaQuery.order(
        "created_at",
        {
          ascending:
            false,
        }
      );
  }

  mediaQuery =
    mediaQuery.range(
      offset,
      offset +
        pageSize -
        1
    );

  const [
    mediaResult,
    totalResult,
    imageResult,
    audioResult,
    videoResult,
  ] = await Promise.all([
    mediaQuery,

    supabase
      .from("media_assets")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "archived",
        false
      ),

    supabase
      .from("media_assets")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "asset_type",
        "image"
      )
      .eq(
        "archived",
        false
      ),

    supabase
      .from("media_assets")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "asset_type",
        "audio"
      )
      .eq(
        "archived",
        false
      ),

    supabase
      .from("media_assets")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "asset_type",
        "video"
      )
      .eq(
        "archived",
        false
      ),
  ]);

  const assets =
    (mediaResult.data as
      | MediaAsset[]
      | null) ?? [];

  const media =
    await addSignedUrls(
      assets
    );

  const totalFiltered =
    mediaResult.count ?? 0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalFiltered /
        pageSize
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  const notice =
    params.notice;

  const error =
    params.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Archivos del workspace
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Biblioteca multimedia
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Centraliza imágenes, audios y videos generados por ContentAI.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/protected/image-generator"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Imagen
          </Link>

          <Link
            href="/protected/audio-generator"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Audio
          </Link>

          <Link
            href="/protected/video-generator"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Video
          </Link>
        </div>
      </div>

      {notice ===
        "deleted" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Archivo multimedia eliminado correctamente.
        </div>
      )}

      {notice ===
        "deleted-storage-warning" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          El registro se eliminó, pero Storage devolvió un aviso. El archivo
          ya no aparece en la biblioteca y conviene revisar Storage después.
        </div>
      )}

      {error ===
        "not-found" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          No se encontró el archivo solicitado.
        </div>
      )}

      {mediaResult.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudo cargar la biblioteca:{" "}
          {mediaResult.error.message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Todos",
            totalResult.count ?? 0,
            "all",
          ],
          [
            "Imágenes",
            imageResult.count ?? 0,
            "image",
          ],
          [
            "Audios",
            audioResult.count ?? 0,
            "audio",
          ],
          [
            "Videos",
            videoResult.count ?? 0,
            "video",
          ],
        ].map(
          ([
            label,
            value,
            valueType,
          ]) => (
            <Link
              key={
                String(
                  label
                )
              }
              href={buildHref({
                type:
                  String(
                    valueType
                  ),
                source,
                favorite,
                state:
                  "active",
                q:
                  search,
                sort,
              })}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:border-indigo-200 ${
                type ===
                valueType
                  ? "border-indigo-300 ring-2 ring-indigo-100"
                  : "border-slate-200"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950">
                {value}
              </p>
            </Link>
          )
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="get"
          className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,auto))_auto]"
        >
          <input
            name="q"
            defaultValue={
              search
            }
            placeholder="Buscar por título..."
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400"
          />

          <select
            name="type"
            defaultValue={
              type
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="all">
              Todos los tipos
            </option>

            <option value="image">
              Imágenes
            </option>

            <option value="audio">
              Audios
            </option>

            <option value="video">
              Videos
            </option>
          </select>

          <select
            name="source"
            defaultValue={
              source
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="all">
              Cualquier origen
            </option>

            <option value="ai">
              Generado con IA
            </option>

            <option value="upload">
              Carga manual
            </option>
          </select>

          <select
            name="favorite"
            defaultValue={
              favorite
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="all">
              Todos
            </option>

            <option value="yes">
              Solo favoritos
            </option>
          </select>

          <select
            name="state"
            defaultValue={
              state
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="active">
              Activos
            </option>

            <option value="archived">
              Archivados
            </option>

            <option value="all">
              Activos + archivados
            </option>
          </select>

          <div className="flex gap-2">
            <select
              name="sort"
              defaultValue={
                sort
              }
              className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="newest">
                Más recientes
              </option>

              <option value="oldest">
                Más antiguos
              </option>

              <option value="name">
                Por nombre
              </option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Filtrar
            </button>
          </div>
        </form>
      </section>

      {media.length ===
      0 ? (
        <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-800">
            No hay archivos con estos filtros.
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Si las credenciales siguen vacías, es normal que la biblioteca
            todavía no contenga archivos generados.
          </p>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {media.map(
            (
              asset
            ) => (
              <article
                key={
                  asset.id
                }
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  asset.archived
                    ? "border-slate-200 opacity-70"
                    : asset.is_favorite
                      ? "border-amber-300 ring-2 ring-amber-100"
                      : "border-slate-200"
                }`}
              >
                <Preview
                  asset={
                    asset
                  }
                />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {typeLabel(
                            asset.asset_type
                          )}
                        </span>

                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                          {sourceLabel(
                            asset.source
                          )}
                        </span>

                        {asset.is_favorite && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            ★ Favorito
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 truncate text-base font-semibold text-slate-950">
                        {asset.title ||
                          `${typeLabel(
                            asset.asset_type
                          )} sin título`}
                      </h2>

                      <p className="mt-1 text-xs text-slate-400">
                        {ownerName(
                          asset.profiles
                        )}{" "}
                        ·{" "}
                        {formatFileSize(
                          asset.file_size
                        )}
                      </p>
                    </div>
                  </div>

                  {asset.tags.length >
                    0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {asset.tags
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            tag
                          ) => (
                            <span
                              key={
                                tag
                              }
                              className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500"
                            >
                              #
                              {tag}
                            </span>
                          )
                        )}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-[10px] text-slate-400">
                      {new Intl.DateTimeFormat(
                        "es",
                        {
                          dateStyle:
                            "medium",
                        }
                      ).format(
                        new Date(
                          asset.created_at
                        )
                      )}
                    </p>

                    <Link
                      href={`/protected/media/${asset.id}`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Abrir →
                    </Link>
                  </div>
                </div>
              </article>
            )
          )}
        </section>
      )}

      {totalPages >
        1 && (
        <nav className="flex items-center justify-center gap-3">
          {currentPage >
            1 && (
            <Link
              href={buildHref({
                type,
                source,
                favorite,
                state,
                q:
                  search,
                sort,
                page:
                  currentPage -
                  1,
              })}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              ← Anterior
            </Link>
          )}

          <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600">
            Página{" "}
            {currentPage}{" "}
            de{" "}
            {totalPages}
          </span>

          {currentPage <
            totalPages && (
            <Link
              href={buildHref({
                type,
                source,
                favorite,
                state,
                q:
                  search,
                sort,
                page:
                  currentPage +
                  1,
              })}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}