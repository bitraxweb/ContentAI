import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ProtectedShell } from "@/components/protected-shell";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PermissionRow = {
  permission_key: string;
  allowed: boolean;
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, role, is_active"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_active) {
    redirect("/pending");
  }

  const [
    permissionsResult,
    workspaceResult,
  ] = await Promise.all([
    supabase.rpc("get_my_permissions"),

    supabase
      .from("workspace_settings")
      .select("workspace_name")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const rows = permissionsResult.data;

  const permissions = (
    (rows as PermissionRow[] | null) ?? []
  )
    .filter((item) => item.allowed)
    .map(
      (item) => item.permission_key
    );

  const userName =
    profile.full_name?.trim() ||
    "Usuario ContentAI";

  return (
    <ProtectedShell
      workspaceName={
        workspaceResult.data?.workspace_name?.trim() ||
        "ContentAI"
      }
      userName={userName}
      role={profile.role}
      permissions={permissions}
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