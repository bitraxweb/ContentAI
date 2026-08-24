import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type RecentContent = {
  id: string;
  title: string | null;
  platform: string;
  status: string;
  created_at: string;
};

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";
  return platform;
}

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "En revisiÃ³n";
  if (status === "approved") return "Aprobado";
  if (status === "archived") return "Archivado";
  return status;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    totalResult,
    draftResult,
    reviewResult,
    approvedResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("contents")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),

    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "review"),

    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("contents")
      .select("id, title, platform, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const total = totalResult.count ?? 0;
  const drafts = draftResult.count ?? 0;
  const reviews = reviewResult.count ?? 0;
  const approved = approvedResult.count ?? 0;

  const recentContents =
    (recentResult.data as RecentContent[] | null) ?? [];

  const databaseError =
    totalResult.error ||
    draftResult.error ||
    reviewResult.error ||
    approvedResult.error ||
    recentResult.error;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Panel principal
        </h2>

        <p className="mt-2 text-muted-foreground">
          Bienvenido a tu plataforma de creaciÃ³n y gestiÃ³n de contenidos.
        </p>
      </div>

      {databaseError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          No se pudieron cargar todos los datos del panel. Revisa la consola
          del servidor si el problema continÃºa.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Contenidos creados
          </p>
          <p className="mt-2 text-3xl font-bold">{total}</p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Borradores
          </p>
          <p className="mt-2 text-3xl font-bold">{drafts}</p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            En revisiÃ³n
          </p>
          <p className="mt-2 text-3xl font-bold">{reviews}</p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Aprobados
          </p>
          <p className="mt-2 text-3xl font-bold">{approved}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="text-xl font-semibold">
          Acciones rÃ¡pidas
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Desde aquÃ­ puedes crear y administrar tus contenidos.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/protected/create"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Crear contenido
          </Link>

          <div className="rounded-lg border px-5 py-3 text-sm font-medium text-muted-foreground">
            Biblioteca prÃ³ximamente
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">
              Actividad reciente
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ãšltimos contenidos guardados en Supabase.
            </p>
          </div>
        </div>

        {recentContents.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            TodavÃ­a no existen contenidos creados.
          </div>
        ) : (
          <div className="mt-6 divide-y rounded-lg border">
            {recentContents.map((content) => (
              <div
                key={content.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {content.title || "Sin tÃ­tulo"}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {platformLabel(content.platform)} Â·{" "}
                    {statusLabel(content.status)}
                  </p>
                </div>

                <time className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("es", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(content.created_at))}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
