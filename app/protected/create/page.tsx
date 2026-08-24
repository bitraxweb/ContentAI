import Link from "next/link";
import { createContent } from "./actions";

export default function CreateContentPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/protected"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Volver al panel
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
            Crear contenido
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Prepara una nueva pieza para LinkedIn o Facebook.
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          Modo manual
        </div>
      </div>

      <form action={createContent} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Información principal
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Define el contenido y dónde se utilizará.
            </p>
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
                placeholder="Ej: Beneficios de la inteligencia artificial"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
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
                  defaultValue="linkedin"
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
                  Tipo de contenido
                </label>

                <select
                  id="content_type"
                  name="content_type"
                  defaultValue="post"
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
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Estrategia
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Añade contexto para organizar mejor el contenido.
            </p>
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
                placeholder="Ej: Conseguir clientes potenciales"
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
                placeholder="Ej: Empresarios y profesionales"
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
                defaultValue="professional"
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
                defaultValue="medium"
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
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Contenido
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Escribe el texto que deseas guardar.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="body"
                className="text-sm font-semibold text-slate-700"
              >
                Texto *
              </label>

              <textarea
                id="body"
                name="body"
                required
                rows={12}
                placeholder="Escribe aquí el contenido de tu publicación..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
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
                  placeholder="#IA #Marketing #Negocios"
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
                  placeholder="Ej: Contáctanos para conocer más"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  name="use_emojis"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded"
                />
                Usar emojis
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  name="use_hashtags"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded"
                />
                Usar hashtags
              </label>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
          <Link
            href="/protected"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Guardar contenido
          </button>
        </div>
      </form>
    </div>
  );
}