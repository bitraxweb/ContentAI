"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function disconnectSocialConnection(
  connectionId: string,
  _formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: authData,
  } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
  }

  const {
    data: canManage,
  } = await supabase.rpc(
    "has_permission",
    {
      p_permission:
        "integrations.manage",
    }
  );

  if (!canManage) {
    redirect(
      "/protected"
    );
  }

  const {
    data: connection,
  } = await supabase
    .from(
      "social_connections"
    )
    .select(
      "id, account_name"
    )
    .eq(
      "id",
      connectionId
    )
    .maybeSingle();

  if (!connection) {
    redirect(
      "/protected/social?error=connection-not-found"
    );
  }

  const admin =
    createAdminClient();

  const {
    error,
  } = await admin.rpc(
    "backend_disconnect_social_connection",
    {
      p_connection_id:
        connectionId,
      p_actor_user_id:
        userId,
    }
  );

  if (error) {
    console.error(
      "Error desconectando cuenta social:",
      error
    );

    redirect(
      "/protected/social?error=disconnect"
    );
  }

  revalidatePath(
    "/protected/social"
  );

  redirect(
    "/protected/social?notice=disconnected"
  );
}