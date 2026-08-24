import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteContent, updateContent } from "./actions";

export const instant = false;

type ContentItem = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  content_type: string;
  platform: string;
  objective: string | null;
  target_audience: string | null;
  tone: string | null;
  content_length: string | null;
  use_emojis: boolean;
  use_hashtags: boolean;
  hashtags: string | null;
  call_to_action: string | null;
  status: string;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
};

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contents")
    .select(
      "id, user_id, title, body, content_type, platform, objective, target_audience, tone, content_length, use_emojis, use_hashtags, hashtags, call_to_action, status, generated_by_ai, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const content = data as ContentItem;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href="/protected/library"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Volver a la biblioteca
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Editar contenido
            </h2>

            <p className="mt-2 text-muted-foreground">
              Modifica la publicación y guarda los cambios.
            </p>
          </div>

          {content.generated_by_ai && (
            <span className="w-fit rounded-full border px-3 py-1 text-xs font-medium">
              Generado con IA
            </span>
          )}
        </div>
      </div>

      {saved === "1" && (
        <div className="rounded-xl border bg-background p-4 text-sm">
          Cambios guardados correctamente.
        </div>
      )}

      <form
        action={updateContent.bind(null, content.id)}
        className="space-y-8 rounded-xl border bg-background p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Título interno *
          </label>

          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={content.title ?? ""}
            className="w-full rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="platform" className="text-sm font-medium">
              Red social
            </label>

            <select
              id="platform"
              name="platform"
              defaultValue={content.platform}
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
              <option value="both">LinkedIn y Facebook</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="content_type" className="text-sm font-medium">
              Tipo
            </label>

            <select
              id="content_type"
              name="content_type"
              defaultValue={content.content_type}
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="post">Publicación</option>
              <option value="video_script">Guion para video</option>
              <option value="title">Título</option>
              <option value="description">Descripción</option>
              <option value="promotional_phrase">Frase promocional</option>
              <option value="idea">Idea de contenido</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Estado
            </label>

            <select
              id="status"
              name="status"
              defaultValue={content.status}
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="draft">Borrador</option>
              <option value="review">En revisión</option>
              <option value="approved">Aprobado</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="objective" className="text-sm font-medium">
              Objetivo
            </label>

            <input
              id="objective"
              name="objective"
              type="text"
              defaultValue={content.objective ?? ""}
              className="w-full rounded-lg border bg-background px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="target_audience" className="text-sm font-medium">
              Público objetivo
            </label>

            <input
              id="target_audience"
              name="target_audience"
              type="text"
              defaultValue={content.target_audience ?? ""}
              className="w-full rounded-lg border bg-background px-4 py-3"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="tone" className="text-sm font-medium">
              Tono
            </label>

            <select
              id="tone"
              name="tone"
              defaultValue={content.tone || "professional"}
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="professional">Profesional</option>
              <option value="friendly">Amigable</option>
              <option value="informative">Informativo</option>
              <option value="persuasive">Persuasivo</option>
              <option value="inspirational">Inspirador</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="content_length" className="text-sm font-medium">
              Extensión
            </label>

            <select
              id="content_length"
              name="content_length"
              defaultValue={content.content_length || "medium"}
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="short">Corto</option>
              <option value="medium">Medio</option>
              <option value="long">Largo</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="body" className="text-sm font-medium">
            Contenido *
          </label>

          <textarea
            id="body"
            name="body"
            required
            rows={12}
            defaultValue={content.body ?? ""}
            className="w-full resize-y rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="hashtags" className="text-sm font-medium">
            Hashtags
          </label>

          <input
            id="hashtags"
            name="hashtags"
            type="text"
            defaultValue={content.hashtags ?? ""}
            className="w-full rounded-lg border bg-background px-4 py-3"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="call_to_action" className="text-sm font-medium">
            Llamado a la acción
          </label>

          <input
            id="call_to_action"
            name="call_to_action"
            type="text"
            defaultValue={content.call_to_action ?? ""}
            className="w-full rounded-lg border bg-background px-4 py-3"
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              name="use_emojis"
              type="checkbox"
              defaultChecked={content.use_emojis}
            />
            Usar emojis
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              name="use_hashtags"
              type="checkbox"
              defaultChecked={content.use_hashtags}
            />
            Usar hashtags
          </label>
        </div>

        <div className="flex flex-wrap gap-3 border-t pt-6">
          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            Guardar cambios
          </button>

          <Link
            href="/protected/library"
            className="rounded-lg border px-6 py-3 font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <div className="rounded-xl border border-destructive/30 bg-background p-6 shadow-sm">
        <h3 className="text-lg font-semibold">
          Eliminar contenido
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Esta acción elimina definitivamente este contenido de la biblioteca.
        </p>

        <form
          action={deleteContent.bind(null, content.id)}
          className="mt-5"
        >
          <button
            type="submit"
            className="rounded-lg border border-destructive/50 px-5 py-3 text-sm font-medium text-destructive"
          >
            Eliminar definitivamente
          </button>
        </form>
      </div>

      <div className="text-xs text-muted-foreground">
        Creado:{" "}
        {new Intl.DateTimeFormat("es", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(content.created_at))}
        {" · "}
        Última actualización:{" "}
        {new Intl.DateTimeFormat("es", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(content.updated_at))}
      </div>
    </div>
  );
}