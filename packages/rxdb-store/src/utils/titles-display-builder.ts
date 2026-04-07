/**
 * Titles Display Builder
 *
 * Builds pet.titles_display JSONB array locally (client-side).
 *
 * ⚠️ MIRROR: This function MIRRORS server trigger logic.
 * If you change the shape, sort order, or filter rules HERE — you MUST also
 * update the SQL trigger function `trg_title_in_pet_rebuild_titles_display`
 * (defined in DB, documented in `breedhub-docs/backend/processes/pet/TITLES_DISPLAY.md`).
 *
 * Pattern: see `breedhub-docs/general/DENORMALIZATION_PATTERN.md`.
 *
 * Why mirror? Local-first UX. The server trigger is canonical (runs after every
 * title_in_pet INSERT/UPDATE/DELETE), but the client can't wait for a server
 * round-trip to show fresh data. So we run the same aggregation locally for
 * instant feedback. Server stays as authoritative source — V3 pull-side
 * staleness check (updated_at compare) catches any divergence on next sync.
 */

export interface TitleInPetRow {
  title_id: string;
  country_id?: string | null;
  amount?: number | null;
  date?: string | null;
  is_confirmed?: boolean | null;
  deleted?: boolean | null;
}

export interface TitleDictionaryEntry {
  name?: string | null;
  rating?: number | string | null;
}

export interface TitlesDisplayEntry {
  id: string;
  name: string;
  rating: number;
  country_id: string | null;
  amount: number;
  date: string | null;
  confirmed: boolean;
}

/**
 * Build titles_display JSONB array.
 *
 * @param titlesInPet — all title_in_pet rows for one pet (any deleted=true are filtered out)
 * @param titleLookup — Map of title_id → { name, rating } from dictionary
 * @returns sorted array (rating DESC, name ASC) ready to write to pet.titles_display
 */
export function buildTitlesDisplay(
  titlesInPet: TitleInPetRow[],
  titleLookup: Map<string, TitleDictionaryEntry>,
): TitlesDisplayEntry[] {
  const entries: TitlesDisplayEntry[] = [];

  for (const tip of titlesInPet) {
    // Filter soft-deleted (mirror: COALESCE(tip.deleted, false) = false)
    if (tip.deleted === true) continue;

    const dict = titleLookup.get(tip.title_id);
    const rating = parseFloat(String(dict?.rating ?? 0)) || 0;
    const name = String(dict?.name ?? '');

    entries.push({
      id: tip.title_id,
      name,
      rating,
      country_id: tip.country_id ?? null,
      amount: tip.amount ?? 1,
      date: tip.date ?? null,
      confirmed: tip.is_confirmed === true,
    });
  }

  // Sort: rating DESC, name ASC (mirror server trigger)
  entries.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  return entries;
}
