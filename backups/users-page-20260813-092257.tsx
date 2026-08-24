import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revokeInvitation } from "./actions";

export const instant = false;

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
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
  searchParams: Promise<{
    revoked?: string;
  }>;
}) {
  const { revoked } = await searchParams;

  const supabase = await createClient();

  const { data: canView } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "users.view",
    }
  );

  if (!canView) {
    redirect("/protected");
  }

  const [
    usersResult,
    invitationsResult,
    canInviteResult,
    canManageResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, is_active, created_at"
      )
      .order("created_at", { ascending: true }),

    supabase
      .from("user_invitations")
      .select(
        "id, email, role, expires_at, accepted_at, revoked_at, created_at"
      )
      .order("created_at", { ascending: false }),

    supabase.rpc("has_permission", {
      p_permission: "users.invite",
    }),

    supabase.rpc("has_permission", {
      p_permission: "users.manage",
    }),
  ]);

  const users =
    (usersResult.data as UserProfile[] | null) ?? [];

  const invitations =
    (invitationsResult.data as Invitation[] | null) ?? [];

  const canInvite = Boolean(canInviteResult.data);
  const canManage = Boolean(canManageResult.data);

  const activeCount =
    users.filter((user) => user.is_active).length;

  const pendingCount =
    users.filter((user) => !user.is_active).length;

  const activeInvitations = invitations.filter(
    (invitation) =>
      !invitation.accepted_at &&
      !invitation.revoked_at &&
      new Date(invitation.expires_at) > new Date()
  );

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
            Gestiona roles, permisos individuales e invitaciones.
          </p>
        </div>

        {canInvite && (
          <Link
            href="/protected/users/invite"
            className="inline-flex w-fit rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Invitar usuario
          </Link>
        )}
      </div>

      {revoked === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Invitación revocada.
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
          <p className="text-sm text-slate-500">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {pendingCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Usuarios registrados
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-slate-950">
                    {user.full_name?.trim() ||
                      user.email ||
                      "Usuario sin nombre"}
                  </p>

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
                  {user.email || "Sin email"}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {roleLabel(user.role)}
                </p>
              </div>

              {canManage && (
                <Link
                  href={`/protected/users/${user.id}`}
                  className="w-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver permisos
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {canInvite && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Invitaciones activas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enlaces creados que todavía no han sido utilizados.
            </p>
          </div>

          {activeInvitations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No hay invitaciones activas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {invitation.email}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {roleLabel(invitation.role)} · Expira{" "}
                      {new Intl.DateTimeFormat("es", {
                        dateStyle: "medium",
                      }).format(new Date(invitation.expires_at))}
                    </p>
                  </div>

                  <form action={revokeInvitation}>
                    <input
                      type="hidden"
                      name="invitation_id"
                      value={invitation.id}
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Revocar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}