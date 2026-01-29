import { LitterCard, LitterData } from "@/components/shared/LitterCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData, dictionaryStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Badge } from "@ui/components/badge";
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
interface PetService {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  iconName: string;
  price?: number;
  currencyName?: string;
  order: number;
}

/**
 * Service feature (chip)
 */
interface ServiceFeature {
  id: string;
  name: string;
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

// Default dataSource configs for services (using base tables + client-side dictionary merge)
const DEFAULT_SERVICES_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_service_in_pet",
    parentField: "pet_id",
  },
};

const DEFAULT_FEATURES_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_service_feature_in_pet",
    parentField: "pet_id",
  },
};

// DataSource for children available for sale (uses VIEW with enriched data)
const CHILDREN_FOR_SALE_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_child_for_sale_with_details",
    parentField: "pet_id",
  },
};

interface PetServicesTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
  featuresDataSource?: DataSourceConfig;
}

/**
 * PetServicesTab - Pet services and offers
 *
 * Displays:
 * 1. Children available for sale (if any) - using same LitterCard as PetChildrenTab
 * 2. Service cards (Sale, Mating, Rent, Frozen sperm)
 * 3. Service features as chips
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines what to load
 * 2. useTabData → TabDataService → SpaceStore → RxDB
 * 3. Component transforms raw data for UI rendering
 *
 * Based on Angular: pet-services.component.ts
 */
export function PetServicesTab({
  onLoadedCount,
  dataSource,
  featuresDataSource,
}: PetServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const petId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Lookup maps state - populated after child records load
  const [serviceTypesMap, setServiceTypesMap] = useState<Map<string, any>>(new Map());
  const [currencyMap, setCurrencyMap] = useState<Map<string, any>>(new Map());
  const [featuresMap, setFeaturesMap] = useState<Map<string, any>>(new Map());
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // Load services via useTabData
  const {
    data: servicesRaw,
    isLoading: servicesLoading,
    error: servicesError
  } = useTabData({
    parentId: petId,
    dataSource: dataSource || DEFAULT_SERVICES_DATASOURCE,
    enabled: !!petId,
  });

  // Load features via useTabData
  const {
    data: featuresRaw,
    isLoading: featuresLoading,
  } = useTabData({
    parentId: petId,
    dataSource: featuresDataSource || DEFAULT_FEATURES_DATASOURCE,
    enabled: !!petId,
  });

  // Load children for sale via useTabData (uses VIEW with enriched data)
  const {
    data: childrenForSaleRaw,
    isLoading: childrenForSaleLoading,
  } = useTabData({
    parentId: petId,
    dataSource: CHILDREN_FOR_SALE_DATASOURCE,
    enabled: !!petId,
  });

  // Load lookups by specific IDs from child records (not entire dictionaries)
  useEffect(() => {
    if (servicesLoading || featuresLoading) return;
    if (!servicesRaw?.length && !featuresRaw?.length) {
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
        const featureIds = new Set<string>();

        servicesRaw?.forEach((item: any) => {
          const serviceTypeId = item.additional?.service_type_id || item.service_type_id;
          const currencyId = item.additional?.currency_id || item.currency_id;
          if (serviceTypeId) serviceTypeIds.add(serviceTypeId);
          if (currencyId) currencyIds.add(currencyId);
        });

        featuresRaw?.forEach((item: any) => {
          const featureId = item.additional?.pet_service_feature_id || item.pet_service_feature_id;
          if (featureId) featureIds.add(featureId);
        });

        // Load only needed records in parallel
        const lookupPromises: Promise<[string, string, any]>[] = [];

        serviceTypeIds.forEach(id => {
          lookupPromises.push(
            dictionaryStore.getRecordById("pet_service", id)
              .then(record => ["serviceType", id, record] as [string, string, any])
          );
        });

        currencyIds.forEach(id => {
          lookupPromises.push(
            dictionaryStore.getRecordById("currency", id)
              .then(record => ["currency", id, record] as [string, string, any])
          );
        });

        featureIds.forEach(id => {
          lookupPromises.push(
            dictionaryStore.getRecordById("pet_service_feature", id)
              .then(record => ["feature", id, record] as [string, string, any])
          );
        });

        const results = await Promise.all(lookupPromises);

        // Build maps from results
        const newServiceTypesMap = new Map<string, any>();
        const newCurrencyMap = new Map<string, any>();
        const newFeaturesMap = new Map<string, any>();

        results.forEach(([type, id, record]) => {
          if (!record) return;
          if (type === "serviceType") newServiceTypesMap.set(id, record);
          else if (type === "currency") newCurrencyMap.set(id, record);
          else if (type === "feature") newFeaturesMap.set(id, record);
        });

        setServiceTypesMap(newServiceTypesMap);
        setCurrencyMap(newCurrencyMap);
        setFeaturesMap(newFeaturesMap);
      } catch (error) {
        console.error("[PetServicesTab] Failed to load lookups:", error);
      } finally {
        setLookupsLoading(false);
      }
    }

    loadLookupsByIds();
  }, [servicesRaw, featuresRaw, servicesLoading, featuresLoading]);

  // Transform raw services data to UI format with dictionary merge
  // Filter out "Children for sale" - it's displayed separately with actual children cards
  const services = useMemo<PetService[]>(() => {
    if (!servicesRaw || servicesRaw.length === 0 || lookupsLoading) return [];

    return servicesRaw
      .map((item: any, index: number) => {
        const serviceTypeId = item.additional?.service_type_id || item.service_type_id;
        const currencyId = item.additional?.currency_id || item.currency_id;
        const serviceType = serviceTypesMap.get(serviceTypeId);
        const currency = currencyMap.get(currencyId);

        return {
          id: item.id,
          serviceTypeId,
          serviceTypeName: serviceType?.name || "Unknown",
          iconName: serviceType?.name || "sale",
          price: item.additional?.price ?? item.price,
          currencyName: currency?.name || currency?.additional?.name || "",
          order: index + 1,
        };
      })
      .filter((service) => service.serviceTypeName.toLowerCase() !== "children for sale");
  }, [servicesRaw, serviceTypesMap, currencyMap, lookupsLoading]);

  // Check if pet has "Children for sale" service enabled
  const hasChildrenForSaleService = useMemo(() => {
    if (!servicesRaw || servicesRaw.length === 0 || lookupsLoading) return false;
    return servicesRaw.some((item: any) => {
      const serviceTypeId = item.additional?.service_type_id || item.service_type_id;
      const serviceType = serviceTypesMap.get(serviceTypeId);
      return serviceType?.name?.toLowerCase() === "children for sale";
    });
  }, [servicesRaw, serviceTypesMap, lookupsLoading]);

  // Transform raw features data to UI format with dictionary merge
  const features = useMemo<ServiceFeature[]>(() => {
    if (!featuresRaw || featuresRaw.length === 0 || lookupsLoading) return [];

    return featuresRaw.map((item: any) => {
      const featureId = item.additional?.pet_service_feature_id || item.pet_service_feature_id;
      const feature = featuresMap.get(featureId);

      return {
        id: item.id,
        name: feature?.name || "Unknown",
      };
    });
  }, [featuresRaw, featuresMap, lookupsLoading]);

  // Group children for sale into litters (same logic as PetChildrenTab)
  const { littersForSale, parentRoleForSale } = useMemo(() => {
    if (!childrenForSaleRaw || childrenForSaleRaw.length === 0) {
      return { littersForSale: [], parentRoleForSale: null };
    }

    // Get parent role from first child (should be same for all)
    const firstChild = childrenForSaleRaw[0];
    const parentRole = firstChild?.parent_role || firstChild?.additional?.parent_role || null;

    // Group by date + other_parent_id
    const grouped = new Map<string, LitterData>();

    for (const item of childrenForSaleRaw) {
      const child = {
        id: item.id,
        name: item.name || item.additional?.name || "",
        slug: item.slug || item.additional?.slug,
        date_of_birth: item.date_of_birth || item.additional?.date_of_birth,
        sex_code: item.sex_code || item.additional?.sex_code,
        sex_name: item.sex_name || item.additional?.sex_name,
        other_parent_id: item.other_parent_id || item.additional?.other_parent_id,
        other_parent_name: item.other_parent_name || item.additional?.other_parent_name,
        other_parent_slug: item.other_parent_slug || item.additional?.other_parent_slug,
      };

      const key = `${child.date_of_birth || "unknown"}:${child.other_parent_id || "unknown"}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: child.date_of_birth || "",
          anotherParent: {
            name: child.other_parent_name,
            url: child.other_parent_slug,
          },
          pets: [],
        });
      }

      grouped.get(key)!.pets.push({
        id: child.id,
        name: child.name,
        url: child.slug,
        sex: {
          code: child.sex_code,
          name: child.sex_name,
        },
        availableForSale: true, // All children in this section are for sale
      });
    }

    // Sort litters by date (newest first)
    const litters = Array.from(grouped.values()).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Sort pets within each litter (males first)
    litters.forEach((litter) => {
      litter.pets.sort((a, b) => (b.sex?.code === "male" ? 1 : -1));
    });

    return { littersForSale: litters, parentRoleForSale: parentRole };
  }, [childrenForSaleRaw]);

  // Determine label for the other parent based on current pet's role
  const anotherParentRole = parentRoleForSale === "father" ? "Mother" : "Father";

  const isLoading = servicesLoading || featuresLoading || lookupsLoading || childrenForSaleLoading;

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(services.length);
    }
  }, [isLoading, onLoadedCount, services.length]);

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
  if (services.length === 0 && features.length === 0 && littersForSale.length === 0) {
    return (
      <div className="py-4 px-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <p className="text-slate-600">No services available for this pet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 px-6 cursor-default">
      {/* Children available for sale - using same LitterCard as PetChildrenTab */}
      {littersForSale.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <PawPrint className="h-4 w-4 text-secondary-400" />
            <span className="font-bold">Children available for sale</span>
          </div>
          <div className={cn("grid gap-3", isFullscreen && "lg:grid-cols-2")}>
            {littersForSale.map((litter, litterIndex) => (
              <LitterCard
                key={`${litter.date}-${litterIndex}`}
                litter={litter}
                anotherParentRole={anotherParentRole}
                isFullscreen={isFullscreen}
                className="bg-even-card-ground"
              />
            ))}
          </div>
        </div>
      )}

      {/* Services grid */}
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

      {/* Service features */}
      {features.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {features.map((feature) => (
            <Badge
              key={feature.id}
              variant="secondary"
              className=" text-base px-4 py-1"
            >
              {feature.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
