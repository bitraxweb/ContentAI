import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  saveMetricsSyncSettings,
  syncMetricsNow,
} from "./actions";

export const instant = false;
export const maxDuration = 300;

type Dashboard = {
  metrics_sync_enabled: boolean;
  metrics_interval_hours: number;
  metrics_batch_size: number;
  public_base_url: string | null;
  last_metrics_dispatched_at: string | null;
  last_metrics_dispatch_error: string | null;
  pending_count: number;
  synced_count: number;
  error_count: number;
  unsupported_count: number;
  last_sync: string | null;
  recent_runs: {
    id: string;
    source: string;
    status: string;
    claimed_count: number;
    synced_count: number;
    unsupported_count: number;
    failed_count: number;
    error_message: string | null;
    started_at: string;
    finished_at: string | null;
  }[];
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "forbidden-sync":
    "No tienes permiso para sincronizar estadísticas externas.",
  "forbidden-settings":
    "No tienes permiso para modificar la automatización.",
  sync:
    "La sincronización devolvió un error. Revisa las conexiones y permisos de las plataformas.",
  interval:
    "El intervalo seleccionado no es válido.",
  batch:
    "El lote debe estar entre 1 y 25.",
  "settings-save":
    "No se pudo guardar la configuración.",
};

export default async function AnalyticsSyncPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    error?: string;
    claimed?: string;
    synced?: string;
    issues?: string;
  }>;
}) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const [
    dashboardResult,
    syncPermissionResult,
    settingsPermissionResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_metrics_sync_dashboard"
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "analytics.sync",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.manage",
      }
    ),
  ]);

  const dashboard =
    dashboardResult.data as unknown as
      | Dashboard
      | null;

  if (
    dashboardResult.error ||
    !dashboard
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        No se pudo cargar la sincronización. Comprueba el SQL del Paso 21.
      </div>
    );
  }

  const canSync =
    Boolean(
      syncPermissionResult.data
    );

  const canManageSettings =
    Boolean(
      settingsPermissionResult.data
    );

  const errorMessage =
    params.error
      ? errorMessages[
          params.error
        ] ||
        "No se pudo completar la operación."
      : null;

  let noticeMessage:
    | string
    | null = null;

  if (
    params.notice ===
    "settings-saved"
  ) {
    noticeMessage =
      "Configuración de sincronización guardada.";
  }
  else if (
    params.notice ===
    "sync"
  ) {
    noticeMessage =
      `Sincronización terminada: ${params.claimed ?? "0"} revisada(s), ${params.synced ?? "0"} actualizada(s), ${params.issues ?? "0"} con incidencia.`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/protected/analytics"
            className="text-sm font-semibold text-indigo-600"
          >
            ← Estadísticas
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Sincronización social
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Actualiza métricas reales únicamente para publicaciones que ya
            tienen un destino social publicado y una conexión OAuth activa.
          </p>
        </div>

        {canSync && (
          <form
            action={
              syncMetricsNow
            }
          >
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Sincronizar ahora
            </button>
          </form>
        )}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Pendientes",
            dashboard.pending_count,
          ],
          [
            "Sincronizadas",
            dashboard.synced_count,
          ],
          [
            "Con error",
            dashboard.error_count,
          ],
          [
            "Permiso no disponible",
            dashboard.unsupported_count,
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Historial
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Ejecuciones recientes
          </h2>

          {dashboard.recent_runs.length ===
          0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-400">
              Todavía no hay sincronizaciones.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {dashboard.recent_runs.map(
                (
                  run
                ) => (
                  <div
                    key={
                      run.id
                    }
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {run.source ===
                        "cron"
                          ? "Automática"
                          : "Manual"}
                      </p>

                      <span className="text-xs font-semibold text-slate-500">
                        {run.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Revisadas:{" "}
                      {run.claimed_count}
                      {" · "}
                      Correctas:{" "}
                      {run.synced_count}
                      {" · "}
                      Sin permiso:{" "}
                      {run.unsupported_count}
                      {" · "}
                      Error:{" "}
                      {run.failed_count}
                    </p>

                    <p className="mt-2 text-[10px] text-slate-400">
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
                          run.started_at
                        )
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Automatización
            </h2>

            <form
              action={
                saveMetricsSyncSettings
              }
              className="mt-5 space-y-4"
            >
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="metrics_sync_enabled"
                  defaultChecked={
                    dashboard.metrics_sync_enabled
                  }
                  disabled={
                    !canManageSettings
                  }
                />

                <span className="text-sm font-semibold text-slate-700">
                  Sincronizar automáticamente
                </span>
              </label>

              <div>
                <label
                  htmlFor="metrics_interval_hours"
                  className="text-xs font-semibold text-slate-600"
                >
                  Intervalo
                </label>

                <select
                  id="metrics_interval_hours"
                  name="metrics_interval_hours"
                  defaultValue={
                    dashboard.metrics_interval_hours
                  }
                  disabled={
                    !canManageSettings
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="1">
                    Cada 1 hora
                  </option>
                  <option value="3">
                    Cada 3 horas
                  </option>
                  <option value="6">
                    Cada 6 horas
                  </option>
                  <option value="12">
                    Cada 12 horas
                  </option>
                  <option value="24">
                    Cada 24 horas
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="metrics_batch_size"
                  className="text-xs font-semibold text-slate-600"
                >
                  Lote máximo
                </label>

                <input
                  id="metrics_batch_size"
                  name="metrics_batch_size"
                  type="number"
                  min="1"
                  max="25"
                  defaultValue={
                    dashboard.metrics_batch_size
                  }
                  disabled={
                    !canManageSettings
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              {canManageSettings && (
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Guardar
                </button>
              )}
            </form>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">
              Credenciales pendientes
            </p>

            <p className="mt-2 text-xs leading-5 text-amber-800">
              Déjala desactivada hasta que el cliente conecte las cuentas
              reales y ContentAI tenga una URL HTTPS pública.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}