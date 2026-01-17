import { Button } from "@ui/components/button";
import { Check } from "lucide-react";
import { useState } from "react";

// Billing period constants
const THREE_YEARLY = 0;
const YEARLY = 1;
const MONTHLY = 2;

interface TierPrice {
  type: number;
  value: number;
}

interface TierFeature {
  name: string;
}

interface Tier {
  id: string;
  name: string;
  description: string;
  features: TierFeature[];
  featuresHeader: string;
  prices: TierPrice[];
  isPopular?: boolean;
  isComingSoon?: boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free forever",
    description: "Perfect for hobby breeders and getting started",
    features: [
      { name: "Create and manage unlimited pedigree trees" },
      { name: "Test matings with COI calculation" },
      { name: "Access to breeders marketplace" },
    ],
    featuresHeader: "",
    prices: [
      { type: THREE_YEARLY, value: 0 },
      { type: YEARLY, value: 0 },
      { type: MONTHLY, value: 0 },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Everything you need to manage your breeding program",
    features: [
      { name: "Litter management" },
      { name: "Kennel management" },
      { name: "Privacy controls for your breeding data" },
    ],
    featuresHeader: "Everything in free forever and",
    isPopular: true,
    prices: [
      { type: THREE_YEARLY, value: 6.67 },
      { type: YEARLY, value: 9.99 },
      { type: MONTHLY, value: 13.32 },
    ],
  },
  {
    id: "supreme_patron",
    name: "Supreme Patron",
    description: "Support the breed you love with flexible contribution",
    features: [
      { name: "Get recognized as a Top Patron of your breed" },
      { name: "Help promote and support your favorite breed community" },
    ],
    featuresHeader: "Everything in professional and",
    prices: [
      { type: THREE_YEARLY, value: 20 },
      { type: YEARLY, value: 20 },
      { type: MONTHLY, value: 20 },
    ],
  },
];

const billingTypes = [
  { value: THREE_YEARLY, label: "3 yearly billing", labelShort: "3 yearly", discount: "33%" },
  { value: YEARLY, label: "Yearly billing", labelShort: "Yearly", discount: "25%" },
  { value: MONTHLY, label: "Monthly billing", labelShort: "Monthly", discount: "" },
];

interface BillingTierSelectorProps {
  currentPlanId?: string;
  onSelectPlan?: (tierId: string, billingType: number) => void;
}

/**
 * BillingTierSelector - Tier selection for billing page
 *
 * Displays available subscription tiers with:
 * - Billing period selector (monthly/yearly/3-yearly)
 * - Tier cards with features and pricing
 * - Current plan indicator
 * - Upgrade buttons for other plans
 */
export function BillingTierSelector({
  currentPlanId = "professional",
  onSelectPlan,
}: BillingTierSelectorProps) {
  const [selectedBillingType, setSelectedBillingType] = useState(YEARLY);

  const formatPrice = (tier: Tier): string => {
    const priceData = tier.prices.find((p) => p.type === selectedBillingType);
    const price = priceData?.value || 0;

    if (price === 0) {
      return "Free";
    }

    return `$${price.toFixed(2)}`;
  };

  const isCurrentPlan = (tier: Tier): boolean => {
    return tier.id === currentPlanId;
  };

  const canUpgrade = (tier: Tier): boolean => {
    // Can't upgrade to current plan
    if (isCurrentPlan(tier)) return false;
    // Can't upgrade to coming soon
    if (tier.isComingSoon) return false;
    return true;
  };

  const getButtonText = (tier: Tier): string => {
    if (isCurrentPlan(tier)) return "Current plan";
    if (tier.id === "free") return "Downgrade";
    return "Upgrade";
  };

  return (
    <div className="flex flex-col">
      {/* Billing Type Selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full bg-secondary-100 dark:bg-secondary-800 p-1">
          {billingTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedBillingType(type.value)}
              className={`
                relative px-3 sm:px-5 py-2 rounded-full transition-all duration-200 text-sm
                ${
                  selectedBillingType === type.value
                    ? "bg-white dark:bg-secondary-700 text-foreground shadow-sm font-bold"
                    : "text-secondary-600 dark:text-secondary-400 hover:text-foreground"
                }
              `}
            >
              <span className="hidden sm:inline">{type.label}</span>
              <span className="sm:hidden">{type.labelShort}</span>
              {type.discount && (
                <span
                  className={`
                    ml-1 text-sm font-bold
                    ${
                      selectedBillingType === type.value
                        ? "text-green-600 dark:text-green-400"
                        : "text-secondary-500 dark:text-secondary-500"
                    }
                  `}
                >
                  -{type.discount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier.id} className="relative">
            {/* Popular Badge */}
            {tier.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Popular
                </span>
              </div>
            )}

            {/* Card */}
            <div
              className={`
                card card-rounded relative flex flex-col h-full p-6
                ${tier.isPopular ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                ${tier.isComingSoon ? "opacity-60" : ""}
              `}
            >
              {/* Coming Soon Badge */}
              {tier.isComingSoon && (
                <div className="absolute top-4 right-4">
                  <span className="bg-warning-100 dark:bg-warning-900/50 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded text-xs font-medium">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6 text-center">
                <h3 className="text-lg font-bold uppercase mb-1">{tier.name}</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  {tier.description}
                </p>
              </div>

              {/* Price - fixed height for alignment */}
              <div className="mb-6 text-center h-[52px]">
                <div className="text-3xl font-bold">{formatPrice(tier)}</div>
                {formatPrice(tier) !== "Free" && (
                  <div className="text-secondary-500 text-sm uppercase mt-1">per month</div>
                )}
              </div>

              {/* CTA Button */}
              <Button
                variant="default"
                className="w-full mb-6"
                disabled={!canUpgrade(tier)}
                onClick={() => canUpgrade(tier) && onSelectPlan?.(tier.id, selectedBillingType)}
              >
                {getButtonText(tier)}
              </Button>

              {/* Features */}
              <div className="space-y-3 mt-auto">
                {tier.featuresHeader && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 uppercase text-center mb-2">
                    {tier.featuresHeader}
                  </p>
                )}
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
