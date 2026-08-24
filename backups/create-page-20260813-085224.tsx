import Link from "next/link";
import { createContent } from "./actions";

export default function CreateContentPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* ENCABEZADO */}
      <div>
        <Link
          href="/protected"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Volver al panel
        </Link>

        <h2 className="mt-4 text-3xl font-bold tracking-tight">
          Crear contenido
        </h2>

        <p className="mt-2 text-muted-foreground">
          Crea y guarda una nueva publicación para tus redes sociales.
        </p>
      </div>

      {/* FORMULARIO */}
      <form
        action={createContent}
        className="space-y-8 rounded-xl border bg-background p-6 shadow-sm"
      >

        {/* TÍTULO */}
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium"
          >
            Título interno *
          </label>

          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Ej: Beneficios de la inteligencia artificial"
            className="w-full rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* RED SOCIAL + TIPO */}
        <div className="grid gap-6 md:grid-cols-2">

          <div className="space-y-2">
            <label
              htmlFor="platform"
              className="text-sm font-medium"
            >
              Red social
            </label>

            <select
              id="platform"
              name="platform"
              defaultValue="linkedin"
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="linkedin">
                LinkedIn
              </option>

              <option value="facebook">
                Facebook
              </option>

              <option value="both">
                LinkedIn y Facebook
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="content_type"
              className="text-sm font-medium"
            >
              Tipo de contenido
            </label>

            <select
              id="content_type"
              name="content_type"
              defaultValue="post"
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="post">
                Publicación
              </option>

              <option value="video_script">
                Guion para video
              </option>

              <option value="title">
                Título
              </option>

              <option value="description">
                Descripción
              </option>

              <option value="promotional_phrase">
                Frase promocional
              </option>

              <option value="idea">
                Idea de contenido
              </option>
            </select>
          </div>

        </div>

        {/* OBJETIVO */}
        <div className="space-y-2">
          <label
            htmlFor="objective"
            className="text-sm font-medium"
          >
            Objetivo
          </label>

          <input
            id="objective"
            name="objective"
            type="text"
            placeholder="Ej: Conseguir clientes potenciales"
            className="w-full rounded-lg border bg-background px-4 py-3"
          />
        </div>

        {/* PÚBLICO */}
        <div className="space-y-2">
          <label
            htmlFor="target_audience"
            className="text-sm font-medium"
          >
            Público objetivo
          </label>

          <input
            id="target_audience"
            name="target_audience"
            type="text"
            placeholder="Ej: Empresarios y profesionales"
            className="w-full rounded-lg border bg-background px-4 py-3"
          />
        </div>

        {/* TONO + EXTENSIÓN */}
        <div className="grid gap-6 md:grid-cols-2">

          <div className="space-y-2">
            <label
              htmlFor="tone"
              className="text-sm font-medium"
            >
              Tono
            </label>

            <select
              id="tone"
              name="tone"
              defaultValue="professional"
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="professional">
                Profesional
              </option>

              <option value="friendly">
                Amigable
              </option>

              <option value="informative">
                Informativo
              </option>

              <option value="persuasive">
                Persuasivo
              </option>

              <option value="inspirational">
                Inspirador
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="content_length"
              className="text-sm font-medium"
            >
              Extensión
            </label>

            <select
              id="content_length"
              name="content_length"
              defaultValue="medium"
              className="w-full rounded-lg border bg-background px-4 py-3"
            >
              <option value="short">
                Corto
              </option>

              <option value="medium">
                Medio
              </option>

              <option value="long">
                Largo
              </option>
            </select>
          </div>

        </div>

        {/* CONTENIDO */}
        <div className="space-y-2">
          <label
            htmlFor="body"
            className="text-sm font-medium"
          >
            Contenido *
          </label>

          <textarea
            id="body"
            name="body"
            required
            rows={10}
            placeholder="Escribe aquí el contenido de tu publicación..."
            className="w-full resize-y rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* HASHTAGS */}
        <div className="space-y-2">
          <label
            htmlFor="hashtags"
            className="text-sm font-medium"
          >
            Hashtags
          </label>

          <input
            id="hashtags"
            name="hashtags"
            type="text"
            placeholder="#InteligenciaArtificial #Marketing #Negocios"
            className="w-full rounded-lg border bg-background px-4 py-3"
          />
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <label
            htmlFor="call_to_action"
            className="text-sm font-medium"
          >
            Llamado a la acción
          </label>

          <input
            id="call_to_action"
            name="call_to_action"
            type="text"
            placeholder="Ej: Contáctanos para conocer más"
            className="w-full rounded-lg border bg-background px-4 py-3"
          />
        </div>

        {/* OPCIONES */}
        <div className="flex flex-wrap gap-6">

          <label className="flex items-center gap-2 text-sm">
            <input
              name="use_emojis"
              type="checkbox"
              defaultChecked
            />

            Usar emojis
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              name="use_hashtags"
              type="checkbox"
              defaultChecked
            />

            Usar hashtags
          </label>

        </div>

        {/* BOTONES */}
        <div className="flex flex-wrap gap-3 border-t pt-6">

          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            Guardar contenido
          </button>

          <Link
            href="/protected"
            className="rounded-lg border px-6 py-3 font-medium"
          >
            Cancelar
          </Link>

        </div>

      </form>

    </div>
  );
}