import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: allowed } =
    await supabase.rpc(
      "has_permission",
      {
        p_permission:
          "content.create",
      }
    );

  if (!allowed) {
    redirect(
      "/protected/library"
    );
  }

  return children;
}