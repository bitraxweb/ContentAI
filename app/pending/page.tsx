import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function PendingPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_active) {
    redirect("/protected");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-white p-8 shadow-2xl sm:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white">
          C
        </div>

        <p className="mt-7 text-sm font-semibold text-indigo-600">
          ContentAI
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Tu cuenta está pendiente de aprobación
        </h1>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Un administrador debe activar tu acceso y asignarte un rol antes
          de que puedas entrar al espacio privado.
        </p>

        <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Cuando tu cuenta sea aprobada, vuelve a iniciar sesión o actualiza
          esta página.
        </div>

        <div className="mt-7">
          <Suspense fallback={<span>Cargando...</span>}>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </main>
  );
}