import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ProtectedShell } from "@/components/protected-shell";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_active) {
    redirect("/pending");
  }

  const userName =
    profile.full_name?.trim() || "Usuario ContentAI";

  return (
    <ProtectedShell
      userName={userName}
      role={profile.role}
      authControl={
        <Suspense
          fallback={
            <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
          }
        >
          <AuthButton />
        </Suspense>
      }
    >
      {children}
    </ProtectedShell>
  );
}