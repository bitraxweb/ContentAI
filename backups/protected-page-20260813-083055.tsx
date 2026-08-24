import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Panel principal
        </h2>

        <p className="mt-2 text-muted-foreground">
          Bienvenido a tu plataforma de creación y gestión de contenidos.
        </p>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Contenidos creados
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Borradores
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Programados
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Publicados
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

      </div>

      {/* ACCIONES RÁPIDAS */}
      <div className="rounded-xl border bg-background p-6 shadow-sm">

        <h3 className="text-xl font-semibold">
          Acciones rápidas
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Desde aquí podrás crear y administrar tus contenidos.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">

      <Link
  href="/protected/create"
  className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
>
  Crear contenido
</Link>

          <div className="rounded-lg border px-5 py-3 text-sm font-medium">
            Ver biblioteca
          </div>

        </div>
      </div>

      {/* ACTIVIDAD */}
      <div className="rounded-xl border bg-background p-6 shadow-sm">

        <h3 className="text-xl font-semibold">
          Actividad reciente
        </h3>

        <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía no existen contenidos creados.
        </div>

      </div>

    </div>
  );
}