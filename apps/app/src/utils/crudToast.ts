import { toast } from '@breedhub/rxdb-store';

export type CrudVerb = 'create' | 'update' | 'delete';

const PAST_TENSE: Record<CrudVerb, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
};

export type CrudResult<T> = { ok: true; data: T } | { ok: false };

/**
 * Wrap a CRUD operation with consistent toast notifications.
 *
 * - Success: `${Label} created/updated/deleted`
 * - Failure: logs error and shows `err.message || Failed to ${verb} ${label}`
 *
 * Returns discriminated result so callers can branch on success/failure
 * even when the underlying operation returns void (e.g. delete).
 *
 * @example
 * const result = await withCrudToast(
 *   () => spaceStore.create(entityType, changes),
 *   { label: 'Pet', verb: 'create' }
 * );
 * if (result.ok) {
 *   // result.data is the created entity
 * }
 */
export async function withCrudToast<T>(
  operation: () => Promise<T>,
  options: { label: string; verb: CrudVerb }
): Promise<CrudResult<T>> {
  const { label, verb } = options;
  try {
    const data = await operation();
    toast.success(`${label} ${PAST_TENSE[verb]}`);
    return { ok: true, data };
  } catch (err: any) {
    console.error(`[crudToast] ${verb} failed for ${label}:`, err);
    toast.error(err?.message || `Failed to ${verb} ${label.toLowerCase()}`);
    return { ok: false };
  }
}

/**
 * Capitalize entityType for user-facing display.
 * Examples: "pet" → "Pet", "contact_in_pet" → "Contact in pet"
 */
export function entityLabel(entityType: string | undefined): string {
  if (!entityType) return 'Record';
  return entityType.charAt(0).toUpperCase() + entityType.slice(1).replace(/_/g, ' ');
}

/**
 * Build a labeled record name for toasts: `${Type} ${name}` (or just `${Type}` if no name).
 * Examples: "Pet Rex", "Breed Affenpinscher", "Pet" (when name unknown)
 */
export function entityRecordLabel(entityType: string | undefined, record: any): string {
  const type = entityLabel(entityType);
  const name = record?.name;
  return name ? `${type} ${name}` : type;
}
