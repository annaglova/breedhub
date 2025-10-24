import type { RxDatabase } from 'rxdb';
import type { FilterFieldConfig } from '../filters/FiltersDialog';

/**
 * Normalize text for URL
 * "Long Hair Cat" → "long-hair-cat"
 * "Black & White" → "black-white"
 */
export function normalizeForUrl(text: string, maxLength = 50): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars (except hyphens and letters)
    .trim()
    .replace(/\s+/g, '-')      // Spaces → hyphens
    .replace(/-+/g, '-');       // Multiple hyphens → one

  return normalized.length > maxLength
    ? normalized.substring(0, maxLength)
    : normalized;
}

/**
 * Determine correct collection name (dictionary vs regular)
 */
function getCollectionName(
  referencedTable: string,
  rxdb: RxDatabase
): { collectionName: string; isDictionary: boolean } | null {
  const dictionaryName = `${referencedTable}_dictionary`;

  // Check dictionary first
  if (rxdb.collections[dictionaryName]) {
    return { collectionName: dictionaryName, isDictionary: true };
  }

  // Check regular collection
  if (rxdb.collections[referencedTable]) {
    return { collectionName: referencedTable, isDictionary: false };
  }

  // Not found
  return null;
}

/**
 * Get display label for filter value
 *
 * Priority:
 * 1. RxDB dictionary/collection lookup
 * 2. Fallback to ID
 */
export async function getLabelForValue(
  fieldConfig: FilterFieldConfig | undefined,
  value: string,
  rxdb: RxDatabase
): Promise<string> {
  if (!fieldConfig) {
    return value;
  }

  // Dynamic lookup (RxDB) - dictionaries or regular collections
  if (fieldConfig.referencedTable && fieldConfig.referencedFieldID && fieldConfig.referencedFieldName) {
    const collectionInfo = getCollectionName(fieldConfig.referencedTable, rxdb);

    if (!collectionInfo) {
      console.warn(`[getLabelForValue] Collection not found: ${fieldConfig.referencedTable}`);
      return value; // Fallback
    }

    try {
      const collection = rxdb.collections[collectionInfo.collectionName];
      const doc = await collection.findOne({
        selector: { [fieldConfig.referencedFieldID]: value }
      }).exec();

      if (doc) {
        const label = doc[fieldConfig.referencedFieldName];
        console.log('[getLabelForValue]', value, '→', label);
        return label || value;
      }
    } catch (err) {
      console.error(`[getLabelForValue] Error fetching doc:`, err);
    }
  }

  // Fallback
  return value;
}

/**
 * Find value (ID) by label
 * Supports normalized labels (e.g., "long-hair" matches "Long Hair")
 */
export async function getValueForLabel(
  fieldConfig: FilterFieldConfig | undefined,
  label: string,
  rxdb: RxDatabase
): Promise<string | null> {
  if (!fieldConfig) {
    return null;
  }

  const normalizedSearchLabel = normalizeForUrl(label);

  // Dynamic lookup (RxDB) - dictionaries or regular collections
  if (fieldConfig.referencedTable && fieldConfig.referencedFieldName) {
    const collectionInfo = getCollectionName(fieldConfig.referencedTable, rxdb);

    if (!collectionInfo) {
      console.warn(`[getValueForLabel] Collection not found: ${fieldConfig.referencedTable}`);
      return null;
    }

    try {
      const collection = rxdb.collections[collectionInfo.collectionName];

      // Get all documents and find by normalized label
      const docs = await collection.find().exec();
      const match = docs.find(doc =>
        normalizeForUrl(doc[fieldConfig.referencedFieldName]) === normalizedSearchLabel
      );

      if (match) {
        const matchId = match[fieldConfig.referencedFieldID];
        console.log('[getValueForLabel]', label, '→', matchId);
        return matchId;
      }
    } catch (err) {
      console.error(`[getValueForLabel] Error fetching docs:`, err);
    }
  }

  // Not found
  return null;
}
