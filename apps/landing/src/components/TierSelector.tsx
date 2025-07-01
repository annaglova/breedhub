import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  TIERS, 
  THREE_YEARLY_NUMBER, 
  YEARLY_NUMBER, 
  MONTHLY_NUMBER,
  type Tier
} from "@/constants/pricing";

interface TierSelectorProps {
  onBillingTypeChange?: (type: number) => void;
  breedId?: string;
}

const billingTypes = [
  { value: THREE_YEARLY_NUMBER, label: "3 yearly", discount: "Save 33%" },
  { value: YEARLY_NUMBER, label: "Yearly", discount: "Save 25%" },
  { value: MONTHLY_NUMBER, label: "Monthly", discount: "" },
];

export default function TierSelector({ onBillingTypeChange, breedId }: TierSelectorProps) {
  const [selectedBillingType, setSelectedBillingType] = useState(YEARLY_NUMBER);
  const [customPrice, setCustomPrice] = useState<number>(20);

  const handleBillingTypeChange = (type: number) => {
    setSelectedBillingType(type);
    onBillingTypeChange?.(type);
  };

  const formatPrice = (tier: Tier): string => {
    const price = tier.prices[selectedBillingType]?.value || 0;
    
    if (tier.name === "Supreme Patron") {
      return `$${customPrice}`;
    }
    
    if (price === 0) {
      return "Free";
    }
    
    return `$${price}`;
  };

  const getPriceSubtext = (tier: Tier): string => {
    if (tier.name === "Supreme Patron") {
      return "per month";
    }
    
    const billingLabel = billingTypes[selectedBillingType].label.toLowerCase();
    if (billingLabel === "3 yearly") {
      return "per month";
    }
    return `per ${billingLabel === "yearly" ? "year" : "month"}`;
  };

  return (
    <div className="w-full">
      {/* Billing Type Selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          {billingTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleBillingTypeChange(type.value)}
              className={`
                relative px-6 py-2 rounded-full text-sm font-medium transition-all
                ${selectedBillingType === type.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              {type.label}
              {type.discount && (
                <span className="ml-2 text-xs text-green-600">{type.discount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier, index) => (
          <div
            key={index}
            className={`
              relative rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-lg
              ${tier.isPopular ? "border-primary-500 ring-2 ring-primary-500" : "border-gray-200"}
              ${tier.isComingSoon ? "opacity-75" : ""}
            `}
          >
            {/* Popular Badge */}
            {tier.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Popular
                </span>
              </div>
            )}

            {/* Coming Soon Overlay */}
            {tier.isComingSoon && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-900/80 z-10">
                <span className="text-white text-xl font-bold">Coming Soon</span>
              </div>
            )}

            {/* Tier Content */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
              <p className="text-sm text-gray-600">{tier.description}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
              {tier.name === "Supreme Patron" ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">$</span>
                  <input
                    type="number"
                    min="10"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-20 text-3xl font-bold border-b-2 border-gray-300 focus:border-primary-500 outline-none"
                  />
                  <span className="text-sm text-gray-600">{getPriceSubtext(tier)}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatPrice(tier)}</span>
                  {formatPrice(tier) !== "Free" && (
                    <span className="text-sm text-gray-600">{getPriceSubtext(tier)}</span>
                  )}
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mb-6 space-y-3">
              {tier.featuresHeader && (
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {tier.featuresHeader}
                </p>
              )}
              {tier.features.map((feature, fIndex) => (
                <div key={fIndex} className="flex items-start gap-2">
                  <i className="pi pi-check text-green-500 mt-0.5" />
                  <span className="text-sm">{feature.name}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Link
              to={
                tier.name === "Free forever"
                  ? "/app"
                  : `/payment?product=${encodeURIComponent(tier.name)}&billingType=${selectedBillingType}${
                      tier.name === "Supreme Patron" ? `&customPrice=${customPrice}` : ""
                    }${breedId ? `&breed=${breedId}` : ""}`
              }
              className={`
                block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors
                ${tier.isComingSoon
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none"
                  : tier.isPopular
                  ? "bg-primary-500 text-white hover:bg-primary-600"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }
              `}
            >
              {tier.callToActionText || "Get Started"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}