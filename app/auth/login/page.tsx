import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-xl font-black text-white">
              C
            </div>

            <div>
              <p className="font-semibold text-white">ContentAI</p>
              <p className="text-xs text-slate-400">
                Private Content Workspace
              </p>
            </div>
          </div>

          <div className="relative max-w-xl">
            <p className="text-sm font-semibold text-indigo-300">
              Crea. Organiza. Publica.
            </p>

            <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-white">
              Tu operación de contenidos en un solo lugar.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Un espacio privado para gestionar contenido, publicaciones,
              calendario y futuras integraciones con inteligencia artificial.
            </p>
          </div>

          <p className="relative text-xs text-slate-500">
            Acceso exclusivo para usuarios autorizados.
          </p>
        </section>

        <section className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white">
                  C
                </div>
                <div>
                  <p className="font-semibold text-slate-950">ContentAI</p>
                  <p className="text-xs text-slate-500">
                    Private Content Workspace
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}