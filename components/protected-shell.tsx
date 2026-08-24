"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";
import type {
  ReactNode,
} from "react";

type ProtectedShellProps = {
  children: ReactNode;
  workspaceName: string;
  userName: string;
  role: string;
  permissions: string[];
  authControl: ReactNode;
};

type IconName =
  | "home"
  | "pen"
  | "sparkles"
  | "image"
  | "audio"
  | "video"
  | "library"
  | "media"
  | "send"
  | "calendar"
  | "clock"
  | "chart"
  | "history"
  | "users"
  | "link"
  | "settings"
  | "shield"
  | "rocket";

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  visible: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function Icon({
  name,
  className = "h-[18px] w-[18px]",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    );
  }

  if (name === "pen") {
    return (
      <svg {...common}>
        <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
        <path d="m13.5 8 3 3" />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg {...common}>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
        <path d="m5 13 .7 1.8 1.8.7-1.8.7L5 18l-.7-1.8-1.8-.7 1.8-.7L5 13Z" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="m5 18 5-5 3 3 2-2 4 4" />
      </svg>
    );
  }

  if (name === "audio") {
    return (
      <svg {...common}>
        <path d="M8 18V6l9-2v12" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="15" cy="16" r="2.5" />
      </svg>
    );
  }

  if (name === "video") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </svg>
    );
  }

  if (name === "library") {
    return (
      <svg {...common}>
        <path d="M5 4h14v16H5z" />
        <path d="M9 4v16M13 4v16" />
      </svg>
    );
  }

  if (name === "media") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="m7 16 3-3 2.5 2.5L15 13l2 2" />
        <path d="M8 8h.01" />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg {...common}>
        <path d="m3.5 4.5 17 7.5-17 7.5 3-7.5-3-7.5Z" />
        <path d="M6.5 12h14" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M7 3v4M17 3v4M3.5 9.5h17" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...common}>
        <path d="M4 6v5h5" />
        <path d="M5.2 15.7A8 8 0 1 0 4 11" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 19c.7-3.2 2.6-5 5.5-5s4.8 1.8 5.5 5" />
        <path d="M14.5 15c3.2-.5 5.2 1 6 4" />
      </svg>
    );
  }

  if (name === "link") {
    return (
      <svg {...common}>
        <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7-7.1L11 5" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1-1" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "rocket") {
    return (
      <svg {...common}>
        <path d="M14 5c2.7-2.2 5.3-2 6-2-.1.7.1 3.3-2 6l-5.5 5.5-3-3L14 5Z" />
        <path d="m9.5 11.5-3-.5L4 13.5l4 1" />
        <path d="m12.5 14.5.5 3L10.5 20l-1-4" />
        <circle cx="16" cy="7" r="1" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" />
    </svg>
  );
}

function roleLabel(
  role: string
) {
  if (role === "super_admin") {
    return "Super administrador";
  }

  if (role === "admin") {
    return "Administrador";
  }

  if (role === "editor") {
    return "Editor";
  }

  if (role === "viewer") {
    return "Visualizador";
  }

  return role;
}

function sectionTitle(
  pathname: string
) {
  const titles: [
    string,
    string,
  ][] = [
    ["/protected/generator", "Texto IA"],
    ["/protected/image-generator", "Imágenes IA"],
    ["/protected/audio-generator", "Audio IA"],
    ["/protected/video-generator", "Video IA"],
    ["/protected/library", "Biblioteca"],
    ["/protected/media", "Multimedia"],
    ["/protected/publications", "Publicaciones"],
    ["/protected/calendar", "Calendario editorial"],
    ["/protected/scheduler", "Programador"],
    ["/protected/analytics", "Estadísticas"],
    ["/protected/activity", "Trazabilidad"],
    ["/protected/users", "Usuarios"],
    ["/protected/social", "Conexiones"],
    ["/protected/settings", "Configuración"],
    ["/protected/readiness", "Seguridad y QA"],
    ["/protected/launch", "Lanzamiento"],
    ["/protected/create", "Crear contenido"],
  ];

  for (
    const [
      prefix,
      title,
    ] of titles
  ) {
    if (
      pathname.startsWith(
        prefix
      )
    ) {
      return title;
    }
  }

  return "Command Center";
}

export function ProtectedShell({
  children,
  workspaceName,
  userName,
  role,
  permissions,
  authControl,
}: ProtectedShellProps) {
  const pathname =
    usePathname();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const has = (
    permission: string
  ) =>
    permissions.includes(
      permission
    );

  const groups =
    useMemo<NavGroup[]>(
      () => [
        {
          label: "Inicio",
          items: [
            {
              label: "Command Center",
              href: "/protected",
              icon: "home",
              visible: true,
            },
          ],
        },
        {
          label: "Crear",
          items: [
            {
              label: "Nuevo contenido",
              href: "/protected/create",
              icon: "pen",
              visible:
                has("content.create"),
            },
            {
              label: "Texto IA",
              href: "/protected/generator",
              icon: "sparkles",
              visible:
                has("ai.use"),
            },
            {
              label: "Imágenes IA",
              href: "/protected/image-generator",
              icon: "image",
              visible:
                has("ai.use"),
            },
            {
              label: "Audio IA",
              href: "/protected/audio-generator",
              icon: "audio",
              visible:
                has("ai.use"),
            },
            {
              label: "Video IA",
              href: "/protected/video-generator",
              icon: "video",
              visible:
                has("ai.use"),
            },
          ],
        },
        {
          label: "Gestionar",
          items: [
            {
              label: "Biblioteca",
              href: "/protected/library",
              icon: "library",
              visible:
                has("content.view"),
            },
            {
              label: "Multimedia",
              href: "/protected/media",
              icon: "media",
              visible:
                has("media.view"),
            },
            {
              label: "Publicaciones",
              href: "/protected/publications",
              icon: "send",
              visible:
                has("publication.view"),
            },
            {
              label: "Calendario",
              href: "/protected/calendar",
              icon: "calendar",
              visible:
                has("calendar.view"),
            },
            {
              label: "Programador",
              href: "/protected/scheduler",
              icon: "clock",
              visible:
                has("publication.manage") ||
                has("publication.publish") ||
                has("settings.view"),
            },
          ],
        },
        {
          label: "Medir",
          items: [
            {
              label: "Estadísticas",
              href: "/protected/analytics",
              icon: "chart",
              visible:
                has("analytics.view"),
            },
            {
              label: "Actividad",
              href: "/protected/activity",
              icon: "history",
              visible:
                has("audit.view"),
            },
          ],
        },
        {
          label: "Administrar",
          items: [
            {
              label: "Usuarios",
              href: "/protected/users",
              icon: "users",
              visible:
                has("users.view"),
            },
            {
              label: "Conexiones",
              href: "/protected/social",
              icon: "link",
              visible:
                has("integrations.manage"),
            },
            {
              label: "Configuración",
              href: "/protected/settings",
              icon: "settings",
              visible:
                has("settings.view"),
            },
            {
              label: "Seguridad y QA",
              href: "/protected/readiness",
              icon: "shield",
              visible:
                has("settings.view") ||
                has("users.manage"),
            },
            {
              label: "Lanzamiento",
              href: "/protected/launch",
              icon: "rocket",
              visible:
                has("settings.view"),
            },
          ],
        },
      ],
      [permissions]
    );

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase()
      )
      .join("") ||
    "U";

  function isActive(
    href: string
  ) {
    if (
      href ===
      "/protected"
    ) {
      return pathname ===
        "/protected";
    }

    return pathname.startsWith(
      href
    );
  }

  const navigation = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#315efb] text-base font-black text-white shadow-[0_8px_24px_rgba(49,94,251,0.25)]">
          C
        </div>

        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#172033]">
            {workspaceName}
          </p>

          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            Content Operations
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map(
          (
            group
          ) => {
            const items =
              group.items.filter(
                (
                  item
                ) =>
                  item.visible
              );

            if (
              items.length ===
              0
            ) {
              return null;
            }

            return (
              <div
                key={
                  group.label
                }
                className="mb-6"
              >
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {group.label}
                </p>

                <nav className="space-y-1">
                  {items.map(
                    (
                      item
                    ) => {
                      const active =
                        isActive(
                          item.href
                        );

                      return (
                        <Link
                          key={
                            item.href
                          }
                          href={
                            item.href
                          }
                          onClick={() =>
                            setMobileOpen(
                              false
                            )
                          }
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                            active
                              ? "bg-[#edf2ff] text-[#2449c7]"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-lg ${
                              active
                                ? "bg-white text-[#315efb] shadow-sm"
                                : "text-slate-400 group-hover:text-slate-700"
                            }`}
                          >
                            <Icon
                              name={
                                item.icon
                              }
                            />
                          </span>

                          <span className="truncate">
                            {item.label}
                          </span>

                          {active && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#315efb]" />
                          )}
                        </Link>
                      );
                    }
                  )}
                </nav>
              </div>
            );
          }
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-[#315efb] shadow-sm ring-1 ring-slate-200">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-800">
              {userName}
            </p>

            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
              {roleLabel(
                role
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="contentai-v3 min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] border-r border-slate-200 bg-white lg:block">
        {navigation}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-[#172033]/30 backdrop-blur-sm"
            onClick={() =>
              setMobileOpen(
                false
              )
            }
          />

          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-[290px] bg-white shadow-2xl">
            {navigation}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-[258px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  true
                )
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              aria-label="Abrir menú"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#172033]">
                {sectionTitle(
                  pathname
                )}
              </p>

              <p className="hidden truncate text-[11px] font-medium text-slate-400 sm:block">
                {workspaceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="max-w-40 truncate text-[11px] font-semibold text-slate-600">
                {userName}
              </span>
            </div>

            {authControl}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1660px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}