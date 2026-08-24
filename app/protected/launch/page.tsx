import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  registerCurrentProductionUrl,
} from "./actions";

export const instant = false;

type Integration = {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  provider_name: string | null;
  model_name: string | null;
  credential_status: string;
};

type SocialConnection = {
  id: string;
  platform: string;
  connection_type: string;
  account_name: string | null;
  status: string;
  token_expires_at: string | null;
};

type ActivationCenter = {
  integrations: Integration[];
  social_connections: SocialConnection[];
  public_base_url: string | null;
  scheduler_enabled: boolean;
  metrics_sync_enabled: boolean;
  scheduled_publications: number;
  published_publications: number;
  last_metrics_sync: string | null;
  security_ok: boolean;
};

const errorMessages:
  Record<
    string,
    string
  > = {
  forbidden:
    "No tienes permiso para registrar la URL de producción.",
  host:
    "No se pudo detectar el dominio actual.",
  localhost:
    "No se puede registrar localhost como URL de producción.",
  https:
    "La URL de producción debe usar HTTPS.",
  "url-save":
    "No se pudo guardar la URL de producción.",
};

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

  return value;
}

export default async function LaunchPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
}) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const [
    activationResult,
    settingsManageResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_activation_center"
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.manage",
      }
    ),
  ]);

  const activation =
    activationResult.data as unknown as
      | ActivationCenter
      | null;

  if (
    activationResult.error ||
    !activation
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        No se pudo cargar el Centro de Lanzamiento. Comprueba el SQL del
        Paso 24.
      </div>
    );
  }

  const canManage =
    Boolean(
      settingsManageResult.data
    );

  const configuredCount =
    activation.integrations.filter(
      (
        item
      ) =>
        item.credential_status ===
        "configured"
    ).length;

  const pendingCount =
    activation.integrations.length -
    configuredCount;

  const connectedCount =
    activation.social_connections.filter(
      (
        item
      ) =>
        item.status ===
        "connected"
    ).length;

  const productionUrlReady =
    Boolean(
      activation.public_base_url?.startsWith(
        "https://"
      )
    );

  const errorMessage =
    params.error
      ? errorMessages[
          params.error
        ] ||
        "No se pudo completar la operación."
      : null;

  const noticeMessage =
    params.notice ===
    "url-registered"
      ? "URL HTTPS de producción registrada correctamente."
      : null;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#315efb]">
          Go live
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#172033]">
          Centro de Lanzamiento
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Aquí termina la construcción de ContentAI. Los módulos quedan
          preparados para activarse cuando el cliente entregue sus
          credenciales y autorice sus cuentas reales.
        </p>
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
        className={`rounded-[20px] border p-6 ${
          activation.security_ok
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className={`text-sm font-black ${
                activation.security_ok
                  ? "text-emerald-900"
                  : "text-amber-900"
              }`}
            >
              {activation.security_ok
                ? "Base técnica preparada"
                : "Revisa Seguridad y QA antes del despliegue"}
            </p>

            <p
              className={`mt-2 text-sm leading-6 ${
                activation.security_ok
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              Las credenciales externas pendientes son intencionales y no
              se consideran un error de la plataforma.
            </p>
          </div>

          <Link
            href="/protected/readiness"
            className="w-fit rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            Abrir Seguridad y QA
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Integraciones listas",
            configuredCount,
          ],
          [
            "Claves pendientes",
            pendingCount,
          ],
          [
            "Cuentas autorizadas",
            connectedCount,
          ],
          [
            "Publicaciones realizadas",
            activation.published_publications,
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
              className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {label}
              </p>

              <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#172033]">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <div className="grid gap-6 2xl:grid-cols-[1fr_430px]">
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Credenciales
              </p>

              <h2 className="mt-1 text-lg font-black text-[#172033]">
                Integraciones del cliente
              </h2>
            </div>

            <Link
              href="/protected/settings"
              className="text-xs font-bold text-[#315efb]"
            >
              Abrir Configuración →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activation.integrations.map(
              (
                integration
              ) => {
                const configured =
                  integration.credential_status ===
                  "configured";

                return (
                  <div
                    key={
                      integration.key
                    }
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          configured
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                        }`}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {integration.label}
                        </p>

                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {configured
                            ? "Configurada"
                            : "Pendiente de credenciales"}
                        </p>

                        {(integration.provider_name ||
                          integration.model_name) && (
                          <p className="mt-2 truncate text-[10px] text-slate-400">
                            {integration.provider_name ||
                              "Proveedor"}
                            {integration.model_name
                              ? ` · ${integration.model_name}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Producción
            </p>

            <h2 className="mt-1 font-black text-[#172033]">
              URL pública
            </h2>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="break-all font-mono text-xs text-slate-600">
                {activation.public_base_url ||
                  "Pendiente de despliegue HTTPS"}
              </p>
            </div>

            {canManage && (
              <form
                action={
                  registerCurrentProductionUrl
                }
                className="mt-4"
              >
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#172033] px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300"
                >
                  Registrar URL HTTPS actual
                </button>
              </form>
            )}

            {!productionUrlReady && (
              <p className="mt-3 text-[10px] leading-4 text-slate-400">
                En localhost este botón mostrará un aviso. Úsalo después de
                desplegar ContentAI bajo HTTPS.
              </p>
            )}
          </section>

          <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Automatización
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-600">
                  Programador
                </span>

                <span className="text-xs font-black text-slate-800">
                  {activation.scheduler_enabled
                    ? "Activo"
                    : "Preparado"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-600">
                  Métricas
                </span>

                <span className="text-xs font-black text-slate-800">
                  {activation.metrics_sync_enabled
                    ? "Activo"
                    : "Preparado"}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              Actívalos solamente después de registrar la URL pública y
              comprobar cuentas OAuth reales.
            </p>
          </section>
        </aside>
      </div>

      <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              OAuth
            </p>

            <h2 className="mt-1 text-lg font-black text-[#172033]">
              Cuentas sociales
            </h2>
          </div>

          <Link
            href="/protected/social"
            className="text-xs font-bold text-[#315efb]"
          >
            Abrir Conexiones →
          </Link>
        </div>

        {activation.social_connections.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-bold text-slate-700">
              Ninguna cuenta autorizada todavía.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Es el estado esperado mientras el cliente no entregue sus
              credenciales de LinkedIn y Meta.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activation.social_connections.map(
              (
                connection
              ) => (
                <div
                  key={
                    connection.id
                  }
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {connection.account_name ||
                        platformLabel(
                          connection.platform
                        )}
                    </p>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                      {connection.status}
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] text-slate-400">
                    {platformLabel(
                      connection.platform
                    )}{" "}
                    ·{" "}
                    {connection.connection_type}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-[20px] border border-[#cbd6ff] bg-[#f3f6ff] p-6">
        <p className="text-sm font-black text-[#2449c7]">
          Qué falta después de este paso
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          No queda un módulo de programación pendiente. Para activar los
          servicios externos solo faltan los datos reales del cliente,
          autorizar las cuentas OAuth de LinkedIn/Facebook, desplegar bajo
          HTTPS y realizar las pruebas finales con esas cuentas.
        </p>
      </section>
    </div>
  );
}