import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSocialAccessToken,
  LINKEDIN_API_VERSION,
  META_GRAPH_VERSION,
} from "@/lib/social/publisher";

type SyncSource =
  | "cron"
  | "manual";

type ClaimRow = {
  metric_id: string;
  claim_token: string;
};

type MetricRow = {
  id: string;
  publication_id: string;
  platform:
    | "linkedin"
    | "facebook";
  target_id: string | null;
  social_connection_id: string | null;
  external_post_id: string | null;
  publication_targets:
    | {
        id: string;
        external_post_id: string | null;
        social_connections:
          | {
              id: string;
              platform:
                | "linkedin"
                | "facebook";
              connection_type:
                | "member"
                | "organization"
                | "page";
              external_account_id: string;
              status: string;
              scopes: string[];
            }
          | {
              id: string;
              platform:
                | "linkedin"
                | "facebook";
              connection_type:
                | "member"
                | "organization"
                | "page";
              external_account_id: string;
              status: string;
              scopes: string[];
            }[]
          | null;
      }
    | {
        id: string;
        external_post_id: string | null;
        social_connections:
          | {
              id: string;
              platform:
                | "linkedin"
                | "facebook";
              connection_type:
                | "member"
                | "organization"
                | "page";
              external_account_id: string;
              status: string;
              scopes: string[];
            }
          | {
              id: string;
              platform:
                | "linkedin"
                | "facebook";
              connection_type:
                | "member"
                | "organization"
                | "page";
              external_account_id: string;
              status: string;
              scopes: string[];
            }[]
          | null;
      }[]
    | null;
};

type MetricsResult = {
  status:
    | "synced"
    | "unsupported"
    | "error";
  impressions:
    | number
    | null;
  reach:
    | number
    | null;
  reactions:
    | number
    | null;
  comments:
    | number
    | null;
  shares:
    | number
    | null;
  clicks:
    | number
    | null;
  saves:
    | number
    | null;
  sends:
    | number
    | null;
  engagementRate:
    | number
    | null;
  error:
    | string
    | null;
  summary:
    Record<
      string,
      unknown
    >;
};

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ??
        null
    : value;
}

function numeric(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function engagementRate({
  impressions,
  reactions,
  comments,
  shares,
  clicks,
}: {
  impressions:
    | number
    | null;
  reactions:
    | number
    | null;
  comments:
    | number
    | null;
  shares:
    | number
    | null;
  clicks:
    | number
    | null;
}) {
  if (
    !impressions ||
    impressions <= 0
  ) {
    return null;
  }

  return (
    (
      (reactions ?? 0) +
      (comments ?? 0) +
      (shares ?? 0) +
      (clicks ?? 0)
    ) /
    impressions
  );
}

function linkedinHeaders(
  accessToken: string
) {
  return {
    Authorization:
      `Bearer ${accessToken}`,
    "Linkedin-Version":
      LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version":
      "2.0.0",
    "Content-Type":
      "application/json",
  };
}

function linkedinEntityValue(
  urn: string
) {
  if (
    urn.startsWith(
      "urn:li:ugcPost:"
    )
  ) {
    return `(ugc:${urn})`;
  }

  return `(share:${urn})`;
}

async function fetchLinkedInMemberMetric({
  accessToken,
  postUrn,
  queryType,
}: {
  accessToken: string;
  postUrn: string;
  queryType: string;
}) {
  const url =
    new URL(
      "https://api.linkedin.com/rest/memberCreatorPostAnalytics"
    );

  url.searchParams.set(
    "q",
    "entity"
  );

  url.searchParams.set(
    "entity",
    linkedinEntityValue(
      postUrn
    )
  );

  url.searchParams.set(
    "queryType",
    queryType
  );

  url.searchParams.set(
    "aggregation",
    "TOTAL"
  );

  let response:
    Response;

  try {
    response =
      await fetch(
        url,
        {
          headers:
            linkedinHeaders(
              accessToken
            ),
          cache:
            "no-store",
        }
      );
  } catch {
    return {
      ok:
        false,
      status:
        0,
      count:
        null,
      message:
        "No se pudo conectar con LinkedIn.",
    };
  }

  if (!response.ok) {
    return {
      ok:
        false,
      status:
        response.status,
      count:
        null,
      message:
        `LinkedIn HTTP ${response.status}`,
    };
  }

  try {
    const payload =
      await response.json() as {
        elements?: {
          count?: number;
        }[];
      };

    return {
      ok:
        true,
      status:
        response.status,
      count:
        numeric(
          payload.elements?.[0]
            ?.count
        ) ?? 0,
      message:
        null,
    };
  } catch {
    return {
      ok:
        false,
      status:
        response.status,
      count:
        null,
      message:
        "Respuesta de analítica LinkedIn no válida.",
    };
  }
}

async function syncLinkedInMember({
  accessToken,
  postUrn,
  scopes,
}: {
  accessToken: string;
  postUrn: string;
  scopes: string[];
}): Promise<MetricsResult> {
  if (
    !scopes.includes(
      "r_member_postAnalytics"
    )
  ) {
    return {
      status:
        "unsupported",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        "La conexión no tiene r_member_postAnalytics.",
      summary: {},
    };
  }

  const metricTypes = [
    "IMPRESSION",
    "MEMBERS_REACHED",
    "REACTION",
    "COMMENT",
    "RESHARE",
    "LINK_CLICKS",
    "POST_SAVE",
    "POST_SEND",
  ];

  const values:
    Record<
      string,
      number | null
    > = {};

  for (
    const queryType
    of metricTypes
  ) {
    const result =
      await fetchLinkedInMemberMetric({
        accessToken,
        postUrn,
        queryType,
      });

    if (
      !result.ok &&
      [
        401,
        403,
      ].includes(
        result.status
      )
    ) {
      return {
        status:
          "unsupported",
        impressions:
          null,
        reach:
          null,
        reactions:
          null,
        comments:
          null,
        shares:
          null,
        clicks:
          null,
        saves:
          null,
        sends:
          null,
        engagementRate:
          null,
        error:
          result.message,
        summary: {
          queryType,
          httpStatus:
            result.status,
        },
      };
    }

    if (!result.ok) {
      return {
        status:
          "error",
        impressions:
          null,
        reach:
          null,
        reactions:
          null,
        comments:
          null,
        shares:
          null,
        clicks:
          null,
        saves:
          null,
        sends:
          null,
        engagementRate:
          null,
        error:
          result.message,
        summary: {
          queryType,
          httpStatus:
            result.status,
        },
      };
    }

    values[
      queryType
    ] =
      result.count;
  }

  const impressions =
    values.IMPRESSION ??
    null;

  const reach =
    values.MEMBERS_REACHED ??
    null;

  const reactions =
    values.REACTION ??
    null;

  const comments =
    values.COMMENT ??
    null;

  const shares =
    values.RESHARE ??
    null;

  const clicks =
    values.LINK_CLICKS ??
    null;

  return {
    status:
      "synced",
    impressions,
    reach,
    reactions,
    comments,
    shares,
    clicks,
    saves:
      values.POST_SAVE ??
      null,
    sends:
      values.POST_SEND ??
      null,
    engagementRate:
      engagementRate({
        impressions,
        reactions,
        comments,
        shares,
        clicks,
      }),
    error:
      null,
    summary: {
      linkedin_version:
        LINKEDIN_API_VERSION,
      source:
        "memberCreatorPostAnalytics",
    },
  };
}

async function syncLinkedInOrganization({
  accessToken,
  postUrn,
  organizationId,
  scopes,
}: {
  accessToken: string;
  postUrn: string;
  organizationId: string;
  scopes: string[];
}): Promise<MetricsResult> {
  if (
    !scopes.includes(
      "rw_organization_admin"
    ) &&
    !scopes.includes(
      "r_organization_admin"
    )
  ) {
    return {
      status:
        "unsupported",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        "La conexión no tiene permiso de analítica de organización.",
      summary: {},
    };
  }

  const organizationUrn =
    organizationId.startsWith(
      "urn:li:"
    )
      ? organizationId
      : `urn:li:organization:${organizationId}`;

  const url =
    new URL(
      "https://api.linkedin.com/rest/organizationalEntityShareStatistics"
    );

  url.searchParams.set(
    "q",
    "organizationalEntity"
  );

  url.searchParams.set(
    "organizationalEntity",
    organizationUrn
  );

  if (
    postUrn.startsWith(
      "urn:li:ugcPost:"
    )
  ) {
    url.searchParams.set(
      "ugcPosts",
      `List(${postUrn})`
    );
  }
  else {
    url.searchParams.set(
      "shares",
      `List(${postUrn})`
    );
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        url,
        {
          headers:
            linkedinHeaders(
              accessToken
            ),
          cache:
            "no-store",
        }
      );
  } catch {
    return {
      status:
        "error",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        "No se pudo conectar con LinkedIn.",
      summary: {},
    };
  }

  if (!response.ok) {
    return {
      status:
        [
          401,
          403,
        ].includes(
          response.status
        )
          ? "unsupported"
          : "error",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        `LinkedIn HTTP ${response.status}`,
      summary: {
        httpStatus:
          response.status,
      },
    };
  }

  try {
    const payload =
      await response.json() as {
        elements?: {
          totalShareStatistics?: {
            impressionCount?: number;
            uniqueImpressionsCount?: number;
            uniqueImpressionsCounts?: number;
            clickCount?: number;
            commentCount?: number;
            likeCount?: number;
            shareCount?: number;
            engagement?: number;
          };
        }[];
      };

    const stats =
      payload.elements?.[0]
        ?.totalShareStatistics;

    const impressions =
      numeric(
        stats?.impressionCount
      ) ?? 0;

    const reach =
      numeric(
        stats?.uniqueImpressionsCount ??
        stats?.uniqueImpressionsCounts
      );

    return {
      status:
        "synced",
      impressions,
      reach,
      reactions:
        numeric(
          stats?.likeCount
        ) ?? 0,
      comments:
        numeric(
          stats?.commentCount
        ) ?? 0,
      shares:
        numeric(
          stats?.shareCount
        ) ?? 0,
      clicks:
        numeric(
          stats?.clickCount
        ) ?? 0,
      saves:
        null,
      sends:
        null,
      engagementRate:
        numeric(
          stats?.engagement
        ),
      error:
        null,
      summary: {
        linkedin_version:
          LINKEDIN_API_VERSION,
        source:
          "organizationalEntityShareStatistics",
      },
    };
  } catch {
    return {
      status:
        "error",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        "Respuesta de analítica LinkedIn no válida.",
      summary: {},
    };
  }
}

async function fetchMetaInsight({
  accessToken,
  postId,
  metric,
}: {
  accessToken: string;
  postId: string;
  metric: string;
}) {
  const url =
    new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
        postId
      )}/insights`
    );

  url.searchParams.set(
    "metric",
    metric
  );

  url.searchParams.set(
    "access_token",
    accessToken
  );

  let response:
    Response;

  try {
    response =
      await fetch(
        url,
        {
          cache:
            "no-store",
        }
      );
  } catch {
    return {
      ok:
        false,
      status:
        0,
      value:
        null as unknown,
    };
  }

  if (!response.ok) {
    return {
      ok:
        false,
      status:
        response.status,
      value:
        null as unknown,
    };
  }

  try {
    const payload =
      await response.json() as {
        data?: {
          values?: {
            value?: unknown;
          }[];
        }[];
      };

    return {
      ok:
        true,
      status:
        response.status,
      value:
        payload.data?.[0]
          ?.values?.[0]
          ?.value ??
        null,
    };
  } catch {
    return {
      ok:
        false,
      status:
        response.status,
      value:
        null as unknown,
    };
  }
}

async function firstMetaMetric({
  accessToken,
  postId,
  metrics,
}: {
  accessToken: string;
  postId: string;
  metrics: string[];
}) {
  for (
    const metric
    of metrics
  ) {
    const result =
      await fetchMetaInsight({
        accessToken,
        postId,
        metric,
      });

    if (result.ok) {
      return {
        metric,
        value:
          result.value,
      };
    }

    if (
      [
        401,
        403,
      ].includes(
        result.status
      )
    ) {
      return {
        metric,
        value:
          null,
        forbidden:
          true,
      };
    }
  }

  return {
    metric:
      metrics[0] ??
      "",
    value:
      null,
  };
}

async function syncFacebook({
  accessToken,
  postId,
  scopes,
}: {
  accessToken: string;
  postId: string;
  scopes: string[];
}): Promise<MetricsResult> {
  if (
    !scopes.includes(
      "pages_read_engagement"
    )
  ) {
    return {
      status:
        "unsupported",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        "La conexión no tiene pages_read_engagement.",
      summary: {},
    };
  }

  const [
    viewsResult,
    reachResult,
    clicksResult,
    reactionBreakdownResult,
  ] = await Promise.all([
    firstMetaMetric({
      accessToken,
      postId,
      metrics: [
        "post_media_view",
        "post_impressions",
      ],
    }),

    firstMetaMetric({
      accessToken,
      postId,
      metrics: [
        "post_total_media_view_unique",
        "post_impressions_unique",
      ],
    }),

    firstMetaMetric({
      accessToken,
      postId,
      metrics: [
        "post_clicks",
      ],
    }),

    firstMetaMetric({
      accessToken,
      postId,
      metrics: [
        "post_reactions_by_type_total",
      ],
    }),
  ]);

  if (
    viewsResult.forbidden ||
    reachResult.forbidden ||
    clicksResult.forbidden ||
    reactionBreakdownResult.forbidden
  ) {
    return {
      status:
        "unsupported",
      impressions:
        null,
      reach:
        null,
      reactions:
        null,
      comments:
        null,
      shares:
        null,
      clicks:
        null,
      saves:
        null,
      sends:
        null,
      engagementRate:
        null,
      error:
        "Meta rechazó el acceso a Page Insights.",
      summary: {},
    };
  }

  const detailsUrl =
    new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
        postId
      )}`
    );

  detailsUrl.searchParams.set(
    "fields",
    "comments.limit(0).summary(true),reactions.limit(0).summary(true),shares"
  );

  detailsUrl.searchParams.set(
    "access_token",
    accessToken
  );

  let comments:
    | number
    | null = null;

  let shares:
    | number
    | null = null;

  let reactionSummary:
    | number
    | null = null;

  try {
    const detailsResponse =
      await fetch(
        detailsUrl,
        {
          cache:
            "no-store",
        }
      );

    if (
      detailsResponse.ok
    ) {
      const payload =
        await detailsResponse.json() as {
          comments?: {
            summary?: {
              total_count?: number;
            };
          };
          reactions?: {
            summary?: {
              total_count?: number;
            };
          };
          shares?: {
            count?: number;
          };
        };

      comments =
        numeric(
          payload.comments?.summary?.total_count
        );

      shares =
        numeric(
          payload.shares?.count
        );

      reactionSummary =
        numeric(
          payload.reactions?.summary?.total_count
        );
    }
  } catch {
    // Los insights principales siguen siendo aprovechables.
  }

  let reactionBreakdownTotal:
    | number
    | null = null;

  const reactionValue =
    reactionBreakdownResult.value;

  if (
    reactionValue &&
    typeof reactionValue ===
      "object" &&
    !Array.isArray(
      reactionValue
    )
  ) {
    reactionBreakdownTotal =
      Object.values(
        reactionValue as Record<
          string,
          unknown
        >
      )
        .map(
          numeric
        )
        .filter(
          (
            value
          ): value is number =>
            value !==
            null
        )
        .reduce(
          (
            total,
            value
          ) =>
            total +
            value,
          0
        );
  }

  const impressions =
    numeric(
      viewsResult.value
    );

  const reach =
    numeric(
      reachResult.value
    );

  const reactions =
    reactionSummary ??
    reactionBreakdownTotal;

  const clicks =
    numeric(
      clicksResult.value
    );

  return {
    status:
      "synced",
    impressions,
    reach,
    reactions,
    comments,
    shares,
    clicks,
    saves:
      null,
    sends:
      null,
    engagementRate:
      engagementRate({
        impressions,
        reactions,
        comments,
        shares,
        clicks,
      }),
    error:
      null,
    summary: {
      graph_version:
        META_GRAPH_VERSION,
      views_metric:
        viewsResult.metric,
      reach_metric:
        reachResult.metric,
      clicks_metric:
        clicksResult.metric,
      reactions_metric:
        reactionBreakdownResult.metric,
    },
  };
}

async function syncMetricRow(
  metricId: string,
  actorUserId:
    | string
    | null
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from(
      "publication_metrics"
    )
    .select(
      "id, publication_id, platform, target_id, social_connection_id, external_post_id, publication_targets(id, external_post_id, social_connections(id, platform, connection_type, external_account_id, status, scopes))"
    )
    .eq(
      "id",
      metricId
    )
    .maybeSingle();

  const metric =
    data as unknown as
      | MetricRow
      | null;

  if (
    error ||
    !metric
  ) {
    return {
      status:
        "error" as const,
      error:
        "Fila de métricas no encontrada.",
    };
  }

  const target =
    firstRelation(
      metric.publication_targets
    );

  const connection =
    firstRelation(
      target?.social_connections ??
      null
    );

  const externalPostId =
    target?.external_post_id ||
    metric.external_post_id;

  if (
    !connection ||
    connection.status !==
      "connected" ||
    !externalPostId
  ) {
    return {
      status:
        "unsupported" as const,
      error:
        "El destino ya no tiene una conexión social utilizable.",
    };
  }

  const accessToken =
    await getSocialAccessToken(
      connection.id
    );

  if (!accessToken) {
    return {
      status:
        "error" as const,
      error:
        "No se pudo leer el access token protegido.",
    };
  }

  let result:
    MetricsResult;

  if (
    connection.platform ===
    "linkedin"
  ) {
    if (
      connection.connection_type ===
      "organization"
    ) {
      result =
        await syncLinkedInOrganization({
          accessToken,
          postUrn:
            externalPostId,
          organizationId:
            connection.external_account_id,
          scopes:
            connection.scopes,
        });
    }
    else {
      result =
        await syncLinkedInMember({
          accessToken,
          postUrn:
            externalPostId,
          scopes:
            connection.scopes,
        });
    }
  }
  else {
    result =
      await syncFacebook({
        accessToken,
        postId:
          externalPostId,
        scopes:
          connection.scopes,
      });
  }

  const fetchedAt =
    result.status ===
    "synced"
      ? new Date().toISOString()
      : null;

  const {
    error: updateError,
  } = await admin
    .from(
      "publication_metrics"
    )
    .update({
      impressions:
        result.impressions,
      reach:
        result.reach,
      reactions:
        result.reactions,
      comments:
        result.comments,
      shares:
        result.shares,
      clicks:
        result.clicks,
      saves:
        result.saves,
      sends:
        result.sends,
      engagement_rate:
        result.engagementRate,
      fetched_at:
        fetchedAt,
      sync_status:
        result.status,
      last_error:
        result.error,
      provider_summary:
        result.summary,
      sync_claimed_at:
        null,
      sync_claim_token:
        null,
    })
    .eq(
      "id",
      metricId
    );

  if (updateError) {
    return {
      status:
        "error" as const,
      error:
        updateError.message,
    };
  }

  void actorUserId;

  return {
    status:
      result.status,
    error:
      result.error,
  };
}

export async function processMetricsBatch({
  source,
  actorUserId,
}: {
  source:
    SyncSource;
  actorUserId:
    | string
    | null;
}) {
  const admin =
    createAdminClient();

  const {
    data: settings,
    error: settingsError,
  } = await admin
    .from(
      "automation_settings"
    )
    .select(
      "metrics_sync_enabled, metrics_batch_size"
    )
    .eq(
      "id",
      1
    )
    .maybeSingle();

  if (
    settingsError ||
    !settings
  ) {
    throw new Error(
      "No se pudo leer la configuración de métricas."
    );
  }

  if (
    source === "cron" &&
    !settings.metrics_sync_enabled
  ) {
    return {
      runId:
        null,
      claimedCount:
        0,
      syncedCount:
        0,
      unsupportedCount:
        0,
      failedCount:
        0,
      disabled:
        true,
    };
  }

  const {
    data: runData,
    error: runError,
  } = await admin
    .from(
      "metrics_sync_runs"
    )
    .insert({
      source,
      actor_user_id:
        actorUserId,
      status:
        "running",
    })
    .select("id")
    .single();

  if (
    runError ||
    !runData?.id
  ) {
    throw new Error(
      "No se pudo iniciar el historial de sincronización."
    );
  }

  const runId =
    String(
      runData.id
    );

  let claimedCount =
    0;

  let syncedCount =
    0;

  let unsupportedCount =
    0;

  let failedCount =
    0;

  try {
    const {
      data: claimsData,
      error: claimError,
    } = await admin.rpc(
      "backend_claim_external_metrics",
      {
        p_limit:
          settings.metrics_batch_size,
      }
    );

    if (claimError) {
      throw new Error(
        claimError.message
      );
    }

    const claims =
      (claimsData as
        | ClaimRow[]
        | null) ??
      [];

    claimedCount =
      claims.length;

    for (
      const claim
      of claims
    ) {
      const result =
        await syncMetricRow(
          claim.metric_id,
          actorUserId
        );

      if (
        result.status ===
        "synced"
      ) {
        syncedCount +=
          1;
      }
      else if (
        result.status ===
        "unsupported"
      ) {
        unsupportedCount +=
          1;
      }
      else {
        failedCount +=
          1;
      }
    }

    const status =
      failedCount >
        0 ||
      unsupportedCount >
        0
        ? "completed_with_errors"
        : "completed";

    await admin
      .from(
        "metrics_sync_runs"
      )
      .update({
        status,
        claimed_count:
          claimedCount,
        synced_count:
          syncedCount,
        unsupported_count:
          unsupportedCount,
        failed_count:
          failedCount,
        finished_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        runId
      );

    return {
      runId,
      claimedCount,
      syncedCount,
      unsupportedCount,
      failedCount,
      disabled:
        false,
    };
  } catch (
    syncError
  ) {
    const message =
      syncError instanceof
      Error
        ? syncError.message
        : "Error inesperado sincronizando métricas.";

    await admin
      .from(
        "metrics_sync_runs"
      )
      .update({
        status:
          "failed",
        claimed_count:
          claimedCount,
        synced_count:
          syncedCount,
        unsupported_count:
          unsupportedCount,
        failed_count:
          failedCount,
        error_message:
          message.slice(
            0,
            1000
          ),
        finished_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        runId
      );

    throw syncError;
  }
}