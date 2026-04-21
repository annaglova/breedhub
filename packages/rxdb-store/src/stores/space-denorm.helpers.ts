import { findDocumentById } from "../utils/rxdb-document.helpers";
import { recordMatchesPartition } from "./space-partition.helpers";

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
  TRecord extends Record<string, any>,
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
  loadTitleInPetRecords: (petId: string, petBreedId?: string) => Promise<any[]>;
  lookupTitleDictionary: (
    titleId: string,
  ) => Promise<{ name?: string | null; rating?: number | string | null } | null>;
  collection?: GuardedPartitionPatchCollection<Record<string, any>>;
  entityStore?: GuardedPartitionPatchEntityStore<Record<string, any>>;
}

function buildPartitionMismatchPayload(
  options: Pick<
    GuardedPartitionPatchOptions<Record<string, any>>,
    "id" | "expectedPartitionId" | "recordIdField" | "expectedPartitionField"
  > & {
    cachedPartitionField: string;
    cachedPartitionId: any;
  },
): Record<string, any> {
  return {
    [options.recordIdField]: options.id,
    [options.expectedPartitionField]: options.expectedPartitionId,
    [options.cachedPartitionField]: options.cachedPartitionId,
  };
}

export async function applyPartitionGuardedPatch<
  TRecord extends Record<string, any>,
>(options: GuardedPartitionPatchOptions<TRecord>): Promise<void> {
  if (options.collection) {
    const doc = await findDocumentById(options.collection as any, options.id);

    if (doc) {
      const cachedRecord = doc.toJSON() as Record<string, any>;
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
      | Record<string, any>
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

  const titlesInPet = childRecords
    .map((record: any) => {
      const additional = record.additional || {};

      return {
        title_id: additional.title_id,
        country_id: additional.country_id ?? null,
        amount: additional.amount ?? null,
        date: additional.date ?? null,
        is_confirmed: additional.is_confirmed ?? null,
        deleted: additional.deleted ?? record.deleted ?? null,
      };
    })
    .filter((record) => !!record.title_id);

  const titleIds = Array.from(
    new Set(titlesInPet.map((record) => record.title_id as string)),
  );
  const titleLookup = new Map<
    string,
    { name?: string | null; rating?: number | string | null }
  >();

  if (titleIds.length > 0) {
    const lookups = await Promise.all(
      titleIds.map((id) => options.lookupTitleDictionary(id)),
    );

    for (let i = 0; i < titleIds.length; i++) {
      const record = lookups[i];

      if (record) {
        titleLookup.set(titleIds[i], {
          name: record.name as string | null,
          rating: record.rating as number | string | null,
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
