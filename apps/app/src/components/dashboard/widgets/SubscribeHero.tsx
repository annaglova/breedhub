import { Button } from "@ui/components/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface SubscribeHeroProps {
  isPaid?: boolean;
  onUpgrade?: () => void;
}

/**
 * Subscribe hero — primary monetization slot on the dashboard.
 * Hidden when isPaid=true. Brand gradient (primary-500 → accent-500) reuses
 * the landing CTA palette so logged-in conversion feels continuous with the
 * marketing surface. Copy is placeholder — replace with the chosen value prop.
 */
export function SubscribeHero({ isPaid = false, onUpgrade }: SubscribeHeroProps) {
  if (isPaid) return null;

  return (
    <section
      className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_1px_2px_rgba(17,17,26,0.08),0_12px_32px_rgba(81,45,168,0.22)]"
      aria-labelledby="subscribe-hero-title"
    >
      {/* Decorative paw silhouettes — atmosphere, not content */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-80 w-80 text-white/10"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="55" r="22" />
        <circle cx="22" cy="38" r="10" />
        <circle cx="50" cy="22" r="10" />
        <circle cx="78" cy="38" r="10" />
        <circle cx="14" cy="64" r="8" />
        <circle cx="86" cy="64" r="8" />
      </svg>

      <div className="relative flex h-full flex-col gap-5 p-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          <Sparkles className="size-3.5" />
          Become a Patron
        </span>

        <div className="space-y-3">
          {/* TODO(anna): replace placeholder copy with actual value prop. */}
          <h2
            id="subscribe-hero-title"
            className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl"
          >
            Unlock your kennel page, document vault, and full pedigree depth.
          </h2>
          <p className="max-w-2xl text-white/90">
            {/* TODO(anna): pick #1 conversion lure — kennel website, document vault, or animal cap. */}
            Patron breeders publish a custom kennel page, store contracts and
            health records per litter, and remove the active-pet limit.
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="default"
            size="lg"
            onClick={onUpgrade}
            className="gap-2 bg-white text-primary-700 shadow-md hover:bg-white/90"
          >
            Upgrade to Patron
            <ArrowRight className="size-4" />
          </Button>
          <button
            type="button"
            className="text-sm font-bold text-white/90 underline-offset-4 transition hover:text-white hover:underline"
          >
            See what changes →
          </button>
        </div>
      </div>
    </section>
  );
}
