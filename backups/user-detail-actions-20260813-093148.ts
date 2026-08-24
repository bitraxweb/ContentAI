"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveUserSecurity(
  targetUserId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const role = String(
    formData.get("role") ?? "viewer"
  );

  const isActive =
    formData.get("is_active") === "on";

  const overrides: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("permission:")) {
      continue;
    }

    const permissionKey = key.slice(
      "permission:".length
    );

    const mode = String(value);

    if (mode === "allow" || mode === "deny") {
      overrides[permissionKey] = mode;
    }
  }

  const { error } = await supabase.rpc(
    "admin_update_user_security",
    {
      p_target_user_id: targetUserId,
      p_new_role: role,
      p_new_active: isActive,
      p_overrides: overrides,
    }
  );

  if (error) {
    throw new Error(
      `No se pudo guardar la seguridad del usuario: ${error.message}`
    );
  }

  revalidatePath("/protected/users");
  revalidatePath(`/protected/users/${targetUserId}`);

  redirect(`/protected/users/${targetUserId}?saved=1`);
}