import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type ContentItem = {
  id: string;
  title: string | null;
  body: string | null;
  content_type: string;
  platform: string;
  status: string;
  generated_by_ai: boolean;
  created_at: string;
};

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";
  return platform;
}

function contentTypeLabel(type: string) {
  if (type === "post") return "Publicación";
  if (type === "video_script") return "Guion de video";
  if (type === "title") return "Título";
  if (type === "description") return "Descripción";
  if (type === "promotional_phrase") return "Frase promocional";
  if (type === "idea") return "Idea";
  return type;
}

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "En revisión";
  if (status === "approved") return "Aprobado";
  if (status === "archived") return "Archivado";
  return status;
}

function statusClasses(status: string) {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }
  if (status === "review") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
  if (status === "archived") {
    return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
  return "bg-indigo-50 text-indigo-700 ring-indigo-600/20";
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contents")
    .select(
      "id, title, body, content_type, platform, status, generated_by_ai, created_at"
    )
    .order("created_at", { ascending: false });

  const contents = (data as ContentItem[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Biblioteca
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Todos tus contenidos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Revisa, organiza y edita el material guardado.
          </p>
        </div>

        <Link
          href="/protected/create"
          className="inline-flex w-fit rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Crear contenido
        </Link>
      </div>

      {deleted === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Contenido eliminado correctamente.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudo cargar la biblioteca: {error.message}
        </div>
      )}

      {!error && contents.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
            +
          </div>

          <h2 className="mt-5 text-xl font-semibold text-slate-950">
            Tu biblioteca está vacía
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Crea tu primer contenido y aparecerá automáticamente en este
            espacio.
          </p>

          <Link
            href="/protected/create"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Crear contenido
          </Link>
        </div>
      )}

      {!error && contents.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                Inventario
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {contents.length} contenido{contents.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              Orden: más recientes
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {contents.map((content) => (
              <article
                key={content.id}
                className="group flex min-h-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
              >
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {platformLabel(content.platform)}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {contentTypeLabel(content.content_type)}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusClasses(
                        content.status
                      )}`}
                    >
                      {statusLabel(content.status)}
                    </span>

                    {content.generated_by_ai && (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                        IA
                      </span>
                    )}
                  </div>

                  <h2 className="mt-5 line-clamp-2 text-xl font-semibold tracking-tight text-slate-950">
                    {content.title || "Sin título"}
                  </h2>

                  <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                    {content.body || "Este contenido no tiene texto."}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-7">
                    <time className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat("es", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(content.created_at))}
                    </time>

                    <Link
                      href={`/protected/library/${content.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700"
                    >
                      Abrir / Editar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}