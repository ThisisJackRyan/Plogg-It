import PageHeader from "@/components/PageHeader";

const pokedex = [
  { category: "Bottles", count: 12, rarity: "common" },
  { category: "Cans", count: 8, rarity: "common" },
  { category: "Cigarette butts", count: 34, rarity: "common" },
  { category: "Wrappers", count: 21, rarity: "common" },
  { category: "Clothing", count: 1, rarity: "uncommon" },
  { category: "Tire", count: 0, rarity: "rare" },
];

const rarityColor: Record<string, string> = {
  common: "bg-neutral-100 text-neutral-600",
  uncommon: "bg-blue-100 text-blue-700",
  rare: "bg-amber-100 text-amber-700",
};

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Your profile" />
      <div className="mx-auto max-w-md space-y-6 px-5 py-6">
        <section className="rounded-2xl bg-brand p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/80">Total points</p>
          <p className="mt-1 text-4xl font-bold">1,240</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
            <Stat label="Cleanups" value="8" />
            <Stat label="Streak" value="3d" />
            <Stat label="Rank" value="#12" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Trash Pokédex
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {pokedex.map((entry) => (
              <li
                key={entry.category}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-medium">{entry.category}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-2xl font-bold">{entry.count}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${rarityColor[entry.rarity]}`}
                  >
                    {entry.rarity}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 py-2">
      <p className="text-base font-semibold">{value}</p>
      <p className="text-white/70">{label}</p>
    </div>
  );
}
