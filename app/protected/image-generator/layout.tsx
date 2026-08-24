import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ImageGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: canUseAI } =
    await supabase.rpc(
      "has_permission",
      {
        p_permission: "ai.use",
      }
    );

  if (!canUseAI) {
    redirect("/protected");
  }

  return children;
}