import Link from "next/link";

export default function Landing() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 px-6 pt-16 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-brand text-5xl shadow-lg">
        🌱
      </div>
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Plogged</h1>
        <p className="mt-3 text-neutral-600">
          Pick up trash. Earn points. Level up your neighborhood.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/map"
          className="rounded-xl bg-brand py-3 text-center font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Open the map
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-neutral-300 py-3 text-center font-medium text-neutral-800 transition hover:bg-neutral-100"
        >
          Sign in
        </Link>
      </div>
      <p className="text-xs text-neutral-400">
        Phase 1 scaffold — map, cleanup flow, and AI verification coming next.
      </p>
    </div>
  );
}
