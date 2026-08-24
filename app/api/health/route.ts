import {
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin =
      createAdminClient();

    const {
      error,
    } = await admin
      .from(
        "workspace_settings"
      )
      .select("id")
      .eq(
        "id",
        1
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          status:
            "degraded",
          app:
            "ContentAI",
          database:
            "unavailable",
        },
        {
          status:
            503,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        status:
          "ok",
        app:
          "ContentAI",
        database:
          "ok",
      },
      {
        status:
          200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        status:
          "degraded",
        app:
          "ContentAI",
        database:
          "unavailable",
      },
      {
        status:
          503,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
