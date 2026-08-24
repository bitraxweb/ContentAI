import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type Check = {
  key: string;
  label: string;
  ok: boolean;
};

type Readiness = {
  ok: boolean;
  checks: Check[];
  configured_integrations: number;
  pending_integrations: number;
  connected_social_accounts: number;
  audit_events: number;
  scheduler_enabled: boolean;
  metrics_sync_enabled: boolean;
};

export default async function ReadinessPage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_security_readiness"
  );

  const readiness =
    data as unknown as
      | Readiness
      | null;

  if (
    error ||
    !readiness
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        No se pudo ejecutar el diagnóstico. Comprueba el SQL del Paso 23.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#315efb]">
          Control técnico
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#172033]">
          Seguridad y QA
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Comprobaciones de base de datos, permisos, trazabilidad,
          automatizaciones y preparación para producción.
        </p>
      </div>

      <section
        className={`rounded-[20px] border p-6 ${
          readiness.ok
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p
          className={`text-sm font-black ${
            readiness.ok
              ? "text-emerald-900"
              : "text-amber-900"
          }`}
        >
          {readiness.ok
            ? "Controles críticos correctos"
            : "Hay controles que requieren revisión"}
        </p>

        <p
          className={`mt-2 text-sm leading-6 ${
            readiness.ok
              ? "text-emerald-700"
              : "text-amber-700"
          }`}
        >
          Las credenciales externas pendientes no se consideran un fallo de
          seguridad: deben permanecer vacías hasta recibirlas del cliente.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Integraciones listas",
            readiness.configured_integrations,
          ],
          [
            "Credenciales pendientes",
            readiness.pending_integrations,
          ],
          [
            "Cuentas sociales",
            readiness.connected_social_accounts,
          ],
          [
            "Eventos auditados",
            readiness.audit_events,
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

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Checklist
          </p>

          <h2 className="mt-1 text-lg font-black text-[#172033]">
            Controles del backend
          </h2>

          <div className="mt-5 space-y-3">
            {readiness.checks.map(
              (
                check
              ) => (
                <div
                  key={
                    check.key
                  }
                  className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${
                      check.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {check.ok
                      ? "✓"
                      : "!"}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {check.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {check.ok
                        ? "Correcto"
                        : "Requiere revisión"}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-[#172033]">
              Automatizaciones
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-600">
                  Publicador
                </span>

                <span className="text-xs font-black text-slate-800">
                  {readiness.scheduler_enabled
                    ? "Activo"
                    : "Preparado"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-600">
                  Métricas
                </span>

                <span className="text-xs font-black text-slate-800">
                  {readiness.metrics_sync_enabled
                    ? "Activo"
                    : "Preparado"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#cbd6ff] bg-[#f3f6ff] p-5">
            <p className="text-sm font-black text-[#2449c7]">
              Validación local
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              El Paso 23 también instala un script local que revisa archivos,
              variables de entorno y patrones peligrosos sin imprimir
              secretos.
            </p>

            <code className="mt-4 block rounded-xl bg-white p-3 text-[10px] text-slate-500">
              scripts\validar-contentai.ps1
            </code>
          </section>

          <Link
            href="/protected/launch"
            className="block rounded-xl bg-[#172033] px-5 py-3 text-center text-sm font-bold text-white"
          >
            Ir a Lanzamiento
          </Link>
        </aside>
      </div>
    </div>
  );
}