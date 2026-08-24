import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type RecentContent = {
  id: string;
  title: string | null;
  platform: string;
  status: string;
  created_at: string;
};

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";
  return platform;
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    totalResult,
    draftResult,
    reviewResult,
    approvedResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("contents")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),

    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "review"),

    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("contents")
      .select("id, title, platform, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const total = totalResult.count ?? 0;
  const drafts = draftResult.count ?? 0;
  const reviews = reviewResult.count ?? 0;
  const approved = approvedResult.count ?? 0;

  const recentContents =
    (recentResult.data as RecentContent[] | null) ?? [];

  const databaseError =
    totalResult.error ||
    draftResult.error ||
    reviewResult.error ||
    approvedResult.error ||
    recentResult.error;

  const stats = [
    {
      label: "Contenidos",
      value: total,
      helper: "Total guardado",
      accent: "from-indigo-500 to-violet-500",
    },
    {
      label: "Borradores",
      value: drafts,
      helper: "Pendientes de trabajo",
      accent: "from-sky-500 to-cyan-500",
    },
    {
      label: "En revisión",
      value: reviews,
      helper: "Esperando aprobación",
      accent: "from-amber-400 to-orange-500",
    },
    {
      label: "Aprobados",
      value: approved,
      helper: "Listos para publicar",
      accent: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] bg-slate-950 shadow-xl shadow-slate-200/70">
        <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-20 right-28 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
              Content workspace
            </span>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Todo tu contenido, en un solo lugar.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Crea, organiza y prepara publicaciones para tus redes sociales
              desde un espacio privado y centralizado.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/protected/create"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
              >
                + Crear contenido
              </Link>

              <Link
                href="/protected/library"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Abrir biblioteca
              </Link>
            </div>
          </div>
        </div>
      </section>

      {databaseError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron cargar todos los datos del panel. Revisa la consola
          del servidor si el problema continúa.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`}
            />

            <p className="text-sm font-medium text-slate-500">
              {stat.label}
            </p>

            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="text-4xl font-bold tracking-tight text-slate-950">
                {stat.value}
              </p>

              <div
                className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.accent} opacity-15`}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {stat.helper}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Actividad reciente
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimos contenidos guardados.
              </p>
            </div>

            <Link
              href="/protected/library"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Ver toda la biblioteca →
            </Link>
          </div>

          {recentContents.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                +
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                Aún no hay actividad
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Tus contenidos aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentContents.map((content) => (
                <Link
                  key={content.id}
                  href={`/protected/library/${content.id}`}
                  className="flex flex-col gap-3 px-6 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {content.title || "Sin título"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {platformLabel(content.platform)}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusClasses(
                          content.status
                        )}`}
                      >
                        {statusLabel(content.status)}
                      </span>
                    </div>
                  </div>

                  <time className="shrink-0 text-xs text-slate-400">
                    {new Intl.DateTimeFormat("es", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(content.created_at))}
                  </time>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Acciones rápidas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Continúa tu flujo de trabajo.
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/protected/create"
                className="flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Crear nuevo contenido
                <span>→</span>
              </Link>

              <Link
                href="/protected/library"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Gestionar biblioteca
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">
              Próximo módulo
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              Usuarios y roles
            </h3>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              Prepararemos permisos para administradores, editores y
              visualizadores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}