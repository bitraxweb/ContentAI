import Link from "next/link";
import { redirect } from "next/navigation";
import { InviteLink } from "@/components/invite-link";
import { createClient } from "@/lib/supabase/server";
import { createInvitation } from "./actions";

export const instant = false;

export default async function InviteUserPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    email?: string;
  }>;
}) {
  const { token, email } = await searchParams;

  const supabase = await createClient();

  const { data: canInvite } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "users.invite",
    }
  );

  if (!canInvite) {
    redirect("/protected/users");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq(
      "id",
      (await supabase.auth.getClaims()).data?.claims?.sub
    )
    .maybeSingle();

  const isSuperAdmin =
    profile?.role === "super_admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/protected/users"
          className="text-sm font-semibold text-indigo-600"
        >
          ← Volver a usuarios
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Invitar usuario
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Genera un enlace privado para que una persona cree su cuenta.
        </p>
      </div>

      {token ? (
        <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">
            Invitación creada
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Envía este enlace a {email || "la persona invitada"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            El enlace es privado y solo funcionará con el email indicado.
          </p>

          <div className="mt-6">
            <InviteLink token={token} />
          </div>

          <Link
            href="/protected/users/invite"
            className="mt-6 inline-flex text-sm font-semibold text-indigo-600"
          >
            Crear otra invitación
          </Link>
        </section>
      ) : (
        <form
          action={createInvitation}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              Email *
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="persona@empresa.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-sm font-semibold text-slate-700"
              >
                Rol inicial
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

                <option value="editor">Editor</option>
                <option value="viewer">
                  Visualizador
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="days"
                className="text-sm font-semibold text-slate-700"
              >
                Vigencia
              </label>

              <select
                id="days"
                name="days"
                defaultValue="7"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="1">1 día</option>
                <option value="3">3 días</option>
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="30">30 días</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Después de que la persona se registre podrás abrir su perfil y
            personalizar cada permiso individual.
          </div>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Generar invitación
          </button>
        </form>
      )}
    </div>
  );
}