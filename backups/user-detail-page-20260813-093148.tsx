import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveUserSecurity } from "./actions";

export const instant = false;

type Permission = {
  key: string;
  label: string;
  description: string;
  category: string;
  sort_order: number;
};

type RolePermission = {
  permission_key: string;
  allowed: boolean;
};

type UserOverride = {
  permission_key: string;
  allowed: boolean;
};

function roleLabel(role: string) {
  if (role === "super_admin") return "Super administrador";
  if (role === "admin") return "Administrador";
  if (role === "editor") return "Editor";
  return "Visualizador";
}

export default async function UserPermissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "users.manage",
    }
  );

  if (!canManage) {
    redirect("/protected/users");
  }

  const [
    profileResult,
    permissionResult,
    rolePermissionResult,
    overrideResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("permissions")
      .select(
        "key, label, description, category, sort_order"
      )
      .order("sort_order"),

    supabase
      .from("role_permissions")
      .select("permission_key, allowed"),

    supabase
      .from("user_permissions")
      .select("permission_key, allowed")
      .eq("user_id", id),
  ]);

  const profile = profileResult.data;

  if (!profile) {
    notFound();
  }

  const permissions =
    (permissionResult.data as Permission[] | null) ?? [];

  const rolePermissions =
    (rolePermissionResult.data as RolePermission[] | null) ?? [];

  const overrides =
    (overrideResult.data as UserOverride[] | null) ?? [];

  const roleDefault = new Map(
    rolePermissions.map((item) => [
      item.permission_key,
      item.allowed,
    ])
  );

  const overrideMap = new Map(
    overrides.map((item) => [
      item.permission_key,
      item.allowed,
    ])
  );

  const categories = Array.from(
    new Set(permissions.map((item) => item.category))
  );

  const boundAction = saveUserSecurity.bind(
    null,
    profile.id
  );

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
          Permisos de usuario
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {profile.full_name?.trim() ||
            profile.email ||
            "Usuario"}{" "}
          · {roleLabel(profile.role)}
        </p>
      </div>

      {saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Permisos guardados correctamente.
        </div>
      )}

      <form action={boundAction} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Acceso general
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-sm font-semibold text-slate-700"
              >
                Rol base
              </label>

              <select
                id="role"
                name="role"
                defaultValue={profile.role}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="super_admin">
                  Super administrador
                </option>
                <option value="admin">
                  Administrador
                </option>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 sm:self-end">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={profile.is_active}
              />
              Cuenta activa
            </label>
          </div>
        </section>

        {categories.map((category) => (
          <section
            key={category}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-950">
                {category}
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {permissions
                .filter(
                  (permission) =>
                    permission.category === category
                )
                .map((permission) => {
                  const override = overrideMap.get(
                    permission.key
                  );

                  const inherited =
                    roleDefault.get(permission.key) ??
                    profile.role === "super_admin";

                  const mode =
                    override === undefined
                      ? "inherit"
                      : override
                        ? "allow"
                        : "deny";

                  const effective =
                    override === undefined
                      ? inherited
                      : override;

                  return (
                    <div
                      key={permission.key}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_220px] md:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {permission.label}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              effective
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {effective
                              ? "Permitido"
                              : "Bloqueado"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {permission.description}
                        </p>
                      </div>

                      <select
                        name={`permission:${permission.key}`}
                        defaultValue={mode}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="inherit">
                          Heredar del rol
                        </option>
                        <option value="allow">
                          Permitir
                        </option>
                        <option value="deny">
                          Denegar
                        </option>
                      </select>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Guardar permisos
          </button>
        </div>
      </form>
    </div>
  );
}