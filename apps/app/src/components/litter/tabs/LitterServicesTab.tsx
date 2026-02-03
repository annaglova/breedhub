import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData, dictionaryStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  CalendarClock,
  Handshake,
  Loader2,
  PawPrint,
  ShoppingCart,
  Snowflake,
  VenusAndMars,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Service type with icon mapping
 */
interface LitterService {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  price?: number;
  currencyName?: string;
}

// Service type name → icon mapping
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "Pre reservation": <CalendarClock className="h-4 w-4" />,
  "Sale": <ShoppingCart className="h-4 w-4" />,
  "Mating": <VenusAndMars className="h-4 w-4" />,
  "Rent": <Handshake className="h-4 w-4" />,
  "Frozen sperm": <Snowflake className="h-4 w-4" />,
  "Children for sale": <PawPrint className="h-4 w-4" />,
};

// DataSource for litter services
const SERVICES_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_service_in_litter",
    parentField: "litter_id",
  },
};

// DataSource for children available for sale (uses VIEW with enriched data)
const CHILDREN_FOR_SALE_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "litter_child_for_sale_with_details",
    parentField: "litter_id",
  },
};

interface LitterServicesTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
}

/**
 * LitterServicesTab - Litter services and pets for sale
 *
 * Displays:
 * 1. Service cards (icon, service type, price)
 * 2. Children for sale cards (from VIEW)
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines what to load
 * 2. useTabData → TabDataService → SpaceStore → RxDB
 * 3. Component transforms raw data for UI rendering
 *
 * Based on Angular: litter-offers.component.ts
 */
export function LitterServicesTab({
  onLoadedCount,
  mode,
}: LitterServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const litterId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Quick check from JSONB: does litter have ANY services?
  const servicesJsonb = selectedEntity?.services as Record<string, string> | undefined;
  const hasAnyServices = servicesJsonb && Object.keys(servicesJsonb).length > 0;

  // Lookup maps state
  const [serviceTypesMap, setServiceTypesMap] = useState<Map<string, any>>(new Map());
  const [currencyMap, setCurrencyMap] = useState<Map<string, any>>(new Map());
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // Load services via useTabData
  const {
    data: servicesRaw,
    isLoading: servicesLoading,
    error: servicesError,
  } = useTabData({
    parentId: litterId,
    dataSource: SERVICES_DATASOURCE,
    enabled: !!litterId,
  });

  // Load children for sale via useTabData
  const {
    data: childrenForSaleRaw,
    isLoading: childrenForSaleLoading,
  } = useTabData({
    parentId: litterId,
    dataSource: CHILDREN_FOR_SALE_DATASOURCE,
    enabled: !!litterId,
  });

  // Load lookups by specific IDs from child records
  useEffect(() => {
    if (servicesLoading || !servicesRaw?.length) {
      setLookupsLoading(false);
      return;
    }

    async function loadLookupsByIds() {
      setLookupsLoading(true);

      try {
        // Ensure dictionaryStore is initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // Extract unique IDs from child records
        const serviceTypeIds = new Set<string>();
        const currencyIds = new Set<string>();

        servicesRaw?.forEach((item: any) => {
          const serviceTypeId = item.additional?.service_type_id || item.service_type_id;
          const currencyId = item.additional?.currency_id || item.currency_id;
          if (serviceTypeId) serviceTypeIds.add(serviceTypeId);
          if (currencyId) currencyIds.add(currencyId);
        });

        // Load only needed records in parallel
        const lookupPromises: Promise<[string, string, any]>[] = [];

        serviceTypeIds.forEach((id) => {
          lookupPromises.push(
            dictionaryStore
              .getRecordById("pet_service", id)
              .then((record) => ["serviceType", id, record] as [string, string, any])
          );
        });

        currencyIds.forEach((id) => {
          lookupPromises.push(
            dictionaryStore
              .getRecordById("currency", id)
              .then((record) => ["currency", id, record] as [string, string, any])
          );
        });

        const results = await Promise.all(lookupPromises);

        // Build maps from results
        const newServiceTypesMap = new Map<string, any>();
        const newCurrencyMap = new Map<string, any>();

        results.forEach(([type, id, record]) => {
          if (!record) return;
          if (type === "serviceType") newServiceTypesMap.set(id, record);
          else if (type === "currency") newCurrencyMap.set(id, record);
        });

        setServiceTypesMap(newServiceTypesMap);
        setCurrencyMap(newCurrencyMap);
      } catch (error) {
        console.error("[LitterServicesTab] Failed to load lookups:", error);
      } finally {
        setLookupsLoading(false);
      }
    }

    loadLookupsByIds();
  }, [servicesRaw, servicesLoading]);

  // Transform raw services data to UI format
  const services = useMemo<LitterService[]>(() => {
    if (!servicesRaw || servicesRaw.length === 0 || lookupsLoading) return [];

    return servicesRaw.map((item: any) => {
      const serviceTypeId = item.additional?.service_type_id || item.service_type_id;
      const currencyId = item.additional?.currency_id || item.currency_id;
      const serviceType = serviceTypesMap.get(serviceTypeId);
      const currency = currencyMap.get(currencyId);

      return {
        id: item.id,
        serviceTypeId,
        serviceTypeName: serviceType?.name || "Unknown",
        price: item.additional?.price ?? item.price,
        currencyName: currency?.name || "",
      };
    });
  }, [servicesRaw, serviceTypesMap, currencyMap, lookupsLoading]);

  // Transform children for sale to Pet format for PetCard
  const childrenForSale = useMemo<Pet[]>(() => {
    if (!childrenForSaleRaw || childrenForSaleRaw.length === 0) return [];

    return childrenForSaleRaw.map((item: any) => {
      const id = item.id || item.additional?.id;
      const slug = item.slug || item.additional?.slug;
      return {
        id,
        name: item.name || item.additional?.name || "Unknown",
        avatarUrl: item.avatar_url || item.additional?.avatar_url || "",
        url: slug ? `/${slug}` : `/pet/${id}`,
        sex: item.sex_code || item.additional?.sex_code,
        dateOfBirth: item.date_of_birth || item.additional?.date_of_birth,
      };
    });
  }, [childrenForSaleRaw]);

  const isLoading = servicesLoading || childrenForSaleLoading || lookupsLoading;

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(services.length + childrenForSale.length);
    }
  }, [isLoading, onLoadedCount, services.length, childrenForSale.length]);

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading services...</span>
      </div>
    );
  }

  // Error state
  if (servicesError) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load services</p>
          <p className="text-red-600 text-sm mt-1">{servicesError.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (services.length === 0 && childrenForSale.length === 0) {
    return (
      <div className="py-4 px-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <p className="text-slate-600">No services available for this litter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col space-y-8 px-6 cursor-default">
      {/* Services grid */}
      {services.length > 0 && (
        <div
          className={cn(
            "grid gap-3",
            isFullscreen ? "grid-cols-2" : "grid-cols-1"
          )}
        >
          {services.map((service) => (
            <div
              key={service.id}
              className="card card-rounded flex items-center space-x-5 p-6 lg:px-8 bg-even-card-ground"
            >
              <span className="text-secondary-400">
                {SERVICE_ICONS[service.serviceTypeName] || (
                  <ShoppingCart className="h-4 w-4" />
                )}
              </span>
              <span className="font-bold">{service.serviceTypeName}</span>
              <div className="flex space-x-2 ml-auto">
                <span>Price:</span>
                {service.price && service.price > 0 ? (
                  <>
                    <span className="font-semibold">{service.price}</span>
                    <span>{service.currencyName}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">is not specified</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Children for sale */}
      {childrenForSale.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <PawPrint className="h-4 w-4 text-secondary-400" />
            <span className="font-bold">Puppies for sale</span>
          </div>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2",
              isFullscreen ? "lg:grid-cols-3 xxl:grid-cols-4" : ""
            )}
          >
            {childrenForSale.map((pet) => (
              <PetCard key={pet.id} pet={pet} mode="litter" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
