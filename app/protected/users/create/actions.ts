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

function goToError(code: string): never {
  redirect(
    `/protected/users/create?error=${encodeURIComponent(code)}`
  );
}

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
    goToError("forbidden");
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
    goToError("name");
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    goToError("email");
  }

  if (password.length < 8) {
    goToError("password");
  }

  if (!allowedRoles.includes(role)) {
    goToError("role");
  }

  if (
    ["admin", "super_admin"].includes(role) &&
    actorProfile?.role !== "super_admin"
  ) {
    goToError("protected-role");
  }

  const admin = createAdminClient();

  const { data: permissionRows, error: permissionError } =
    await admin
      .from("permissions")
      .select("key");

  if (permissionError) {
    console.error(
      "Error cargando permisos:",
      permissionError
    );
    goToError("permissions");
  }

  const validPermissionKeys = (
    permissionRows ?? []
  ).map((item) => item.key);

  const selectedPermissions =
    new Set<string>();

  for (const [key] of formData.entries()) {
    if (!key.startsWith("permission:")) {
      continue;
    }

    const permissionKey = key.slice(
      "permission:".length
    );

    if (
      validPermissionKeys.includes(
        permissionKey
      )
    ) {
      selectedPermissions.add(
        permissionKey
      );
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
    console.error(
      "Error creando usuario Auth:",
      createError
    );
    goToError("create");
  }

  const newUserId = created.user.id;

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
    console.error(
      "Error configurando perfil:",
      profileError
    );

    await admin.auth.admin.deleteUser(
      newUserId
    );

    goToError("setup");
  }

  const { error: deletePermissionError } =
    await admin
      .from("user_permissions")
      .delete()
      .eq("user_id", newUserId);

  if (deletePermissionError) {
    console.error(
      "Error preparando permisos:",
      deletePermissionError
    );

    await admin.auth.admin.deleteUser(
      newUserId
    );

    goToError("setup");
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
      console.error(
        "Error guardando permisos:",
        insertError
      );

      await admin.auth.admin.deleteUser(
        newUserId
      );

      goToError("setup");
    }
  }

  revalidatePath("/protected/users");

  redirect(
    `/protected/users?created=1&email=${encodeURIComponent(email)}`
  );
}