"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

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
  | "plus"
  | "library"
  | "send"
  | "calendar"
  | "chart"
  | "users"
  | "settings";

type NavItem = {
  label: string;
  href?: string;
  icon: IconName;
  disabled?: boolean;
  denied?: boolean;
};

function NavIcon({
  name,
  className = "h-5 w-5",
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
    return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></svg>;
  }

  if (name === "plus") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
  }

  if (name === "library") {
    return <svg {...common}><path d="M4 5.5h16v14H4z" /><path d="M8 5.5v14M12 5.5v14" /></svg>;
  }

  if (name === "send") {
    return <svg {...common}><path d="m4 4 16 8-16 8 3-8-3-8Z" /><path d="M7 12h13" /></svg>;
  }

  if (name === "calendar") {
    return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7 3v4M17 3v4M3.5 9.5h17" /></svg>;
  }

  if (name === "chart") {
    return <svg {...common}><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></svg>;
  }

  if (name === "users") {
    return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 19c.7-3.2 2.6-5 5.5-5s4.8 1.8 5.5 5" /><path d="M14.5 15c3.2-.5 5.2 1 6 4" /></svg>;
  }

  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
}

function roleLabel(role: string) {
  if (role === "super_admin") return "Super administrador";
  if (role === "admin") return "Administrador";
  if (role === "editor") return "Editor";
  if (role === "viewer") return "Visualizador";
  return role;
}

export function ProtectedShell({
  children,
  workspaceName,
  userName,
  role,
  permissions,
  authControl,
}: ProtectedShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const has = (permission: string) =>
    permissions.includes(permission);

  const navItems: NavItem[] = [
    {
      label: "Panel principal",
      href: "/protected",
      icon: "home",
    },
    {
      label: "Crear contenido",
      href: has("content.create")
        ? "/protected/create"
        : undefined,
      icon: "plus",
      denied: !has("content.create"),
    },    {
      label: "Generador IA",
      href: has("ai.use")
        ? "/protected/generator"
        : undefined,
      icon: "plus",
      denied: !has("ai.use"),
    },    {
      label: "Imágenes IA",
      href: has("ai.use")
        ? "/protected/image-generator"
        : undefined,
      icon: "plus",
      denied: !has("ai.use"),
    },    {
      label: "Audio IA",
      href: has("ai.use")
        ? "/protected/audio-generator"
        : undefined,
      icon: "plus",
      denied: !has("ai.use"),
    },
    {
      label: "Biblioteca",
      href: has("content.view")
        ? "/protected/library"
        : undefined,
      icon: "library",
      denied: !has("content.view"),
    },
    {
      label: "Publicaciones",
      href: has("publication.view")
        ? "/protected/publications"
        : undefined,
      icon: "send",
      denied: !has("publication.view"),
    },
    {
      label: "Calendario",
      href: has("calendar.view")
        ? "/protected/calendar"
        : undefined,
      icon: "calendar",
      denied: !has("calendar.view"),
    },
    {
      label: "Estadísticas",
      href: has("analytics.view")
        ? "/protected/analytics"
        : undefined,
      icon: "chart",
      denied: !has("analytics.view"),
    },
    {
      label: "Usuarios y permisos",
      href: has("users.view")
        ? "/protected/users"
        : undefined,
      icon: "users",
      denied: !has("users.view"),
    },
    {
      label: "Configuración",
      href: has("settings.view")
        ? "/protected/settings"
        : undefined,
      icon: "settings",
      denied: !has("settings.view"),
    },
  ];

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase()
      )
      .join("") || "U";

  function isActive(
    href?: string
  ) {
    if (!href) return false;

    if (href === "/protected") {
      return pathname === "/protected";
    }

    return pathname.startsWith(href);
  }

  const nav = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-lg font-black text-white shadow-lg shadow-indigo-950/30">
          C
        </div>

        <div>
          <p className="max-w-44 truncate text-base font-semibold tracking-tight text-white">
            {workspaceName}
          </p>
          <p className="text-xs text-slate-400">
            Content Workspace
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Espacio de trabajo
        </p>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active =
              isActive(item.href);

            if (
              item.disabled ||
              item.denied ||
              !item.href
            ) {
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500"
                >
                  <NavIcon
                    name={item.icon}
                  />

                  <span className="flex-1">
                    {item.label}
                  </span>

                  <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                    {item.denied
                      ? "Sin acceso"
                      : "Próximo"}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavIcon
                  name={item.icon}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-400/15 text-sm font-bold text-indigo-200 ring-1 ring-inset ring-indigo-300/20">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {userName}
              </p>

              <p className="truncate text-xs text-slate-400">
                {roleLabel(role)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-slate-950 lg:flex">
        {nav}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() =>
              setMobileOpen(false)
            }
          />

          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-80 flex-col bg-slate-950 shadow-2xl">
            {nav}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(true)
              }
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
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

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Plataforma privada
              </p>

              <p className="hidden text-xs text-slate-500 sm:block">
                Creación y gestión de contenidos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-slate-900">
                {userName}
              </p>

              <p className="text-xs text-slate-500">
                {roleLabel(role)}
              </p>
            </div>

            {authControl}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}