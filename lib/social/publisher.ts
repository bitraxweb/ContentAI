import { createAdminClient } from "@/lib/supabase/admin";

export const LINKEDIN_API_VERSION =
  "202607";

export const META_GRAPH_VERSION =
  "v26.0";

type SocialConnection = {
  id: string;
  platform: "linkedin" | "facebook";
  connection_type:
    | "member"
    | "organization"
    | "page";
  external_account_id: string;
  account_name: string | null;
  status: string;
  scopes: string[];
};

type PublicationImage = {
  buffer: Buffer;
  mimeType: string;
  title: string;
};

export type ProviderPublishResult = {
  success: boolean;
  httpStatus:
    | number
    | null;
  externalPostId:
    | string
    | null;
  externalUrl:
    | string
    | null;
  errorCode:
    | string
    | null;
  errorMessage:
    | string
    | null;
  metadata:
    Record<
      string,
      unknown
    >;
};

function linkedinHeaders(
  accessToken: string
) {
  return {
    Authorization:
      `Bearer ${accessToken}`,
    "Content-Type":
      "application/json",
    "X-Restli-Protocol-Version":
      "2.0.0",
    "Linkedin-Version":
      LINKEDIN_API_VERSION,
  };
}

function linkedinAuthorUrn(
  connection:
    SocialConnection
) {
  const id =
    connection
      .external_account_id
      .trim();

  if (
    id.startsWith(
      "urn:li:"
    )
  ) {
    return id;
  }

  if (
    connection.connection_type ===
    "organization"
  ) {
    return `urn:li:organization:${id}`;
  }

  return `urn:li:person:${id}`;
}

async function parseProviderError(
  response: Response
) {
  let message =
    `HTTP ${response.status}`;

  let code:
    string | null = null;

  try {
    const payload =
      await response.json() as {
        message?: string;
        code?:
          | string
          | number;
        error?: {
          message?: string;
          code?:
            | string
            | number;
          type?: string;
        };
      };

    message =
      payload.error?.message ||
      payload.message ||
      message;

    const rawCode =
      payload.error?.code ??
      payload.code ??
      payload.error?.type;

    if (
      rawCode !== null &&
      rawCode !== undefined
    ) {
      code =
        String(
          rawCode
        );
    }
  } catch {
    try {
      const text =
        await response.text();

      if (text.trim()) {
        message =
          text
            .trim()
            .slice(
              0,
              500
            );
      }
    } catch {
      // Mantener HTTP status.
    }
  }

  return {
    code,
    message:
      message.slice(
        0,
        500
      ),
  };
}

async function uploadLinkedInImage({
  accessToken,
  ownerUrn,
  image,
}: {
  accessToken: string;
  ownerUrn: string;
  image: PublicationImage;
}) {
  const initResponse =
    await fetch(
      "https://api.linkedin.com/rest/images?action=initializeUpload",
      {
        method:
          "POST",
        headers:
          linkedinHeaders(
            accessToken
          ),
        body:
          JSON.stringify({
            initializeUploadRequest: {
              owner:
                ownerUrn,
            },
          }),
        cache:
          "no-store",
      }
    );

  if (!initResponse.ok) {
    const error =
      await parseProviderError(
        initResponse
      );

    throw new Error(
      `LinkedIn image init: ${error.message}`
    );
  }

  const initPayload =
    await initResponse.json() as {
      value?: {
        uploadUrl?: string;
        image?: string;
      };
    };

  const uploadUrl =
    initPayload.value
      ?.uploadUrl;

  const imageUrn =
    initPayload.value
      ?.image;

  if (
    !uploadUrl ||
    !imageUrn
  ) {
    throw new Error(
      "LinkedIn no devolvio uploadUrl o Image URN."
    );
  }

  const uploadResponse =
    await fetch(
      uploadUrl,
      {
        method:
          "PUT",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            image.mimeType,
        },
        body:
          new Uint8Array(
            image.buffer
          ),
        cache:
          "no-store",
      }
    );

  if (!uploadResponse.ok) {
    throw new Error(
      `LinkedIn image upload HTTP ${uploadResponse.status}`
    );
  }

  return imageUrn;
}

async function publishLinkedIn({
  connection,
  accessToken,
  message,
  image,
}: {
  connection:
    SocialConnection;
  accessToken: string;
  message: string;
  image:
    | PublicationImage
    | null;
}): Promise<ProviderPublishResult> {
  const scopes =
    connection.scopes ??
    [];

  if (
    connection.connection_type ===
      "organization" &&
    !scopes.includes(
      "w_organization_social"
    )
  ) {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "scope",
      errorMessage:
        "La conexion no tiene w_organization_social.",
      metadata: {},
    };
  }

  if (
    connection.connection_type !==
      "organization" &&
    !scopes.includes(
      "w_member_social"
    )
  ) {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "scope",
      errorMessage:
        "La conexion no tiene w_member_social.",
      metadata: {},
    };
  }

  const authorUrn =
    linkedinAuthorUrn(
      connection
    );

  if (
    image &&
    ![
      "image/png",
      "image/jpeg",
      "image/gif",
    ].includes(
      image.mimeType
    )
  ) {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "image_format",
      errorMessage:
        "LinkedIn admite PNG, JPEG o GIF para este conector. Convierte la imagen antes de publicarla.",
      metadata: {},
    };
  }

  let imageUrn:
    | string
    | null = null;

  if (image) {
    try {
      imageUrn =
        await uploadLinkedInImage({
          accessToken,
          ownerUrn:
            authorUrn,
          image,
        });
    } catch (
      imageError
    ) {
      return {
        success:
          false,
        httpStatus:
          null,
        externalPostId:
          null,
        externalUrl:
          null,
        errorCode:
          "image_upload",
        errorMessage:
          imageError instanceof
          Error
            ? imageError.message.slice(
                0,
                500
              )
            : "No se pudo subir la imagen a LinkedIn.",
        metadata: {},
      };
    }
  }

  const body:
    Record<
      string,
      unknown
    > = {
    author:
      authorUrn,
    commentary:
      message,
    visibility:
      "PUBLIC",
    distribution: {
      feedDistribution:
        "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels:
        [],
    },
    lifecycleState:
      "PUBLISHED",
    isReshareDisabledByAuthor:
      false,
  };

  if (imageUrn) {
    body.content = {
      media: {
        id:
          imageUrn,
        altText:
          image?.title ||
          "Imagen de la publicacion",
      },
    };
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://api.linkedin.com/rest/posts",
        {
          method:
            "POST",
          headers:
            linkedinHeaders(
              accessToken
            ),
          body:
            JSON.stringify(
              body
            ),
          cache:
            "no-store",
        }
      );
  } catch {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "network",
      errorMessage:
        "No se pudo conectar con LinkedIn.",
      metadata: {},
    };
  }

  if (!response.ok) {
    const error =
      await parseProviderError(
        response
      );

    return {
      success:
        false,
      httpStatus:
        response.status,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        error.code,
      errorMessage:
        error.message,
      metadata: {},
    };
  }

  const postId =
    response.headers.get(
      "x-restli-id"
    );

  if (!postId) {
    return {
      success:
        false,
      httpStatus:
        response.status,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "missing_id",
      errorMessage:
        "LinkedIn publico la solicitud, pero no devolvio x-restli-id.",
      metadata: {},
    };
  }

  return {
    success:
      true,
    httpStatus:
      response.status,
    externalPostId:
      postId,
    externalUrl:
      `https://www.linkedin.com/feed/update/${postId}/`,
    errorCode:
      null,
    errorMessage:
      null,
    metadata: {
      linkedin_version:
        LINKEDIN_API_VERSION,
      image:
        Boolean(
          imageUrn
        ),
    },
  };
}

async function publishFacebook({
  connection,
  accessToken,
  message,
  image,
}: {
  connection:
    SocialConnection;
  accessToken: string;
  message: string;
  image:
    | PublicationImage
    | null;
}): Promise<ProviderPublishResult> {
  if (
    connection.connection_type !==
    "page"
  ) {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "connection_type",
      errorMessage:
        "Facebook requiere una conexion de tipo pagina.",
      metadata: {},
    };
  }

  if (
    !connection.scopes.includes(
      "pages_manage_posts"
    )
  ) {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "scope",
      errorMessage:
        "La conexion no tiene pages_manage_posts.",
      metadata: {},
    };
  }

  let response:
    Response;

  try {
    if (image) {
      const form =
        new FormData();

      form.set(
        "message",
        message
      );

      form.set(
        "access_token",
        accessToken
      );

      form.set(
        "source",
        new Blob(
          [
            new Uint8Array(
              image.buffer
            ),
          ],
          {
            type:
              image.mimeType,
          }
        ),
        image.title ||
          "contentai-image"
      );

      response =
        await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
            connection.external_account_id
          )}/photos`,
          {
            method:
              "POST",
            body:
              form,
            cache:
              "no-store",
          }
        );
    }
    else {
      const form =
        new URLSearchParams();

      form.set(
        "message",
        message
      );

      form.set(
        "access_token",
        accessToken
      );

      response =
        await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
            connection.external_account_id
          )}/feed`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },
            body:
              form.toString(),
            cache:
              "no-store",
          }
        );
    }
  } catch {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "network",
      errorMessage:
        "No se pudo conectar con Facebook.",
      metadata: {},
    };
  }

  let payload: {
    id?: string;
    post_id?: string;
    error?: {
      message?: string;
      code?:
        | string
        | number;
      type?: string;
    };
  };

  try {
    payload =
      await response.json() as typeof payload;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    return {
      success:
        false,
      httpStatus:
        response.status,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        payload.error?.code !==
          undefined
          ? String(
              payload.error.code
            )
          : payload.error?.type ||
            null,
      errorMessage:
        (
          payload.error?.message ||
          `Facebook HTTP ${response.status}`
        ).slice(
          0,
          500
        ),
      metadata: {},
    };
  }

  const postId =
    payload.post_id ||
    payload.id ||
    null;

  if (!postId) {
    return {
      success:
        false,
      httpStatus:
        response.status,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "missing_id",
      errorMessage:
        "Facebook no devolvio el identificador de la publicacion.",
      metadata: {},
    };
  }

  return {
    success:
      true,
    httpStatus:
      response.status,
    externalPostId:
      postId,
    externalUrl:
      null,
    errorCode:
      null,
    errorMessage:
      null,
    metadata: {
      graph_version:
        META_GRAPH_VERSION,
      image:
        Boolean(image),
    },
  };
}

export async function getSocialAccessToken(
  connectionId: string
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "backend_get_social_access_token",
    {
      p_connection_id:
        connectionId,
    }
  );

  if (
    error ||
    typeof data !==
      "string" ||
    !data.trim()
  ) {
    return null;
  }

  return data.trim();
}

export async function loadPublicationImage(
  mediaAssetId:
    | string
    | null
) {
  if (!mediaAssetId) {
    return null;
  }

  const admin =
    createAdminClient();

  const {
    data: asset,
    error: assetError,
  } = await admin
    .from("media_assets")
    .select(
      "id, asset_type, title, storage_bucket, storage_path, mime_type"
    )
    .eq(
      "id",
      mediaAssetId
    )
    .maybeSingle();

  if (
    assetError ||
    !asset ||
    asset.asset_type !==
      "image"
  ) {
    throw new Error(
      "La imagen asociada no existe o no es valida."
    );
  }

  const {
    data: blob,
    error: downloadError,
  } =
    await admin.storage
      .from(
        asset.storage_bucket
      )
      .download(
        asset.storage_path
      );

  if (
    downloadError ||
    !blob
  ) {
    throw new Error(
      "No se pudo descargar la imagen privada."
    );
  }

  const buffer =
    Buffer.from(
      await blob.arrayBuffer()
    );

  if (
    buffer.length ===
    0
  ) {
    throw new Error(
      "La imagen privada esta vacia."
    );
  }

  return {
    buffer,
    mimeType:
      asset.mime_type ||
      "image/png",
    title:
      asset.title ||
      "contentai-image",
  };
}

export async function publishToProvider({
  connection,
  accessToken,
  message,
  image,
}: {
  connection:
    SocialConnection;
  accessToken: string;
  message: string;
  image:
    | PublicationImage
    | null;
}) {
  if (
    connection.status !==
    "connected"
  ) {
    return {
      success:
        false,
      httpStatus:
        null,
      externalPostId:
        null,
      externalUrl:
        null,
      errorCode:
        "connection",
      errorMessage:
        "La cuenta social no esta conectada.",
      metadata: {},
    } satisfies ProviderPublishResult;
  }

  if (
    connection.platform ===
    "linkedin"
  ) {
    return publishLinkedIn({
      connection,
      accessToken,
      message,
      image,
    });
  }

  return publishFacebook({
    connection,
    accessToken,
    message,
    image,
  });
}