import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  event_code: string;
  operation: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: Record<
    string,
    unknown
  >;
  created_at: string;
};

function entityLabel(
  entity: string
) {
  const labels:
    Record<
      string,
      string
    > = {
    content: "Contenido",
    publication: "Publicación",
    profile: "Usuario",
    user_permission: "Permiso de usuario",
    workspace_settings: "Configuración",
    integration: "Integración",
    media: "Multimedia",
    ai_text_brief: "Brief IA de texto",
    ai_image_brief: "Brief IA de imagen",
    ai_audio_brief: "Brief IA de audio",
    ai_video_brief: "Brief IA de video",
  };

  return labels[
    entity
  ] ?? entity;
}

function roleLabel(
  role:
    | string
    | null
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

  if (
    role === "viewer"
  ) {
    return "Visualizador";
  }

  return "Sistema / backend";
}

function eventLabel(
  row: AuditRow
) {
  const exact:
    Record<
      string,
      string
    > = {
    "content.status_changed":
      "Cambio de estado de contenido",
    "publication.status_changed":
      "Cambio de estado de publicación",
    "user.role_changed":
      "Cambio de rol de usuario",
    "user.status_changed":
      "Cambio de estado de usuario",
    "user.permission_changed":
      "Cambio de permisos",
  };

  if (
    exact[
      row.event_code
    ]
  ) {
    return exact[
      row.event_code
    ];
  }

  if (
    row.operation ===
    "insert"
  ) {
    return `Creación de ${entityLabel(
      row.entity_type
    ).toLowerCase()}`;
  }

  if (
    row.operation ===
    "delete"
  ) {
    return `Eliminación de ${entityLabel(
      row.entity_type
    ).toLowerCase()}`;
  }

  return `Modificación de ${entityLabel(
    row.entity_type
  ).toLowerCase()}`;
}

function changedFields(
  details:
    Record<
      string,
      unknown
    >
) {
  const value =
    details?.changed_fields;

  if (
    !Array.isArray(value)
  ) {
    return [] as string[];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
      "string"
  );
}

function detailValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Sí"
      : "No";
  }

  if (
    typeof value ===
      "object"
  ) {
    return JSON.stringify(
      value
    );
  }

  return String(
    value
  );
}

function entityHref(
  row: AuditRow
) {
  if (
    !row.entity_id ||
    row.operation ===
      "delete"
  ) {
    return null;
  }

  if (
    row.entity_type ===
    "content"
  ) {
    return `/protected/library/${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "publication"
  ) {
    return `/protected/publications/${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "profile"
  ) {
    return `/protected/users/${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "media"
  ) {
    return `/protected/media/${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "ai_text_brief"
  ) {
    return `/protected/generator?brief=${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "ai_image_brief"
  ) {
    return `/protected/image-generator?brief=${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "ai_audio_brief"
  ) {
    return `/protected/audio-generator?brief=${row.entity_id}`;
  }

  if (
    row.entity_type ===
    "ai_video_brief"
  ) {
    return `/protected/video-generator?brief=${row.entity_id}`;
  }

  return null;
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();

  const {
    data,
  } = await supabase
    .from("audit_logs")
    .select(
      "id, actor_user_id, actor_name, actor_email, actor_role, event_code, operation, entity_type, entity_id, entity_label, details, created_at"
    )
    .eq(
      "id",
      id
    )
    .maybeSingle();

  const row =
    data as
      | AuditRow
      | null;

  if (!row) {
    redirect(
      "/protected/activity"
    );
  }

  const fields =
    changedFields(
      row.details ??
        {}
    );

  const safeEntries =
    Object.entries(
      row.details ??
        {}
    ).filter(
      ([key]) =>
        key !==
        "changed_fields"
    );

  const targetHref =
    entityHref(
      row
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/protected/activity"
            className="text-sm font-semibold text-indigo-600"
          >
            ← Volver a trazabilidad
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Detalle del evento
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {eventLabel(
              row
            )}
          </p>
        </div>

        {targetHref && (
          <Link
            href={
              targetHref
            }
            className="w-fit rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Abrir elemento
          </Link>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Actor",
            row.actor_name?.trim() ||
              "Sistema / backend",
          ],
          [
            "Rol",
            roleLabel(
              row.actor_role
            ),
          ],
          [
            "Módulo",
            entityLabel(
              row.entity_type
            ),
          ],
          [
            "Fecha",
            new Intl.DateTimeFormat(
              "es",
              {
                dateStyle:
                  "medium",
                timeStyle:
                  "short",
              }
            ).format(
              new Date(
                row.created_at
              )
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

              <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Acción registrada
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {eventLabel(
              row
            )}
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Elemento
              </p>

              <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                {row.entity_label ||
                  row.entity_id ||
                  "Sin etiqueta"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Código del evento
              </p>

              <p className="mt-2 break-all font-mono text-xs text-slate-700">
                {row.event_code}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-800">
              Campos modificados
            </p>

            {fields.length ===
            0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Este evento no requiere una lista de campos modificados.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {fields.map(
                  (
                    field
                  ) => (
                    <span
                      key={
                        field
                      }
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 font-mono text-xs font-medium text-indigo-700"
                    >
                      {field}
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          {safeEntries.length >
            0 && (
            <div className="mt-7">
              <p className="text-sm font-semibold text-slate-800">
                Metadatos seguros
              </p>

              <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {safeEntries.map(
                  ([
                    key,
                    value,
                  ]) => (
                    <div
                      key={
                        key
                      }
                      className="grid gap-2 p-4 sm:grid-cols-[180px_1fr]"
                    >
                      <p className="font-mono text-xs font-semibold text-slate-500">
                        {key}
                      </p>

                      <p className="break-words text-sm text-slate-700">
                        {detailValue(
                          value
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Actor
            </h2>

            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nombre
                </dt>

                <dd className="mt-1 text-sm text-slate-700">
                  {row.actor_name ||
                    "Sistema / backend"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Correo
                </dt>

                <dd className="mt-1 break-all text-sm text-slate-700">
                  {row.actor_email ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Rol
                </dt>

                <dd className="mt-1 text-sm text-slate-700">
                  {roleLabel(
                    row.actor_role
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-sm font-semibold text-sky-900">
              Registro de solo lectura
            </p>

            <p className="mt-2 text-xs leading-5 text-sky-800">
              Este evento no puede editarse ni eliminarse desde ContentAI.
              Los detalles mostrados están deliberadamente limitados para
              evitar copiar secretos o contenido sensible al historial.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}