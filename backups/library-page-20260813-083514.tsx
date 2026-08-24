import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type ContentItem = {
  id: string;
  title: string | null;
  body: string | null;
  content_type: string;
  platform: string;
  status: string;
  generated_by_ai: boolean;
  created_at: string;
};

function platformLabel(platform: string) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "both") return "LinkedIn + Facebook";
  return platform;
}

function contentTypeLabel(type: string) {
  if (type === "post") return "PublicaciÃ³n";
  if (type === "video_script") return "Guion de video";
  if (type === "title") return "TÃ­tulo";
  if (type === "description") return "DescripciÃ³n";
  if (type === "promotional_phrase") return "Frase promocional";
  if (type === "idea") return "Idea";
  return type;
}

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "review") return "En revisiÃ³n";
  if (status === "approved") return "Aprobado";
  if (status === "archived") return "Archivado";
  return status;
}

export default async function LibraryPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contents")
    .select(
      "id, title, body, content_type, platform, status, generated_by_ai, created_at"
    )
    .order("created_at", { ascending: false });

  const contents = (data as ContentItem[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Biblioteca
          </h2>

          <p className="mt-2 text-muted-foreground">
            Consulta y organiza todos los contenidos guardados.
          </p>
        </div>

        <Link
          href="/protected/create"
          className="inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Crear contenido
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          No se pudo cargar la biblioteca: {error.message}
        </div>
      )}

      {!error && contents.length === 0 && (
        <div className="rounded-xl border border-dashed bg-background p-10 text-center">
          <h3 className="text-lg font-semibold">
            La biblioteca estÃ¡ vacÃ­a
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Crea tu primer contenido para verlo aquÃ­.
          </p>

          <Link
            href="/protected/create"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Crear contenido
          </Link>
        </div>
      )}

      {!error && contents.length > 0 && (
        <>
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground shadow-sm">
            Total de contenidos:{" "}
            <span className="font-semibold text-foreground">
              {contents.length}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {contents.map((content) => (
              <article
                key={content.id}
                className="flex min-h-64 flex-col rounded-xl border bg-background p-6 shadow-sm"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    {platformLabel(content.platform)}
                  </span>

                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    {contentTypeLabel(content.content_type)}
                  </span>

                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    {statusLabel(content.status)}
                  </span>

                  {content.generated_by_ai && (
                    <span className="rounded-full border px-3 py-1 text-xs font-medium">
                      Generado con IA
                    </span>
                  )}
                </div>

                <h3 className="mt-5 text-xl font-semibold">
                  {content.title || "Sin tÃ­tulo"}
                </h3>

                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {content.body || "Este contenido no tiene texto."}
                </p>

                <div className="mt-auto pt-6 text-xs text-muted-foreground">
                  Creado el{" "}
                  {new Intl.DateTimeFormat("es", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(content.created_at))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
