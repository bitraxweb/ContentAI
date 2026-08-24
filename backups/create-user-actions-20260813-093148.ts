"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = [
  "super_admin",
  "admin",
  "editor",
  "viewer",
];

export async function createManagedUser(
  formData: FormData
) {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const actorId = authData?.claims?.sub;

  if (authError || !actorId) {
    redirect("/auth/login");
  }

  const { data: canCreate } = await supabase.rpc(
    "has_permission",
    {
      p_permission: "users.create",
    }
  );

  if (!canCreate) {
    throw new Error(
      "No tienes permiso para crear usuarios."
    );
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();

  const fullName = String(
    formData.get("full_name") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? ""
  );

  const role = String(
    formData.get("role") ?? "viewer"
  );

  const isActive =
    formData.get("is_active") === "on";

  if (!fullName) {
    throw new Error("El nombre es obligatorio.");
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    throw new Error("El correo no es válido.");
  }

  if (password.length < 8) {
    throw new Error(
      "La contraseña debe tener al menos 8 caracteres."
    );
  }

  if (!allowedRoles.includes(role)) {
    throw new Error("Rol no válido.");
  }

  if (
    ["admin", "super_admin"].includes(role) &&
    actorProfile?.role !== "super_admin"
  ) {
    throw new Error(
      "Solo un super administrador puede crear administradores."
    );
  }

  const admin = createAdminClient();

  const { data: permissionRows, error: permissionError } =
    await admin
      .from("permissions")
      .select("key");

  if (permissionError) {
    throw new Error(
      `No se pudieron cargar los permisos: ${permissionError.message}`
    );
  }

  const validPermissionKeys = (
    permissionRows ?? []
  ).map((item) => item.key);

  const selectedPermissions = new Set<string>();

  for (const [key] of formData.entries()) {
    if (!key.startsWith("permission:")) {
      continue;
    }

    const permissionKey = key.slice(
      "permission:".length
    );

    if (
      validPermissionKeys.includes(permissionKey)
    ) {
      selectedPermissions.add(permissionKey);
    }
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (
    createError ||
    !created.user
  ) {
    throw new Error(
      `No se pudo crear el usuario: ${
        createError?.message || "error desconocido"
      }`
    );
  }

  const newUserId = created.user.id;

  try {
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: newUserId,
        email,
        full_name: fullName,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      throw new Error(
        `No se pudo configurar el perfil: ${profileError.message}`
      );
    }

    const { error: deleteError } = await admin
      .from("user_permissions")
      .delete()
      .eq("user_id", newUserId);

    if (deleteError) {
      throw new Error(
        `No se pudieron preparar los permisos: ${deleteError.message}`
      );
    }

    const permissionRecords =
      validPermissionKeys.map(
        (permissionKey) => ({
          user_id: newUserId,
          permission_key: permissionKey,
          allowed:
            selectedPermissions.has(
              permissionKey
            ),
        })
      );

    if (permissionRecords.length > 0) {
      const { error: insertError } =
        await admin
          .from("user_permissions")
          .insert(permissionRecords);

      if (insertError) {
        throw new Error(
          `No se pudieron guardar los permisos: ${insertError.message}`
        );
      }
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(
      newUserId
    );

    throw error;
  }

  revalidatePath("/protected/users");

  redirect(
    `/protected/users?created=1&email=${encodeURIComponent(
      email
    )}`
  );
}