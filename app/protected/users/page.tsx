import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

function roleLabel(role: string) {
  if (role === "super_admin") {
    return "Super administrador";
  }

  if (role === "admin") {
    return "Administrador";
  }

  if (role === "editor") {
    return "Editor";
  }

  return "Visualizador";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    email?: string;
    deleted?: string;
  }>;
}) {
  const {
    created,
    email,
    deleted,
  } = await searchParams;

  const supabase = await createClient();

  const [
    canViewResult,
    canCreateResult,
    canManageResult,
  ] = await Promise.all([
    supabase.rpc("has_permission", {
      p_permission: "users.view",
    }),

    supabase.rpc("has_permission", {
      p_permission: "users.create",
    }),

    supabase.rpc("has_permission", {
      p_permission: "users.manage",
    }),
  ]);

  if (!canViewResult.data) {
    redirect("/protected");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, is_active, created_at"
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  const users =
    (data as UserProfile[] | null) ?? [];

  const activeCount =
    users.filter(
      (user) =>
        user.is_active
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Usuarios y permisos
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Crea cuentas, cambia contraseñas, bloquea accesos y controla
            cada permiso.
          </p>
        </div>

        {Boolean(
          canCreateResult.data
        ) && (
          <Link
            href="/protected/users/create"
            className="inline-flex w-fit rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Crear usuario
          </Link>
        )}
      </div>

      {created === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Usuario {email || ""} creado correctamente y listo para iniciar
          sesión.
        </div>
      )}

      {deleted === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Usuario eliminado correctamente.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron cargar los usuarios: {error.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Usuarios
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Activos
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Bloqueados
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-500">
            {users.length - activeCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Cuentas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Selecciona una cuenta para administrar todos sus datos y
            permisos.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map(
            (user) => (
              <div
                key={user.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-950">
                      {user.full_name?.trim() ||
                        user.email ||
                        "Usuario"}
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.is_active
                        ? "Activo"
                        : "Bloqueado"}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {user.email ||
                      "Sin correo"}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {roleLabel(
                      user.role
                    )}
                  </p>
                </div>

                {Boolean(
                  canManageResult.data
                ) && (
                  <Link
                    href={`/protected/users/${user.id}`}
                    className="w-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Administrar
                  </Link>
                )}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}