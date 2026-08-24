import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">

        {/* MENÚ LATERAL */}
        <aside className="border-r bg-background p-5">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">
              ContentAI
            </h1>

            <p className="text-sm text-muted-foreground">
              Gestión de contenidos
            </p>
          </div>

          <nav className="flex flex-col gap-2">

            <Link
              href="/protected"
              className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Panel principal
            </Link>

 <Link
  href="/protected/create"
  className="rounded-lg px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
>
  Crear contenido
</Link>
            <div className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Biblioteca
            </div>

            <div className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Publicaciones
            </div>

            <div className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Calendario
            </div>

            <div className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Estadísticas
            </div>

            <div className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Redes sociales
            </div>

            <div className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Configuración
            </div>

          </nav>
        </aside>

        {/* CONTENIDO */}
        <div className="flex min-w-0 flex-col">

          {/* BARRA SUPERIOR */}
          <header className="flex min-h-16 items-center justify-between border-b bg-background px-6">
            <div>
              <p className="font-semibold">
                Plataforma privada de contenidos
              </p>
            </div>

            <Suspense fallback={<span>Cargando...</span>}>
              <AuthButton />
            </Suspense>
          </header>

          {/* PÁGINAS INTERNAS */}
          <main className="flex-1 p-6 md:p-8">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}