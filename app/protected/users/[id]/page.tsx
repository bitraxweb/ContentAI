import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { UserPermissionChecklist } from "@/components/user-permission-checklist";
import { createClient } from "@/lib/supabase/server";

import {
  deleteManagedUser,
  resetManagedUserPassword,
  updateManagedUser,
} from "./actions";

export const instant = false;

type Permission = {
  key: string;
  label: string;
  description: string;
  category: string;
  sort_order: number;
};

type RolePermission = {
  role: string;
  permission_key: string;
  allowed: boolean;
};

type UserPermission = {
  permission_key: string;
  allowed: boolean;
};

const errorMessages: Record<string, string> = {
  "manage-forbidden":
    "No tienes permiso para modificar usuarios.",
  "password-forbidden":
    "No tienes permiso para cambiar contraseñas.",
  "delete-forbidden":
    "No tienes permiso para eliminar usuarios.",
  "self-security":
    "Tu propia cuenta está protegida: no puedes cambiar tu rol, estado o permisos desde esta pantalla.",
  "self-delete":
    "No puedes eliminar tu propia cuenta.",
  "not-found":
    "El usuario ya no existe.",
  name:
    "El nombre es obligatorio.",
  email:
    "El correo no es válido.",
  role:
    "El rol seleccionado no es válido.",
  "protected-role":
    "Solo un super administrador puede administrar cuentas de administrador.",
  permissions:
    "No se pudo cargar el catálogo de permisos.",
  "auth-update":
    "No se pudo actualizar el correo del usuario. Comprueba que no esté utilizado por otra cuenta.",
  "profile-update":
    "No se pudo actualizar el perfil.",
  "permissions-update":
    "No se pudieron guardar todos los permisos.",
  "password-short":
    "La nueva contraseña debe tener al menos 8 caracteres.",
  "password-match":
    "Las dos contraseñas no coinciden.",
  "password-update":
    "Supabase no pudo cambiar la contraseña.",
  "delete-check":
    "No se pudo comprobar si el usuario tiene contenidos.",
  delete:
    "No se pudo eliminar la cuenta. Puedes bloquearla mientras revisamos el motivo.",
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

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    password_changed?: string;
    delete_blocked?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;

  const {
    saved,
    password_changed: passwordChanged,
    delete_blocked: deleteBlocked,
    error,
  } = await searchParams;

  const supabase = await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const actorId = authData?.claims?.sub;

  if (!actorId) {
    redirect("/auth/login");
  }

  const [
    actorProfileResult,
    canViewResult,
    canManageResult,
    canPasswordResult,
    canDeleteResult,
    targetResult,
    permissionsResult,
    rolePermissionsResult,
    userPermissionsResult,
    contentCountResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle(),

    supabase.rpc("has_permission", {
      p_permission: "users.view",
    }),

    supabase.rpc("has_permission", {
      p_permission: "users.manage",
    }),

    supabase.rpc("has_permission", {
      p_permission:
        "users.password_reset",
    }),

    supabase.rpc("has_permission", {
      p_permission: "users.delete",
    }),

    supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, is_active, created_at"
      )
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
      .select(
        "role, permission_key, allowed"
      ),

    supabase
      .from("user_permissions")
      .select(
        "permission_key, allowed"
      )
      .eq("user_id", id),

    supabase
      .from("contents")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq("user_id", id),
  ]);

  if (!canViewResult.data) {
    redirect("/protected");
  }

  const target = targetResult.data;

  if (!target) {
    notFound();
  }

  const actorRole =
    actorProfileResult.data?.role ??
    "viewer";

  const isSelf =
    actorId === target.id;

  const protectedTarget =
    actorRole !== "super_admin" &&
    ["admin", "super_admin"].includes(
      target.role
    );

  const canManage =
    Boolean(canManageResult.data) &&
    !isSelf &&
    !protectedTarget;

  const canResetPassword =
    Boolean(canPasswordResult.data) &&
    (
      isSelf ||
      !protectedTarget
    );

  const canDelete =
    Boolean(canDeleteResult.data) &&
    !isSelf &&
    !protectedTarget;

  const permissions =
    (permissionsResult.data as
      | Permission[]
      | null) ?? [];

  const rolePermissions =
    (rolePermissionsResult.data as
      | RolePermission[]
      | null) ?? [];

  const userPermissions =
    (userPermissionsResult.data as
      | UserPermission[]
      | null) ?? [];

  const overrideMap = new Map(
    userPermissions.map(
      (item) => [
        item.permission_key,
        item.allowed,
      ]
    )
  );

  const roleMap = new Map(
    rolePermissions
      .filter(
        (item) =>
          item.role === target.role &&
          item.allowed
      )
      .map(
        (item) => [
          item.permission_key,
          true,
        ]
      )
  );

  const selectedPermissionKeys =
    permissions
      .filter((permission) => {
        const override =
          overrideMap.get(
            permission.key
          );

        if (override !== undefined) {
          return override;
        }

        if (
          target.role ===
          "super_admin"
        ) {
          return true;
        }

        return (
          roleMap.get(
            permission.key
          ) === true
        );
      })
      .map(
        (permission) =>
          permission.key
      );

  const boundUpdate =
    updateManagedUser.bind(
      null,
      target.id
    );

  const boundPassword =
    resetManagedUserPassword.bind(
      null,
      target.id
    );

  const boundDelete =
    deleteManagedUser.bind(
      null,
      target.id
    );

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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Administrar usuario
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {target.full_name ||
                target.email ||
                "Usuario"}{" "}
              · {roleLabel(target.role)}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              target.is_active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {target.is_active
              ? "Cuenta activa"
              : "Cuenta bloqueada"}
          </span>
        </div>
      </div>

      {saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Usuario y permisos guardados correctamente.
        </div>
      )}

      {passwordChanged === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Contraseña cambiada correctamente.
        </div>
      )}

      {deleteBlocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Esta cuenta no se eliminó porque tiene{" "}
          <strong>{deleteBlocked}</strong>{" "}
          contenido(s) asociado(s). Puedes bloquearla sin perder datos.
          Más adelante añadiremos transferencia de propiedad.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {(isSelf || protectedTarget) && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6 text-indigo-800">
          {isSelf
            ? "Esta es tu propia cuenta. El rol, estado y permisos están protegidos para evitar que pierdas acceso accidentalmente."
            : "Esta cuenta tiene nivel de administrador. Solo un super administrador puede modificar su seguridad."}
        </div>
      )}

      <form
        action={boundUpdate}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Datos y acceso
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Modifica la información principal de la cuenta.
              </p>
            </div>

            <span className="text-xs text-slate-400">
              Contenidos creados:{" "}
              {contentCountResult.count ?? 0}
            </span>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="full_name"
                className="text-sm font-semibold text-slate-700"
              >
                Nombre
              </label>

              <input
                id="full_name"
                name="full_name"
                defaultValue={
                  target.full_name ?? ""
                }
                disabled={!canManage}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Correo
              </label>

              <input
                id="email"
                name="email"
                type="email"
                defaultValue={
                  target.email ?? ""
                }
                disabled={!canManage}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
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
                defaultValue={
                  target.role
                }
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              >
                {actorRole ===
                  "super_admin" && (
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

            <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={
                  target.is_active
                }
                disabled={!canManage}
              />
              Usuario activo
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <UserPermissionChecklist
            permissions={permissions}
            initialSelectedKeys={
              selectedPermissionKeys
            }
            disabled={!canManage}
          />
        </section>

        {canManage && (
          <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar usuario y permisos
            </button>
          </div>
        )}
      </form>

      {canResetPassword && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Cambiar contraseña
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Establece una nueva contraseña de acceso.
          </p>

          <form
            action={boundPassword}
            className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Nueva contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm_password"
                className="text-sm font-semibold text-slate-700"
              >
                Repetir contraseña
              </label>

              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Cambiar contraseña
            </button>
          </form>
        </section>
      )}

      {canDelete && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
          <h2 className="text-lg font-semibold text-rose-900">
            Eliminar cuenta
          </h2>

          <p className="mt-2 text-sm leading-6 text-rose-700">
            Solo se permitirá eliminarla si no tiene contenidos asociados.
            Si tiene contenido, bloquéala para conservar la información.
          </p>

          <form
            action={boundDelete}
            className="mt-5"
          >
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Eliminar usuario definitivamente
            </button>
          </form>
        </section>
      )}
    </div>
  );
}