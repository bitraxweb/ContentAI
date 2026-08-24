import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateUserAccess } from "./actions";

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
  if (role === "super_admin") return "Super administrador";
  if (role === "admin") return "Administrador";
  if (role === "editor") return "Editor";
  return "Visualizador";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const { updated } = await searchParams;

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getClaims();
  const currentUserId = authData?.claims?.sub;

  if (!currentUserId) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", currentUserId)
    .maybeSingle();

  if (
    !currentProfile?.is_active ||
    !["admin", "super_admin"].includes(
      currentProfile.role
    )
  ) {
    redirect("/protected");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, is_active, created_at"
    )
    .order("created_at", { ascending: true });

  const users = (data as UserProfile[] | null) ?? [];

  const activeCount =
    users.filter((user) => user.is_active).length;

  const pendingCount =
    users.filter((user) => !user.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">
          Administración
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Usuarios y roles
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Aprueba cuentas y define qué puede hacer cada persona dentro de
          ContentAI.
        </p>
      </div>

      {updated === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Usuario actualizado correctamente.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudo cargar la lista de usuarios: {error.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Usuarios</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Activos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pendientes de aprobación
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {pendingCount}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          [
            "Super administrador",
            "Control total, incluidos administradores y permisos.",
          ],
          [
            "Administrador",
            "Gestiona contenidos y usuarios editor/viewer.",
          ],
          [
            "Editor",
            "Crea y edita. Solo elimina contenidos propios.",
          ],
          [
            "Visualizador",
            "Puede consultar contenidos, sin modificarlos.",
          ],
        ].map(([title, description]) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">
              {title}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Cuentas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Las cuentas nuevas quedan bloqueadas hasta ser aprobadas.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;

            const canManageTarget =
              !isSelf &&
              (
                currentProfile.role === "super_admin" ||
                !["admin", "super_admin"].includes(user.role)
              );

            return (
              <div
                key={user.id}
                className="grid gap-5 px-6 py-5 xl:grid-cols-[1fr_1.2fr]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-950">
                      {user.full_name?.trim() ||
                        user.email ||
                        "Usuario sin nombre"}
                    </p>

                    {isSelf && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                        Tú
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {user.is_active ? "Activo" : "Pendiente"}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {user.email || "Sin email sincronizado"}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Rol actual: {roleLabel(user.role)}
                  </p>
                </div>

                {canManageTarget ? (
                  <form
                    action={updateUserAccess}
                    className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                  >
                    <input
                      type="hidden"
                      name="user_id"
                      value={user.id}
                    />

                    <div className="space-y-2">
                      <label
                        htmlFor={`role-${user.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Rol
                      </label>

                      <select
                        id={`role-${user.id}`}
                        name="role"
                        defaultValue={user.role}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      >
                        {currentProfile.role === "super_admin" && (
                          <>
                            <option value="super_admin">
                              Super administrador
                            </option>
                            <option value="admin">
                              Administrador
                            </option>
                          </>
                        )}

                        <option value="editor">Editor</option>
                        <option value="viewer">
                          Visualizador
                        </option>
                      </select>
                    </div>

                    <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700">
                      <input
                        name="is_active"
                        type="checkbox"
                        defaultChecked={user.is_active}
                      />
                      Activo
                    </label>

                    <button
                      type="submit"
                      className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Guardar
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center xl:justify-end">
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      {isSelf
                        ? "Tu propio rol se protege para evitar bloqueos accidentales."
                        : "Este usuario requiere un super administrador."}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No se encontraron usuarios.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}