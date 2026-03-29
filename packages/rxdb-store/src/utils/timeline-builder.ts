/**
 * Timeline Builder
 *
 * Builds/rebuilds pet timeline JSONB locally (client-side).
 * Mirrors server-side trigger_pet_timeline_on_dates() logic.
 */

interface TimelineEvent {
  d: string;  // date YYYY-MM-DD
  t: string;  // type: 'birthday', 'litter', 'date of death'
  id: string; // post UUID
}

/**
 * Rebuild timeline when date_of_birth or date_of_death changes.
 * Keeps existing events (litters etc), replaces birthday/death entries.
 */
export function rebuildTimelineOnDateChange(
  existingTimeline: TimelineEvent[],
  dateOfBirth: string | null | undefined,
  dateOfDeath: string | null | undefined,
): TimelineEvent[] {
  // Keep non-birthday/death entries (litters etc)
  const otherEvents = (existingTimeline || []).filter(
    (e) => e.t !== 'birthday' && e.t !== 'date of death'
  );

  const newEvents: TimelineEvent[] = [...otherEvents];

  if (dateOfBirth) {
    const existing = (existingTimeline || []).find((e) => e.t === 'birthday');
    newEvents.push({ d: dateOfBirth, t: 'birthday', id: existing?.id || crypto.randomUUID() });
  }

  if (dateOfDeath) {
    const existing = (existingTimeline || []).find((e) => e.t === 'date of death');
    newEvents.push({ d: dateOfDeath, t: 'date of death', id: existing?.id || crypto.randomUUID() });
  }

  return newEvents.sort((a, b) => a.d.localeCompare(b.d));
}

/**
 * Build initial timeline for a newly created pet.
 */
export function buildInitialTimeline(
  dateOfBirth: string | null | undefined,
  dateOfDeath: string | null | undefined,
): TimelineEvent[] | null {
  if (!dateOfBirth && !dateOfDeath) return null;

  const events: TimelineEvent[] = [];

  if (dateOfBirth) {
    events.push({ d: dateOfBirth, t: 'birthday', id: crypto.randomUUID() });
  }
  if (dateOfDeath) {
    events.push({ d: dateOfDeath, t: 'date of death', id: crypto.randomUUID() });
  }

  return events.sort((a, b) => a.d.localeCompare(b.d));
}
