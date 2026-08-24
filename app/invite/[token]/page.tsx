import Link from "next/link";
import { InviteSignUpForm } from "@/components/invite-sign-up-form";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type InviteData = {
  email: string;
  role: string;
  expires_at: string;
};

export default async function PublicInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "lookup_user_invitation",
    {
      p_token: token,
    }
  );

  const invitation =
    ((data as InviteData[] | null) ?? [])[0];

  if (error || !invitation) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
        <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl">
          <p className="text-sm font-semibold text-rose-600">
            Invitación no disponible
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Este enlace ya no es válido
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Puede haber expirado, sido revocado o utilizado anteriormente.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex text-sm font-semibold text-indigo-600"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white">
          C
        </div>

        <p className="mt-6 text-sm font-semibold text-indigo-600">
          Invitación a ContentAI
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Crea tu cuenta
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Has sido invitado a un espacio privado de gestión de contenidos.
        </p>

        <div className="mt-7">
          <InviteSignUpForm
            email={invitation.email}
            token={token}
          />
        </div>
      </div>
    </main>
  );
}