import { Button } from "@ui/components/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface SubscribeHeroProps {
  isPaid?: boolean;
  onUpgrade?: () => void;
}

/**
 * Subscribe hero — top-of-dashboard monetization slot.
 * Hidden when isPaid=true. Mirrors the patron-hero pattern from breed/pet
 * detail pages: deep purple fill, white CTA. Copy is placeholder — replace
 * with the actual value prop once defined.
 */
export function SubscribeHero({ isPaid = false, onUpgrade }: SubscribeHeroProps) {
  if (isPaid) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-primary-700 text-white shadow-[0_1px_2px_rgba(17,17,26,0.08),0_8px_24px_rgba(81,45,168,0.18)]"
      aria-labelledby="subscribe-hero-title"
    >
      {/* Decorative paw silhouettes — atmosphere, not content */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-72 w-72 text-white/8"
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
      <svg
        aria-hidden
        className="pointer-events-none absolute -bottom-10 right-32 h-40 w-40 text-white/5"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="55" r="22" />
        <circle cx="22" cy="38" r="10" />
        <circle cx="50" cy="22" r="10" />
        <circle cx="78" cy="38" r="10" />
      </svg>

      <div className="relative flex flex-col gap-6 p-8 sm:p-10 lg:flex-row lg:items-center lg:gap-10">
        <div className="flex-1 space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <Sparkles className="size-3.5" />
            Become a Patron
          </span>

          {/* TODO(anna): replace placeholder copy with actual value prop. */}
          <h2
            id="subscribe-hero-title"
            className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl"
          >
            Unlock your kennel page, document vault, and full pedigree depth.
          </h2>
          <p className="max-w-2xl text-white/85">
            {/* TODO(anna): pick #1 conversion lure — kennel website, document vault, or animal cap. */}
            Patron breeders publish a custom kennel page, store contracts and
            health records per litter, and remove the active-pet limit.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="accent"
              size="lg"
              onClick={onUpgrade}
              className="gap-2"
            >
              Upgrade to Patron
              <ArrowRight className="size-4" />
            </Button>
            <button
              type="button"
              className="text-sm font-bold text-white/80 underline-offset-4 transition hover:text-white hover:underline"
            >
              See what changes →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
