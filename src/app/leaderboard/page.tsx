import PageHeader from "@/components/PageHeader";

const rows = [
  { name: "Maya", points: 4820 },
  { name: "Diego", points: 3910 },
  { name: "Kenji", points: 3025 },
  { name: "Aisha", points: 2650 },
  { name: "You", points: 1240 },
];

export default function LeaderboardPage() {
  return (
    <>
      <PageHeader title="Leaderboard" subtitle="This week · your neighborhood" />
      <div className="mx-auto max-w-md px-5 py-6">
        <ol className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {rows.map((row, idx) => {
            const isYou = row.name === "You";
            return (
              <li
                key={row.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  idx !== rows.length - 1 ? "border-b border-neutral-100" : ""
                } ${isYou ? "bg-brand/5" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      idx === 0
                        ? "bg-amber-100 text-amber-700"
                        : idx === 1
                          ? "bg-neutral-200 text-neutral-700"
                          : idx === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className={`font-medium ${isYou ? "text-brand" : ""}`}>
                    {row.name}
                  </span>
                </div>
                <span className="font-semibold">{row.points.toLocaleString()}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
