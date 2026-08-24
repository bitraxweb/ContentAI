import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase =
    await createClient();

  const {
    data: canManage,
  } = await supabase.rpc(
    "has_permission",
    {
      p_permission:
        "integrations.manage",
    }
  );

  if (!canManage) {
    redirect("/protected");
  }

  return children;
}