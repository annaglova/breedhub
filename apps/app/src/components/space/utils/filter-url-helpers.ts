import type { RxDatabase } from 'rxdb';
import type { FilterFieldConfig } from '../filters/FiltersDialog';
import { supabase } from '@breedhub/rxdb-store';

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
 * 2. Supabase fallback (if RxDB empty) + cache result in RxDB
 * 3. Fallback to raw ID
 */
export async function getLabelForValue(
  fieldConfig: FilterFieldConfig | undefined,
  value: string,
  rxdb: RxDatabase
): Promise<string> {
  if (!fieldConfig) {
    return value;
  }

  if (!fieldConfig.referencedTable || !fieldConfig.referencedFieldID || !fieldConfig.referencedFieldName) {
    return value;
  }

  // 1. Try RxDB lookup first
  const collectionInfo = getCollectionInfo(fieldConfig, rxdb);

  if (collectionInfo) {
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
        return doc[fieldConfig.referencedFieldName] || value;
      }

      // Check if collection has data for this specific table
      // For dictionaries - check count with table_name filter
      // For regular collections - check total count
      let count = 0;
      if (collectionInfo.isDictionary && collectionInfo.tableName) {
        count = await collection.count({
          selector: { table_name: collectionInfo.tableName }
        }).exec();
      } else {
        count = await collection.count().exec();
      }

      // If collection has data but item not found - it doesn't exist
      if (count > 0) {
        return value;
      }
    } catch (err) {
      console.warn('[getLabelForValue] RxDB error:', err);
    }
  }

  // 2. Supabase fallback (RxDB empty or collection not found)
  try {
    const tableName = fieldConfig.referencedTable;
    const idField = fieldConfig.referencedFieldID || 'id';
    const nameField = fieldConfig.referencedFieldName || 'name';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq(idField, value)
      .single();

    if (error || !data) {
      return value;
    }

    const label = data[nameField];

    // 3. Cache in RxDB for future lookups
    await cacheInRxDB(rxdb, fieldConfig, data);

    return label || value;
  } catch (err) {
    console.warn('[getLabelForValue] Supabase fallback error:', err);
    return value;
  }
}

/**
 * Find value (ID) by label
 * Supports normalized labels (e.g., "long-hair" matches "Long Hair")
 *
 * Priority:
 * 1. RxDB lookup (fast, local)
 * 2. Supabase fallback (if RxDB empty) + cache result in RxDB
 */
export async function getValueForLabel(
  fieldConfig: FilterFieldConfig | undefined,
  label: string,
  rxdb: RxDatabase
): Promise<string | null> {
  if (!fieldConfig) {
    return null;
  }

  if (!fieldConfig.referencedTable || !fieldConfig.referencedFieldName || !fieldConfig.referencedFieldID) {
    return null;
  }

  const normalizedSearchLabel = normalizeForUrl(label);
  const idField = fieldConfig.referencedFieldID;
  const nameField = fieldConfig.referencedFieldName;

  // 1. Try RxDB lookup first
  const collectionInfo = getCollectionInfo(fieldConfig, rxdb);

  if (collectionInfo) {
    try {
      const collection = rxdb.collections[collectionInfo.collectionName];

      let docs;
      if (collectionInfo.isDictionary && collectionInfo.tableName) {
        docs = await collection.find({
          selector: { table_name: collectionInfo.tableName }
        }).exec();
      } else {
        docs = await collection.find().exec();
      }

      // Find by normalized label match
      const match = docs.find((doc: any) =>
        normalizeForUrl(doc[nameField]) === normalizedSearchLabel
      );

      if (match) {
        return match[idField];
      }

      // If RxDB has docs but no match, don't fallback (item doesn't exist)
      if (docs.length > 0) {
        return null;
      }
    } catch (err) {
      console.warn('[getValueForLabel] RxDB error:', err);
    }
  }

  // 2. Supabase fallback (RxDB empty or collection not found)
  try {
    const tableName = fieldConfig.referencedTable;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .ilike(nameField, label);

    if (error || !data || data.length === 0) {
      return null;
    }

    // Find by normalized label match (same logic as RxDB)
    const match = data.find((item: any) =>
      normalizeForUrl(item[nameField]) === normalizedSearchLabel
    );

    if (!match) {
      return null;
    }

    const matchId = match[idField];

    // 3. Cache in RxDB for future lookups
    await cacheInRxDB(rxdb, fieldConfig, match);

    return matchId;
  } catch (err) {
    console.warn('[getValueForLabel] Supabase fallback error:', err);
    return null;
  }
}

/**
 * Cache Supabase result in RxDB for future lookups
 *
 * Logic:
 * 1. If collection with referencedTable name exists → cache there (filter fields by schema)
 * 2. Otherwise → cache in 'dictionaries' collection with table_name field
 */
async function cacheInRxDB(
  rxdb: RxDatabase,
  fieldConfig: FilterFieldConfig,
  record: any
): Promise<void> {
  try {
    const tableName = fieldConfig.referencedTable;
    if (!tableName) {
      return;
    }

    // Check if dedicated collection exists (e.g., 'breed', 'pet')
    const hasDedicatedCollection = !!rxdb.collections[tableName];
    const collectionName = hasDedicatedCollection ? tableName : 'dictionaries';

    if (!rxdb.collections[collectionName]) {
      return;
    }

    const collection = rxdb.collections[collectionName];

    // Prepare record for RxDB
    let rxdbRecord: any;

    if (!hasDedicatedCollection) {
      // For dictionaries collection - needs specific schema fields
      rxdbRecord = {
        id: record.id,
        name: record.name,
        table_name: tableName,
        cachedAt: Date.now(),
        _deleted: false,
      };
    } else {
      // For dedicated collections - filter to only allowed schema properties
      const schema = collection.schema.jsonSchema;
      const allowedProps = new Set(Object.keys(schema.properties || {}));

      rxdbRecord = { _deleted: false };
      for (const key of Object.keys(record)) {
        if (allowedProps.has(key)) {
          rxdbRecord[key] = record[key];
        }
      }
      if (!rxdbRecord.updated_at) {
        rxdbRecord.updated_at = new Date().toISOString();
      }
    }

    await collection.upsert(rxdbRecord);
  } catch (err) {
    // Don't fail if caching fails - it's just an optimization
    console.warn('[cacheInRxDB] Failed to cache:', err);
  }
}
