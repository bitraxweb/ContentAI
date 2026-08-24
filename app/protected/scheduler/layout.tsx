import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function SchedulerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase =
    await createClient();

  const [
    manageResult,
    publishResult,
    settingsResult,
  ] = await Promise.all([
    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.manage",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "publication.publish",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "settings.view",
      }
    ),
  ]);

  if (
    !manageResult.data &&
    !publishResult.data &&
    !settingsResult.data
  ) {
    redirect(
      "/protected"
    );
  }

  return children;
}