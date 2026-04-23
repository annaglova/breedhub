import { useEffect, useState } from "react";
import { getDatabase, routeStore } from "@breedhub/rxdb-store";

export interface ResolvedRoute {
  entity: string;
  entity_id: string;
  entity_partition_id?: string;
  partition_field?: string;
  model: string;
}

const resolvedRoutesCache = new Map<string, ResolvedRoute>();

export function extractResolvableSlug(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  const normalizedPath = path.trim();
  if (!normalizedPath || normalizedPath === "#" || normalizedPath.startsWith("http")) {
    return null;
  }

  const withoutHash = normalizedPath.split("#", 1)[0];
  const withoutQuery = withoutHash.split("?", 1)[0];
  const withoutLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery.slice(1)
    : withoutQuery;

  if (!withoutLeadingSlash || withoutLeadingSlash.includes("/")) {
    return null;
  }

  return withoutLeadingSlash;
}

export function getCachedResolvedRoute(slug?: string | null): ResolvedRoute | null {
  if (!slug) {
    return null;
  }

  return resolvedRoutesCache.get(slug) ?? null;
}

export function hasCachedResolvedRoute(slug?: string | null): boolean {
  return !!slug && resolvedRoutesCache.has(slug);
}

export async function resolveRouteBySlug(slug: string): Promise<ResolvedRoute | null> {
  const cached = resolvedRoutesCache.get(slug);
  if (cached) {
    return cached;
  }

  if (!routeStore.initialized.value) {
    await routeStore.initialize();
  }

  const route = await routeStore.resolveRoute(slug);

  if (route) {
    resolvedRoutesCache.set(slug, route);
  }

  return route;
}

export async function getResolvedEntityName(
  route: ResolvedRoute,
  fallbackName: string,
): Promise<string> {
  try {
    const db = await getDatabase();
    const collections = db.collections as Record<string, any>;
    const collection = collections[route.entity];

    if (!collection) {
      return fallbackName;
    }

    const entity = await collection.findOne(route.entity_id).exec();
    return entity?.name || fallbackName;
  } catch (error) {
    console.warn("[route-resolution] Could not get entity name from RxDB:", error);
    return fallbackName;
  }
}

export function useResolvedRoute(slug?: string | null) {
  const [error, setError] = useState<string | null>(null);
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute | null>(() =>
    getCachedResolvedRoute(slug),
  );
  const [isResolving, setIsResolving] = useState(() =>
    slug ? !hasCachedResolvedRoute(slug) : false,
  );

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setResolvedRoute(null);
      setError("No slug provided");
      setIsResolving(false);
      return () => {
        cancelled = true;
      };
    }

    const cached = getCachedResolvedRoute(slug);
    if (cached) {
      setResolvedRoute(cached);
      setError(null);
      setIsResolving(false);
      return () => {
        cancelled = true;
      };
    }

    setResolvedRoute(null);
    setError(null);
    setIsResolving(true);

    void resolveRouteBySlug(slug)
      .then((route) => {
        if (cancelled) {
          return;
        }

        if (!route) {
          setResolvedRoute(null);
          setError(`Page not found: /${slug}`);
          setIsResolving(false);
          return;
        }

        setResolvedRoute(route);
        setError(null);
        setIsResolving(false);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        console.error("[route-resolution] Error:", err);
        setResolvedRoute(null);
        setError(err instanceof Error ? err.message : "Failed to resolve URL");
        setIsResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { resolvedRoute, error, isResolving };
}
