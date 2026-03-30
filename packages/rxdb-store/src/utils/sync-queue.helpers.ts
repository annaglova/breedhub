/**
 * Helper functions for sync queue payload transformation.
 * Extracted from EntityReplicationService push handlers.
 */

/**
 * Transform RxDB entity document to Supabase-ready payload.
 * Same logic as EntityReplicationService.mapRxDBToSupabase().
 */
export function buildEntityPayload(rxdbDoc: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  const rxdbOnlyFields = new Set(['cachedAt']);

  for (const key in rxdbDoc) {
    if (key === '_deleted') {
      mapped.deleted = rxdbDoc._deleted || false;
    } else if (!key.startsWith('_') && !rxdbOnlyFields.has(key)) {
      mapped[key] = rxdbDoc[key];
    }
  }

  // Ensure timestamps
  if (!mapped.updated_at) {
    mapped.updated_at = new Date().toISOString();
  }
  if (!mapped.created_at) {
    mapped.created_at = mapped.updated_at;
  }

  return mapped;
}

/**
 * Transform RxDB child document to flat Supabase-ready payload.
 * Unpacks universal schema: {id, parentId, additional} → {id, breed_id, field1, field2, ...}
 * Same logic as EntityReplicationService child push handler.
 */
export function buildChildPayload(
  childDoc: Record<string, any>,
  entityType: string,
  partitionConfig?: { keyField: string; childFilterField: string }
): Record<string, any> {
  const parentIdField = `${entityType}_id`;
  const additional = childDoc.additional || {};

  const supabaseRow: Record<string, any> = {
    id: childDoc.id,
    [parentIdField]: childDoc.parentId,
    ...additional,
    ...(childDoc.created_at && { created_at: childDoc.created_at }),
    ...(childDoc.created_by && { created_by: childDoc.created_by }),
    ...(childDoc.updated_by && { updated_by: childDoc.updated_by }),
    updated_at: childDoc.updated_at || new Date().toISOString(),
  };

  // Add partition field for partitioned entities (e.g., pet → breed_id)
  if (childDoc.partitionId && partitionConfig) {
    supabaseRow[partitionConfig.childFilterField] = childDoc.partitionId;
  }

  return supabaseRow;
}

/**
 * Get onConflict string for Supabase upsert.
 * Partitioned tables need composite key: 'id,breed_id'.
 */
export function getOnConflict(entityType: string, partitionKey?: string): string {
  return partitionKey ? `id,${partitionKey}` : 'id';
}
