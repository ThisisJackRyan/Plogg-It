"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/map", label: "Map", icon: "🗺️" },
  { href: "/leaderboard", label: "Board", icon: "🏆" },
  { href: "/report", label: "Report", icon: "📍" },
  { href: "/profile", label: "Profile", icon: "🧑" },
];

export default function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition ${
                  active ? "text-brand" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
