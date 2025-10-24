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
 * Determine correct collection name and query approach
 * - If dataSource="collection" → use separate collection (e.g., breed)
 * - Otherwise → use dictionaries collection with table_name filter
 */
function getCollectionInfo(
  fieldConfig: FilterFieldConfig | undefined,
  rxdb: RxDatabase
): { collectionName: string; isDictionary: boolean; tableName?: string } | null {
  if (!fieldConfig?.referencedTable) {
    return null;
  }

  const dataSource = (fieldConfig as any).dataSource;

  // Check if this is a regular collection (not dictionary)
  if (dataSource === 'collection' && rxdb.collections[fieldConfig.referencedTable]) {
    return {
      collectionName: fieldConfig.referencedTable,
      isDictionary: false
    };
  }

  // Otherwise, it's a dictionary - use dictionaries collection
  if (rxdb.collections['dictionaries']) {
    return {
      collectionName: 'dictionaries',
      isDictionary: true,
      tableName: fieldConfig.referencedTable
    };
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
    const collectionInfo = getCollectionInfo(fieldConfig, rxdb);

    if (!collectionInfo) {
      console.warn(`[getLabelForValue] Collection not found: ${fieldConfig.referencedTable}`);
      return value; // Fallback
    }

    try {
      const collection = rxdb.collections[collectionInfo.collectionName];

      let doc;
      if (collectionInfo.isDictionary && collectionInfo.tableName) {
        // Query dictionaries collection with table_name filter
        doc = await collection.findOne({
          selector: {
            table_name: collectionInfo.tableName,
            [fieldConfig.referencedFieldID]: value
          }
        }).exec();
      } else {
        // Query regular collection
        doc = await collection.findOne({
          selector: { [fieldConfig.referencedFieldID]: value }
        }).exec();
      }

      if (doc) {
        const label = doc[fieldConfig.referencedFieldName];
        console.log('[getLabelForValue]', value, '→', label, `(from ${collectionInfo.isDictionary ? 'dictionary' : 'collection'})`);
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
    const collectionInfo = getCollectionInfo(fieldConfig, rxdb);

    if (!collectionInfo) {
      console.warn(`[getValueForLabel] Collection not found: ${fieldConfig.referencedTable}`);
      return null;
    }

    try {
      const collection = rxdb.collections[collectionInfo.collectionName];

      let docs;
      if (collectionInfo.isDictionary && collectionInfo.tableName) {
        // Query dictionaries collection with table_name filter
        docs = await collection.find({
          selector: {
            table_name: collectionInfo.tableName
          }
        }).exec();
      } else {
        // Query regular collection - get all docs
        docs = await collection.find().exec();
      }

      // Find by normalized label match
      const match = docs.find(doc =>
        normalizeForUrl(doc[fieldConfig.referencedFieldName]) === normalizedSearchLabel
      );

      if (match) {
        const matchId = match[fieldConfig.referencedFieldID];
        console.log('[getValueForLabel]', label, '→', matchId, `(from ${collectionInfo.isDictionary ? 'dictionary' : 'collection'})`);
        return matchId;
      }
    } catch (err) {
      console.error(`[getValueForLabel] Error fetching docs:`, err);
    }
  }

  // Not found
  return null;
}
