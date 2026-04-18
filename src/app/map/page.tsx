import PageHeader from "@/components/PageHeader";
import Link from "next/link";

const demoHotspots = [
  { id: "h1", name: "Oak St. alley", difficulty: 2, points: 45 },
  { id: "h2", name: "River trail entrance", difficulty: 3, points: 70 },
  { id: "h3", name: "Bus stop on Elm", difficulty: 1, points: 25 },
];

export default function MapPage() {
  return (
    <>
      <PageHeader title="Nearby hotspots" subtitle="Tap a pin to start a cleanup" />
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-neutral-400">
          Map placeholder (Mapbox GL in phase 2)
        </div>
        <ul className="space-y-3">
          {demoHotspots.map((h) => (
            <li key={h.id}>
              <Link
                href={`/hotspot/${h.id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition hover:border-brand"
              >
                <div>
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-neutral-500">
                    Difficulty {h.difficulty}/5
                  </p>
                </div>
                <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                  +{h.points}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
