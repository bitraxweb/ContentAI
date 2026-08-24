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
  searchParams: Promise<{ saved?: string; generated?: string }>;
}) {
  const { id } = await params;
  const { saved, generated } = await searchParams;

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/protected/library"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Volver a la biblioteca
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Editar contenido
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Ajusta la pieza antes de pasarla al siguiente estado.
            </p>
          </div>

          {content.generated_by_ai && (
            <span className="w-fit rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
              Generado con IA
            </span>
          )}
        </div>
      </div>

      {(saved === "1" || generated === "1") && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {generated === "1"
            ? "Contenido generado y guardado. Revísalo antes de continuar."
            : "Cambios guardados correctamente."}
        </div>
      )}

      <form action={updateContent.bind(null, content.id)} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Información y estado
            </h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="text-sm font-semibold text-slate-700"
              >
                Título interno *
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={content.title ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="platform"
                  className="text-sm font-semibold text-slate-700"
                >
                  Red social
                </label>

                <select
                  id="platform"
                  name="platform"
                  defaultValue={content.platform}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="both">LinkedIn y Facebook</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="content_type"
                  className="text-sm font-semibold text-slate-700"
                >
                  Tipo
                </label>

                <select
                  id="content_type"
                  name="content_type"
                  defaultValue={content.content_type}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="post">Publicación</option>
                  <option value="video_script">Guion para video</option>
                  <option value="title">Título</option>
                  <option value="description">Descripción</option>
                  <option value="promotional_phrase">
                    Frase promocional
                  </option>
                  <option value="idea">Idea de contenido</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="status"
                  className="text-sm font-semibold text-slate-700"
                >
                  Estado
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue={content.status}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="draft">Borrador</option>
                  <option value="review">En revisión</option>
                  <option value="approved">Aprobado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Estrategia
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="objective"
                className="text-sm font-semibold text-slate-700"
              >
                Objetivo
              </label>

              <input
                id="objective"
                name="objective"
                type="text"
                defaultValue={content.objective ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="target_audience"
                className="text-sm font-semibold text-slate-700"
              >
                Público objetivo
              </label>

              <input
                id="target_audience"
                name="target_audience"
                type="text"
                defaultValue={content.target_audience ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="tone"
                className="text-sm font-semibold text-slate-700"
              >
                Tono
              </label>

              <select
                id="tone"
                name="tone"
                defaultValue={content.tone || "professional"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="professional">Profesional</option>
                <option value="friendly">Amigable</option>
                <option value="informative">Informativo</option>
                <option value="persuasive">Persuasivo</option>
                <option value="inspirational">Inspirador</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="content_length"
                className="text-sm font-semibold text-slate-700"
              >
                Extensión
              </label>

              <select
                id="content_length"
                name="content_length"
                defaultValue={content.content_length || "medium"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="short">Corto</option>
                <option value="medium">Medio</option>
                <option value="long">Largo</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="body"
                className="text-sm font-semibold text-slate-700"
              >
                Contenido *
              </label>

              <textarea
                id="body"
                name="body"
                required
                rows={14}
                defaultValue={content.body ?? ""}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="hashtags"
                  className="text-sm font-semibold text-slate-700"
                >
                  Hashtags
                </label>

                <input
                  id="hashtags"
                  name="hashtags"
                  type="text"
                  defaultValue={content.hashtags ?? ""}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="call_to_action"
                  className="text-sm font-semibold text-slate-700"
                >
                  Llamado a la acción
                </label>

                <input
                  id="call_to_action"
                  name="call_to_action"
                  type="text"
                  defaultValue={content.call_to_action ?? ""}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  name="use_emojis"
                  type="checkbox"
                  defaultChecked={content.use_emojis}
                />
                Usar emojis
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  name="use_hashtags"
                  type="checkbox"
                  defaultChecked={content.use_hashtags}
                />
                Usar hashtags
              </label>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
          <Link
            href="/protected/library"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Guardar cambios
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
        <h2 className="text-lg font-semibold text-rose-900">
          Zona de peligro
        </h2>

        <p className="mt-2 text-sm leading-6 text-rose-700">
          La eliminación es definitiva. Utiliza esta opción únicamente
          cuando ya no necesites el contenido.
        </p>

        <form
          action={deleteContent.bind(null, content.id)}
          className="mt-5"
        >
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Eliminar definitivamente
          </button>
        </form>
      </section>

      <div className="pb-6 text-xs text-slate-400">
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