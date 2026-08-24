import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type SearchParams = {
  entity?: string;
  operation?: string;
  actor?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
};

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

const pageSize = 30;

const entityOptions = [
  ["all", "Todos los módulos"],
  ["content", "Contenidos"],
  ["publication", "Publicaciones"],
  ["profile", "Usuarios"],
  ["user_permission", "Permisos"],
  ["workspace_settings", "Configuración"],
  ["integration", "Integraciones"],
  ["media", "Multimedia"],
  ["ai_text_brief", "IA de texto"],
  ["ai_image_brief", "IA de imagen"],
  ["ai_audio_brief", "IA de audio"],
  ["ai_video_brief", "IA de video"],
] as const;

const operationOptions = [
  ["all", "Todas las acciones"],
  ["insert", "Creaciones"],
  ["update", "Modificaciones"],
  ["delete", "Eliminaciones"],
] as const;

function entityLabel(
  entity: string
) {
  const found =
    entityOptions.find(
      ([value]) =>
        value === entity
    );

  return found?.[1] ??
    entity;
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

  return "Sistema";
}

function eventLabel(
  eventCode: string,
  operation: string,
  entityType: string
) {
  const exact:
    Record<
      string,
      string
    > = {
    "content.status_changed":
      "Cambió el estado de un contenido",
    "publication.status_changed":
      "Cambió el estado de una publicación",
    "user.role_changed":
      "Cambió el rol de un usuario",
    "user.status_changed":
      "Cambió el estado de un usuario",
    "user.permission_changed":
      "Modificó permisos de usuario",
  };

  if (
    exact[
      eventCode
    ]
  ) {
    return exact[
      eventCode
    ];
  }

  const noun =
    entityLabel(
      entityType
    ).toLowerCase();

  if (
    operation ===
    "insert"
  ) {
    return `Creó ${noun}`;
  }

  if (
    operation ===
    "delete"
  ) {
    return `Eliminó ${noun}`;
  }

  return `Modificó ${noun}`;
}

function operationClasses(
  operation: string
) {
  if (
    operation === "insert"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    operation === "delete"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-indigo-50 text-indigo-700";
}

function operationLabel(
  operation: string
) {
  if (
    operation === "insert"
  ) {
    return "Creación";
  }

  if (
    operation === "delete"
  ) {
    return "Eliminación";
  }

  return "Modificación";
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

function fieldLabel(
  value: string
) {
  const labels:
    Record<
      string,
      string
    > = {
    title: "título",
    body: "texto",
    status: "estado",
    role: "rol",
    is_active: "estado de cuenta",
    platform: "red",
    publication_date: "fecha",
    publication_time: "hora",
    internal_notes: "notas",
    call_to_action: "CTA",
    hashtags: "hashtags",
    enabled: "activación",
    provider_name: "proveedor",
    model_name: "modelo",
    credential_status: "estado de credencial",
    tags: "etiquetas",
    is_favorite: "favorito",
    archived: "archivo",
    full_name: "nombre",
    email: "correo",
    allowed: "permiso",
  };

  return labels[
    value
  ] ?? value;
}

function buildHref({
  entity,
  operation,
  actor,
  q,
  from,
  to,
  page,
}: {
  entity: string;
  operation: string;
  actor: string;
  q: string;
  from: string;
  to: string;
  page?: number;
}) {
  const params =
    new URLSearchParams();

  if (
    entity !==
    "all"
  ) {
    params.set(
      "entity",
      entity
    );
  }

  if (
    operation !==
    "all"
  ) {
    params.set(
      "operation",
      operation
    );
  }

  if (actor) {
    params.set(
      "actor",
      actor
    );
  }

  if (q) {
    params.set(
      "q",
      q
    );
  }

  if (from) {
    params.set(
      "from",
      from
    );
  }

  if (to) {
    params.set(
      "to",
      to
    );
  }

  if (
    page &&
    page > 1
  ) {
    params.set(
      "page",
      String(page)
    );
  }

  const suffix =
    params.toString();

  return suffix
    ? `/protected/activity?${suffix}`
    : "/protected/activity";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params =
    await searchParams;

  const entity =
    entityOptions.some(
      ([value]) =>
        value ===
        params.entity
    )
      ? params.entity!
      : "all";

  const operation =
    operationOptions.some(
      ([value]) =>
        value ===
        params.operation
    )
      ? params.operation!
      : "all";

  const actor =
    (params.actor ?? "")
      .trim()
      .slice(
        0,
        80
      );

  const q =
    (params.q ?? "")
      .trim()
      .slice(
        0,
        100
      );

  const from =
    /^\d{4}-\d{2}-\d{2}$/.test(
      params.from ?? ""
    )
      ? params.from!
      : "";

  const to =
    /^\d{4}-\d{2}-\d{2}$/.test(
      params.to ?? ""
    )
      ? params.to!
      : "";

  const parsedPage =
    Number(
      params.page ??
      "1"
    );

  const page =
    Number.isInteger(
      parsedPage
    ) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const offset =
    (page - 1) *
    pageSize;

  const supabase =
    await createClient();

  let activityQuery =
    supabase
      .from("audit_logs")
      .select(
        "id, actor_user_id, actor_name, actor_email, actor_role, event_code, operation, entity_type, entity_id, entity_label, details, created_at",
        {
          count: "exact",
        }
      );

  if (
    entity !==
    "all"
  ) {
    activityQuery =
      activityQuery.eq(
        "entity_type",
        entity
      );
  }

  if (
    operation !==
    "all"
  ) {
    activityQuery =
      activityQuery.eq(
        "operation",
        operation
      );
  }

  if (actor) {
    activityQuery =
      activityQuery.ilike(
        "actor_name",
        `%${actor}%`
      );
  }

  if (q) {
    activityQuery =
      activityQuery.ilike(
        "entity_label",
        `%${q}%`
      );
  }

  if (from) {
    activityQuery =
      activityQuery.gte(
        "created_at",
        `${from}T00:00:00`
      );
  }

  if (to) {
    const end =
      new Date(
        `${to}T00:00:00`
      );

    end.setDate(
      end.getDate() +
      1
    );

    activityQuery =
      activityQuery.lt(
        "created_at",
        end.toISOString()
      );
  }

  activityQuery =
    activityQuery
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        offset,
        offset +
          pageSize -
          1
      );

  const now =
    new Date();

  const last24Hours =
    new Date(
      now.getTime() -
        24 *
        60 *
        60 *
        1000
    ).toISOString();

  const last7Days =
    new Date(
      now.getTime() -
        7 *
        24 *
        60 *
        60 *
        1000
    ).toISOString();

  const [
    activityResult,
    totalResult,
    last24Result,
    last7Result,
    deleteResult,
  ] = await Promise.all([
    activityQuery,

    supabase
      .from("audit_logs")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("audit_logs")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte(
        "created_at",
        last24Hours
      ),

    supabase
      .from("audit_logs")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte(
        "created_at",
        last7Days
      ),

    supabase
      .from("audit_logs")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "operation",
        "delete"
      ),
  ]);

  const rows =
    (activityResult.data as
      | AuditRow[]
      | null) ?? [];

  const totalFiltered =
    activityResult.count ??
    0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalFiltered /
        pageSize
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">
          Seguridad y control
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Trazabilidad
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Registro inmutable de las acciones relevantes realizadas dentro
          del workspace.
        </p>
      </div>

      {activityResult.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudo cargar el historial:{" "}
          {activityResult.error.message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Eventos registrados",
            totalResult.count ??
              0,
          ],
          [
            "Últimas 24 h",
            last24Result.count ??
              0,
          ],
          [
            "Últimos 7 días",
            last7Result.count ??
              0,
          ],
          [
            "Eliminaciones",
            deleteResult.count ??
              0,
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

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="get"
          className="grid gap-3 xl:grid-cols-[repeat(2,minmax(180px,1fr))_repeat(2,minmax(150px,1fr))_repeat(2,minmax(145px,auto))_auto]"
        >
          <select
            name="entity"
            defaultValue={
              entity
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            {entityOptions.map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {label}
                </option>
              )
            )}
          </select>

          <select
            name="operation"
            defaultValue={
              operation
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            {operationOptions.map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {label}
                </option>
              )
            )}
          </select>

          <input
            name="actor"
            defaultValue={
              actor
            }
            placeholder="Actor..."
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />

          <input
            name="q"
            defaultValue={
              q
            }
            placeholder="Elemento..."
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />

          <input
            name="from"
            type="date"
            defaultValue={
              from
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
          />

          <input
            name="to"
            type="date"
            defaultValue={
              to
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Filtrar
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-950">
              Registro de actividad
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {totalFiltered} resultado(s)
            </p>
          </div>

          {(entity !== "all" ||
            operation !== "all" ||
            actor ||
            q ||
            from ||
            to) && (
            <Link
              href="/protected/activity"
              className="text-xs font-semibold text-indigo-600"
            >
              Limpiar filtros
            </Link>
          )}
        </div>

        {rows.length ===
        0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-700">
              No hay actividad con estos filtros.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Los nuevos cambios comenzarán a registrarse automáticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(
              (
                row
              ) => {
                const fields =
                  changedFields(
                    row.details ??
                      {}
                  );

                return (
                  <Link
                    key={
                      row.id
                    }
                    href={`/protected/activity/${row.id}`}
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[190px_minmax(180px,0.8fr)_minmax(260px,1.5fr)_minmax(180px,0.8fr)_auto] lg:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {row.actor_name?.trim() ||
                          "Sistema / backend"}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {roleLabel(
                          row.actor_role
                        )}
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${operationClasses(
                          row.operation
                        )}`}
                      >
                        {operationLabel(
                          row.operation
                        )}
                      </span>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {entityLabel(
                          row.entity_type
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {eventLabel(
                          row.event_code,
                          row.operation,
                          row.entity_type
                        )}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {row.entity_label ||
                          row.entity_id ||
                          "Elemento sin etiqueta"}
                      </p>

                      {fields.length >
                        0 && (
                        <p className="mt-1 truncate text-[10px] text-slate-400">
                          Cambios:{" "}
                          {fields
                            .slice(
                              0,
                              5
                            )
                            .map(
                              fieldLabel
                            )
                            .join(
                              ", "
                            )}
                          {fields.length >
                          5
                            ? "…"
                            : ""}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-600">
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
                            row.created_at
                          )
                        )}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {row.actor_email ||
                          ""}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-indigo-600">
                      Ver →
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>

      {totalPages >
        1 && (
        <nav className="flex flex-wrap items-center justify-center gap-3">
          {currentPage >
            1 && (
            <Link
              href={buildHref({
                entity,
                operation,
                actor,
                q,
                from,
                to,
                page:
                  currentPage -
                  1,
              })}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              ← Anterior
            </Link>
          )}

          <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600">
            Página{" "}
            {currentPage}{" "}
            de{" "}
            {totalPages}
          </span>

          {currentPage <
            totalPages && (
            <Link
              href={buildHref({
                entity,
                operation,
                actor,
                q,
                from,
                to,
                page:
                  currentPage +
                  1,
              })}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Siguiente →
            </Link>
          )}
        </nav>
      )}

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-semibold text-sky-900">
          Historial protegido
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-800">
          Esta pantalla es de solo lectura. El historial se genera mediante
          triggers de base de datos y no almacena API keys, secretos de
          Vault, archivos, cuerpos completos de contenido ni prompts
          completos.
        </p>
      </section>
    </div>
  );
}