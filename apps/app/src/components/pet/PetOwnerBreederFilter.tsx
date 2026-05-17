import { LucideIconByName } from "@ui/lib/lucide-icons";
import { cn } from "@ui/lib/utils";
import { spaceStore, type SpaceQuickFiltersConfig } from "@breedhub/rxdb-store";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

interface PetOwnerBreederFilterProps {
  config: SpaceQuickFiltersConfig;
}

/**
 * Quick-filter chip strip for pet spaces. Renders one chip per mode
 * (Owned / Bred / All), with the chip whose slug matches `?scope=<slug>`
 * (or the `isDefault` mode if no scope is in the URL) highlighted.
 *
 * Clicking a chip writes `?scope=<slug>` to the URL — the single source of
 * truth — which causes SpaceComponent to re-resolve readFrom and the space
 * to re-fetch from the matching mapping table.
 */
export function PetOwnerBreederFilter({ config }: PetOwnerBreederFilterProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeScope = searchParams.get("scope");

  const modes = useMemo(() => {
    return Object.values(config.modes).slice().sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [config.modes]);

  const activeSlug = useMemo(() => {
    if (activeScope && modes.some((m) => m.slug === activeScope)) return activeScope;
    return modes.find((m) => m.isDefault)?.slug ?? modes[0]?.slug;
  }, [activeScope, modes]);

  const handleClick = useCallback(
    (slug: string) => {
      // Clear the current selection synchronously BEFORE writing scope so
      // the list never paints a frame with the stale entity highlighted.
      // The scope-redirect effect in useEntitySelection will pick the new
      // first entity once the refetch settles.
      spaceStore.clearSelection("pet");
      const next = new URLSearchParams(searchParams);
      next.set("scope", slug);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  if (modes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((mode) => {
        const isActive = mode.slug === activeSlug;
        return (
          <button
            key={mode.slug}
            type="button"
            onClick={() => handleClick(mode.slug)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors",
              "border border-secondary-300",
              isActive
                ? "bg-secondary-600 text-white border-secondary-600"
                : "bg-white text-secondary-700 hover:bg-secondary-50",
            )}
            aria-pressed={isActive}
          >
            {mode.icon && (
              <LucideIconByName name={mode.icon} className="h-3.5 w-3.5" />
            )}
            <span>{mode.label || mode.slug}</span>
          </button>
        );
      })}
    </div>
  );
}
