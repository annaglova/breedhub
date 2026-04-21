import { PetCard, type Pet } from "@/components/shared/PetCard";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface InfinitePetGridTabProps {
  pets: Pet[];
  isLoading: boolean;
  isFullscreen: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage: string;
  allLoadedMessage?: string;
  loadingFallback?: ReactNode;
  className?: string;
}

export function InfinitePetGridTab({
  pets,
  isLoading,
  isFullscreen,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  emptyMessage,
  allLoadedMessage,
  loadingFallback,
  className,
}: InfinitePetGridTabProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFullscreen || !onLoadMore) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isFullscreen, isLoadingMore, onLoadMore, pets.length]);

  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

    return (
      <div className="flex justify-center p-8">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <span className="text-secondary p-8 text-center block">
        {emptyMessage}
      </span>
    );
  }

  const content = (
    <>
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4",
        )}
      >
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} mode="default" />
        ))}
      </div>

      {isFullscreen && (
        <div
          ref={loadMoreRef}
          className="py-4 flex justify-center"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
          {!hasMore && pets.length > 0 && (
            <span className="text-muted-foreground text-sm">
              {allLoadedMessage ?? `All ${pets.length} pets loaded`}
            </span>
          )}
        </div>
      )}
    </>
  );

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return content;
}
