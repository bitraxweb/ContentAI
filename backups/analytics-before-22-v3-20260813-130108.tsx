import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type MonthlyPoint = {
  month: string;
  contents: number;
  publications: number;
};

type ExternalMetrics = {
  rows: number;
  impressions: number | null;
  reach: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  last_sync: string | null;
};

type AnalyticsData = {
  content_total: number;
  publications_total: number;
  users_total: number;
  users_active: number;
  publication_status: Record<
    string,
    number
  >;
  publication_platform: Record<
    string,
    number
  >;
  content_type: Record<
    string,
    number
  >;
  monthly: MonthlyPoint[];
  external: ExternalMetrics;
};

function numberValue(
  value:
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function labelStatus(
  key: string
) {
  if (key === "draft") {
    return "Borrador";
  }

  if (key === "review") {
    return "En revisión";
  }

  if (key === "approved") {
    return "Aprobado";
  }

  if (key === "scheduled") {
    return "Programado";
  }

  if (key === "published") {
    return "Publicado";
  }

  if (key === "cancelled") {
    return "Cancelado";
  }

  return key;
}

function labelPlatform(
  key: string
) {
  if (key === "linkedin") {
    return "LinkedIn";
  }

  if (key === "facebook") {
    return "Facebook";
  }

  if (key === "both") {
    return "LinkedIn + Facebook";
  }

  return key;
}

function labelContentType(
  key: string
) {
  if (key === "post") {
    return "Publicación";
  }

  if (
    key === "video_script"
  ) {
    return "Guion de video";
  }

  if (key === "title") {
    return "Título";
  }

  if (
    key === "description"
  ) {
    return "Descripción";
  }

  if (
    key ===
    "promotional_phrase"
  ) {
    return "Frase promocional";
  }

  if (key === "idea") {
    return "Idea";
  }

  return key;
}

function formatMonth(
  month: string
) {
  const [
    year,
    monthNumber,
  ] = month.split("-");

  const date = new Date(
    Number(year),
    Number(monthNumber) - 1,
    1
  );

  return new Intl.DateTimeFormat(
    "es",
    {
      month: "short",
    }
  ).format(date);
}

function formatInteger(
  value:
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "es"
  ).format(value);
}

function DistributionCard({
  title,
  data,
  label,
}: {
  title: string;
  data: Record<
    string,
    number
  >;
  label: (
    value: string
  ) => string;
}) {
  const entries =
    Object.entries(
      data ?? {}
    )
      .map(
        ([key, value]) => [
          key,
          numberValue(value),
        ] as const
      )
      .sort(
        (
          first,
          second
        ) =>
          second[1] -
          first[1]
      );

  const total =
    entries.reduce(
      (
        sum,
        [, value]
      ) =>
        sum + value,
      0
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        {title}
      </h2>

      {entries.length ===
      0 ? (
        <p className="mt-5 text-sm text-slate-400">
          Todavía no hay datos.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {entries.map(
            ([
              key,
              value,
            ]) => {
              const percent =
                total > 0
                  ? Math.round(
                      (
                        value /
                        total
                      ) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={key}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {label(
                        key
                      )}
                    </span>

                    <span className="font-semibold text-slate-950">
                      {
                        value
                      }{" "}
                      <span className="font-normal text-slate-400">
                        (
                        {
                          percent
                        }
                        %)
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{
                        width: `${percent}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default async function AnalyticsPage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_internal_analytics"
  );

  const analytics =
    (data as
      | AnalyticsData
      | null) ?? {
      content_total: 0,
      publications_total: 0,
      users_total: 0,
      users_active: 0,
      publication_status: {},
      publication_platform: {},
      content_type: {},
      monthly: [],
      external: {
        rows: 0,
        impressions: null,
        reach: null,
        reactions: null,
        comments: null,
        shares: null,
        clicks: null,
        engagement_rate: null,
        last_sync: null,
      },
    };

  const monthly =
    analytics.monthly ?? [];

  const maxMonthly =
    Math.max(
      1,
      ...monthly.flatMap(
        (item) => [
          numberValue(
            item.contents
          ),
          numberValue(
            item.publications
          ),
        ]
      )
    );

  const external =
    analytics.external ?? {
      rows: 0,
      impressions: null,
      reach: null,
      reactions: null,
      comments: null,
      shares: null,
      clicks: null,
      engagement_rate: null,
      last_sync: null,
    };

  const hasExternal =
    numberValue(
      external.rows
    ) > 0;

  const activeUsers =
    numberValue(
      analytics.users_active
    );

  const totalUsers =
    numberValue(
      analytics.users_total
    );

  const published =
    numberValue(
      analytics
        .publication_status
        ?.published
    );

  const scheduled =
    numberValue(
      analytics
        .publication_status
        ?.scheduled
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Rendimiento
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Estadísticas
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Métricas internas de ContentAI y espacio preparado para
            resultados de LinkedIn y Facebook.
          </p>
        </div>

        <Link
          href="/protected/settings?section=social"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Configurar redes
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron cargar las estadísticas:{" "}
          {
            error.message
          }
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label:
              "Contenidos",
            value:
              numberValue(
                analytics.content_total
              ),
            help:
              "Elementos en biblioteca",
          },
          {
            label:
              "Publicaciones",
            value:
              numberValue(
                analytics.publications_total
              ),
            help:
              `${published} publicadas`,
          },
          {
            label:
              "Programadas",
            value:
              scheduled,
            help:
              "Con fecha editorial",
          },
          {
            label:
              "Usuarios activos",
            value:
              activeUsers,
            help:
              `${activeUsers} de ${totalUsers}`,
          },
        ].map(
          (
            metric
          ) => (
            <div
              key={
                metric.label
              }
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {
                  metric.label
                }
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {
                  metric.value
                }
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {
                  metric.help
                }
              </p>
            </div>
          )
        )}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Últimos 6 meses
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Actividad interna
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Contenidos creados frente a publicaciones preparadas.
          </p>
        </div>

        {monthly.length ===
        0 ? (
          <div className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-400">
            Todavía no hay actividad suficiente para mostrar.
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid h-64 grid-cols-6 items-end gap-4 border-b border-slate-200">
                {monthly.map(
                  (
                    point
                  ) => {
                    const contents =
                      numberValue(
                        point.contents
                      );

                    const publications =
                      numberValue(
                        point.publications
                      );

                    const contentHeight =
                      Math.max(
                        contents >
                          0
                          ? 8
                          : 0,
                        Math.round(
                          (
                            contents /
                            maxMonthly
                          ) *
                            190
                        )
                      );

                    const publicationHeight =
                      Math.max(
                        publications >
                          0
                          ? 8
                          : 0,
                        Math.round(
                          (
                            publications /
                            maxMonthly
                          ) *
                            190
                        )
                      );

                    return (
                      <div
                        key={
                          point.month
                        }
                        className="flex h-full flex-col justify-end"
                      >
                        <div className="flex flex-1 items-end justify-center gap-2">
                          <div className="group flex flex-col items-center justify-end">
                            <span className="mb-2 text-[10px] font-semibold text-slate-400">
                              {
                                contents
                              }
                            </span>

                            <div
                              className="w-5 rounded-t-md bg-slate-900"
                              style={{
                                height:
                                  contentHeight,
                              }}
                              title={`${contents} contenidos`}
                            />
                          </div>

                          <div className="group flex flex-col items-center justify-end">
                            <span className="mb-2 text-[10px] font-semibold text-indigo-500">
                              {
                                publications
                              }
                            </span>

                            <div
                              className="w-5 rounded-t-md bg-indigo-500"
                              style={{
                                height:
                                  publicationHeight,
                              }}
                              title={`${publications} publicaciones`}
                            />
                          </div>
                        </div>

                        <p className="py-3 text-center text-xs font-semibold capitalize text-slate-500">
                          {formatMonth(
                            point.month
                          )}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" />
                  Contenidos
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                  Publicaciones
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <DistributionCard
          title="Publicaciones por estado"
          data={
            analytics.publication_status ??
            {}
          }
          label={
            labelStatus
          }
        />

        <DistributionCard
          title="Publicaciones por red"
          data={
            analytics.publication_platform ??
            {}
          }
          label={
            labelPlatform
          }
        />

        <DistributionCard
          title="Tipos de contenido"
          data={
            analytics.content_type ??
            {}
          }
          label={
            labelContentType
          }
        />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Redes sociales
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Métricas externas
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Impresiones, alcance, reacciones, comentarios, compartidos,
              clics y engagement se completarán cuando el cliente conecte
              sus cuentas.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              hasExternal
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {hasExternal
              ? "Datos sincronizados"
              : "Pendiente de credenciales"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Impresiones",
              external.impressions,
            ],
            [
              "Alcance",
              external.reach,
            ],
            [
              "Reacciones",
              external.reactions,
            ],
            [
              "Comentarios",
              external.comments,
            ],
            [
              "Compartidos",
              external.shares,
            ],
            [
              "Clics",
              external.clicks,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <div
                key={
                  String(
                    label
                  )
                }
                className="rounded-xl bg-slate-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {hasExternal
                    ? formatInteger(
                        value as
                          | number
                          | null
                      )
                    : "—"}
                </p>
              </div>
            )
          )}

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Engagement
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {hasExternal &&
              external.engagement_rate !==
                null
                ? `${Number(
                    external.engagement_rate
                  ).toFixed(
                    2
                  )}%`
                : "—"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Última sincronización
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              {hasExternal &&
              external.last_sync
                ? new Intl.DateTimeFormat(
                    "es",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    }
                  ).format(
                    new Date(
                      external.last_sync
                    )
                  )
                : "Pendiente"}
            </p>
          </div>
        </div>

        {!hasExternal && (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            Los campos externos están creados pero permanecen vacíos. No se
            genera ninguna cifra ficticia. Cuando existan credenciales y se
            conecten LinkedIn/Facebook, el backend podrá sincronizarlos aquí.
          </div>
        )}
      </section>
    </div>
  );
}