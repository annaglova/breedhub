import { findDocumentById } from "../utils/rxdb-document.helpers";
import type {
  TitleDictionaryEntry,
  TitleInPetRow,
} from "../utils/titles-display-builder";
import { recordMatchesPartition } from "./space-partition.helpers";

type DenormRecord = Record<string, unknown>;

interface TitleInPetChildRecord {
  additional?:
    | {
        title_id?: string | null;
        country_id?: string | null;
        amount?: number | null;
        date?: string | null;
        is_confirmed?: boolean | null;
        deleted?: boolean | null;
      }
    | null;
  deleted?: boolean | null;
}

export interface GuardedPartitionPatchCollection<TRecord> {
  findOne(id: string): {
    exec(): Promise<
      | {
          toJSON(): unknown;
          patch(patch: Partial<TRecord>): Promise<unknown>;
        }
      | null
    >;
  };
}

export interface GuardedPartitionPatchEntityStore<TRecord> {
  entityMap: { value: Map<string, unknown> };
  updateOne: (id: string, patch: Partial<TRecord>) => void;
}

export interface GuardedPartitionPatchOptions<
  TRecord extends DenormRecord,
> {
  id: string;
  patch: Partial<TRecord>;
  fieldName: string;
  partitionField: string;
  expectedPartitionId?: string | null;
  recordIdField: string;
  expectedPartitionField: string;
  cachedPartitionField: string;
  partitionEntityLabel: string;
  collection?: GuardedPartitionPatchCollection<TRecord>;
  entityStore?: GuardedPartitionPatchEntityStore<TRecord>;
}

export interface RebuildPetTitlesDisplayFlowOptions {
  petId: string;
  petBreedId?: string;
  loadTitleInPetRecords: (
    petId: string,
    petBreedId?: string,
  ) => Promise<TitleInPetChildRecord[]>;
  lookupTitleDictionary: (
    titleId: string,
  ) => Promise<TitleDictionaryEntry | null>;
  collection?: GuardedPartitionPatchCollection<DenormRecord>;
  entityStore?: GuardedPartitionPatchEntityStore<DenormRecord>;
}

function buildPartitionMismatchPayload(
  options: Pick<
    GuardedPartitionPatchOptions<DenormRecord>,
    "id" | "expectedPartitionId" | "recordIdField" | "expectedPartitionField"
  > & {
    cachedPartitionField: string;
    cachedPartitionId: unknown;
  },
): Record<string, unknown> {
  return {
    [options.recordIdField]: options.id,
    [options.expectedPartitionField]: options.expectedPartitionId,
    [options.cachedPartitionField]: options.cachedPartitionId,
  };
}

export async function applyPartitionGuardedPatch<
  TRecord extends DenormRecord,
>(options: GuardedPartitionPatchOptions<TRecord>): Promise<void> {
  if (options.collection) {
    const doc = await findDocumentById(
      options.collection as unknown as Parameters<typeof findDocumentById<TRecord>>[0],
      options.id,
    );

    if (doc) {
      const cachedRecord = doc.toJSON() as TRecord;
      const cachedPartitionId = cachedRecord[options.partitionField];

      if (
        recordMatchesPartition(
          cachedRecord,
          options.partitionField,
          options.expectedPartitionId,
        )
      ) {
        await doc.patch(options.patch);
      } else {
        console.warn(
          `[SpaceStore] Skipping ${options.fieldName} patch for mismatched ${options.partitionEntityLabel} partition`,
          buildPartitionMismatchPayload({
            id: options.id,
            expectedPartitionId: options.expectedPartitionId,
            recordIdField: options.recordIdField,
            expectedPartitionField: options.expectedPartitionField,
            cachedPartitionField: options.cachedPartitionField,
            cachedPartitionId,
          }),
        );
      }
    }
  }

  if (options.entityStore) {
    const cachedRecord = options.entityStore.entityMap.value.get(options.id) as
      | TRecord
      | undefined;
    const cachedPartitionId = cachedRecord?.[options.partitionField];

    if (
      recordMatchesPartition(
        cachedRecord,
        options.partitionField,
        options.expectedPartitionId,
      )
    ) {
      options.entityStore.updateOne(options.id, options.patch);
    } else if (cachedRecord) {
      console.warn(
        `[SpaceStore] Skipping ${options.fieldName} store update for mismatched ${options.partitionEntityLabel} partition`,
        buildPartitionMismatchPayload({
          id: options.id,
          expectedPartitionId: options.expectedPartitionId,
          recordIdField: options.recordIdField,
          expectedPartitionField: options.expectedPartitionField,
          cachedPartitionField: options.cachedPartitionField,
          cachedPartitionId,
        }),
      );
    }
  }
}

export async function rebuildPetTitlesDisplayFlow(
  options: RebuildPetTitlesDisplayFlowOptions,
): Promise<void> {
  const childRecords = await options.loadTitleInPetRecords(
    options.petId,
    options.petBreedId,
  );

  const titlesInPet = childRecords.reduce<TitleInPetRow[]>((records, record) => {
      const additional = record.additional ?? {};
      const titleId = additional.title_id;

      if (!titleId) {
        return records;
      }

      records.push({
        title_id: titleId,
        country_id: additional.country_id ?? null,
        amount: additional.amount ?? null,
        date: additional.date ?? null,
        is_confirmed: additional.is_confirmed ?? null,
        deleted: additional.deleted ?? record.deleted ?? null,
      });

      return records;
    }, []);

  const titleIds = Array.from(
    new Set(titlesInPet.map((record) => record.title_id)),
  );
  const titleLookup = new Map<string, TitleDictionaryEntry>();

  if (titleIds.length > 0) {
    const lookups = await Promise.all(
      titleIds.map((id) => options.lookupTitleDictionary(id)),
    );

    for (let i = 0; i < titleIds.length; i++) {
      const record = lookups[i];

      if (record) {
        titleLookup.set(titleIds[i], {
          name: record.name ?? null,
          rating: record.rating ?? null,
        });
      }
    }
  }

  const { buildTitlesDisplay } = await import("../utils/titles-display-builder");
  const titlesDisplay = buildTitlesDisplay(titlesInPet, titleLookup);

  await applyPartitionGuardedPatch({
    id: options.petId,
    patch: { titles_display: titlesDisplay },
    fieldName: "titles_display",
    partitionField: "breed_id",
    expectedPartitionId: options.petBreedId,
    recordIdField: "petId",
    expectedPartitionField: "expectedBreedId",
    cachedPartitionField: "cachedBreedId",
    partitionEntityLabel: "pet",
    collection: options.collection,
    entityStore: options.entityStore,
  });
}
