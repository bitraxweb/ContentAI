"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createInvitation(
  formData: FormData
) {
  const supabase = await createClient();

  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const role = String(
    formData.get("role") ?? "viewer"
  );

  const days = Number(
    formData.get("days") ?? "7"
  );

  if (!email) {
    throw new Error("El email es obligatorio.");
  }

  const { data: token, error } = await supabase.rpc(
    "create_user_invitation",
    {
      p_email: email,
      p_role: role,
      p_days: Number.isFinite(days) ? days : 7,
    }
  );

  if (error || !token) {
    throw new Error(
      `No se pudo crear la invitación: ${
        error?.message || "sin token"
      }`
    );
  }

  redirect(
    `/protected/users/invite?token=${encodeURIComponent(
      String(token)
    )}&email=${encodeURIComponent(email)}`
  );
}