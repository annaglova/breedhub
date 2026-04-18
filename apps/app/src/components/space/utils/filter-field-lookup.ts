import type { RxDatabase } from "rxdb";
import { supabase } from "@breedhub/rxdb-store";
import type { FilterFieldConfig } from "../filters/FiltersDialog";
import { normalizeForUrl } from "./url-formatting";

interface CollectionInfo {
  collectionName: string;
  isDictionary: boolean;
  tableName?: string;
}

function getCollectionInfo(
  fieldConfig: FilterFieldConfig | undefined,
  rxdb: RxDatabase,
): CollectionInfo | null {
  if (!fieldConfig?.referencedTable) {
    return null;
  }

  const dataSource = (fieldConfig as any).dataSource;

  if (
    dataSource === "collection" &&
    rxdb.collections[fieldConfig.referencedTable]
  ) {
    return {
      collectionName: fieldConfig.referencedTable,
      isDictionary: false,
    };
  }

  if (rxdb.collections.dictionaries) {
    return {
      collectionName: "dictionaries",
      isDictionary: true,
      tableName: fieldConfig.referencedTable,
    };
  }

  return null;
}

async function getCollectionCount(
  collection: any,
  collectionInfo: CollectionInfo,
): Promise<number> {
  if (collectionInfo.isDictionary && collectionInfo.tableName) {
    return collection.count({
      selector: { table_name: collectionInfo.tableName },
    }).exec();
  }

  return collection.count().exec();
}

async function findLookupDoc(
  collection: any,
  collectionInfo: CollectionInfo,
  idField: string,
  value: string,
) {
  if (collectionInfo.isDictionary && collectionInfo.tableName) {
    return collection.findOne({
      selector: {
        table_name: collectionInfo.tableName,
        [idField]: value,
      },
    }).exec();
  }

  return collection.findOne({
    selector: { [idField]: value },
  }).exec();
}

async function findLookupDocs(collection: any, collectionInfo: CollectionInfo) {
  if (collectionInfo.isDictionary && collectionInfo.tableName) {
    return collection.find({
      selector: { table_name: collectionInfo.tableName },
    }).exec();
  }

  return collection.find().exec();
}

async function cacheInRxDB(
  rxdb: RxDatabase,
  fieldConfig: FilterFieldConfig,
  record: any,
): Promise<void> {
  try {
    const tableName = fieldConfig.referencedTable;
    if (!tableName) {
      return;
    }

    const hasDedicatedCollection = !!rxdb.collections[tableName];
    const collectionName = hasDedicatedCollection ? tableName : "dictionaries";

    if (!rxdb.collections[collectionName]) {
      return;
    }

    const collection = rxdb.collections[collectionName];
    let rxdbRecord: any;

    if (!hasDedicatedCollection) {
      rxdbRecord = {
        id: record.id,
        name: record.name,
        table_name: tableName,
        cachedAt: Date.now(),
        _deleted: false,
      };
    } else {
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
    console.warn("[cacheInRxDB] Failed to cache:", err);
  }
}

export async function getLabelForValue(
  fieldConfig: FilterFieldConfig | undefined,
  value: string,
  rxdb: RxDatabase,
): Promise<string> {
  if (
    !fieldConfig?.referencedTable ||
    !fieldConfig.referencedFieldID ||
    !fieldConfig.referencedFieldName
  ) {
    return value;
  }

  const idField = fieldConfig.referencedFieldID;
  const nameField = fieldConfig.referencedFieldName;
  const collectionInfo = getCollectionInfo(fieldConfig, rxdb);

  if (collectionInfo) {
    try {
      const collection = rxdb.collections[collectionInfo.collectionName];
      const doc = await findLookupDoc(collection, collectionInfo, idField, value);

      if (doc) {
        return doc[nameField] || value;
      }

      const count = await getCollectionCount(collection, collectionInfo);
      if (count > 0) {
        return value;
      }
    } catch (err) {
      console.warn("[getLabelForValue] RxDB error:", err);
    }
  }

  try {
    const { data, error } = await supabase
      .from(fieldConfig.referencedTable)
      .select("*")
      .eq(idField, value)
      .single();

    if (error || !data) {
      return value;
    }

    const label = data[nameField];
    await cacheInRxDB(rxdb, fieldConfig, data);
    return label || value;
  } catch (err) {
    console.warn("[getLabelForValue] Supabase fallback error:", err);
    return value;
  }
}

export async function getValueForLabel(
  fieldConfig: FilterFieldConfig | undefined,
  label: string,
  rxdb: RxDatabase,
): Promise<string | null> {
  if (
    !fieldConfig?.referencedTable ||
    !fieldConfig.referencedFieldName ||
    !fieldConfig.referencedFieldID
  ) {
    return null;
  }

  const normalizedSearchLabel = normalizeForUrl(label);
  const idField = fieldConfig.referencedFieldID;
  const nameField = fieldConfig.referencedFieldName;
  const collectionInfo = getCollectionInfo(fieldConfig, rxdb);

  if (collectionInfo) {
    try {
      const collection = rxdb.collections[collectionInfo.collectionName];
      const docs = await findLookupDocs(collection, collectionInfo);

      const match = docs.find(
        (doc: any) => normalizeForUrl(doc[nameField]) === normalizedSearchLabel,
      );

      if (match) {
        return match[idField];
      }

      if (docs.length > 0) {
        return null;
      }
    } catch (err) {
      console.warn("[getValueForLabel] RxDB error:", err);
    }
  }

  try {
    const { data, error } = await supabase
      .from(fieldConfig.referencedTable)
      .select("*")
      .ilike(nameField, label);

    if (error || !data || data.length === 0) {
      return null;
    }

    const match = data.find(
      (item: any) => normalizeForUrl(item[nameField]) === normalizedSearchLabel,
    );

    if (!match) {
      return null;
    }

    await cacheInRxDB(rxdb, fieldConfig, match);
    return match[idField];
  } catch (err) {
    console.warn("[getValueForLabel] Supabase fallback error:", err);
    return null;
  }
}
