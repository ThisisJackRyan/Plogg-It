import PageHeader from "@/components/PageHeader";
import Link from "next/link";

// Static export requires generateStaticParams for dynamic segments.
// We pre-render the demo IDs until the hotspots table is wired up.
export function generateStaticParams() {
  return [{ id: "h1" }, { id: "h2" }, { id: "h3" }];
}

export const dynamicParams = false;

export default async function HotspotDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Hotspot" subtitle={`ID: ${id}`} />
      <div className="mx-auto max-w-md space-y-6 px-5 py-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
            photo placeholder
          </div>
          <h2 className="text-lg font-semibold">Sample hotspot {id}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Loose bottles, wrappers, and a small pile near the curb. Should take
            about 10 minutes.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-neutral-50 p-3">
              <dt className="text-xs text-neutral-500">Difficulty</dt>
              <dd className="font-medium">2 / 5</dd>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <dt className="text-xs text-neutral-500">Points available</dt>
              <dd className="font-medium text-brand">+45</dd>
            </div>
          </dl>
        </div>
        <Link
          href="/cleanup/new"
          className="block rounded-xl bg-brand py-3 text-center font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Start cleanup
        </Link>
      </div>
    </>
  );
}
