import Link from "next/link";
import { redirect } from "next/navigation";

import { UserPermissionChecklist } from "@/components/user-permission-checklist";
import { createClient } from "@/lib/supabase/server";

import { createManagedUser } from "./actions";

export const instant = false;

type Permission = {
  key: string;
  label: string;
  description: string;
  category: string;
  sort_order: number;
};

const errorMessages: Record<string, string> = {
  forbidden: "No tienes permiso para crear usuarios.",
  name: "Escribe el nombre del usuario.",
  email: "Escribe un correo válido.",
  password: "La contraseña debe tener al menos 8 caracteres.",
  role: "El rol seleccionado no es válido.",
  "protected-role":
    "Solo un super administrador puede crear administradores.",
  permissions:
    "No se pudo cargar el catálogo de permisos.",
  create:
    "No se pudo crear la cuenta. Comprueba que el correo no esté utilizado.",
  setup:
    "La cuenta no pudo configurarse completamente y la operación fue cancelada.",
};

export default async function CreateUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: canCreate } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "users.create",
    }
  );

  if (!canCreate) {
    redirect("/protected/users");
  }

  const { data: authData } =
    await supabase.auth.getClaims();

  const actorId = authData?.claims?.sub;

  if (!actorId) {
    redirect("/auth/login");
  }

  const [
    profileResult,
    permissionResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle(),

    supabase
      .from("permissions")
      .select(
        "key, label, description, category, sort_order"
      )
      .order("sort_order"),
  ]);

  const isSuperAdmin =
    profileResult.data?.role ===
    "super_admin";

  const permissions =
    (permissionResult.data as
      | Permission[]
      | null) ?? [];

  const errorMessage = error
    ? errorMessages[error] ||
      "No se pudo completar la operación."
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/protected/users"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Volver a usuarios
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Crear usuario
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Define correo, contraseña, rol y todos sus permisos antes de
          crear la cuenta.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      <form
        action={createManagedUser}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Datos de acceso
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="full_name"
                className="text-sm font-semibold text-slate-700"
              >
                Nombre *
              </label>

              <input
                id="full_name"
                name="full_name"
                required
                placeholder="Nombre del usuario"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Correo *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="usuario@empresa.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Contraseña *
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />

              <p className="text-xs text-slate-400">
                Esta será la contraseña inicial con la que podrá entrar.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-sm font-semibold text-slate-700"
              >
                Rol
              </label>

              <select
                id="role"
                name="role"
                defaultValue="viewer"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                {isSuperAdmin && (
                  <>
                    <option value="super_admin">
                      Super administrador
                    </option>
                    <option value="admin">
                      Administrador
                    </option>
                  </>
                )}

                <option value="editor">
                  Editor
                </option>

                <option value="viewer">
                  Visualizador
                </option>
              </select>
            </div>
          </div>

          <label className="mt-5 flex w-fit items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked
            />
            Usuario activo desde este momento
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <UserPermissionChecklist
            permissions={permissions}
          />
        </section>

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <Link
            href="/protected/users"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Crear usuario
          </button>
        </div>
      </form>
    </div>
  );
}