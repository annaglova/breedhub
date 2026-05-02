import type { RxDatabase } from "rxdb";
import { dictionaryStore } from "@breedhub/rxdb-store";
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

  // Local-first miss → route through dictionaryStore so the lookup gets the
  // in-flight Promise dedup and write-through caching every other UI path
  // already enjoys. Direct supabase.from() here used to bypass both.
  try {
    const record = await dictionaryStore.getRecordById(
      fieldConfig.referencedTable,
      value,
      { idField, nameField },
    );
    if (!record) {
      return value;
    }
    const label = (record as Record<string, unknown>)[nameField];
    return typeof label === "string" && label ? label : value;
  } catch (err) {
    console.warn("[getLabelForValue] dictionaryStore fallback error:", err);
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

  // Local-first miss → query through dictionaryStore.getDictionary so the
  // search hits the in-flight dedup + RxDB write-through, instead of bypassing
  // both with a direct supabase.from() call.
  try {
    const { records } = await dictionaryStore.getDictionary(
      fieldConfig.referencedTable,
      { search: label, nameField, idField, limit: 30 },
    );
    if (records.length === 0) {
      return null;
    }
    const match = records.find(
      (item: Record<string, unknown>) =>
        normalizeForUrl(String(item[nameField] ?? item.name ?? "")) ===
        normalizedSearchLabel,
    );
    if (!match) {
      return null;
    }
    return String(
      (match as Record<string, unknown>)[idField] ?? (match as { id: string }).id,
    );
  } catch (err) {
    console.warn("[getValueForLabel] dictionaryStore fallback error:", err);
    return null;
  }
}
