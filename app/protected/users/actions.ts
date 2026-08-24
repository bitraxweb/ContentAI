"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function revokeInvitation(
  formData: FormData
) {
  const invitationId = String(
    formData.get("invitation_id") ?? ""
  );

  if (!invitationId) {
    throw new Error("Invitación no válida.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "revoke_user_invitation",
    {
      p_invitation_id: invitationId,
    }
  );

  if (error) {
    throw new Error(
      `No se pudo revocar la invitación: ${error.message}`
    );
  }

  revalidatePath("/protected/users");
  redirect("/protected/users?revoked=1");
}