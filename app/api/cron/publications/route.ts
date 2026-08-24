import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { processScheduledBatch } from "@/lib/social/scheduler-runner";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

function safeSecretEquals(
  provided: string,
  expected: string
) {
  const providedBuffer =
    Buffer.from(
      provided
    );

  const expectedBuffer =
    Buffer.from(
      expected
    );

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

export async function POST(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) ?? "";

  const providedSecret =
    authorization.startsWith(
      "Bearer "
    )
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (!providedSecret) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "unauthorized",
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
    data: expectedSecret,
    error: secretError,
  } = await admin.rpc(
    "backend_get_scheduler_secret"
  );

  if (
    secretError ||
    typeof expectedSecret !==
      "string" ||
    !expectedSecret.trim() ||
    !safeSecretEquals(
      providedSecret,
      expectedSecret.trim()
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "unauthorized",
      },
      {
        status:
          401,
      }
    );
  }

  try {
    const result =
      await processScheduledBatch({
        source:
          "cron",
        actorUserId:
          null,
      });

    return NextResponse.json(
      {
        ok:
          true,
        ...result,
      },
      {
        status:
          200,
      }
    );
  } catch (
    schedulerError
  ) {
    console.error(
      "Scheduler automatico:",
      schedulerError
    );

    return NextResponse.json(
      {
        ok:
          false,
        error:
          "scheduler_failed",
      },
      {
        status:
          500,
      }
    );
  }
}