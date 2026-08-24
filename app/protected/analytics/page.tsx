import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

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
  monthly: {
    month: string;
    contents: number;
    publications: number;
  }[];
  external: {
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
};

type MetricRow = {
  id: string;
  platform: string;
  impressions: number | null;
  reach: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  sync_status: string;
  fetched_at: string | null;
};

function compactNumber(
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
    "es",
    {
      notation:
        value >= 10000
          ? "compact"
          : "standard",
      maximumFractionDigits:
        1,
    }
  ).format(value);
}

function platformLabel(
  value: string
) {
  return value ===
    "linkedin"
    ? "LinkedIn"
    : "Facebook";
}

export default async function AnalyticsPage() {
  const supabase =
    await createClient();

  const [
    analyticsResult,
    metricsResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_internal_analytics"
    ),

    supabase
      .from(
        "publication_metrics"
      )
      .select(
        "id, platform, impressions, reach, reactions, comments, shares, clicks, engagement_rate, sync_status, fetched_at"
      )
      .order(
        "fetched_at",
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      )
      .limit(12),
  ]);

  const analytics =
    (analyticsResult.data as unknown as
      | AnalyticsData
      | null) ?? {
      content_total:
        0,
      publications_total:
        0,
      users_total:
        0,
      users_active:
        0,
      publication_status: {},
      publication_platform: {},
      content_type: {},
      monthly: [],
      external: {
        rows:
          0,
        impressions:
          null,
        reach:
          null,
        reactions:
          null,
        comments:
          null,
        shares:
          null,
        clicks:
          null,
        engagement_rate:
          null,
        last_sync:
          null,
      },
    };

  const rows =
    (metricsResult.data as unknown as
      | MetricRow[]
      | null) ?? [];

  const externalReady =
    analytics.external.rows >
      0 &&
    analytics.external.last_sync !==
      null;

  const maximumMonthly =
    Math.max(
      1,
      ...analytics.monthly.map(
        (
          point
        ) =>
          Math.max(
            point.contents,
            point.publications
          )
      )
    );

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#315efb]">
            Performance
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#172033]">
            Estadísticas
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Métricas internas del flujo editorial y rendimiento social real
            cuando existan cuentas autorizadas.
          </p>
        </div>

        <Link
          href="/protected/analytics/sync"
          className="w-fit rounded-xl bg-[#315efb] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(49,94,251,0.20)]"
        >
          Sincronización social
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Contenidos",
            analytics.content_total,
            "Total creado",
          ],
          [
            "Publicaciones",
            analytics.publications_total,
            "Flujo editorial",
          ],
          [
            "Usuarios activos",
            analytics.users_active,
            `${analytics.users_total} registrados`,
          ],
          [
            "Métricas sociales",
            analytics.external.rows,
            externalReady
              ? "Con datos reales"
              : "Pendiente de credenciales",
          ],
        ].map(
          ([
            label,
            value,
            helper,
          ]) => (
            <div
              key={
                String(label)
              }
              className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
              </p>

              <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#172033]">
                {value}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {helper}
              </p>
            </div>
          )
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Últimos 6 meses
          </p>

          <h2 className="mt-1 text-lg font-black text-[#172033]">
            Actividad editorial
          </h2>

          <div className="mt-7 flex h-56 items-end gap-3">
            {analytics.monthly.map(
              (
                point
              ) => (
                <div
                  key={
                    point.month
                  }
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-44 w-full items-end justify-center gap-1.5">
                    <div
                      className="w-[34%] rounded-t-md bg-[#315efb]"
                      style={{
                        height:
                          `${Math.max(
                            4,
                            (
                              point.contents /
                              maximumMonthly
                            ) *
                              100
                          )}%`,
                      }}
                      title={`Contenidos: ${point.contents}`}
                    />

                    <div
                      className="w-[34%] rounded-t-md bg-[#14b8a6]"
                      style={{
                        height:
                          `${Math.max(
                            4,
                            (
                              point.publications /
                              maximumMonthly
                            ) *
                              100
                          )}%`,
                      }}
                      title={`Publicaciones: ${point.publications}`}
                    />
                  </div>

                  <span className="truncate text-[9px] font-semibold text-slate-400">
                    {point.month}
                  </span>
                </div>
              )
            )}
          </div>

          <div className="mt-4 flex gap-5 text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#315efb]" />
              Contenidos
            </span>

            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#14b8a6]" />
              Publicaciones
            </span>
          </div>
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-[#172033] p-6 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Social
          </p>

          <h2 className="mt-1 text-lg font-black">
            Rendimiento acumulado
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              [
                "Impresiones / vistas",
                analytics.external.impressions,
              ],
              [
                "Alcance",
                analytics.external.reach,
              ],
              [
                "Reacciones",
                analytics.external.reactions,
              ],
              [
                "Comentarios",
                analytics.external.comments,
              ],
              [
                "Compartidos",
                analytics.external.shares,
              ],
              [
                "Clics",
                analytics.external.clicks,
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={
                    String(label)
                  }
                  className="rounded-xl bg-white/7 p-4"
                >
                  <p className="text-xl font-black">
                    {externalReady
                      ? compactNumber(
                          value as number | null
                        )
                      : "—"}
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    {label}
                  </p>
                </div>
              )
            )}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-400">
            {externalReady
              ? `Última actualización: ${new Intl.DateTimeFormat(
                  "es",
                  {
                    dateStyle:
                      "medium",
                    timeStyle:
                      "short",
                  }
                ).format(
                  new Date(
                    analytics.external.last_sync!
                  )
                )}`
              : "No se mostrarán números ficticios. Este bloque se activará con datos reales."}
          </p>
        </section>
      </div>

      <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Publicaciones
            </p>

            <h2 className="mt-1 text-lg font-black text-[#172033]">
              Últimas métricas sincronizadas
            </h2>
          </div>

          <Link
            href="/protected/analytics/sync"
            className="text-xs font-bold text-[#315efb]"
          >
            Administrar sincronización →
          </Link>
        </div>

        {rows.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
            Pendiente de publicaciones reales y credenciales del cliente.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <th className="pb-3 pr-4">
                    Red
                  </th>
                  <th className="pb-3 pr-4">
                    Vistas
                  </th>
                  <th className="pb-3 pr-4">
                    Alcance
                  </th>
                  <th className="pb-3 pr-4">
                    Reacciones
                  </th>
                  <th className="pb-3 pr-4">
                    Comentarios
                  </th>
                  <th className="pb-3 pr-4">
                    Compartidos
                  </th>
                  <th className="pb-3 pr-4">
                    Clics
                  </th>
                  <th className="pb-3">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(
                  (
                    row
                  ) => (
                    <tr
                      key={
                        row.id
                      }
                      className="text-xs text-slate-600"
                    >
                      <td className="py-3.5 pr-4 font-bold text-slate-800">
                        {platformLabel(
                          row.platform
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {compactNumber(
                          row.impressions
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {compactNumber(
                          row.reach
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {compactNumber(
                          row.reactions
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {compactNumber(
                          row.comments
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {compactNumber(
                          row.shares
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {compactNumber(
                          row.clicks
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                          {row.sync_status}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}