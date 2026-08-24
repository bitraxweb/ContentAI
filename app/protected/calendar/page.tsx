import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PublicationRow = {
  id: string;
  platform: string;
  status: string;
  publication_date: string | null;
  publication_time: string | null;
  contents:
    | {
        id: string;
        title: string | null;
      }
    | {
        id: string;
        title: string | null;
      }[]
    | null;
};

type SearchParams = {
  month?: string;
  view?: string;
  week?: string;
  status?: string;
  platform?: string;
};

const weekDayLabels = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

const statusOptions = [
  ["all", "Todos los estados"],
  ["draft", "Borrador"],
  ["review", "En revisión"],
  ["approved", "Aprobado"],
  ["scheduled", "Programado"],
  ["published", "Publicado"],
  ["cancelled", "Cancelado"],
] as const;

const platformOptions = [
  ["all", "Todas las redes"],
  ["linkedin", "LinkedIn"],
  ["facebook", "Facebook"],
  ["both", "LinkedIn + Facebook"],
] as const;

function getContent(
  value: PublicationRow["contents"]
) {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "En revisión";
  if (status === "approved") return "Aprobado";
  if (status === "scheduled") return "Programado";
  if (status === "published") return "Publicado";
  if (status === "cancelled") return "Cancelado";

  return status;
}

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";

  return platform;
}

function statusDotClasses(status: string) {
  if (status === "published") return "bg-emerald-500";
  if (status === "scheduled") return "bg-sky-500";
  if (status === "approved") return "bg-violet-500";
  if (status === "review") return "bg-amber-500";
  if (status === "cancelled") return "bg-rose-500";

  return "bg-slate-400";
}

function statusBadgeClasses(status: string) {
  if (status === "published") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (status === "scheduled") {
    return "bg-sky-50 text-sky-700 ring-sky-600/20";
  }

  if (status === "approved") {
    return "bg-violet-50 text-violet-700 ring-violet-600/20";
  }

  if (status === "review") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  if (status === "cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-600/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function parseMonthKey(
  value: string | undefined
) {
  if (
    value &&
    /^\d{4}-\d{2}$/.test(value)
  ) {
    const [yearText, monthText] =
      value.split("-");

    const year = Number(yearText);
    const month = Number(monthText);

    if (
      Number.isInteger(year) &&
      month >= 1 &&
      month <= 12
    ) {
      return {
        year,
        month,
      };
    }
  }

  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function monthKey(
  year: number,
  month: number
) {
  return `${year}-${pad(month)}`;
}

function shiftMonth(
  year: number,
  month: number,
  amount: number
) {
  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function mondayOfWeek(date: Date) {
  const copy = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const day = copy.getDay();

  copy.setDate(
    copy.getDate() +
      (day === 0 ? -6 : 1 - day)
  );

  return copy;
}

function addDays(
  date: Date,
  amount: number
) {
  const copy = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  copy.setDate(
    copy.getDate() + amount
  );

  return copy;
}

function parseWeekKey(
  value: string | undefined,
  fallback: Date
) {
  if (
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const parsed = new Date(
      `${value}T12:00:00`
    );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return mondayOfWeek(
        parsed
      );
    }
  }

  return mondayOfWeek(
    fallback
  );
}

function makeCalendarHref({
  view,
  year,
  month,
  week,
  status,
  platform,
}: {
  view: string;
  year: number;
  month: number;
  week?: Date;
  status: string;
  platform: string;
}) {
  const params =
    new URLSearchParams();

  params.set(
    "view",
    view
  );

  params.set(
    "month",
    monthKey(
      year,
      month
    )
  );

  if (
    view === "week" &&
    week
  ) {
    params.set(
      "week",
      toDateKey(week)
    );
  }

  if (status !== "all") {
    params.set(
      "status",
      status
    );
  }

  if (platform !== "all") {
    params.set(
      "platform",
      platform
    );
  }

  return `/protected/calendar?${params.toString()}`;
}

function eventPreview(
  publication: PublicationRow
) {
  const content = getContent(
    publication.contents
  );

  return (
    <Link
      key={publication.id}
      href={`/protected/publications/${publication.id}`}
      className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotClasses(
          publication.status
        )}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-semibold text-slate-500">
            {publication.publication_time
              ? publication.publication_time.slice(
                  0,
                  5
                )
              : "--:--"}
          </span>

          <span className="truncate text-[10px] text-slate-400">
            {platformLabel(
              publication.platform
            )}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 group-hover:text-indigo-700">
          {content?.title ||
            "Sin título"}
        </p>
      </div>
    </Link>
  );
}

function agendaRow(
  publication: PublicationRow
) {
  const content = getContent(
    publication.contents
  );

  return (
    <Link
      key={publication.id}
      href={`/protected/publications/${publication.id}`}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm sm:grid-cols-[90px_1fr_auto] sm:items-center"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {publication.publication_date
            ? new Intl.DateTimeFormat(
                "es",
                {
                  day: "2-digit",
                  month: "short",
                }
              ).format(
                new Date(
                  `${publication.publication_date}T12:00:00`
                )
              )
            : "Sin fecha"}
        </p>

        <p className="mt-1 text-sm font-bold text-slate-900">
          {publication.publication_time
            ? publication.publication_time.slice(
                0,
                5
              )
            : "Sin hora"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">
          {content?.title ||
            "Publicación sin título"}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {platformLabel(
            publication.platform
          )}
        </p>
      </div>

      <span
        className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusBadgeClasses(
          publication.status
        )}`}
      >
        {statusLabel(
          publication.status
        )}
      </span>
    </Link>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params =
    await searchParams;

  const {
    year,
    month,
  } = parseMonthKey(
    params.month
  );

  const currentMonthDate =
    new Date(
      year,
      month - 1,
      1
    );

  const requestedView =
    params.view === "week" ||
    params.view === "agenda"
      ? params.view
      : "month";

  const selectedStatus =
    statusOptions.some(
      ([value]) =>
        value === params.status
    )
      ? params.status!
      : "all";

  const selectedPlatform =
    platformOptions.some(
      ([value]) =>
        value === params.platform
    )
      ? params.platform!
      : "all";

  const selectedWeekStart =
    parseWeekKey(
      params.week,
      new Date()
    );

  const monthStart =
    new Date(
      year,
      month - 1,
      1
    );

  const monthEnd =
    new Date(
      year,
      month,
      0
    );

  const calendarStart =
    mondayOfWeek(
      monthStart
    );

  const calendarEnd =
    addDays(
      mondayOfWeek(
        monthEnd
      ),
      6
    );

  const queryStart =
    requestedView === "week"
      ? toDateKey(
          selectedWeekStart
        )
      : toDateKey(
          calendarStart
        );

  const queryEnd =
    requestedView === "week"
      ? toDateKey(
          addDays(
            selectedWeekStart,
            6
          )
        )
      : toDateKey(
          calendarEnd
        );

  const supabase =
    await createClient();

  let publicationsQuery =
    supabase
      .from("publications")
      .select(
        "id, platform, status, publication_date, publication_time, contents(id, title)"
      )
      .not(
        "publication_date",
        "is",
        null
      )
      .gte(
        "publication_date",
        queryStart
      )
      .lte(
        "publication_date",
        queryEnd
      )
      .order(
        "publication_date",
        {
          ascending: true,
        }
      )
      .order(
        "publication_time",
        {
          ascending: true,
          nullsFirst: false,
        }
      );

  if (
    selectedStatus !== "all"
  ) {
    publicationsQuery =
      publicationsQuery.eq(
        "status",
        selectedStatus
      );
  }

  if (
    selectedPlatform !== "all"
  ) {
    publicationsQuery =
      publicationsQuery.eq(
        "platform",
        selectedPlatform
      );
  }

  const [
    publicationsResult,
    canManageCalendarResult,
    canManagePublicationsResult,
  ] = await Promise.all([
    publicationsQuery,

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "calendar.manage",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.manage",
      }
    ),
  ]);

  const publications =
    (publicationsResult.data as
      | PublicationRow[]
      | null) ?? [];

  const canSchedule =
    Boolean(
      canManageCalendarResult.data
    ) &&
    Boolean(
      canManagePublicationsResult.data
    );

  const publicationsByDate =
    new Map<
      string,
      PublicationRow[]
    >();

  for (
    const publication
    of publications
  ) {
    if (
      !publication.publication_date
    ) {
      continue;
    }

    const current =
      publicationsByDate.get(
        publication.publication_date
      ) ?? [];

    current.push(
      publication
    );

    publicationsByDate.set(
      publication.publication_date,
      current
    );
  }

  const monthLabel =
    new Intl.DateTimeFormat(
      "es",
      {
        month: "long",
        year: "numeric",
      }
    ).format(
      currentMonthDate
    );

  const previousMonth =
    shiftMonth(
      year,
      month,
      -1
    );

  const nextMonth =
    shiftMonth(
      year,
      month,
      1
    );

  const previousWeek =
    addDays(
      selectedWeekStart,
      -7
    );

  const nextWeek =
    addDays(
      selectedWeekStart,
      7
    );

  const monthDays =
    Array.from(
      {
        length:
          Math.round(
            (
              calendarEnd.getTime() -
              calendarStart.getTime()
            ) /
              86400000
          ) + 1,
      },
      (_, index) =>
        addDays(
          calendarStart,
          index
        )
    );

  const weekDays =
    Array.from(
      {
        length: 7,
      },
      (_, index) =>
        addDays(
          selectedWeekStart,
          index
        )
    );

  const todayKey =
    toDateKey(
      new Date()
    );

  const scheduledCount =
    publications.filter(
      (item) =>
        item.status ===
        "scheduled"
    ).length;

  const reviewCount =
    publications.filter(
      (item) =>
        item.status ===
        "review"
    ).length;

  const publishedCount =
    publications.filter(
      (item) =>
        item.status ===
        "published"
    ).length;

  const upcoming =
    publications
      .filter(
        (item) =>
          item.publication_date &&
          item.publication_date >=
            todayKey &&
          item.status !==
            "cancelled"
      )
      .slice(
        0,
        6
      );

  const viewHref = (
    view: string
  ) =>
    makeCalendarHref({
      view,
      year,
      month,
      week:
        view === "week"
          ? selectedWeekStart
          : undefined,
      status:
        selectedStatus,
      platform:
        selectedPlatform,
    });

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Planificación editorial
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Calendario
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Organiza visualmente todo lo que está por revisar,
              programar y publicar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["month", "Mes"],
              ["week", "Semana"],
              ["agenda", "Agenda"],
            ].map(
              ([value, label]) => (
                <Link
                  key={value}
                  href={viewHref(
                    value
                  )}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    requestedView ===
                    value
                      ? "bg-slate-950 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </Link>
              )
            )}

            {canSchedule && (
              <Link
                href="/protected/publications/create"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                + Programar
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <form
            method="get"
            className="contents"
          >
            <input
              type="hidden"
              name="view"
              value={
                requestedView
              }
            />

            <input
              type="hidden"
              name="month"
              value={monthKey(
                year,
                month
              )}
            />

            {requestedView ===
              "week" && (
              <input
                type="hidden"
                name="week"
                value={toDateKey(
                  selectedWeekStart
                )}
              />
            )}

            <select
              name="status"
              defaultValue={
                selectedStatus
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none"
            >
              {statusOptions.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              name="platform"
              defaultValue={
                selectedPlatform
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none"
            >
              {platformOptions.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Aplicar filtros
            </button>
          </form>
        </div>
      </section>

      {publicationsResult.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudo cargar el calendario:{" "}
          {publicationsResult.error.message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Programadas
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {scheduledCount}
              </p>
            </div>

            <span className="h-3 w-3 rounded-full bg-sky-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                En revisión
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {reviewCount}
              </p>
            </div>

            <span className="h-3 w-3 rounded-full bg-amber-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Publicadas
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {publishedCount}
              </p>
            </div>

            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
        </div>
      </section>

      {requestedView ===
        "month" && (
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={makeCalendarHref({
                  view: "month",
                  year:
                    previousMonth.year,
                  month:
                    previousMonth.month,
                  status:
                    selectedStatus,
                  platform:
                    selectedPlatform,
                })}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                ←
              </Link>

              <Link
                href={makeCalendarHref({
                  view: "month",
                  year:
                    new Date().getFullYear(),
                  month:
                    new Date().getMonth() +
                    1,
                  status:
                    selectedStatus,
                  platform:
                    selectedPlatform,
                })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hoy
              </Link>

              <Link
                href={makeCalendarHref({
                  view: "month",
                  year:
                    nextMonth.year,
                  month:
                    nextMonth.month,
                  status:
                    selectedStatus,
                  platform:
                    selectedPlatform,
                })}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                →
              </Link>
            </div>

            <h2 className="text-lg font-semibold capitalize text-slate-950">
              {monthLabel}
            </h2>
          </div>

          <div className="hidden grid-cols-7 border-b border-slate-100 bg-slate-50 md:grid">
            {weekDayLabels.map(
              (label) => (
                <div
                  key={label}
                  className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                >
                  {label}
                </div>
              )
            )}
          </div>

          <div className="hidden grid-cols-7 md:grid">
            {monthDays.map(
              (date) => {
                const dateKey =
                  toDateKey(date);

                const items =
                  publicationsByDate.get(
                    dateKey
                  ) ?? [];

                const isCurrentMonth =
                  date.getMonth() ===
                  month - 1;

                const isToday =
                  dateKey ===
                  todayKey;

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[152px] border-b border-r border-slate-100 p-2.5 ${
                      isCurrentMonth
                        ? "bg-white"
                        : "bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-indigo-600 text-white"
                            : isCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {canSchedule &&
                        isCurrentMonth && (
                          <Link
                            href={`/protected/publications/create?date=${dateKey}`}
                            title="Programar publicación"
                            className="grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            +
                          </Link>
                        )}
                    </div>

                    <div className="mt-2 space-y-0.5">
                      {items
                        .slice(0, 2)
                        .map(
                          eventPreview
                        )}

                      {items.length >
                        2 && (
                        <Link
                          href={makeCalendarHref({
                            view: "agenda",
                            year:
                              date.getFullYear(),
                            month:
                              date.getMonth() +
                              1,
                            status:
                              selectedStatus,
                            platform:
                              selectedPlatform,
                          })}
                          className="block rounded-lg px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          +{" "}
                          {items.length -
                            2}{" "}
                          más
                        </Link>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {monthDays
              .filter(
                (date) =>
                  date.getMonth() ===
                  month - 1
              )
              .map(
                (date) => {
                  const dateKey =
                    toDateKey(
                      date
                    );

                  const items =
                    publicationsByDate.get(
                      dateKey
                    ) ?? [];

                  return (
                    <div
                      key={dateKey}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {new Intl.DateTimeFormat(
                              "es",
                              {
                                weekday:
                                  "long",
                              }
                            ).format(
                              date
                            )}
                          </p>

                          <p className="mt-1 font-semibold text-slate-950">
                            {new Intl.DateTimeFormat(
                              "es",
                              {
                                day: "numeric",
                                month:
                                  "long",
                              }
                            ).format(
                              date
                            )}
                          </p>
                        </div>

                        {canSchedule && (
                          <Link
                            href={`/protected/publications/create?date=${dateKey}`}
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                          >
                            + Añadir
                          </Link>
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        {items.length ===
                        0 ? (
                          <p className="text-xs text-slate-400">
                            Sin publicaciones
                          </p>
                        ) : (
                          items.map(
                            eventPreview
                          )
                        )}
                      </div>
                    </div>
                  );
                }
              )}
          </div>
        </section>
      )}

      {requestedView ===
        "week" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={makeCalendarHref({
                  view: "week",
                  year:
                    previousWeek.getFullYear(),
                  month:
                    previousWeek.getMonth() +
                    1,
                  week:
                    previousWeek,
                  status:
                    selectedStatus,
                  platform:
                    selectedPlatform,
                })}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600"
              >
                ←
              </Link>

              <Link
                href={makeCalendarHref({
                  view: "week",
                  year:
                    new Date().getFullYear(),
                  month:
                    new Date().getMonth() +
                    1,
                  week:
                    mondayOfWeek(
                      new Date()
                    ),
                  status:
                    selectedStatus,
                  platform:
                    selectedPlatform,
                })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Esta semana
              </Link>

              <Link
                href={makeCalendarHref({
                  view: "week",
                  year:
                    nextWeek.getFullYear(),
                  month:
                    nextWeek.getMonth() +
                    1,
                  week:
                    nextWeek,
                  status:
                    selectedStatus,
                  platform:
                    selectedPlatform,
                })}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600"
              >
                →
              </Link>
            </div>

            <p className="text-sm font-semibold text-slate-700">
              {new Intl.DateTimeFormat(
                "es",
                {
                  day: "numeric",
                  month: "short",
                }
              ).format(
                selectedWeekStart
              )}{" "}
              —{" "}
              {new Intl.DateTimeFormat(
                "es",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              ).format(
                addDays(
                  selectedWeekStart,
                  6
                )
              )}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-7">
            {weekDays.map(
              (date, index) => {
                const dateKey =
                  toDateKey(date);

                const items =
                  publicationsByDate.get(
                    dateKey
                  ) ?? [];

                const isToday =
                  dateKey ===
                  todayKey;

                return (
                  <section
                    key={dateKey}
                    className={`min-h-72 rounded-2xl border bg-white p-4 shadow-sm ${
                      isToday
                        ? "border-indigo-300 ring-2 ring-indigo-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {
                            weekDayLabels[
                              index
                            ]
                          }
                        </p>

                        <p
                          className={`mt-1 text-2xl font-bold ${
                            isToday
                              ? "text-indigo-600"
                              : "text-slate-950"
                          }`}
                        >
                          {date.getDate()}
                        </p>
                      </div>

                      {canSchedule && (
                        <Link
                          href={`/protected/publications/create?date=${dateKey}`}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          +
                        </Link>
                      )}
                    </div>

                    <div className="mt-4 space-y-1">
                      {items.length ===
                      0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                          Sin publicaciones
                        </p>
                      ) : (
                        items.map(
                          eventPreview
                        )
                      )}
                    </div>
                  </section>
                );
              }
            )}
          </div>
        </section>
      )}

      {requestedView ===
        "agenda" && (
        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Agenda de
                </p>

                <p className="mt-1 text-lg font-semibold capitalize text-slate-950">
                  {monthLabel}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={makeCalendarHref({
                    view: "agenda",
                    year:
                      previousMonth.year,
                    month:
                      previousMonth.month,
                    status:
                      selectedStatus,
                    platform:
                      selectedPlatform,
                  })}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600"
                >
                  ←
                </Link>

                <Link
                  href={makeCalendarHref({
                    view: "agenda",
                    year:
                      nextMonth.year,
                    month:
                      nextMonth.month,
                    status:
                      selectedStatus,
                    platform:
                      selectedPlatform,
                  })}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600"
                >
                  →
                </Link>
              </div>
            </div>

            {publications.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-semibold text-slate-700">
                  No hay publicaciones con estos filtros.
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Cambia el mes, estado o red social.
                </p>
              </div>
            ) : (
              publications.map(
                agendaRow
              )
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Estado del mes
            </p>

            <div className="mt-5 space-y-4">
              {[
                [
                  "Programadas",
                  scheduledCount,
                  "bg-sky-500",
                ],
                [
                  "En revisión",
                  reviewCount,
                  "bg-amber-500",
                ],
                [
                  "Publicadas",
                  publishedCount,
                  "bg-emerald-500",
                ],
              ].map(
                ([
                  label,
                  value,
                  dotClass,
                ]) => (
                  <div
                    key={String(
                      label
                    )}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
                      />

                      <span className="text-sm text-slate-600">
                        {label}
                      </span>
                    </div>

                    <span className="text-sm font-bold text-slate-950">
                      {value}
                    </span>
                  </div>
                )
              )}
            </div>
          </aside>
        </section>
      )}

      {requestedView !==
        "agenda" && (
        <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Leyenda
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
              {[
                ["draft", "Borrador"],
                ["review", "En revisión"],
                ["approved", "Aprobado"],
                ["scheduled", "Programado"],
                ["published", "Publicado"],
                ["cancelled", "Cancelado"],
              ].map(
                ([
                  value,
                  label,
                ]) => (
                  <div
                    key={value}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusDotClasses(
                        value
                      )}`}
                    />

                    <span className="text-xs font-medium text-slate-600">
                      {label}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Próximas
                </p>

                <h2 className="mt-1 font-semibold text-slate-950">
                  Siguientes publicaciones
                </h2>
              </div>

              <Link
                href={viewHref(
                  "agenda"
                )}
                className="text-xs font-semibold text-indigo-600"
              >
                Ver agenda
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {upcoming.length ===
              0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">
                  No hay publicaciones próximas con los filtros actuales.
                </p>
              ) : (
                upcoming.map(
                  (publication) => {
                    const content =
                      getContent(
                        publication.contents
                      );

                    return (
                      <Link
                        key={
                          publication.id
                        }
                        href={`/protected/publications/${publication.id}`}
                        className="flex gap-3 rounded-xl p-2.5 transition hover:bg-slate-50"
                      >
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClasses(
                            publication.status
                          )}`}
                        />

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {content?.title ||
                              "Sin título"}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {publication.publication_date}{" "}
                            {publication.publication_time
                              ? `· ${publication.publication_time.slice(
                                  0,
                                  5
                                )}`
                              : ""}
                          </p>
                        </div>
                      </Link>
                    );
                  }
                )
              )}
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}