import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  publishPublicationNow,
  savePublicationTargets,
} from "./actions";

export const instant = false;
export const maxDuration = 180;

type Publication = {
  id: string;
  platform: string;
  status: string;
  delivery_status: string;
  last_delivery_error: string | null;
  publication_date: string | null;
  publication_time: string | null;
  hashtags: string | null;
  call_to_action: string | null;
  external_url: string | null;
  published_at: string | null;
  contents:
    | {
        title: string | null;
        body: string | null;
      }
    | {
        title: string | null;
        body: string | null;
      }[]
    | null;
};

type Connection = {
  id: string;
  platform: string;
  connection_type: string;
  external_account_id: string;
  account_name: string | null;
  status: string;
  scopes: string[];
};

type MediaAsset = {
  id: string;
  title: string | null;
};

type Target = {
  id: string;
  social_connection_id: string;
  platform: string;
  media_asset_id: string | null;
  status: string;
  attempt_count: number;
  external_post_id: string | null;
  external_url: string | null;
  last_attempt_at: string | null;
  published_at: string | null;
  last_error: string | null;
};

type Attempt = {
  id: string;
  target_id: string;
  platform: string;
  result: string;
  provider_http_status: number | null;
  provider_error_code: string | null;
  provider_error_message: string | null;
  external_post_id: string | null;
  created_at: string;
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "forbidden-manage":
    "No tienes permiso para configurar destinos de publicación.",
  "forbidden-publish":
    "No tienes permiso para publicar en redes sociales.",
  "not-found":
    "La publicación no existe.",
  "already-published":
    "La publicación ya está marcada como publicada.",
  connections:
    "Una de las cuentas seleccionadas no está disponible.",
  platform:
    "La cuenta seleccionada no corresponde a la red de esta publicación.",
  media:
    "La imagen seleccionada no es válida.",
  "targets-save":
    "No se pudieron guardar los destinos.",
  "not-approved":
    "La publicación debe estar Aprobada antes de usar Publicar ahora.",
  scheduled:
    "Esta publicación está Programada. El envío automático se activará en el Paso 20.",
  "empty-message":
    "No hay texto disponible para publicar.",
  targets:
    "No se pudieron cargar los destinos.",
  "no-targets":
    "Selecciona y guarda al menos una cuenta de destino.",
  "publish-failed":
    "Ningún destino pudo publicarse. Revisa el detalle de errores.",
  "delivery-state":
    "La entrega terminó, pero no se pudo actualizar el estado general de la publicación.",
};

const noticeMessages:
  Record<
    string,
    string
  > = {
  published:
    "La publicación fue enviada correctamente a todos los destinos.",
  partial:
    "La entrega fue parcial: al menos un destino publicó y otro devolvió un error.",
};

function getContent(
  value:
    Publication["contents"]
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
    return "En revisión";
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
    return "Listo";
  }

  if (
    value ===
    "publishing"
  ) {
    return "Publicando";
  }

  if (
    value ===
    "partial"
  ) {
    return "Entrega parcial";
  }

  if (
    value ===
    "published"
  ) {
    return "Entregado";
  }

  if (
    value ===
    "failed"
  ) {
    return "Error";
  }

  return value;
}

function targetStatusLabel(
  value: string
) {
  if (
    value === "ready"
  ) {
    return "Listo";
  }

  if (
    value === "publishing"
  ) {
    return "Publicando";
  }

  if (
    value === "published"
  ) {
    return "Publicado";
  }

  if (
    value === "failed"
  ) {
    return "Error";
  }

  return "Cancelado";
}

function targetStatusClasses(
  value: string
) {
  if (
    value ===
    "published"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "failed"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    value ===
    "publishing"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-indigo-50 text-indigo-700";
}

function resultClasses(
  value: string
) {
  if (
    value ===
    "success"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "failed"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

function resultLabel(
  value: string
) {
  if (
    value ===
    "success"
  ) {
    return "Correcto";
  }

  if (
    value ===
    "failed"
  ) {
    return "Error";
  }

  return "Inicio";
}

export default async function PublicationDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const [
    publicationResult,
    manageResult,
    publishResult,
    mediaViewResult,
    connectionsResult,
    targetsResult,
    attemptsResult,
  ] = await Promise.all([
    supabase
      .from(
        "publications"
      )
      .select(
        "id, platform, status, delivery_status, last_delivery_error, publication_date, publication_time, hashtags, call_to_action, external_url, published_at, contents(title, body)"
      )
      .eq(
        "id",
        id
      )
      .maybeSingle(),

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

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.view",
      }
    ),

    supabase
      .from(
        "social_connections"
      )
      .select(
        "id, platform, connection_type, external_account_id, account_name, status, scopes"
      )
      .eq(
        "status",
        "connected"
      )
      .order(
        "platform"
      )
      .order(
        "account_name"
      ),

    supabase
      .from(
        "publication_targets"
      )
      .select(
        "id, social_connection_id, platform, media_asset_id, status, attempt_count, external_post_id, external_url, last_attempt_at, published_at, last_error"
      )
      .eq(
        "publication_id",
        id
      )
      .order(
        "created_at"
      ),

    supabase
      .from(
        "publication_attempts"
      )
      .select(
        "id, target_id, platform, result, provider_http_status, provider_error_code, provider_error_message, external_post_id, created_at"
      )
      .eq(
        "publication_id",
        id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(30),
  ]);

  const publication =
    publicationResult.data as
      | Publication
      | null;

  if (!publication) {
    notFound();
  }

  const canManage =
    Boolean(
      manageResult.data
    );

  const canPublish =
    Boolean(
      publishResult.data
    );

  if (
    !canManage &&
    !canPublish
  ) {
    notFound();
  }

  const canViewMedia =
    Boolean(
      mediaViewResult.data
    );

  const connections =
    (connectionsResult.data as
      | Connection[]
      | null) ??
    [];

  const relevantConnections =
    connections.filter(
      (
        connection
      ) =>
        publication.platform ===
          "both" ||
        publication.platform ===
          connection.platform
    );

  const targets =
    (targetsResult.data as
      | Target[]
      | null) ??
    [];

  const attempts =
    (attemptsResult.data as
      | Attempt[]
      | null) ??
    [];

  let mediaAssets:
    MediaAsset[] = [];

  if (canViewMedia) {
    const {
      data,
    } = await supabase
      .from(
        "media_assets"
      )
      .select(
        "id, title"
      )
      .eq(
        "asset_type",
        "image"
      )
      .eq(
        "archived",
        false
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(50);

    mediaAssets =
      (data as
        | MediaAsset[]
        | null) ??
      [];
  }

  const targetByConnection =
    new Map(
      targets.map(
        (
          target
        ) => [
          target.social_connection_id,
          target,
        ]
      )
    );

  const content =
    getContent(
      publication.contents
    );

  const saveAction =
    savePublicationTargets.bind(
      null,
      publication.id
    );

  const publishAction =
    publishPublicationNow.bind(
      null,
      publication.id
    );

  const errorMessage =
    query.error
      ? errorMessages[
          query.error
        ] ||
        "No se pudo completar la operación."
      : null;

  const noticeMessage =
    query.notice
      ? noticeMessages[
          query.notice
        ]
      : null;

  const canPublishNow =
    canPublish &&
    publication.status ===
      "approved" &&
    targets.some(
      (
        target
      ) =>
        target.status ===
          "ready" ||
        target.status ===
          "failed"
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href={`/protected/publications/${publication.id}`}
            className="text-sm font-semibold text-indigo-600"
          >
            ← Volver a la publicación
          </Link>

          <p className="mt-4 text-sm font-semibold text-indigo-600">
            Entrega social
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Motor de publicación
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Selecciona las cuentas que recibirán la publicación y revisa
            cada intento de entrega.
          </p>
        </div>

        <Link
          href="/protected/social"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Administrar conexiones
        </Link>
      </div>

      {query.saved ===
        "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Destinos guardados correctamente.
        </div>
      )}

      {noticeMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {noticeMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Estado editorial",
            statusLabel(
              publication.status
            ),
          ],
          [
            "Entrega",
            deliveryLabel(
              publication.delivery_status
            ),
          ],
          [
            "Red",
            platformLabel(
              publication.platform
            ),
          ],
          [
            "Destinos",
            String(
              targets.length
            ),
          ],
        ].map(
          ([
            label,
            value,
          ]) => (
            <div
              key={
                label
              }
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Vista previa
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {content?.title ||
                "Publicación"}
            </h2>

            <div className="mt-4 rounded-xl bg-slate-50 p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {content?.body ||
                  "Sin texto"}
              </p>

              {publication.call_to_action && (
                <p className="mt-4 text-sm font-semibold text-slate-800">
                  {publication.call_to_action}
                </p>
              )}

              {publication.hashtags && (
                <p className="mt-4 text-sm text-indigo-600">
                  {publication.hashtags}
                </p>
              )}

              {publication.external_url && (
                <p className="mt-4 break-all text-xs text-slate-400">
                  {publication.external_url}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Publicar ahora
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Solo se habilita cuando el contenido está Aprobado y existe
              al menos un destino listo o con error para reintentar.
            </p>

            <form
              action={
                publishAction
              }
              className="mt-5"
            >
              <button
                type="submit"
                disabled={
                  !canPublishNow
                }
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {publication.status ===
                  "scheduled"
                  ? "Programada · Paso 20"
                  : canPublishNow
                    ? "Publicar ahora"
                    : "No disponible"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Destinos
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Cuentas de publicación
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Una misma publicación puede enviarse a varios destinos
            autorizados.
          </p>
        </div>

        {relevantConnections.length ===
        0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-700">
              No hay cuentas conectadas para esta publicación.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Esto es normal mientras el cliente no proporcione las
              credenciales y autorice LinkedIn o Facebook.
            </p>
          </div>
        ) : (
          <form
            action={
              saveAction
            }
            className="mt-6 space-y-4"
          >
            {relevantConnections.map(
              (
                connection
              ) => {
                const target =
                  targetByConnection.get(
                    connection.id
                  );

                const isPublished =
                  target?.status ===
                  "published";

                return (
                  <article
                    key={
                      connection.id
                    }
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <label className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          name="connection_ids"
                          value={
                            connection.id
                          }
                          defaultChecked={
                            Boolean(
                              target
                            )
                          }
                          disabled={
                            isPublished ||
                            !canManage
                          }
                          className="mt-1"
                        />

                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {connection.account_name ||
                              connection.external_account_id}
                          </span>

                          <span className="mt-1 block text-xs text-slate-400">
                            {platformLabel(
                              connection.platform
                            )}{" "}
                            ·{" "}
                            {connection.connection_type}
                          </span>
                        </span>
                      </label>

                      {target && (
                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${targetStatusClasses(
                            target.status
                          )}`}
                        >
                          {targetStatusLabel(
                            target.status
                          )}
                        </span>
                      )}
                    </div>

                    {canViewMedia && (
                      <div className="mt-4">
                        <label
                          htmlFor={`media_${connection.id}`}
                          className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >
                          Imagen opcional
                        </label>

                        <select
                          id={`media_${connection.id}`}
                          name={`media_${connection.id}`}
                          defaultValue={
                            target?.media_asset_id ??
                            ""
                          }
                          disabled={
                            isPublished ||
                            !canManage
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"
                        >
                          <option value="">
                            Sin imagen
                          </option>

                          {mediaAssets.map(
                            (
                              asset
                            ) => (
                              <option
                                key={
                                  asset.id
                                }
                                value={
                                  asset.id
                                }
                              >
                                {asset.title ||
                                  "Imagen sin título"}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}

                    {target?.last_error && (
                      <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">
                        {target.last_error}
                      </div>
                    )}

                    {target?.external_post_id && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          ID externo
                        </p>

                        <p className="mt-1 break-all font-mono text-xs text-slate-600">
                          {target.external_post_id}
                        </p>

                        {target.external_url && (
                          <a
                            href={
                              target.external_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-indigo-600"
                          >
                            Abrir publicación externa ↗
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}

            {canManage && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar destinos
                </button>
              </div>
            )}
          </form>
        )}
      </section>

      {publication.last_delivery_error && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-900">
            Último problema de entrega
          </p>

          <p className="mt-2 text-sm leading-6 text-rose-700">
            {publication.last_delivery_error}
          </p>
        </section>
      )}

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Diagnóstico
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Historial de intentos
          </h2>
        </div>

        {attempts.length ===
        0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-400">
            Todavía no se ha intentado publicar esta pieza.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {attempts.map(
              (
                attempt
              ) => (
                <div
                  key={
                    attempt.id
                  }
                  className="grid gap-3 p-4 lg:grid-cols-[130px_120px_1fr_170px]"
                >
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${resultClasses(
                        attempt.result
                      )}`}
                    >
                      {resultLabel(
                        attempt.result
                      )}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    {platformLabel(
                      attempt.platform
                    )}
                  </p>

                  <div className="min-w-0">
                    {attempt.provider_error_message ? (
                      <p className="text-xs leading-5 text-rose-600">
                        {attempt.provider_error_message}
                      </p>
                    ) : attempt.external_post_id ? (
                      <p className="truncate font-mono text-xs text-slate-500">
                        {attempt.external_post_id}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Solicitud iniciada
                      </p>
                    )}

                    {attempt.provider_http_status !==
                      null && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        HTTP{" "}
                        {attempt.provider_http_status}
                        {attempt.provider_error_code
                          ? ` · ${attempt.provider_error_code}`
                          : ""}
                      </p>
                    )}
                  </div>

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
                        attempt.created_at
                      )
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-semibold text-sky-900">
          Sin cuentas conectadas no hay llamadas externas
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-800">
          El motor solo publica cuando una cuenta OAuth real está conectada,
          la publicación está Aprobada y un usuario con
          publication.publish pulsa Publicar ahora. Las publicaciones
          Programadas se enviarán automáticamente en el Paso 20.
        </p>
      </section>
    </div>
  );
}