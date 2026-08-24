import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  deleteIntegrationCredential,
  saveIntegrationCredential,
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

type CredentialMetadata = {
  integration_key: string;
  credential_key: string;
  label: string;
  description: string;
  is_required: boolean;
  vault_secret_id: string | null;
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
      "Texto, imagen, audio y video.",
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
      "Credenciales y protección.",
  },
];

const errorMessages: Record<
  string,
  string
> = {
  forbidden:
    "No tienes permiso para modificar la configuración general.",
  "integration-forbidden":
    "No tienes permiso para modificar integraciones o credenciales.",
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
  "credential-empty":
    "La credencial está vacía o es demasiado corta.",
  "credential-save":
    "No se pudo guardar la credencial cifrada.",
  "credential-delete":
    "No se pudo eliminar la credencial.",
};

function credentialStatusLabel(
  status: string
) {
  if (
    status === "configured"
  ) {
    return "Configurada";
  }

  if (
    status === "error"
  ) {
    return "Requiere revisión";
  }

  return "No configurada";
}

function credentialStatusClasses(
  status: string
) {
  if (
    status === "configured"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (
    status === "error"
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-600/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function roleLabel(
  role: string
) {
  if (
    role === "super_admin"
  ) {
    return "Super administrador";
  }

  if (
    role === "admin"
  ) {
    return "Administrador";
  }

  if (
    role === "editor"
  ) {
    return "Editor";
  }

  return "Visualizador";
}

function integrationCard(
  integration: IntegrationSetting,
  credentials: CredentialMetadata[],
  canManage: boolean
) {
  const preferenceAction =
    saveIntegrationPreferences.bind(
      null,
      integration.integration_key
    );

  const isSocial =
    integration.category ===
    "social";

  const configuredCredentials =
    credentials.filter(
      (credential) =>
        credential.vault_secret_id
    ).length;

  return (
    <section
      key={
        integration.integration_key
      }
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <form
        action={
          preferenceAction
        }
        className="p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-950">
                {
                  integration.label
                }
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
              {
                integration.description
              }
            </p>
          </div>

          <label className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={
                integration.enabled
              }
              disabled={
                !canManage
              }
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
              disabled={
                !canManage
              }
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
              disabled={
                !canManage
              }
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
              integration.notes ??
              ""
            }
            disabled={
              !canManage
            }
            placeholder="Observaciones de configuración..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {canManage && (
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Guardar preferencias
            </button>
          </div>
        )}
      </form>

      <div className="border-t border-slate-100 bg-slate-50/60 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Credenciales cifradas
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {
                configuredCredentials
              }{" "}
              de{" "}
              {
                credentials.length
              }{" "}
              guardada(s). Ningún valor secreto se vuelve a mostrar.
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Supabase Vault
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {
            credentials.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
                Esta integración todavía no necesita una credencial manual.
              </div>
            ) : (
              credentials.map(
                (
                  credential
                ) => {
                  const configured =
                    Boolean(
                      credential.vault_secret_id
                    );

                  const saveAction =
                    saveIntegrationCredential.bind(
                      null,
                      integration.integration_key,
                      credential.credential_key
                    );

                  const deleteAction =
                    deleteIntegrationCredential.bind(
                      null,
                      integration.integration_key,
                      credential.credential_key
                    );

                  return (
                    <div
                      key={
                        credential.credential_key
                      }
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {
                                credential.label
                              }
                            </p>

                            {credential.is_required && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                Requerida
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {
                              credential.description
                            }
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            configured
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {configured
                            ? "Guardada"
                            : "Vacía"}
                        </span>
                      </div>

                      {canManage && (
                        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                          <form
                            action={
                              saveAction
                            }
                            className="flex flex-1 flex-col gap-2 sm:flex-row"
                          >
                            <input
                              name="secret_value"
                              type="password"
                              required
                              minLength={4}
                              autoComplete="off"
                              spellCheck={
                                false
                              }
                              placeholder={
                                configured
                                  ? "Escribe una nueva credencial para reemplazarla"
                                  : "Pega aquí la credencial"
                              }
                              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />

                            <button
                              type="submit"
                              className="shrink-0 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              {configured
                                ? "Reemplazar"
                                : "Guardar segura"}
                            </button>
                          </form>

                          {configured && (
                            <form
                              action={
                                deleteAction
                              }
                            >
                              <button
                                type="submit"
                                className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 lg:w-auto"
                              >
                                Eliminar
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )
            )
          }
        </div>
      </div>
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    saved?: string;
    saved_integration?: string;
    credential_saved?: string;
    credential_deleted?: string;
    error?: string;
  }>;
}) {
  const {
    section,
    saved,
    saved_integration:
      savedIntegration,
    credential_saved:
      credentialSaved,
    credential_deleted:
      credentialDeleted,
    error,
  } = await searchParams;

  const currentSection =
    sections.some(
      (item) =>
        item.key ===
        section
    )
      ? section!
      : "general";

  const supabase =
    await createClient();

  const [
    workspaceResult,
    integrationsResult,
    credentialsResult,
    canManageResult,
    canManageIntegrationsResult,
    authResult,
  ] = await Promise.all([
    supabase
      .from(
        "workspace_settings"
      )
      .select(
        "id, workspace_name, language, timezone, default_platform, default_tone, updated_at"
      )
      .eq("id", 1)
      .maybeSingle(),

    supabase
      .from(
        "integration_settings"
      )
      .select(
        "integration_key, label, description, category, enabled, provider_name, model_name, notes, credential_status, updated_at"
      )
      .order(
        "category"
      )
      .order(
        "integration_key"
      ),

    supabase
      .from(
        "integration_credentials"
      )
      .select(
        "integration_key, credential_key, label, description, is_required, vault_secret_id, updated_at"
      )
      .order(
        "integration_key"
      )
      .order(
        "credential_key"
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

  const credentials =
    (credentialsResult.data as
      | CredentialMetadata[]
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

  const {
    data: profile,
  } = userId
    ? await supabase
        .from(
          "profiles"
        )
        .select(
          "full_name, role, is_active"
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle()
    : {
        data: null,
      };

  const errorMessage =
    error
      ? errorMessages[
          error
        ] ||
        "No se pudo completar la operación."
      : null;

  const aiIntegrations =
    integrations.filter(
      (item) =>
        item.category ===
        "ai"
    );

  const socialIntegrations =
    integrations.filter(
      (item) =>
        item.category ===
        "social"
    );

  const configuredCredentialCount =
    credentials.filter(
      (item) =>
        Boolean(
          item.vault_secret_id
        )
    ).length;

  const fullyConfiguredIntegrations =
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
          Preferencias del workspace, proveedores y credenciales
          protegidas.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {
            errorMessage
          }
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

      {credentialSaved && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Credencial cifrada y guardada correctamente.
        </div>
      )}

      {credentialDeleted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Credencial eliminada correctamente.
        </div>
      )}

      {(
        workspaceResult.error ||
        integrationsResult.error ||
        credentialsResult.error
      ) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron cargar todos los datos de configuración.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="h-fit space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-28">
          {
            sections.map(
              (
                item
              ) => {
                const active =
                  currentSection ===
                  item.key;

                return (
                  <Link
                    key={
                      item.key
                    }
                    href={`/protected/settings?section=${item.key}`}
                    className={`block rounded-xl px-4 py-3 transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {
                        item.label
                      }
                    </p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        active
                          ? "text-slate-300"
                          : "text-slate-400"
                      }`}
                    >
                      {
                        item.description
                      }
                    </p>
                  </Link>
                );
              }
            )
          }
        </aside>

        <div className="min-w-0">
          {currentSection ===
            "general" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Preferencias generales
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Define los valores predeterminados del espacio de trabajo.
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
          )}

          {currentSection ===
            "ai" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-800">
                No necesitas configurar ninguna API ahora. Cuando tengas una,
                podrás guardarla en el campo correspondiente y ContentAI no
                volverá a mostrar el valor.
              </div>

              {
                aiIntegrations.map(
                  (
                    integration
                  ) =>
                    integrationCard(
                      integration,
                      credentials.filter(
                        (
                          credential
                        ) =>
                          credential.integration_key ===
                          integration.integration_key
                      ),
                      canManageIntegrations
                    )
                )
              }
            </div>
          )}

          {currentSection ===
            "social" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-800">
                Dejamos Client ID / Client Secret y App ID / App Secret
                protegidos. Los tokens de acceso se generarán más adelante
                mediante el flujo de conexión de cada red, en lugar de
                pedirte que los pegues manualmente.
              </div>

              {
                socialIntegrations.map(
                  (
                    integration
                  ) =>
                    integrationCard(
                      integration,
                      credentials.filter(
                        (
                          credential
                        ) =>
                          credential.integration_key ===
                          integration.integration_key
                      ),
                      canManageIntegrations
                    )
                )
              }
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
                  {
                    [
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
                          roleLabel(
                            profile?.role ||
                              "viewer"
                          ),
                      },
                      {
                        label:
                          "Credenciales guardadas",
                        value: `${configuredCredentialCount} de ${credentials.length}`,
                      },
                      {
                        label:
                          "Integraciones completas",
                        value: `${fullyConfiguredIntegrations} de ${integrations.length}`,
                      },
                      {
                        label:
                          "Almacén de secretos",
                        value:
                          "Supabase Vault activo",
                      },
                      {
                        label:
                          "Secret key del backend",
                        value:
                          process.env
                            .SUPABASE_SECRET_KEY
                            ? "Configurada en servidor"
                            : "No configurada",
                      },
                    ].map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {
                              item.label
                            }
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {
                              item.value
                            }
                          </p>
                        </div>
                      )
                    )
                  }
                </div>
              </section>

              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-sm font-semibold text-emerald-900">
                  Cómo se protegen las credenciales
                </p>

                <div className="mt-4 space-y-3 text-sm leading-6 text-emerald-800">
                  <p>
                    • La tabla de configuración solamente conserva el ID del
                    secreto, nunca la API key en texto plano.
                  </p>

                  <p>
                    • El valor real se almacena cifrado en Supabase Vault.
                  </p>

                  <p>
                    • La interfaz únicamente sabe si existe o no una
                    credencial; nunca vuelve a leerla para mostrarla.
                  </p>

                  <p>
                    • La futura integración con IA o redes leerá el secreto
                    mediante el backend privilegiado, no desde el navegador.
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