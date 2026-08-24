import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PublicationRow = {
  id: string;
  platform: string;
  status: string;
  publication_date: string | null;
  publication_time: string | null;
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

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "Pendiente de revisión";
  if (status === "approved") return "Aprobado";
  if (status === "scheduled") return "Programado";
  if (status === "published") return "Publicado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function statusClasses(status: string) {
  if (status === "published") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (status === "scheduled") {
    return "bg-sky-50 text-sky-700 ring-sky-600/20";
  }

  if (status === "approved") {
    return "bg-violet-50 text-violet-700 ring-violet-600/20";
  }

  if (status === "review") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  if (status === "cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-600/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";
  return platform;
}

function getContent(
  value: PublicationRow["contents"]
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
  }>;
}) {
  const { created, deleted } = await searchParams;

  const supabase = await createClient();

  const [
    publicationsResult,
    canManageResult,
  ] = await Promise.all([
    supabase
      .from("publications")
      .select(
        "id, platform, status, publication_date, publication_time, updated_at, contents(id, title, body)"
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase.rpc("has_permission", {
      p_permission: "publication.manage",
    }),
  ]);

  const publications =
    (publicationsResult.data as PublicationRow[] | null) ?? [];

  const canManage = Boolean(
    canManageResult.data
  );

  const counts = {
    total: publications.length,
    review: publications.filter(
      (item) => item.status === "review"
    ).length,
    scheduled: publications.filter(
      (item) => item.status === "scheduled"
    ).length,
    published: publications.filter(
      (item) => item.status === "published"
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Flujo editorial
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Publicaciones
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Prepara, revisa, aprueba y programa los contenidos antes de
            conectarlos con LinkedIn y Facebook.
          </p>
        </div>

        {canManage && (
          <Link
            href="/protected/publications/create"
            className="inline-flex w-fit rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Preparar publicación
          </Link>
        )}
      </div>

      {created === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Publicación creada correctamente.
        </div>
      )}

      {deleted === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Publicación eliminada correctamente.
        </div>
      )}

      {publicationsResult.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron cargar las publicaciones:{" "}
          {publicationsResult.error.message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", counts.total],
          ["En revisión", counts.review],
          ["Programadas", counts.scheduled],
          ["Publicadas", counts.published],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              {label}
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      {publications.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl font-semibold text-indigo-600">
            ↗
          </div>

          <h2 className="mt-5 text-xl font-semibold text-slate-950">
            Aún no hay publicaciones
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Elige un contenido de la biblioteca y conviértelo en una pieza
            preparada para publicación.
          </p>

          {canManage && (
            <Link
              href="/protected/publications/create"
              className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Preparar primera publicación
            </Link>
          )}
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {publications.map((publication) => {
            const content = getContent(
              publication.contents
            );

            return (
              <article
                key={publication.id}
                className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {platformLabel(
                      publication.platform
                    )}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusClasses(
                      publication.status
                    )}`}
                  >
                    {statusLabel(
                      publication.status
                    )}
                  </span>
                </div>

                <h2 className="mt-5 line-clamp-2 text-xl font-semibold tracking-tight text-slate-950">
                  {content?.title ||
                    "Contenido sin título"}
                </h2>

                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                  {content?.body ||
                    "Sin texto disponible."}
                </p>

                <div className="mt-auto pt-6">
                  <div className="mb-4 text-xs text-slate-400">
                    {publication.publication_date
                      ? `Fecha: ${publication.publication_date}${
                          publication.publication_time
                            ? ` · ${publication.publication_time.slice(
                                0,
                                5
                              )}`
                            : ""
                        }`
                      : "Sin fecha programada"}
                  </div>

                  <Link
                    href={`/protected/publications/${publication.id}`}
                    className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Abrir publicación
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}