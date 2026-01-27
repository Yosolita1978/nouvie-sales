import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          Nouvie Sales
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Sistema de ventas e inventario
        </p>
        <Link
          href="/dashboard"
          className="flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Ir al Dashboard
        </Link>
      </main>
    </div>
  );
}
