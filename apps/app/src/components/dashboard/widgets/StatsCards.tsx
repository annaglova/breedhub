import { Award, Baby, PawPrint } from "lucide-react";
import type { DashboardStat } from "../mock-data";

interface StatsCardsProps {
  stats: DashboardStat[];
}

const ICON_MAP = {
  pets: PawPrint,
  litters: Baby,
  offspring: PawPrint,
  champion: Award,
} as const;

/**
 * 3 stat cards — kennel pulse at a glance.
 * Champion-tone card uses amber accent (MOODBOARD pt.6 — gold/bronze for
 * achievements). Other cards use primary purple.
 */
export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = ICON_MAP[stat.icon];
        const isChampion = stat.tone === "champion";

        return (
          <article
            key={stat.id}
            className="rounded-2xl border border-primary-100/70 bg-white p-5 shadow-[0_1px_1px_rgba(17,17,26,0.04),0_2px_6px_rgba(17,17,26,0.03)]"
          >
            <div className="flex items-start justify-between">
              <span
                className={`flex size-10 items-center justify-center rounded-xl ${
                  isChampion
                    ? "bg-amber-100 text-amber-700"
                    : "bg-primary-100 text-primary-700"
                }`}
              >
                <Icon className="size-5" />
              </span>
              {stat.hint && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    isChampion
                      ? "bg-amber-50 text-amber-700"
                      : "bg-primary-50 text-primary-700"
                  }`}
                >
                  {stat.hint}
                </span>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p
                className={`mt-1 text-4xl font-bold tabular-nums ${
                  isChampion ? "text-amber-700" : "text-primary-700"
                }`}
              >
                {stat.value}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
