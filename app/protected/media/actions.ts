"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type MediaAssetAccessRow = {
  id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
};

function mediaError(
  assetId: string,
  code: string
): never {
  redirect(
    `/protected/media/${encodeURIComponent(
      assetId
    )}?error=${encodeURIComponent(
      code
    )}`
  );
}

async function getActorAndAsset(
  assetId: string
) {
  const supabase =
    await createClient();

  const { data: authData } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [
    assetResult,
    manageOwnResult,
    manageAllResult,
    deleteOwnResult,
    deleteAllResult,
  ] = await Promise.all([
    supabase
      .from("media_assets")
      .select(
        "id, user_id, storage_bucket, storage_path"
      )
      .eq("id", assetId)
      .maybeSingle(),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.manage_own",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.manage_all",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.delete_own",
      }
    ),

    supabase.rpc(
      "has_permission",
      {
        p_permission:
          "media.delete_all",
      }
    ),
  ]);

  const asset =
    assetResult.data as
      | MediaAssetAccessRow
      | null;

  if (!asset) {
    redirect(
      "/protected/media?error=not-found"
    );
  }

  return {
    supabase,
    userId,
    asset,
    canManage:
      Boolean(
        manageAllResult.data
      ) ||
      (
        asset.user_id ===
          userId &&
        Boolean(
          manageOwnResult.data
        )
      ),
    canDelete:
      Boolean(
        deleteAllResult.data
      ) ||
      (
        asset.user_id ===
          userId &&
        Boolean(
          deleteOwnResult.data
        )
      ),
  };
}

function normalizeTags(
  value: string
) {
  const unique =
    new Set<string>();

  for (
    const raw
    of value.split(",")
  ) {
    const tag =
      raw
        .trim()
        .replace(
          /\s+/g,
          " "
        )
        .slice(
          0,
          40
        );

    if (tag) {
      unique.add(tag);
    }

    if (
      unique.size >=
      20
    ) {
      break;
    }
  }

  return Array.from(
    unique
  );
}

export async function updateMediaAsset(
  assetId: string,
  formData: FormData
) {
  const {
    supabase,
    canManage,
  } =
    await getActorAndAsset(
      assetId
    );

  if (!canManage) {
    mediaError(
      assetId,
      "forbidden-update"
    );
  }

  const title = String(
    formData.get("title") ?? ""
  )
    .trim()
    .slice(
      0,
      180
    );

  const description = String(
    formData.get("description") ??
      ""
  )
    .trim()
    .slice(
      0,
      2000
    );

  const tagsText = String(
    formData.get("tags") ??
      ""
  );

  const tags =
    normalizeTags(
      tagsText
    );

  const isFavorite =
    formData.get(
      "is_favorite"
    ) === "on";

  const archived =
    formData.get(
      "archived"
    ) === "on";

  const {
    error,
  } = await supabase
    .from("media_assets")
    .update({
      title:
        title ||
        null,
      description:
        description ||
        null,
      tags,
      is_favorite:
        isFavorite,
      archived,
    })
    .eq(
      "id",
      assetId
    );

  if (error) {
    console.error(
      "Error actualizando multimedia:",
      error
    );

    mediaError(
      assetId,
      "database"
    );
  }

  revalidatePath(
    "/protected/media"
  );

  revalidatePath(
    `/protected/media/${assetId}`
  );

  redirect(
    `/protected/media/${encodeURIComponent(
      assetId
    )}?saved=1`
  );
}

export async function deleteMediaAsset(
  assetId: string,
  _formData: FormData
) {
  const {
    supabase,
    asset,
    canDelete,
  } =
    await getActorAndAsset(
      assetId
    );

  if (!canDelete) {
    mediaError(
      assetId,
      "forbidden-delete"
    );
  }

  const {
    error: databaseError,
  } = await supabase
    .from("media_assets")
    .delete()
    .eq(
      "id",
      assetId
    );

  if (databaseError) {
    console.error(
      "Error eliminando registro multimedia:",
      databaseError
    );

    mediaError(
      assetId,
      "database-delete"
    );
  }

  const admin =
    createAdminClient();

  const {
    error: storageError,
  } =
    await admin.storage
      .from(
        asset.storage_bucket
      )
      .remove([
        asset.storage_path,
      ]);

  if (storageError) {
    console.error(
      "El registro se elimino, pero Storage devolvio un error:",
      storageError
    );

    revalidatePath(
      "/protected/media"
    );

    redirect(
      "/protected/media?notice=deleted-storage-warning"
    );
  }

  revalidatePath(
    "/protected/media"
  );

  redirect(
    "/protected/media?notice=deleted"
  );
}