import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function PublicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: canView } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "publication.view",
    }
  );

  if (!canView) {
    redirect("/protected");
  }

  return children;
}