import { dictionaryStore } from "@breedhub/rxdb-store";
import { useEffect, useState } from "react";
import type { UnitInfo, UnitsByType } from "@/utils/format-measurement";

interface MeasurementUnitsResult {
  unitsByType: UnitsByType;
  loading: boolean;
}

/**
 * Loads `unit` and `unit_by_measurement_type` from DictionaryStore and joins
 * them into the shape `formatMeasurement` and `toBase` expect.
 *
 * The two tables are tiny (≤ 30 active rows total) — no pagination, single
 * fetch. DictionaryStore caches in RxDB, so subsequent mounts are free.
 */
export function useMeasurementUnits(): MeasurementUnitsResult {
  const [unitsByType, setUnitsByType] = useState<UnitsByType>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [unitsRes, mappingsRes] = await Promise.all([
          dictionaryStore.getDictionary("unit", { limit: 100 }),
          dictionaryStore.getDictionary("unit_by_measurement_type", {
            limit: 100,
            additionalFields: [
              "unit_id",
              "measurement_type_id",
              "factor_to_base",
              "is_base",
            ],
          }),
        ]);
        if (cancelled) return;

        const unitsById = new Map<string, { id: string; name: string }>();
        for (const u of unitsRes.records) {
          const id = u.id as string;
          if (!id) continue;
          unitsById.set(id, { id, name: String(u.name ?? "") });
        }

        const result: UnitsByType = {};
        for (const m of mappingsRes.records) {
          const additional = (m as { additional?: Record<string, unknown> }).additional ?? {};
          const unitId = additional.unit_id as string | undefined;
          const typeId = additional.measurement_type_id as string | undefined;
          if (!unitId || !typeId) continue;

          const unit = unitsById.get(unitId);
          if (!unit) continue;

          const info: UnitInfo = {
            id: unit.id,
            name: unit.name,
            factor_to_base: Number(additional.factor_to_base ?? 1),
            is_base: Boolean(additional.is_base),
          };

          if (!result[typeId]) result[typeId] = [];
          result[typeId].push(info);
        }

        setUnitsByType(result);
      } catch (err) {
        console.error("[useMeasurementUnits] Failed to load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { unitsByType, loading };
}
