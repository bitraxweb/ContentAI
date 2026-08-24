import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { processMetricsBatch } from "@/lib/social/metrics-sync";
import { createAdminClient } from "@/lib/supabase/admin";


export const maxDuration =
  300;

function safeEquals(
  left: string,
  right: string
) {
  const leftBuffer =
    Buffer.from(left);

  const rightBuffer =
    Buffer.from(right);

  return (
    leftBuffer.length ===
      rightBuffer.length &&
    timingSafeEqual(
      leftBuffer,
      rightBuffer
    )
  );
}

export async function POST(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) ?? "";

  const provided =
    authorization.startsWith(
      "Bearer "
    )
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (!provided) {
    return NextResponse.json(
      {
        ok:
          false,
      },
      {
        status:
          401,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: expected,
    error,
  } = await admin.rpc(
    "backend_get_scheduler_secret"
  );

  if (
    error ||
    typeof expected !==
      "string" ||
    !expected.trim() ||
    !safeEquals(
      provided,
      expected.trim()
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,
      },
      {
        status:
          401,
      }
    );
  }

  try {
    const result =
      await processMetricsBatch({
        source:
          "cron",
        actorUserId:
          null,
      });

    return NextResponse.json({
      ok:
        true,
      ...result,
    });
  } catch (
    syncError
  ) {
    console.error(
      "Cron de métricas:",
      syncError
    );

    return NextResponse.json(
      {
        ok:
          false,
        error:
          "metrics_sync_failed",
      },
      {
        status:
          500,
      }
    );
  }
}
