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

type ActorAccess = {
  actorId: string;
  actorRole: string;
  canManage: boolean;
  canResetPassword: boolean;
  canDelete: boolean;
};

async function getActorAccess(): Promise<ActorAccess> {
  const supabase = await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const actorId = authData?.claims?.sub;

  if (!actorId) {
    redirect("/auth/login");
  }

  const [
    profileResult,
    manageResult,
    passwordResult,
    deleteResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", actorId)
      .maybeSingle(),

    supabase.rpc("has_permission", {
      p_permission: "users.manage",
    }),

    supabase.rpc("has_permission", {
      p_permission:
        "users.password_reset",
    }),

    supabase.rpc("has_permission", {
      p_permission: "users.delete",
    }),
  ]);

  if (!profileResult.data?.is_active) {
    redirect("/pending");
  }

  return {
    actorId,
    actorRole: profileResult.data.role,
    canManage: Boolean(manageResult.data),
    canResetPassword:
      Boolean(passwordResult.data),
    canDelete: Boolean(deleteResult.data),
  };
}

function detailError(
  userId: string,
  code: string
): never {
  redirect(
    `/protected/users/${userId}?error=${encodeURIComponent(code)}`
  );
}

function isProtectedTarget(
  actorRole: string,
  targetRole: string,
  newRole?: string
) {
  if (actorRole === "super_admin") {
    return false;
  }

  return (
    ["admin", "super_admin"].includes(
      targetRole
    ) ||
    (
      newRole !== undefined &&
      ["admin", "super_admin"].includes(
        newRole
      )
    )
  );
}

export async function updateManagedUser(
  targetUserId: string,
  formData: FormData
) {
  const access = await getActorAccess();

  if (!access.canManage) {
    detailError(
      targetUserId,
      "manage-forbidden"
    );
  }

  if (access.actorId === targetUserId) {
    detailError(
      targetUserId,
      "self-security"
    );
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } =
    await admin
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();

  if (targetError || !target) {
    detailError(
      targetUserId,
      "not-found"
    );
  }

  const fullName = String(
    formData.get("full_name") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const role = String(
    formData.get("role") ?? "viewer"
  );

  const isActive =
    formData.get("is_active") === "on";

  if (!fullName) {
    detailError(
      targetUserId,
      "name"
    );
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    detailError(
      targetUserId,
      "email"
    );
  }

  if (!allowedRoles.includes(role)) {
    detailError(
      targetUserId,
      "role"
    );
  }

  if (
    isProtectedTarget(
      access.actorRole,
      target.role,
      role
    )
  ) {
    detailError(
      targetUserId,
      "protected-role"
    );
  }

  const { data: permissionRows, error: permissionError } =
    await admin
      .from("permissions")
      .select("key");

  if (permissionError) {
    console.error(
      "Error cargando permisos:",
      permissionError
    );
    detailError(
      targetUserId,
      "permissions"
    );
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

  const { error: authUpdateError } =
    await admin.auth.admin.updateUserById(
      targetUserId,
      {
        email,
        user_metadata: {
          full_name: fullName,
        },
      }
    );

  if (authUpdateError) {
    console.error(
      "Error actualizando Auth:",
      authUpdateError
    );
    detailError(
      targetUserId,
      "auth-update"
    );
  }

  const { error: profileUpdateError } =
    await admin
      .from("profiles")
      .update({
        email,
        full_name: fullName,
        role,
        is_active: isActive,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", targetUserId);

  if (profileUpdateError) {
    console.error(
      "Error actualizando perfil:",
      profileUpdateError
    );
    detailError(
      targetUserId,
      "profile-update"
    );
  }

  const { error: clearError } =
    await admin
      .from("user_permissions")
      .delete()
      .eq("user_id", targetUserId);

  if (clearError) {
    console.error(
      "Error limpiando permisos:",
      clearError
    );
    detailError(
      targetUserId,
      "permissions-update"
    );
  }

  const permissionRecords =
    validPermissionKeys.map(
      (permissionKey) => ({
        user_id: targetUserId,
        permission_key: permissionKey,
        allowed:
          selectedPermissions.has(
            permissionKey
          ),
      })
    );

  if (permissionRecords.length > 0) {
    const { error: saveError } =
      await admin
        .from("user_permissions")
        .insert(permissionRecords);

    if (saveError) {
      console.error(
        "Error guardando permisos:",
        saveError
      );
      detailError(
        targetUserId,
        "permissions-update"
      );
    }
  }

  revalidatePath("/protected/users");
  revalidatePath(
    `/protected/users/${targetUserId}`
  );

  redirect(
    `/protected/users/${targetUserId}?saved=1`
  );
}

export async function resetManagedUserPassword(
  targetUserId: string,
  formData: FormData
) {
  const access = await getActorAccess();

  if (!access.canResetPassword) {
    detailError(
      targetUserId,
      "password-forbidden"
    );
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } =
    await admin
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();

  if (targetError || !target) {
    detailError(
      targetUserId,
      "not-found"
    );
  }

  if (
    access.actorId !== targetUserId &&
    isProtectedTarget(
      access.actorRole,
      target.role
    )
  ) {
    detailError(
      targetUserId,
      "protected-role"
    );
  }

  const password = String(
    formData.get("password") ?? ""
  );

  const confirmPassword = String(
    formData.get("confirm_password") ?? ""
  );

  if (password.length < 8) {
    detailError(
      targetUserId,
      "password-short"
    );
  }

  if (password !== confirmPassword) {
    detailError(
      targetUserId,
      "password-match"
    );
  }

  const { error } =
    await admin.auth.admin.updateUserById(
      targetUserId,
      {
        password,
      }
    );

  if (error) {
    console.error(
      "Error cambiando contraseña:",
      error
    );
    detailError(
      targetUserId,
      "password-update"
    );
  }

  redirect(
    `/protected/users/${targetUserId}?password_changed=1`
  );
}

export async function deleteManagedUser(
  targetUserId: string,
  _formData: FormData
) {
  const access = await getActorAccess();

  if (!access.canDelete) {
    detailError(
      targetUserId,
      "delete-forbidden"
    );
  }

  if (access.actorId === targetUserId) {
    detailError(
      targetUserId,
      "self-delete"
    );
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } =
    await admin
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();

  if (targetError || !target) {
    detailError(
      targetUserId,
      "not-found"
    );
  }

  if (
    isProtectedTarget(
      access.actorRole,
      target.role
    )
  ) {
    detailError(
      targetUserId,
      "protected-role"
    );
  }

  const { count, error: countError } =
    await admin
      .from("contents")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq("user_id", targetUserId);

  if (countError) {
    console.error(
      "Error comprobando contenidos:",
      countError
    );
    detailError(
      targetUserId,
      "delete-check"
    );
  }

  if ((count ?? 0) > 0) {
    redirect(
      `/protected/users/${targetUserId}?delete_blocked=${count ?? 0}`
    );
  }

  const { error: deleteError } =
    await admin.auth.admin.deleteUser(
      targetUserId
    );

  if (deleteError) {
    console.error(
      "Error eliminando usuario:",
      deleteError
    );
    detailError(
      targetUserId,
      "delete"
    );
  }

  revalidatePath("/protected/users");

  redirect(
    "/protected/users?deleted=1"
  );
}