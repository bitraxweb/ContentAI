import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type CommandCenter = {
  contents_total: number;
  contents_review: number;
  contents_approved: number;
  publications_scheduled: number;
  publications_published: number;
  delivery_issues: number;
  connected_social_accounts: number;
  configured_integrations: number;
  last_metrics_sync: string | null;
};

type RecentContent = {
  id: string;
  title: string | null;
  status: string;
  platform: string;
  created_at: string;
};

type UpcomingPublication = {
  id: string;
  status: string;
  platform: string;
  publication_date: string | null;
  publication_time: string | null;
  delivery_status: string;
  contents:
    | {
        title: string | null;
      }
    | {
        title: string | null;
      }[]
    | null;
};

type Integration = {
  integration_key: string;
  label: string;
  credential_status: string;
  enabled: boolean;
};

function firstContent(
  value:
    UpcomingPublication["contents"]
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ??
        null
    : value;
}

function platformLabel(
  value: string
) {
  if (
    value === "linkedin"
  ) {
    return "LinkedIn";
  }

  if (
    value === "facebook"
  ) {
    return "Facebook";
  }

  return "LinkedIn + Facebook";
}

function statusLabel(
  value: string
) {
  if (
    value === "draft"
  ) {
    return "Borrador";
  }

  if (
    value === "review"
  ) {
    return "Revisión";
  }

  if (
    value === "approved"
  ) {
    return "Aprobado";
  }

  if (
    value === "scheduled"
  ) {
    return "Programado";
  }

  if (
    value === "published"
  ) {
    return "Publicado";
  }

  return value;
}

function statusClasses(
  value: string
) {
  if (
    value === "approved" ||
    value === "published"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    value === "review" ||
    value === "scheduled"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default async function DashboardPage() {
  const supabase =
    await createClient();

  const [
    overviewResult,
    contentViewResult,
    publicationViewResult,
    settingsViewResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_editorial_command_center"
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "content.view",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.view",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.view",
      }
    ),
  ]);

  const overview =
    (overviewResult.data as unknown as
      | CommandCenter
      | null) ?? {
      contents_total:
        0,
      contents_review:
        0,
      contents_approved:
        0,
      publications_scheduled:
        0,
      publications_published:
        0,
      delivery_issues:
        0,
      connected_social_accounts:
        0,
      configured_integrations:
        0,
      last_metrics_sync:
        null,
    };

  let recentContents:
    RecentContent[] = [];

  let upcoming:
    UpcomingPublication[] = [];

  let integrations:
    Integration[] = [];

  if (
    contentViewResult.data
  ) {
    const {
      data,
    } = await supabase
      .from("contents")
      .select(
        "id, title, status, platform, created_at"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(6);

    recentContents =
      (data as unknown as
        | RecentContent[]
        | null) ?? [];
  }

  if (
    publicationViewResult.data
  ) {
    const {
      data,
    } = await supabase
      .from(
        "publications"
      )
      .select(
        "id, status, platform, publication_date, publication_time, delivery_status, contents(title)"
      )
      .in(
        "status",
        [
          "approved",
          "scheduled",
        ]
      )
      .order(
        "publication_date",
        {
          ascending:
            true,
          nullsFirst:
            false,
        }
      )
      .order(
        "publication_time",
        {
          ascending:
            true,
          nullsFirst:
            false,
        }
      )
      .limit(6);

    upcoming =
      (data as unknown as
        | UpcomingPublication[]
        | null) ?? [];
  }

  if (
    settingsViewResult.data
  ) {
    const {
      data,
    } = await supabase
      .from(
        "integration_settings"
      )
      .select(
        "integration_key, label, credential_status, enabled"
      )
      .order(
        "category"
      )
      .order(
        "label"
      );

    integrations =
      (data as unknown as
        | Integration[]
        | null) ?? [];
  }

  const kpis = [
    {
      label:
        "Contenidos",
      value:
        overview.contents_total,
      helper:
        `${overview.contents_review} en revisión`,
      accent:
        "bg-[#315efb]",
    },
    {
      label:
        "Aprobados",
      value:
        overview.contents_approved,
      helper:
        "Listos para publicación",
      accent:
        "bg-emerald-500",
    },
    {
      label:
        "Programados",
      value:
        overview.publications_scheduled,
      helper:
        "En la cola editorial",
      accent:
        "bg-amber-400",
    },
    {
      label:
        "Publicados",
      value:
        overview.publications_published,
      helper:
        overview.delivery_issues >
          0
          ? `${overview.delivery_issues} con incidencia`
          : "Sin incidencias",
      accent:
        overview.delivery_issues >
          0
          ? "bg-rose-500"
          : "bg-[#14b8a6]",
    },
  ];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(23,32,51,0.06)]">
        <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.35fr_.65fr] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-[11px] font-bold text-[#315efb]">
                CONTENT OPERATIONS
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                Workspace privado
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#172033] sm:text-[40px] sm:leading-[1.05]">
              Crea, aprueba y publica sin perder el control.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              Tu flujo editorial, IA, multimedia, calendario, redes y
              analítica están organizados desde un solo centro de trabajo.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/protected/create"
                className="rounded-xl bg-[#315efb] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(49,94,251,0.22)] hover:bg-[#264bd1]"
              >
                Crear contenido
              </Link>

              <Link
                href="/protected/publications"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Ver publicaciones
              </Link>
            </div>
          </div>

          <div className="rounded-[18px] bg-[#172033] p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Estado operativo
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/7 p-4">
                <p className="text-2xl font-black">
                  {overview.connected_social_accounts}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  cuentas sociales
                </p>
              </div>

              <div className="rounded-xl bg-white/7 p-4">
                <p className="text-2xl font-black">
                  {overview.configured_integrations}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  integraciones listas
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              {overview.last_metrics_sync
                ? `Última sincronización: ${new Intl.DateTimeFormat(
                    "es",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    }
                  ).format(
                    new Date(
                      overview.last_metrics_sync
                    )
                  )}`
                : "Las métricas externas seguirán pendientes mientras no existan cuentas reales conectadas."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(
          (
            item
          ) => (
            <div
              key={
                item.label
              }
              className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span
                className={`absolute left-0 top-0 h-full w-1 ${item.accent}`}
              />

              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                {item.label}
              </p>

              <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#172033]">
                {item.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {item.helper}
              </p>
            </div>
          )
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Flujo reciente
              </p>

              <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[#172033]">
                Últimos contenidos
              </h2>
            </div>

            <Link
              href="/protected/library"
              className="text-xs font-bold text-[#315efb]"
            >
              Ver biblioteca →
            </Link>
          </div>

          {recentContents.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
              Todavía no hay contenidos visibles.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {recentContents.map(
                (
                  item
                ) => (
                  <Link
                    key={
                      item.id
                    }
                    href={`/protected/library/${item.id}`}
                    className="flex items-center gap-4 py-3.5"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                      {platformLabel(
                        item.platform
                      ).slice(
                        0,
                        1
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {item.title ||
                          "Contenido sin título"}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {platformLabel(
                          item.platform
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClasses(
                        item.status
                      )}`}
                    >
                      {statusLabel(
                        item.status
                      )}
                    </span>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Agenda
              </p>

              <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[#172033]">
                Próximas publicaciones
              </h2>
            </div>

            <Link
              href="/protected/calendar"
              className="text-xs font-bold text-[#315efb]"
            >
              Calendario →
            </Link>
          </div>

          {upcoming.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
              No hay publicaciones próximas.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {upcoming.map(
                (
                  publication
                ) => {
                  const content =
                    firstContent(
                      publication.contents
                    );

                  return (
                    <Link
                      key={
                        publication.id
                      }
                      href={`/protected/publications/${publication.id}`}
                      className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#b8c6ff] hover:bg-[#f8faff]"
                    >
                      <div className="rounded-lg bg-[#edf2ff] px-2 py-2 text-center">
                        <p className="text-[10px] font-bold text-[#315efb]">
                          {publication.publication_date
                            ? publication.publication_date.slice(
                                5
                              )
                            : "—"}
                        </p>

                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          {publication.publication_time
                            ? publication.publication_time.slice(
                                0,
                                5
                              )
                            : "—"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {content?.title ||
                            "Publicación"}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {platformLabel(
                            publication.platform
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${statusClasses(
                          publication.status
                        )}`}
                      >
                        {statusLabel(
                          publication.status
                        )}
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>

      {integrations.length >
        0 && (
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Integraciones
              </p>

              <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[#172033]">
                Preparadas para el cliente
              </h2>
            </div>

            <Link
              href="/protected/settings"
              className="text-xs font-bold text-[#315efb]"
            >
              Abrir configuración →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {integrations.map(
              (
                integration
              ) => {
                const configured =
                  integration.credential_status ===
                  "configured";

                return (
                  <div
                    key={
                      integration.integration_key
                    }
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        configured
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                      }`}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {integration.label}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {configured
                          ? "Credencial configurada"
                          : "Pendiente de credenciales"}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}