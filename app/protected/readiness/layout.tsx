import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ReadinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase =
    await createClient();

  const [
    settingsResult,
    usersResult,
  ] = await Promise.all([
    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.view",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "users.manage",
      }
    ),
  ]);

  if (
    !settingsResult.data &&
    !usersResult.data
  ) {
    redirect(
      "/protected"
    );
  }

  return children;
}