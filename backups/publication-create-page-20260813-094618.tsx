import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createPublication } from "./actions";

export const instant = false;

type ContentOption = {
  id: string;
  title: string | null;
  platform: string;
};

const errorMessages: Record<string, string> = {
  forbidden:
    "No tienes permiso para gestionar publicaciones.",
  content:
    "Selecciona un contenido válido.",
  platform:
    "Selecciona una red social válida.",
  status:
    "Selecciona un estado válido.",
  publish:
    "No tienes permiso para marcar una publicación como Publicada.",
  schedule:
    "Una publicación programada necesita una fecha.",
  database:
    "No se pudo guardar la publicación.",
};

export default async function CreatePublicationPage({
  searchParams,
}: {
  searchParams: Promise<{
    content?: string;
    error?: string;
  }>;
}) {
  const { content, error } = await searchParams;

  const supabase = await createClient();

  const [
    canManageResult,
    canPublishResult,
    contentsResult,
  ] = await Promise.all([
    supabase.rpc("has_permission", {
      p_permission: "publication.manage",
    }),

    supabase.rpc("has_permission", {
      p_permission: "publication.publish",
    }),

    supabase
      .from("contents")
      .select("id, title, platform")
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (!canManageResult.data) {
    redirect("/protected/publications");
  }

  const contents =
    (contentsResult.data as ContentOption[] | null) ?? [];

  const selectedContent =
    contents.find(
      (item) => item.id === content
    ) ?? contents[0];

  const errorMessage = error
    ? errorMessages[error] ||
      "No se pudo completar la operación."
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/protected/publications"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Volver a publicaciones
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Preparar publicación
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Convierte un contenido de la biblioteca en una publicación lista
          para revisión, aprobación o programación.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {contents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            Primero necesitas un contenido
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            La publicación siempre parte de un elemento de la biblioteca.
          </p>

          <Link
            href="/protected/create"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Crear contenido
          </Link>
        </div>
      ) : (
        <form
          action={createPublication}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Contenido y destino
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="content_id"
                  className="text-sm font-semibold text-slate-700"
                >
                  Contenido
                </label>

                <select
                  id="content_id"
                  name="content_id"
                  defaultValue={
                    selectedContent?.id
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {contents.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.title ||
                        "Sin título"}
                    </option>
                  ))}
                </select>
              </div>

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
                  defaultValue={
                    selectedContent?.platform ||
                    "linkedin"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Flujo editorial
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
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
                  defaultValue="draft"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="draft">
                    Borrador
                  </option>
                  <option value="review">
                    Pendiente de revisión
                  </option>
                  <option value="approved">
                    Aprobado
                  </option>
                  <option value="scheduled">
                    Programado
                  </option>

                  {Boolean(
                    canPublishResult.data
                  ) && (
                    <option value="published">
                      Publicado
                    </option>
                  )}

                  <option value="cancelled">
                    Cancelado
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="publication_date"
                  className="text-sm font-semibold text-slate-700"
                >
                  Fecha
                </label>

                <input
                  id="publication_date"
                  name="publication_date"
                  type="date"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="publication_time"
                  className="text-sm font-semibold text-slate-700"
                >
                  Hora
                </label>

                <input
                  id="publication_time"
                  name="publication_time"
                  type="time"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Datos de publicación
            </h2>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="internal_notes"
                  className="text-sm font-semibold text-slate-700"
                >
                  Notas internas
                </label>

                <textarea
                  id="internal_notes"
                  name="internal_notes"
                  rows={4}
                  placeholder="Indicaciones, observaciones o comentarios para el equipo..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
                    placeholder="#Marketing #IA"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
                    placeholder="Contáctanos para conocer más"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="external_url"
                  className="text-sm font-semibold text-slate-700"
                >
                  Enlace
                </label>

                <input
                  id="external_url"
                  name="external_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 flex justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <Link
              href="/protected/publications"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar publicación
            </button>
          </div>
        </form>
      )}
    </div>
  );
}