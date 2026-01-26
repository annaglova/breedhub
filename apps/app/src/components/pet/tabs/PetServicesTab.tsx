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

  // Dictionaries state
  const [serviceTypesMap, setServiceTypesMap] = useState<Map<string, any>>(new Map());
  const [currencyMap, setCurrencyMap] = useState<Map<string, any>>(new Map());
  const [featuresMap, setFeaturesMap] = useState<Map<string, any>>(new Map());
  const [dictsLoading, setDictsLoading] = useState(true);

  // Load dictionaries on mount
  useEffect(() => {
    async function loadDictionaries() {
      try {
        // Ensure dictionaryStore is initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // Load all required dictionaries in parallel
        const [serviceTypes, currencies, features] = await Promise.all([
          dictionaryStore.getDictionary("pet_service", {
            idField: "id",
            nameField: "name"
          }),
          dictionaryStore.getDictionary("currency", {
            idField: "id",
            nameField: "short_name",
            additionalFields: ["name"]
          }),
          dictionaryStore.getDictionary("pet_service_feature", {
            idField: "id",
            nameField: "name"
          }),
        ]);

        // Build lookup maps
        setServiceTypesMap(new Map(serviceTypes.records.map((r: any) => [r.id, r])));
        setCurrencyMap(new Map(currencies.records.map((r: any) => [r.id, r])));
        setFeaturesMap(new Map(features.records.map((r: any) => [r.id, r])));
      } catch (error) {
        console.error("[PetServicesTab] Failed to load dictionaries:", error);
      } finally {
        setDictsLoading(false);
      }
    }

    loadDictionaries();
  }, []);

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

  // Transform raw services data to UI format with dictionary merge
  // Filter out "Children for sale" - it's displayed separately with actual children cards
  const services = useMemo<PetService[]>(() => {
    if (!servicesRaw || servicesRaw.length === 0 || dictsLoading) return [];

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
  }, [servicesRaw, serviceTypesMap, currencyMap, dictsLoading]);

  // Check if pet has "Children for sale" service enabled
  const hasChildrenForSaleService = useMemo(() => {
    if (!servicesRaw || servicesRaw.length === 0 || dictsLoading) return false;
    return servicesRaw.some((item: any) => {
      const serviceTypeId = item.additional?.service_type_id || item.service_type_id;
      const serviceType = serviceTypesMap.get(serviceTypeId);
      return serviceType?.name?.toLowerCase() === "children for sale";
    });
  }, [servicesRaw, serviceTypesMap, dictsLoading]);

  // Transform raw features data to UI format with dictionary merge
  const features = useMemo<ServiceFeature[]>(() => {
    if (!featuresRaw || featuresRaw.length === 0 || dictsLoading) return [];

    return featuresRaw.map((item: any) => {
      const featureId = item.additional?.pet_service_feature_id || item.pet_service_feature_id;
      const feature = featuresMap.get(featureId);

      return {
        id: item.id,
        name: feature?.name || "Unknown",
      };
    });
  }, [featuresRaw, featuresMap, dictsLoading]);

  // TODO: Load children for sale when hasChildrenForSaleService is true
  // Need to query pet's children with available_for_sale = true
  // For now, this section is hidden until children loading is implemented
  const littersForSale: LitterData[] = [];

  // Get pet sex from selected entity
  const petSexCode = selectedEntity?.additional?.sex?.code || "male";

  // Determine label for the other parent based on current pet's sex
  const anotherParentRole = petSexCode === "male" ? "Mother" : "Father";

  const isLoading = servicesLoading || featuresLoading || dictsLoading;

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
  if (services.length === 0 && features.length === 0) {
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
