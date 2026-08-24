import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  deletePublication,
  updatePublication,
} from "./actions";

export const instant = false;

type PublicationDetail = {
  id: string;
  content_id: string;
  platform: string;
  status: string;
  publication_date: string | null;
  publication_time: string | null;
  internal_notes: string | null;
  hashtags: string | null;
  call_to_action: string | null;
  external_url: string | null;
  social_post_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  contents:
    | {
        id: string;
        title: string | null;
        body: string | null;
      }
    | {
        id: string;
        title: string | null;
        body: string | null;
      }[]
    | null;
};

const errorMessages: Record<string, string> = {
  forbidden:
    "No tienes permiso para modificar publicaciones.",
  platform:
    "La red social seleccionada no es válida.",
  status:
    "El estado seleccionado no es válido.",
  publish:
    "No tienes permiso para cambiar el estado Publicado.",
  schedule:
    "Una publicación programada necesita una fecha.",
  "not-found":
    "La publicación ya no existe.",
  database:
    "No se pudieron guardar los cambios.",
  delete:
    "No se pudo eliminar la publicación.",
};

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "Pendiente de revisión";
  if (status === "approved") return "Aprobado";
  if (status === "scheduled") return "Programado";
  if (status === "published") return "Publicado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function getContent(
  value: PublicationDetail["contents"]
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function PublicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();

  const [
    publicationResult,
    canManageResult,
    canPublishResult,
  ] = await Promise.all([
    supabase
      .from("publications")
      .select(
        "id, content_id, platform, status, publication_date, publication_time, internal_notes, hashtags, call_to_action, external_url, social_post_id, published_at, created_at, updated_at, contents(id, title, body)"
      )
      .eq("id", id)
      .maybeSingle(),

    supabase.rpc("has_permission", {
      p_permission: "publication.manage",
    }),

    supabase.rpc("has_permission", {
      p_permission: "publication.publish",
    }),
  ]);

  const publication =
    publicationResult.data as PublicationDetail | null;

  if (!publication) {
    notFound();
  }

  const content = getContent(
    publication.contents
  );

  const canManage = Boolean(
    canManageResult.data
  );

  const canPublish = Boolean(
    canPublishResult.data
  );

  const errorMessage = error
    ? errorMessages[error] ||
      "No se pudo completar la operación."
    : null;

  const boundUpdate =
    updatePublication.bind(
      null,
      publication.id
    );

  const boundDelete =
    deletePublication.bind(
      null,
      publication.id
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/protected/publications"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Volver a publicaciones
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              {statusLabel(
                publication.status
              )}
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {content?.title ||
                "Publicación sin título"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Administra el flujo editorial y la programación.
            </p>
          </div>

          <Link
            href={`/protected/library/${publication.content_id}`}
            className="w-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver contenido original
          </Link>
        </div>
      </div>

      {saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Publicación actualizada correctamente.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Vista previa del contenido
        </h2>

        <div className="mt-4 rounded-2xl bg-slate-50 p-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {content?.body ||
              "Este contenido no tiene texto."}
          </p>
        </div>
      </section>

      <form
        action={boundUpdate}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Estado y programación
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="platform"
                className="text-sm font-semibold text-slate-700"
              >
                Red social
              </label>

              <select
                id="platform"
                name="platform"
                defaultValue={
                  publication.platform
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
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
                htmlFor="status"
                className="text-sm font-semibold text-slate-700"
              >
                Estado
              </label>

              <select
                id="status"
                name="status"
                defaultValue={
                  publication.status
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
              >
                <option value="draft">
                  Borrador
                </option>
                <option value="review">
                  Pendiente de revisión
                </option>
                <option value="approved">
                  Aprobado
                </option>
                <option value="scheduled">
                  Programado
                </option>

                {(canPublish ||
                  publication.status ===
                    "published") && (
                  <option value="published">
                    Publicado
                  </option>
                )}

                <option value="cancelled">
                  Cancelado
                </option>
              </select>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {publication.published_at
                ? `Publicado: ${new Intl.DateTimeFormat(
                    "es",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  ).format(
                    new Date(
                      publication.published_at
                    )
                  )}`
                : "Todavía no marcado como publicado."}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="publication_date"
                className="text-sm font-semibold text-slate-700"
              >
                Fecha
              </label>

              <input
                id="publication_date"
                name="publication_date"
                type="date"
                defaultValue={
                  publication.publication_date ??
                  ""
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="publication_time"
                className="text-sm font-semibold text-slate-700"
              >
                Hora
              </label>

              <input
                id="publication_time"
                name="publication_time"
                type="time"
                defaultValue={
                  publication.publication_time
                    ? publication.publication_time.slice(
                        0,
                        5
                      )
                    : ""
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Datos de publicación
          </h2>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="internal_notes"
                className="text-sm font-semibold text-slate-700"
              >
                Notas internas
              </label>

              <textarea
                id="internal_notes"
                name="internal_notes"
                rows={4}
                defaultValue={
                  publication.internal_notes ??
                  ""
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="hashtags"
                  className="text-sm font-semibold text-slate-700"
                >
                  Hashtags
                </label>

                <input
                  id="hashtags"
                  name="hashtags"
                  defaultValue={
                    publication.hashtags ??
                    ""
                  }
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                />
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
                    publication.call_to_action ??
                    ""
                  }
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="external_url"
                className="text-sm font-semibold text-slate-700"
              >
                Enlace
              </label>

              <input
                id="external_url"
                name="external_url"
                type="url"
                defaultValue={
                  publication.external_url ??
                  ""
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>
        </section>

        {canManage && (
          <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar cambios
            </button>
          </div>
        )}
      </form>

      {(canManage || canPublish) && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
          <p className="text-sm font-semibold text-indigo-700">
            Entrega social
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Motor de publicación
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Selecciona las cuentas de LinkedIn/Facebook, revisa el estado
            de entrega y publica únicamente cuando la pieza esté aprobada.
          </p>

          <Link
            href={`/protected/publications/${publication.id}/delivery`}
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Abrir motor de publicación
          </Link>
        </section>
      )}
      {canManage && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
          <h2 className="text-lg font-semibold text-rose-900">
            Eliminar publicación
          </h2>

          <p className="mt-2 text-sm text-rose-700">
            El contenido original de la biblioteca no se eliminará.
          </p>

          <form
            action={boundDelete}
            className="mt-5"
          >
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Eliminar publicación
            </button>
          </form>
        </section>
      )}
    </div>
  );
}