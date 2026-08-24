import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  disconnectSocialConnection,
} from "./actions";

export const instant = false;

type IntegrationState = {
  integration_key: string;
  label: string;
  enabled: boolean;
  credential_status: string;
  provider_name: string | null;
};

type SocialConnection = {
  id: string;
  platform: string;
  connection_type: string;
  external_account_id: string;
  account_name: string | null;
  status: string;
  scopes: string[];
  token_expires_at: string | null;
  metadata:
    Record<
      string,
      unknown
    >;
  connected_at: string | null;
  last_checked_at: string | null;
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "linkedin-credentials":
    "LinkedIn todavía no tiene Client ID y Client Secret configurados.",
  "linkedin-cancelled":
    "La autorización de LinkedIn fue cancelada o rechazada.",
  "linkedin-state":
    "No se pudo validar de forma segura la respuesta OAuth de LinkedIn.",
  "linkedin-network":
    "No se pudo conectar con LinkedIn para intercambiar el código OAuth.",
  "linkedin-token":
    "LinkedIn no entregó un access token válido.",
  "linkedin-profile":
    "No se pudo recuperar la identidad de la cuenta de LinkedIn.",
  "linkedin-store":
    "LinkedIn autorizó la cuenta, pero no se pudo guardar el token en Vault.",
  "facebook-credentials":
    "Facebook/Meta todavía no tiene App ID y App Secret configurados.",
  "facebook-cancelled":
    "La autorización de Facebook fue cancelada o rechazada.",
  "facebook-state":
    "No se pudo validar de forma segura la respuesta OAuth de Facebook.",
  "facebook-network":
    "No se pudo conectar con Meta para intercambiar el código OAuth.",
  "facebook-token":
    "Meta no entregó un access token válido.",
  "facebook-pages":
    "No se pudieron consultar las páginas administradas por la cuenta autorizada.",
  "facebook-no-pages":
    "La cuenta autorizada no devolvió ninguna página administrable para ContentAI.",
  "facebook-store":
    "Meta autorizó la cuenta, pero no se pudieron guardar los tokens de página en Vault.",
  "connection-not-found":
    "No se encontró la conexión solicitada.",
  disconnect:
    "No se pudo desconectar la cuenta.",
};

const noticeMessages:
  Record<
    string,
    string
  > = {
  "linkedin-connected":
    "Cuenta de LinkedIn conectada. El access token quedó almacenado en Vault.",
  "facebook-connected":
    "Facebook/Meta conectado. Las páginas autorizadas quedaron registradas con tokens protegidos en Vault.",
  disconnected:
    "La conexión fue desactivada y su token fue eliminado de Vault.",
};

function platformLabel(
  platform: string
) {
  return platform ===
    "linkedin"
    ? "LinkedIn"
    : "Facebook";
}

function connectionTypeLabel(
  type: string
) {
  if (
    type === "member"
  ) {
    return "Miembro";
  }

  if (
    type ===
    "organization"
  ) {
    return "Organización";
  }

  if (
    type === "page"
  ) {
    return "Página";
  }

  return type;
}

function statusLabel(
  status: string
) {
  if (
    status ===
    "connected"
  ) {
    return "Conectada";
  }

  if (
    status ===
    "expired"
  ) {
    return "Expirada";
  }

  if (
    status ===
    "error"
  ) {
    return "Requiere revisión";
  }

  return "Desconectada";
}

function statusClasses(
  status: string
) {
  if (
    status ===
    "connected"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "expired" ||
    status ===
      "error"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-500";
}

function credentialReady(
  integration:
    | IntegrationState
    | undefined
) {
  return (
    integration
      ?.credential_status ===
    "configured"
  );
}

function ConnectionCard({
  connection,
}: {
  connection:
    SocialConnection;
}) {
  const disconnectAction =
    disconnectSocialConnection.bind(
      null,
      connection.id
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              {platformLabel(
                connection.platform
              )}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                connection.status
              )}`}
            >
              {statusLabel(
                connection.status
              )}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-semibold text-slate-950">
            {connection.account_name ||
              connection.external_account_id}
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            {connectionTypeLabel(
              connection.connection_type
            )}{" "}
            · ID{" "}
            {connection.external_account_id}
          </p>
        </div>

        {connection.status ===
          "connected" && (
          <form
            action={
              disconnectAction
            }
          >
            <button
              type="submit"
              className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Desconectar
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Token
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            {connection.status ===
            "connected"
              ? "Protegido en Vault"
              : "No disponible"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Expiración
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            {connection.token_expires_at
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
                    connection.token_expires_at
                  )
                )
              : "No informada"}
          </p>
        </div>
      </div>

      {connection.scopes.length >
        0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {connection.scopes.map(
            (
              scope
            ) => (
              <span
                key={
                  scope
                }
                className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-[9px] font-medium text-indigo-600"
              >
                {scope}
              </span>
            )
          )}
        </div>
      )}
    </article>
  );
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    error?: string;
    count?: string;
  }>;
}) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const [
    integrationsResult,
    connectionsResult,
  ] = await Promise.all([
    supabase
      .from(
        "integration_settings"
      )
      .select(
        "integration_key, label, enabled, credential_status, provider_name"
      )
      .in(
        "integration_key",
        [
          "linkedin",
          "facebook",
        ]
      ),

    supabase
      .from(
        "social_connections"
      )
      .select(
        "id, platform, connection_type, external_account_id, account_name, status, scopes, token_expires_at, metadata, connected_at, last_checked_at"
      )
      .order(
        "platform"
      )
      .order(
        "account_name"
      ),
  ]);

  const integrations =
    (integrationsResult.data as
      | IntegrationState[]
      | null) ?? [];

  const connections =
    (connectionsResult.data as
      | SocialConnection[]
      | null) ?? [];

  const linkedin =
    integrations.find(
      (
        item
      ) =>
        item.integration_key ===
        "linkedin"
    );

  const facebook =
    integrations.find(
      (
        item
      ) =>
        item.integration_key ===
        "facebook"
    );

  const linkedinConnections =
    connections.filter(
      (
        item
      ) =>
        item.platform ===
        "linkedin"
    );

  const facebookConnections =
    connections.filter(
      (
        item
      ) =>
        item.platform ===
        "facebook"
    );

  const errorMessage =
    params.error
      ? errorMessages[
          params.error
        ] ||
        "No se pudo completar la conexión."
      : null;

  let noticeMessage =
    params.notice
      ? noticeMessages[
          params.notice
        ]
      : null;

  if (
    params.notice ===
      "facebook-connected" &&
    params.count
  ) {
    noticeMessage =
      `${noticeMessages["facebook-connected"]} Páginas detectadas: ${params.count}.`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Integraciones sociales
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Conexiones
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Autoriza cuentas sociales sin exponer access tokens en el
            navegador ni en las tablas normales de configuración.
          </p>
        </div>

        <Link
          href="/protected/settings?section=social"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Credenciales de aplicación
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

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                LinkedIn
              </p>

              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Cuenta profesional
              </h2>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                credentialReady(
                  linkedin
                )
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {credentialReady(
                linkedin
              )
                ? "App configurada"
                : "Credenciales pendientes"}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            La conexión inicial usa OAuth de miembro. El token queda
            protegido en Vault y la cuenta puede desconectarse desde aquí.
            La selección de una organización para publicar se resolverá en
            el motor de publicación.
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Callback que deberá registrarse
            </p>

            <code className="mt-2 block break-all text-[11px] text-slate-500">
              https://TU-DOMINIO/api/integrations/linkedin/callback
            </code>
          </div>

          <div className="mt-5">
            {credentialReady(
              linkedin
            ) ? (
              <Link
                href="/api/integrations/linkedin/connect"
                className="inline-flex rounded-xl bg-[#0A66C2] px-5 py-3 text-sm font-semibold text-white"
              >
                Conectar LinkedIn
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
                Esperando Client ID + Client Secret
              </span>
            )}
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Meta
              </p>

              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Páginas de Facebook
              </h2>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                credentialReady(
                  facebook
                )
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {credentialReady(
                facebook
              )
                ? "App configurada"
                : "Credenciales pendientes"}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            Después de autorizar Meta, ContentAI consultará las páginas que
            la cuenta puede administrar y almacenará cada Page access token
            por separado dentro de Vault.
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Callback que deberá registrarse
            </p>

            <code className="mt-2 block break-all text-[11px] text-slate-500">
              https://TU-DOMINIO/api/integrations/facebook/callback
            </code>
          </div>

          <div className="mt-5">
            {credentialReady(
              facebook
            ) ? (
              <Link
                href="/api/integrations/facebook/connect"
                className="inline-flex rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-semibold text-white"
              >
                Conectar Facebook
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
                Esperando App ID + App Secret
              </span>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">
          En este momento no debes conectar nada
        </p>

        <p className="mt-2 text-sm leading-6 text-amber-800">
          Mientras el cliente no entregue las credenciales de sus
          aplicaciones, ambos botones permanecerán bloqueados. ContentAI no
          utiliza valores de ejemplo ni intenta autenticarse con cuentas
          externas.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Cuentas autorizadas
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            LinkedIn
          </h2>
        </div>

        {linkedinConnections.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            No hay ninguna cuenta de LinkedIn conectada.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {linkedinConnections.map(
              (
                connection
              ) => (
                <ConnectionCard
                  key={
                    connection.id
                  }
                  connection={
                    connection
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Cuentas autorizadas
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Facebook
          </h2>
        </div>

        {facebookConnections.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            No hay ninguna página de Facebook conectada.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {facebookConnections.map(
              (
                connection
              ) => (
                <ConnectionCard
                  key={
                    connection.id
                  }
                  connection={
                    connection
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-semibold text-sky-900">
          Separación de secretos
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-800">
          Client Secret, App Secret y los access tokens OAuth nunca se
          consultan desde el navegador. Esta pantalla recibe únicamente
          nombres de cuenta, IDs externos, scopes, estado y fechas.
        </p>
      </section>
    </div>
  );
}