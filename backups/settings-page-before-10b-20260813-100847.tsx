import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  saveIntegrationPreferences,
  saveWorkspaceSettings,
} from "./actions";

export const instant = false;

type WorkspaceSettings = {
  id: number;
  workspace_name: string;
  language: string;
  timezone: string;
  default_platform: string;
  default_tone: string;
  updated_at: string;
};

type IntegrationSetting = {
  integration_key: string;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
  provider_name: string | null;
  model_name: string | null;
  notes: string | null;
  credential_status: string;
  updated_at: string;
};

const sections = [
  {
    key: "general",
    label: "General",
    description:
      "Identidad y preferencias del espacio.",
  },
  {
    key: "ai",
    label: "Inteligencia Artificial",
    description:
      "Proveedores de texto, imagen, audio y video.",
  },
  {
    key: "social",
    label: "Redes sociales",
    description:
      "LinkedIn y Facebook.",
  },
  {
    key: "security",
    label: "Seguridad",
    description:
      "Estado de protección y credenciales.",
  },
];

const errorMessages: Record<
  string,
  string
> = {
  forbidden:
    "No tienes permiso para modificar la configuración general.",
  "integration-forbidden":
    "No tienes permiso para modificar integraciones.",
  name:
    "El nombre del espacio es obligatorio.",
  language:
    "El idioma seleccionado no es válido.",
  timezone:
    "La zona horaria es obligatoria.",
  platform:
    "La red predeterminada no es válida.",
  tone:
    "El tono predeterminado no es válido.",
  integration:
    "La integración seleccionada no es válida.",
  database:
    "No se pudieron guardar los cambios.",
};

function credentialStatusLabel(
  status: string
) {
  if (status === "configured") {
    return "Configurada";
  }

  if (status === "error") {
    return "Requiere revisión";
  }

  return "No configurada";
}

function credentialStatusClasses(
  status: string
) {
  if (status === "configured") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (status === "error") {
    return "bg-rose-50 text-rose-700 ring-rose-600/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function integrationCard(
  integration: IntegrationSetting,
  canManage: boolean
) {
  const boundAction =
    saveIntegrationPreferences.bind(
      null,
      integration.integration_key
    );

  const isSocial =
    integration.category ===
    "social";

  return (
    <form
      key={
        integration.integration_key
      }
      action={boundAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {integration.label}
            </h2>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${credentialStatusClasses(
                integration.credential_status
              )}`}
            >
              {credentialStatusLabel(
                integration.credential_status
              )}
            </span>
          </div>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {integration.description}
          </p>
        </div>

        <label className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={
              integration.enabled
            }
            disabled={!canManage}
          />
          Habilitada
        </label>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={`provider-${integration.integration_key}`}
            className="text-sm font-semibold text-slate-700"
          >
            {isSocial
              ? "Plataforma / proveedor"
              : "Proveedor"}
          </label>

          <input
            id={`provider-${integration.integration_key}`}
            name="provider_name"
            defaultValue={
              integration.provider_name ??
              ""
            }
            disabled={!canManage}
            placeholder={
              isSocial
                ? "Ej: Meta"
                : "Ej: OpenAI"
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`model-${integration.integration_key}`}
            className="text-sm font-semibold text-slate-700"
          >
            {isSocial
              ? "Identificador opcional"
              : "Modelo predeterminado"}
          </label>

          <input
            id={`model-${integration.integration_key}`}
            name="model_name"
            defaultValue={
              integration.model_name ??
              ""
            }
            disabled={!canManage}
            placeholder={
              isSocial
                ? "Se completará al conectar la cuenta"
                : "Se definirá cuando configures la API"
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <label
          htmlFor={`notes-${integration.integration_key}`}
          className="text-sm font-semibold text-slate-700"
        >
          Notas internas
        </label>

        <textarea
          id={`notes-${integration.integration_key}`}
          name="notes"
          rows={3}
          defaultValue={
            integration.notes ?? ""
          }
          disabled={!canManage}
          placeholder="Observaciones de configuración..."
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Credenciales
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              No se solicita ninguna clave todavía. En el siguiente
              subpaso podrás guardarla desde aquí de forma cifrada.
            </p>
          </div>

          <span className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
            Próximo paso
          </span>
        </div>
      </div>

      {canManage && (
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Guardar preferencias
          </button>
        </div>
      )}
    </form>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    saved?: string;
    saved_integration?: string;
    error?: string;
  }>;
}) {
  const {
    section,
    saved,
    saved_integration:
      savedIntegration,
    error,
  } = await searchParams;

  const currentSection =
    sections.some(
      (item) =>
        item.key === section
    )
      ? section!
      : "general";

  const supabase =
    await createClient();

  const [
    workspaceResult,
    integrationsResult,
    canManageResult,
    canManageIntegrationsResult,
    authResult,
  ] = await Promise.all([
    supabase
      .from("workspace_settings")
      .select(
        "id, workspace_name, language, timezone, default_platform, default_tone, updated_at"
      )
      .eq("id", 1)
      .maybeSingle(),

    supabase
      .from("integration_settings")
      .select(
        "integration_key, label, description, category, enabled, provider_name, model_name, notes, credential_status, updated_at"
      )
      .order("category")
      .order("integration_key"),

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
          "integrations.manage",
      }
    ),

    supabase.auth.getClaims(),
  ]);

  const workspace =
    workspaceResult.data as
      | WorkspaceSettings
      | null;

  const integrations =
    (integrationsResult.data as
      | IntegrationSetting[]
      | null) ?? [];

  const canManage =
    Boolean(
      canManageResult.data
    );

  const canManageIntegrations =
    Boolean(
      canManageIntegrationsResult.data
    );

  const userId =
    authResult.data?.claims?.sub;

  const { data: profile } =
    userId
      ? await supabase
          .from("profiles")
          .select(
            "full_name, role, is_active"
          )
          .eq("id", userId)
          .maybeSingle()
      : {
          data: null,
        };

  const errorMessage = error
    ? errorMessages[error] ||
      "No se pudo completar la operación."
    : null;

  const aiIntegrations =
    integrations.filter(
      (item) =>
        item.category === "ai"
    );

  const socialIntegrations =
    integrations.filter(
      (item) =>
        item.category ===
        "social"
    );

  const configuredCount =
    integrations.filter(
      (item) =>
        item.credential_status ===
        "configured"
    ).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">
          Administración
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Configuración
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Centraliza las preferencias del workspace y deja preparadas las
          futuras conexiones externas.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Configuración general guardada correctamente.
        </div>
      )}

      {savedIntegration && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Preferencias de integración guardadas correctamente.
        </div>
      )}

      {(workspaceResult.error ||
        integrationsResult.error) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron cargar todos los datos de configuración.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="h-fit space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-28">
          {sections.map(
            (item) => {
              const active =
                currentSection ===
                item.key;

              return (
                <Link
                  key={item.key}
                  href={`/protected/settings?section=${item.key}`}
                  className={`block rounded-xl px-4 py-3 transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {item.label}
                  </p>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      active
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    {item.description}
                  </p>
                </Link>
              );
            }
          )}
        </aside>

        <div className="min-w-0">
          {currentSection ===
            "general" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Preferencias generales
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Estos valores definirán el comportamiento predeterminado
                    de ContentAI.
                  </p>
                </div>

                {workspace && (
                  <form
                    action={
                      saveWorkspaceSettings
                    }
                    className="mt-6 space-y-6"
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor="workspace_name"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Nombre del espacio
                      </label>

                      <input
                        id="workspace_name"
                        name="workspace_name"
                        defaultValue={
                          workspace.workspace_name
                        }
                        disabled={
                          !canManage
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                      />

                      <p className="text-xs text-slate-400">
                        Este nombre aparecerá también en el menú lateral.
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="language"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Idioma
                        </label>

                        <select
                          id="language"
                          name="language"
                          defaultValue={
                            workspace.language
                          }
                          disabled={
                            !canManage
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                        >
                          <option value="es">
                            Español
                          </option>

                          <option value="en">
                            Inglés
                          </option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="timezone"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Zona horaria
                        </label>

                        <input
                          id="timezone"
                          name="timezone"
                          defaultValue={
                            workspace.timezone
                          }
                          disabled={
                            !canManage
                          }
                          placeholder="Ej: America/Lima"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                        />

                        <p className="text-xs text-slate-400">
                          Usa un identificador IANA, por ejemplo
                          America/Lima.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="default_platform"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Red predeterminada
                        </label>

                        <select
                          id="default_platform"
                          name="default_platform"
                          defaultValue={
                            workspace.default_platform
                          }
                          disabled={
                            !canManage
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                        >
                          <option value="linkedin">
                            LinkedIn
                          </option>

                          <option value="facebook">
                            Facebook
                          </option>

                          <option value="both">
                            LinkedIn y Facebook
                          </option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="default_tone"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Tono predeterminado
                        </label>

                        <select
                          id="default_tone"
                          name="default_tone"
                          defaultValue={
                            workspace.default_tone
                          }
                          disabled={
                            !canManage
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                        >
                          <option value="professional">
                            Profesional
                          </option>

                          <option value="friendly">
                            Amigable
                          </option>

                          <option value="informative">
                            Informativo
                          </option>

                          <option value="persuasive">
                            Persuasivo
                          </option>

                          <option value="inspirational">
                            Inspirador
                          </option>
                        </select>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex justify-end border-t border-slate-100 pt-5">
                        <button
                          type="submit"
                          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          Guardar configuración
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </section>
            </div>
          )}

          {currentSection ===
            "ai" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-800">
                Puedes dejar todo sin configurar. No necesitamos ninguna
                API key para continuar desarrollando la plataforma.
              </div>

              {aiIntegrations.map(
                (integration) =>
                  integrationCard(
                    integration,
                    canManageIntegrations
                  )
              )}
            </div>
          )}

          {currentSection ===
            "social" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-800">
                Las cuentas de LinkedIn y Facebook se conectarán más
                adelante. Por ahora solo dejamos organizada su
                configuración.
              </div>

              {socialIntegrations.map(
                (integration) =>
                  integrationCard(
                    integration,
                    canManageIntegrations
                  )
              )}
            </div>
          )}

          {currentSection ===
            "security" && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">
                  Estado de seguridad
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      label:
                        "Cuenta actual",
                      value:
                        profile?.is_active
                          ? "Activa"
                          : "Bloqueada",
                    },
                    {
                      label:
                        "Rol actual",
                      value:
                        profile?.role ||
                        "Sin rol",
                    },
                    {
                      label:
                        "Integraciones con credenciales",
                      value: `${configuredCount} de ${integrations.length}`,
                    },
                    {
                      label:
                        "Secret key de administración",
                      value:
                        process.env
                          .SUPABASE_SECRET_KEY
                          ? "Configurada en servidor"
                          : "No configurada",
                    },
                  ].map(
                    (item) => (
                      <div
                        key={
                          item.label
                        }
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {item.label}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {item.value}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">
                  Credenciales sensibles
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Las claves de IA y las credenciales de redes sociales no
                  se mostrarán como texto visible dentro de la base de datos
                  de configuración. El siguiente subpaso añadirá el almacén
                  cifrado y desde esta misma pantalla podrás guardarlas,
                  reemplazarlas o eliminarlas.
                </p>

                <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Preparado para el almacén de secretos
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    No necesitas introducir ninguna clave en este momento.
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}