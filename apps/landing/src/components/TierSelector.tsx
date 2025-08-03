import {
  MONTHLY_NUMBER,
  THREE_YEARLY_NUMBER,
  TIERS,
  YEARLY_NUMBER,
  type Tier,
} from "@/constants/pricing";
import { Input } from "@ui/components/input";
import { useState } from "react";
import { Link } from "react-router-dom";
import "./TierSelector.css";

interface TierSelectorProps {
  onBillingTypeChange?: (type: number) => void;
  breedId?: string;
}

const billingTypes = [
  {
    value: THREE_YEARLY_NUMBER,
    label: "3 yearly billing",
    labelShort: "3 yearly",
    discount: "33%",
  },
  {
    value: YEARLY_NUMBER,
    label: "Yearly billing",
    labelShort: "Yearly",
    discount: "25%",
  },
  {
    value: MONTHLY_NUMBER,
    label: "Monthly billing",
    labelShort: "Monthly",
    discount: "",
  },
];

export default function TierSelector({
  onBillingTypeChange,
  breedId,
}: TierSelectorProps) {
  const [selectedBillingType, setSelectedBillingType] = useState(YEARLY_NUMBER);
  const [customPrice, setCustomPrice] = useState<string>("20");
  const [priceError, setPriceError] = useState<string>("");

  const handleBillingTypeChange = (type: number) => {
    setSelectedBillingType(type);
    onBillingTypeChange?.(type);
  };

  const formatPrice = (tier: Tier): string => {
    const priceData = tier.prices[selectedBillingType];
    const price = priceData?.value || 0;

    if (tier.name === "Supreme Patron") {
      return `$${customPrice}`;
    }

    if (price === 0) {
      return "Free";
    }

    // For 3 yearly and yearly, show monthly price; for monthly, show actual price
    return `$${price.toFixed(2)}`;
  };

  const getAlternativePricing = (tier: Tier) => {
    if (tier.name === "Supreme Patron") {
      return (
        <div className="text-gray-500  space-y-1">
          <div>
            Minimum payment is <span className="font-bold">$20.00</span>
          </div>
          <div>Monthly subscription only</div>
        </div>
      );
    }

    const alternatives = [];

    // Show other billing options (not the selected one)
    if (selectedBillingType !== THREE_YEARLY_NUMBER) {
      const price = tier.prices[THREE_YEARLY_NUMBER]?.value || 0;
      alternatives.push(
        <div key="3yearly">
          <span className="font-bold">${price.toFixed(2)}</span> billed 3 yearly
        </div>
      );
    }

    if (selectedBillingType !== YEARLY_NUMBER) {
      const price = tier.prices[YEARLY_NUMBER]?.value || 0;
      alternatives.push(
        <div key="yearly">
          <span className="font-bold">${price.toFixed(2)}</span> billed yearly
        </div>
      );
    }

    if (selectedBillingType !== MONTHLY_NUMBER) {
      const price = tier.prices[MONTHLY_NUMBER]?.value || 0;
      alternatives.push(
        <div key="monthly">
          <span className="font-bold">${price.toFixed(2)}</span> billed monthly
        </div>
      );
    }

    return <div className="text-gray-500 space-y-1">{alternatives}</div>;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Billing Type Selector */}
      <div className="flex justify-center mb-14">
        <div className="inline-flex rounded-full bg-white/10 p-[3px] shadow-inner border-2 border-white/40">
          {billingTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleBillingTypeChange(type.value)}
              className={`
                relative px-4 sm:px-6 py-3 rounded-full transition-all duration-200 text-base
                ${
                  selectedBillingType === type.value
                    ? "bg-white/90 text-gray-700 shadow-md cursor-pointer font-bold"
                    : "text-gray-600 hover:text-gray-700 hover:bg-white/30 cursor-pointer"
                }
              `}
            >
              <span className="hidden sm:inline cursor-pointer">
                {type.label}
              </span>
              <span className="sm:hidden cursor-pointer">
                {type.labelShort}
              </span>
              {type.discount && (
                <span
                  className={`
                  ml-1.5 text-base font-bold cursor-pointer
                  ${
                    selectedBillingType === type.value
                      ? "text-green-600"
                      : "text-gray-500"
                  }
                `}
                >
                  Save {type.discount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Cards */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-screen md:max-w-6xl">
        {TIERS.map((tier, index) => (
          <div key={index} className="tier-card-wrapper">
            {/* Popular Badge - Outside the card */}
            {tier.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50">
                <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-md font-bold uppercase">
                  Popular
                </span>
              </div>
            )}

            {/* Card with overflow hidden */}
            <div
              className={`
                tier-card tier-card-content relative rounded-lg border bg-white px-6 py-8 flex flex-col h-full shadow-lg
                ${
                  tier.isPopular
                    ? "border-primary outline outline-2 outline-offset-2 outline-primary"
                    : "border-gray-200"
                }
                ${tier.isComingSoon ? "coming-soon" : ""}
              `}
            >
              {/* Coming Soon Banner */}
              {tier.isComingSoon && (
                <div className="coming-soon-banner">
                  <div className="coming-soon-banner-content">Coming Soon</div>
                </div>
              )}

              {/* Tier Content */}
              <div className="mb-8 flex flex-col items-center">
                <h3 className="text-xl font-bold mb-2 uppercase">
                  {tier.name}
                </h3>
                <p className=" text-gray-600 w-3/4 text-center">
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-4 text-center h-[69px]">
                {tier.name === "Supreme Patron" ? (
                  <div>
                    <div className="flex gap-2 justify-center">
                      <span className="text-3xl font-bold mr-1">$</span>

                      <div className="w-full">
                        <Input
                          type="number"
                          value={customPrice}
                          onChange={(e) => {
                            setCustomPrice(e.target.value);

                            // Show error if out of bounds
                            const numValue = Number(e.target.value);
                            if (e.target.value && numValue < 20) {
                              setPriceError("Minimum amount is $20");
                            } else if (e.target.value && numValue > 100) {
                              setPriceError("Maximum amount is $100");
                            } else {
                              setPriceError("");
                            }
                          }}
                          onBlur={(e) => {
                            const numValue = Number(e.target.value);
                            if (!e.target.value || numValue < 20) {
                              setCustomPrice("20");
                              setPriceError("");
                            } else if (numValue > 100) {
                              setCustomPrice("100");
                              setPriceError("");
                            }
                          }}
                          className="text-xl font-bold text-center"
                          variant={priceError ? "destructive" : "default"}
                        />
                        {priceError && (
                          <div className="text-warning-500 text-sm mt-1 text-left">
                            {priceError}
                          </div>
                        )}
                      </div>

                      <span className="text-gray-600 uppercase text-md  max-w-14">
                        per month
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold">
                      {formatPrice(tier)}
                    </div>
                    {formatPrice(tier) !== "Free" ? (
                      <div className="text-gray-600 mt-1 uppercase text-md">
                        per month
                      </div>
                    ) : (
                      <div className="h-6"></div>
                    )}
                  </div>
                )}
              </div>

              {/* Alternative Pricing */}
              <div className="mb-6">{getAlternativePricing(tier)}</div>

              {/* CTA Button */}
              <button
                className={`
               landing-raised-button landing-raised-button-primary w-full py-2.5 rounded-md mb-6
                ${
                  tier.isComingSoon
                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                    : ""
                }
              `}
              >
                <Link
                  to={
                    tier.name === "Free forever"
                      ? "/app"
                      : `/payment?product=${encodeURIComponent(
                          tier.name
                        )}&billingType=${selectedBillingType}${
                          tier.name === "Supreme Patron"
                            ? `&customPrice=${customPrice}`
                            : ""
                        }${breedId ? `&breed=${breedId}` : ""}`
                  }
                  className="block w-full h-full"
                >
                  {tier.callToActionText || "Get Started"}
                </Link>
              </button>

              {/* Features */}
              <div className="space-y-3 mt-auto">
                {tier.featuresHeader && (
                  <p className="text-md font-medium text-gray-700 mb-2 uppercase text-center">
                    {tier.featuresHeader}
                  </p>
                )}
                {tier.features.map((feature, fIndex) => (
                  <div key={fIndex} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className=" text-gray-700">{feature.name}</span>
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
