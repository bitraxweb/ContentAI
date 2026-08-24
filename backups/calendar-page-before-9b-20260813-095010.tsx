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

function getContent(
  value: PublicationRow["contents"]
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "Revisión";
  if (status === "approved") return "Aprobado";
  if (status === "scheduled") return "Programado";
  if (status === "published") return "Publicado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function statusClasses(status: string) {
  if (status === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "scheduled") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (status === "approved") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  if (status === "review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";
  return platform;
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
  const difference =
    day === 0 ? -6 : 1 - day;

  copy.setDate(
    copy.getDate() + difference
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
    const date = new Date(
      `${value}T12:00:00`
    );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return mondayOfWeek(date);
    }
  }

  return mondayOfWeek(fallback);
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

function publicationCard(
  publication: PublicationRow
) {
  const content = getContent(
    publication.contents
  );

  return (
    <Link
      key={publication.id}
      href={`/protected/publications/${publication.id}`}
      className={`block rounded-lg border px-2.5 py-2 text-xs leading-4 transition hover:shadow-sm ${statusClasses(
        publication.status
      )}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">
          {publication.publication_time
            ? publication.publication_time.slice(
                0,
                5
              )
            : "Sin hora"}
        </span>

        <span className="shrink-0 text-[10px] opacity-70">
          {platformLabel(
            publication.platform
          )}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 font-medium">
        {content?.title ||
          "Publicación sin título"}
      </p>

      <p className="mt-1 text-[10px] opacity-70">
        {statusLabel(
          publication.status
        )}
      </p>
    </Link>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const { year, month } =
    parseMonthKey(params.month);

  const currentMonthDate =
    new Date(
      year,
      month - 1,
      1
    );

  const view =
    params.view === "week"
      ? "week"
      : "month";

  const selectedWeekStart =
    parseWeekKey(
      params.week,
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
    mondayOfWeek(monthStart);

  const calendarEnd =
    addDays(
      mondayOfWeek(monthEnd),
      6
    );

  const queryStart =
    view === "month"
      ? toDateKey(calendarStart)
      : toDateKey(selectedWeekStart);

  const queryEnd =
    view === "month"
      ? toDateKey(calendarEnd)
      : toDateKey(
          addDays(
            selectedWeekStart,
            6
          )
        );

  const supabase =
    await createClient();

  const [
    publicationsResult,
    canManageCalendarResult,
    canManagePublicationsResult,
  ] = await Promise.all([
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
      ),

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

  const byDate =
    new Map<
      string,
      PublicationRow[]
    >();

  for (const publication of publications) {
    if (
      !publication.publication_date
    ) {
      continue;
    }

    const current =
      byDate.get(
        publication.publication_date
      ) ?? [];

    current.push(publication);

    byDate.set(
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

  const scheduledCount =
    publications.filter(
      (item) =>
        item.status === "scheduled"
    ).length;

  const publishedCount =
    publications.filter(
      (item) =>
        item.status === "published"
    ).length;

  const reviewCount =
    publications.filter(
      (item) =>
        item.status === "review"
    ).length;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Planificación
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Calendario editorial
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Visualiza las publicaciones planificadas y publicadas por fecha.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/protected/calendar?view=month&month=${monthKey(
              year,
              month
            )}`}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              view === "month"
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            Mes
          </Link>

          <Link
            href={`/protected/calendar?view=week&month=${monthKey(
              year,
              month
            )}&week=${toDateKey(
              selectedWeekStart
            )}`}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              view === "week"
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            Semana
          </Link>

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

      {publicationsResult.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudo cargar el calendario:{" "}
          {publicationsResult.error.message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Programadas
          </p>

          <p className="mt-2 text-3xl font-bold text-sky-600">
            {scheduledCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            En revisión
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-600">
            {reviewCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Publicadas
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {publishedCount}
          </p>
        </div>
      </section>

      {view === "month" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={`/protected/calendar?view=month&month=${monthKey(
                  previousMonth.year,
                  previousMonth.month
                )}`}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                ←
              </Link>

              <Link
                href="/protected/calendar?view=month"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hoy
              </Link>

              <Link
                href={`/protected/calendar?view=month&month=${monthKey(
                  nextMonth.year,
                  nextMonth.month
                )}`}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                →
              </Link>
            </div>

            <h2 className="text-lg font-semibold capitalize text-slate-950">
              {monthLabel}
            </h2>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {weekDayLabels.map(
              (label) => (
                <div
                  key={label}
                  className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {label}
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map(
              (date) => {
                const key =
                  toDateKey(date);

                const items =
                  byDate.get(key) ??
                  [];

                const isCurrentMonth =
                  date.getMonth() ===
                  month - 1;

                const todayKey =
                  toDateKey(
                    new Date()
                  );

                const isToday =
                  key === todayKey;

                return (
                  <div
                    key={key}
                    className={`min-h-36 border-b border-r border-slate-100 p-2 ${
                      isCurrentMonth
                        ? "bg-white"
                        : "bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-indigo-600 text-white"
                            : isCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-400"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {canSchedule &&
                        isCurrentMonth && (
                          <Link
                            href={`/protected/publications/create?date=${key}`}
                            className="grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Programar en esta fecha"
                          >
                            +
                          </Link>
                        )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {items
                        .slice(0, 3)
                        .map(
                          publicationCard
                        )}

                      {items.length >
                        3 && (
                        <Link
                          href={`/protected/calendar?view=week&month=${monthKey(
                            date.getFullYear(),
                            date.getMonth() +
                              1
                          )}&week=${toDateKey(
                            mondayOfWeek(
                              date
                            )
                          )}`}
                          className="block px-1 text-[10px] font-semibold text-indigo-600"
                        >
                          +{" "}
                          {items.length -
                            3}{" "}
                          más
                        </Link>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={`/protected/calendar?view=week&month=${monthKey(
                  previousWeek.getFullYear(),
                  previousWeek.getMonth() +
                    1
                )}&week=${toDateKey(
                  previousWeek
                )}`}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                ←
              </Link>

              <Link
                href="/protected/calendar?view=week"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Esta semana
              </Link>

              <Link
                href={`/protected/calendar?view=week&month=${monthKey(
                  nextWeek.getFullYear(),
                  nextWeek.getMonth() +
                    1
                )}&week=${toDateKey(
                  nextWeek
                )}`}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
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

          <div className="grid gap-px bg-slate-100 md:grid-cols-7">
            {weekDays.map(
              (date, index) => {
                const key =
                  toDateKey(date);

                const items =
                  byDate.get(key) ??
                  [];

                const isToday =
                  key ===
                  toDateKey(
                    new Date()
                  );

                return (
                  <div
                    key={key}
                    className="min-h-80 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {
                            weekDayLabels[
                              index
                            ]
                          }
                        </p>

                        <p
                          className={`mt-1 text-lg font-bold ${
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
                          href={`/protected/publications/create?date=${key}`}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          +
                        </Link>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {items.length ===
                      0 ? (
                        <p className="text-xs text-slate-400">
                          Sin publicaciones
                        </p>
                      ) : (
                        items.map(
                          publicationCard
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

      <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        {[
          [
            "Borrador",
            "border-slate-200 bg-slate-50 text-slate-700",
          ],
          [
            "Revisión",
            "border-amber-200 bg-amber-50 text-amber-800",
          ],
          [
            "Aprobado",
            "border-violet-200 bg-violet-50 text-violet-800",
          ],
          [
            "Programado",
            "border-sky-200 bg-sky-50 text-sky-800",
          ],
          [
            "Publicado",
            "border-emerald-200 bg-emerald-50 text-emerald-800",
          ],
          [
            "Cancelado",
            "border-rose-200 bg-rose-50 text-rose-800",
          ],
        ].map(
          ([label, classes]) => (
            <span
              key={label}
              className={`rounded-full border px-3 py-1 font-medium ${classes}`}
            >
              {label}
            </span>
          )
        )}
      </section>
    </div>
  );
}