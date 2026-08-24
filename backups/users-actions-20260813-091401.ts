"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = [
  "super_admin",
  "admin",
  "editor",
  "viewer",
];

export async function updateUserAccess(
  formData: FormData
) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (
    !actor?.is_active ||
    !["admin", "super_admin"].includes(actor.role)
  ) {
    redirect("/protected");
  }

  const targetUserId = String(
    formData.get("user_id") ?? ""
  );

  const newRole = String(
    formData.get("role") ?? "viewer"
  );

  const newActive =
    formData.get("is_active") === "on";

  if (!targetUserId || !allowedRoles.includes(newRole)) {
    throw new Error("Datos de usuario no válidos.");
  }

  const { error } = await supabase.rpc(
    "admin_update_user_access",
    {
      p_target_user_id: targetUserId,
      p_new_role: newRole,
      p_new_active: newActive,
    }
  );

  if (error) {
    console.error("Error administrando usuario:", error);

    throw new Error(
      `No se pudo actualizar el usuario: ${error.message}`
    );
  }

  revalidatePath("/protected/users");
  redirect("/protected/users?updated=1");
}