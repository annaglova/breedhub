import { ArrowRight, Trophy } from "lucide-react";
import type { RankSnapshot } from "../mock-data";

interface TopKennelsBannerProps {
  ranking: RankSnapshot;
  onSeeRanking?: () => void;
}

/**
 * Top kennels in your breed + your current position.
 * Mirrors the BreedCoverV1 patron-strip pattern: 3 leader avatars on the
 * gradient, your slot at the right with an obvious "climb" hint. Same brand
 * gradient as the SubscribeHero so the hero row reads as one band.
 */
export function TopKennelsBanner({ ranking, onSeeRanking }: TopKennelsBannerProps) {
  const { breedName, topKennels, yourRank, yourInitials, nextTier } = ranking;

  return (
    <section
      aria-labelledby="top-kennels-title"
      className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_1px_2px_rgba(17,17,26,0.08),0_8px_24px_rgba(81,45,168,0.18)]"
    >
      {/* Decorative trophy silhouette */}
      <Trophy
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-6 size-44 text-white/10"
        strokeWidth={1.2}
      />

      <div className="relative flex h-full flex-col gap-4 p-6">
        <header className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            <Trophy className="size-3.5" />
            Top breeders
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">
            {breedName}
          </span>
        </header>

        <ol className="mt-2 flex items-end gap-3" aria-label={`Top kennels of ${breedName}`}>
          {topKennels.map((kennel) => (
            <li key={kennel.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className="flex size-12 items-center justify-center rounded-full border border-white/40 bg-white/15 text-sm font-bold backdrop-blur-sm"
                aria-hidden
              >
                {kennel.initials}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">
                #{kennel.rank}
              </span>
              <span className="w-full truncate text-center text-[11px] text-white/90">
                {kennel.name}
              </span>
            </li>
          ))}
          <li className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className="flex size-12 items-center justify-center rounded-full border-2 border-white bg-white/30 text-sm font-bold shadow-[0_0_0_4px_rgba(255,255,255,0.15)] backdrop-blur-sm"
              aria-hidden
            >
              {yourInitials}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
              #{yourRank}
            </span>
            <span className="w-full truncate text-center text-[11px] font-bold text-white">
              You
            </span>
          </li>
        </ol>

        <div className="mt-auto space-y-3">
          <p id="top-kennels-title" className="text-sm leading-snug text-white/90">
            Climb{" "}
            <span className="font-bold text-white">{nextTier.spotsAway} spots</span>{" "}
            to reach <span className="font-bold text-white">{nextTier.name}</span>.
          </p>
          <button
            type="button"
            onClick={onSeeRanking}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white/90 transition hover:text-white"
          >
            See ranking
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
