import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  resetExhaustedRetries,
  runSchedulerNow,
  saveSchedulerSettings,
} from "./actions";

export const instant = false;
export const maxDuration = 300;

type SchedulerRun = {
  id: string;
  source: string;
  status: string;
  claimed_count: number;
  published_count: number;
  partial_count: number;
  failed_count: number;
  skipped_count: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

type SchedulerDashboard = {
  scheduler_enabled: boolean;
  public_base_url: string | null;
  interval_minutes: number;
  batch_size: number;
  retry_minutes: number;
  max_attempts: number;
  timezone: string;
  last_dispatched_at: string | null;
  last_dispatch_error: string | null;
  cron_job_active: boolean;
  cron_schedule: string | null;
  due_count: number;
  retry_count: number;
  exhausted_count: number;
  next_due_at: string | null;
  recent_runs: SchedulerRun[];
};

type ScheduledPublication = {
  id: string;
  status: string;
  platform: string;
  publication_date: string | null;
  publication_time: string | null;
  delivery_status: string;
  scheduler_attempt_count: number;
  next_retry_at: string | null;
  last_scheduler_error: string | null;
  auto_publish_enabled: boolean;
  contents:
    | {
        title: string | null;
      }
    | {
        title: string | null;
      }[]
    | null;
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "forbidden-settings":
    "No tienes permiso para modificar la configuración del programador.",
  "url-required":
    "Para activar el programador primero debes indicar la URL HTTPS pública de ContentAI.",
  https:
    "La URL pública debe comenzar con https://.",
  interval:
    "El intervalo seleccionado no es válido.",
  batch:
    "El tamaño del lote debe estar entre 1 y 25.",
  retry:
    "El tiempo de reintento no es válido.",
  attempts:
    "El máximo de intentos debe estar entre 1 y 20.",
  save:
    "No se pudo guardar la configuración del programador.",
  "forbidden-run":
    "No tienes permiso publication.publish para ejecutar publicaciones.",
  "manual-run":
    "La ejecución manual del programador devolvió un error.",
  "forbidden-reset":
    "Necesitas permisos de administración y publicación para reactivar reintentos.",
  reset:
    "No se pudieron reactivar los reintentos.",
};

function getContent(
  value:
    ScheduledPublication["contents"]
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
    value ===
    "linkedin"
  ) {
    return "LinkedIn";
  }

  if (
    value ===
    "facebook"
  ) {
    return "Facebook";
  }

  return "LinkedIn + Facebook";
}

function deliveryLabel(
  value: string
) {
  if (
    value ===
    "not_ready"
  ) {
    return "Sin destinos";
  }

  if (
    value ===
    "ready"
  ) {
    return "Lista";
  }

  if (
    value ===
    "publishing"
  ) {
    return "Procesando";
  }

  if (
    value ===
    "partial"
  ) {
    return "Parcial";
  }

  if (
    value ===
    "published"
  ) {
    return "Publicada";
  }

  return "Error";
}

function runStatusLabel(
  value: string
) {
  if (
    value ===
    "completed"
  ) {
    return "Completada";
  }

  if (
    value ===
    "completed_with_errors"
  ) {
    return "Con incidencias";
  }

  if (
    value ===
    "failed"
  ) {
    return "Error";
  }

  return "Ejecutando";
}

function runStatusClasses(
  value: string
) {
  if (
    value ===
    "completed"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "completed_with_errors"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    value ===
    "failed"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-indigo-50 text-indigo-700";
}

export default async function SchedulerPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    error?: string;
    claimed?: string;
    published?: string;
    failed?: string;
  }>;
}) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const [
    dashboardResult,
    settingsManageResult,
    publicationManageResult,
    publicationPublishResult,
    scheduledResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_scheduler_dashboard"
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.manage",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.manage",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.publish",
      }
    ),

    supabase
      .from(
        "publications"
      )
      .select(
        "id, status, platform, publication_date, publication_time, delivery_status, scheduler_attempt_count, next_retry_at, last_scheduler_error, auto_publish_enabled, contents(title)"
      )
      .eq(
        "status",
        "scheduled"
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
      .limit(30),
  ]);

  const dashboard =
    dashboardResult.data as
      | SchedulerDashboard
      | null;

  const canManageSettings =
    Boolean(
      settingsManageResult.data
    );

  const canManagePublications =
    Boolean(
      publicationManageResult.data
    );

  const canPublish =
    Boolean(
      publicationPublishResult.data
    );

  const scheduled =
    (scheduledResult.data as
      | ScheduledPublication[]
      | null) ??
    [];

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
      "Configuración del programador guardada.";
  }
  else if (
    params.notice ===
    "retries-reset"
  ) {
    noticeMessage =
      "Los reintentos agotados fueron reactivados.";
  }
  else if (
    params.notice ===
    "manual-run"
  ) {
    noticeMessage =
      `Ejecución manual terminada: ${params.claimed ?? "0"} revisada(s), ${params.published ?? "0"} publicada(s), ${params.failed ?? "0"} con incidencia.`;
  }

  if (
    dashboardResult.error ||
    !dashboard
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        No se pudo cargar el Programador. Comprueba que el SQL del Paso 20
        se ejecutó correctamente.
      </div>
    );
  }

  const readyForAutomatic =
    dashboard.scheduler_enabled &&
    Boolean(
      dashboard.public_base_url
    ) &&
    dashboard.cron_job_active;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Automatización editorial
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Programador automático
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Procesa publicaciones programadas cuando llega su fecha y hora,
            respetando la zona horaria del workspace y los permisos de
            publicación.
          </p>
        </div>

        <Link
          href="/protected/calendar"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ver calendario
        </Link>
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

      <section
        className={`rounded-2xl border p-5 ${
          readyForAutomatic
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className={`text-sm font-semibold ${
                readyForAutomatic
                  ? "text-emerald-900"
                  : "text-amber-900"
              }`}
            >
              {readyForAutomatic
                ? "Programación automática activa"
                : "Programación automática preparada, pero inactiva"}
            </p>

            <p
              className={`mt-2 text-sm leading-6 ${
                readyForAutomatic
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {readyForAutomatic
                ? `Supabase revisa ContentAI cada ${dashboard.interval_minutes} minuto(s).`
                : "Déjala desactivada mientras trabajas en localhost. Se activará cuando ContentAI tenga una URL HTTPS pública y decidas habilitarla."}
            </p>
          </div>

          <span className="w-fit rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Zona horaria:{" "}
            {dashboard.timezone}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Vencidas listas",
            dashboard.due_count,
          ],
          [
            "Esperando reintento",
            dashboard.retry_count,
          ],
          [
            "Intentos agotados",
            dashboard.exhausted_count,
          ],
          [
            "Cron interno",
            dashboard.cron_job_active
              ? "Activo"
              : "No disponible",
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {label}
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Próximas publicaciones
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Cola editorial
            </h2>
          </div>

          {scheduled.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-400">
              No hay publicaciones con estado Programado.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {scheduled.map(
                (
                  publication
                ) => {
                  const content =
                    getContent(
                      publication.contents
                    );

                  return (
                    <Link
                      key={
                        publication.id
                      }
                      href={`/protected/publications/${publication.id}/delivery`}
                      className="grid gap-3 p-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(180px,1fr)_150px_170px_120px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {content?.title ||
                            "Publicación sin título"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {platformLabel(
                            publication.platform
                          )}
                        </p>

                        {publication.last_scheduler_error && (
                          <p className="mt-2 line-clamp-2 text-xs text-rose-600">
                            {publication.last_scheduler_error}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          {publication.publication_date ||
                            "Sin fecha"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {publication.publication_time
                            ? publication.publication_time.slice(
                                0,
                                5
                              )
                            : "Sin hora"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          {deliveryLabel(
                            publication.delivery_status
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Intentos:{" "}
                          {publication.scheduler_attempt_count}
                          /
                          {dashboard.max_attempts}
                        </p>
                      </div>

                      <span className="text-right text-sm font-semibold text-indigo-600">
                        Abrir →
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Configuración
            </p>

            <h2 className="mt-1 font-semibold text-slate-950">
              Automatización
            </h2>

            <form
              action={
                saveSchedulerSettings
              }
              className="mt-5 space-y-4"
            >
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="scheduler_enabled"
                  defaultChecked={
                    dashboard.scheduler_enabled
                  }
                  disabled={
                    !canManageSettings
                  }
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Activar programador
                  </span>

                  <span className="mt-1 block text-xs text-slate-400">
                    Solo después del despliegue HTTPS.
                  </span>
                </span>
              </label>

              <div className="space-y-2">
                <label
                  htmlFor="public_base_url"
                  className="text-sm font-semibold text-slate-700"
                >
                  URL pública de ContentAI
                </label>

                <input
                  id="public_base_url"
                  name="public_base_url"
                  type="url"
                  defaultValue={
                    dashboard.public_base_url ??
                    ""
                  }
                  disabled={
                    !canManageSettings
                  }
                  placeholder="https://contentai.cliente.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50"
                />

                <p className="text-xs leading-5 text-slate-400">
                  Déjala vacía mientras ContentAI funcione únicamente en
                  localhost.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="interval_minutes"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Revisar cada
                  </label>

                  <select
                    id="interval_minutes"
                    name="interval_minutes"
                    defaultValue={
                      dashboard.interval_minutes
                    }
                    disabled={
                      !canManageSettings
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm disabled:bg-slate-50"
                  >
                    <option value="1">
                      1 minuto
                    </option>

                    <option value="5">
                      5 minutos
                    </option>

                    <option value="10">
                      10 minutos
                    </option>

                    <option value="15">
                      15 minutos
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="batch_size"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Lote máximo
                  </label>

                  <input
                    id="batch_size"
                    name="batch_size"
                    type="number"
                    min="1"
                    max="25"
                    defaultValue={
                      dashboard.batch_size
                    }
                    disabled={
                      !canManageSettings
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="retry_minutes"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Reintento
                  </label>

                  <input
                    id="retry_minutes"
                    name="retry_minutes"
                    type="number"
                    min="1"
                    max="1440"
                    defaultValue={
                      dashboard.retry_minutes
                    }
                    disabled={
                      !canManageSettings
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50"
                  />

                  <p className="text-[10px] text-slate-400">
                    minutos
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="max_attempts"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Máximo intentos
                  </label>

                  <input
                    id="max_attempts"
                    name="max_attempts"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={
                      dashboard.max_attempts
                    }
                    disabled={
                      !canManageSettings
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50"
                  />
                </div>
              </div>

              {canManageSettings && (
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar configuración
                </button>
              )}
            </form>
          </section>

          {canPublish && (
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <p className="text-sm font-semibold text-indigo-900">
                Prueba manual
              </p>

              <p className="mt-2 text-xs leading-5 text-indigo-700">
                Procesa ahora únicamente las publicaciones Programadas cuya
                fecha/hora ya venció. Funciona incluso con el automático
                desactivado.
              </p>

              <form
                action={
                  runSchedulerNow
                }
                className="mt-4"
              >
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Procesar vencidas ahora
                </button>
              </form>
            </section>
          )}

          {canManagePublications &&
            canPublish &&
            dashboard.exhausted_count >
              0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">
                  Reintentos agotados
                </p>

                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Úsalo después de corregir una credencial, permiso o
                  conexión que provocó errores repetidos.
                </p>

                <form
                  action={
                    resetExhaustedRetries
                  }
                  className="mt-4"
                >
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Reactivar reintentos
                  </button>
                </form>
              </section>
            )}
        </aside>
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Ejecuciones
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Historial del programador
            </h2>
          </div>

          <span className="text-xs text-slate-400">
            Cron:{" "}
            {dashboard.cron_schedule ||
              "—"}
          </span>
        </div>

        {dashboard.recent_runs.length ===
        0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-400">
            Todavía no hay ejecuciones registradas.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {dashboard.recent_runs.map(
              (
                run
              ) => (
                <div
                  key={
                    run.id
                  }
                  className="grid gap-3 p-4 lg:grid-cols-[130px_150px_1fr_180px]"
                >
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${runStatusClasses(
                      run.status
                    )}`}
                  >
                    {runStatusLabel(
                      run.status
                    )}
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {run.source ===
                      "cron"
                        ? "Automático"
                        : "Manual"}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {run.claimed_count} revisada(s)
                    </p>
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    Publicadas:{" "}
                    {run.published_count}
                    {" · "}
                    Parciales:{" "}
                    {run.partial_count}
                    {" · "}
                    Fallidas:{" "}
                    {run.failed_count}
                    {" · "}
                    Omitidas:{" "}
                    {run.skipped_count}
                    {run.error_message
                      ? ` · ${run.error_message}`
                      : ""}
                  </p>

                  <p className="text-xs text-slate-400">
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

      {dashboard.last_dispatch_error && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-900">
            Último error del despachador
          </p>

          <p className="mt-2 text-sm leading-6 text-rose-700">
            {dashboard.last_dispatch_error}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-semibold text-sky-900">
          Protección contra duplicados y secretos
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-800">
          Cada publicación vencida se reclama de forma atómica antes de
          procesarse, evitando que dos ejecuciones simultáneas tomen la
          misma fila. El webhook usa un secreto interno generado
          automáticamente y almacenado en Vault; la interfaz nunca lo
          muestra.
        </p>
      </section>
    </div>
  );
}