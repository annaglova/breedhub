import { ContentPageLayout } from "@/layouts/ContentPageLayout";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { MajorPoint } from "@ui/components/major-point";
import { toast } from "@breedhub/rxdb-store";
import { ArrowLeftRight, Check, Copy, Gift, Heart, Info, Percent, Wallet } from "lucide-react";
import { useState } from "react";

/**
 * Referral record for performance tracking
 */
interface Referral {
  id: string;
  name: string;
  isCustomer: boolean;
  earnings: number;
}

/**
 * Step card for "How it works" section
 */
function StepCard({
  step,
  title,
  icon: Icon,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center space-y-2 rounded-xl border border-border bg-card-ground p-5 shadow-md">
      <span className="text-primary text-xl font-bold">Step {step}</span>
      <span className="text-center text-sm">{title}</span>
      <div className="flex h-full">
        <Icon className="h-11 w-11 self-end text-primary/60" />
      </div>
    </div>
  );
}

interface ExchangeTier {
  name: string;
  description: string;
  price: number;
  featuresHeader: string;
  features: string[];
  isComingSoon?: boolean;
}

const EXCHANGE_TIERS: ExchangeTier[] = [
  {
    name: "Professional",
    description: "Best for a professional breeder",
    price: 100,
    featuresHeader: "Everything in free forever and",
    features: [
      "Litter management",
      "Kennel management",
      "An ability to manage the publicity of your data",
    ],
  },
  {
    name: "Prime",
    description: "Best for a professional kennel",
    price: 150,
    featuresHeader: "Everything in professional and",
    features: [
      "Kennel site",
      "Various site skins",
      "Pages visits analytics",
    ],
    isComingSoon: true,
  },
];

/**
 * Tier exchange card
 */
function ExchangeTierCard({
  tier,
  colorClass,
  borderColor,
}: {
  tier: ExchangeTier;
  colorClass: string;
  borderColor: string;
}) {
  const [months, setMonths] = useState(1);

  const decrement = () => setMonths((m) => Math.max(0, m - 1));
  const increment = () => setMonths((m) => Math.min(40, m + 1));

  return (
    <div
      className="card card-rounded relative h-full flex-col p-6 outline outline-2 outline-offset-2"
      style={{ outlineColor: borderColor, borderColor: borderColor }}
    >
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

      {/* Price */}
      <div className="mb-6 text-center">
        <div className={`text-3xl font-bold ${colorClass}`}>
          {tier.price}
        </div>
        <div className="text-secondary-500 text-sm uppercase mt-1">PetCoins per month</div>
      </div>

      {/* Months selector */}
      <div className="mb-6">
        <div className="text-sm text-secondary-600 dark:text-secondary-400 text-center mb-2">Months of usage</div>
        <div className="flex">
          <Button
            variant="secondary"
            className="rounded-r-none"
            onClick={decrement}
            disabled={tier.isComingSoon || months <= 0}
          >
            <span>−</span>
          </Button>
          <Input
            type="number"
            value={months}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setMonths(Math.max(0, Math.min(40, val)));
            }}
            className="rounded-none text-center flex-1"
            disabled={tier.isComingSoon}
          />
          <Button
            variant="default"
            className="rounded-l-none"
            onClick={increment}
            disabled={tier.isComingSoon || months >= 40}
          >
            <span>+</span>
          </Button>
        </div>
      </div>

      {/* Exchange Button */}
      <Button className="w-full mb-6 gap-2" disabled={tier.isComingSoon || months === 0}>
        <ArrowLeftRight className="h-4 w-4" />
        Exchange
      </Button>

      {/* Features */}
      <div className="space-y-3 mt-auto">
        <p className="text-xs text-secondary-500 dark:text-secondary-400 uppercase text-center mb-2">
          {tier.featuresHeader}
        </p>
        {tier.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span className="text-sm text-secondary-700 dark:text-secondary-300">
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ReferralPage - User referral program management
 *
 * Features:
 * - Two tabs: Info and Exchange
 * - Info tab: referral link, stats, how it works, performance details
 * - Exchange tab: exchange PetCoins for paid services
 */
export function ReferralPage() {
  const [activeTab, setActiveTab] = useState<"info" | "exchange">("info");

  // Mock data - TODO: fetch from API
  const referralLink = "https://breedpride.com/ref/abc123";
  const stats = {
    referrals: 123,
    customers: 15,
    earnings: 354,
    balance: 130,
  };

  const referrals: Referral[] = [
    { id: "1", name: "John Doe", isCustomer: false, earnings: 0 },
    { id: "2", name: "Jane Smith", isCustomer: true, earnings: 25 },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <ContentPageLayout>
      {/* Header with tabs */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Referrals</h1>

        {/* Tab buttons */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("info")}
            className="group flex flex-col"
          >
            <div
              className={`flex items-center px-4 py-2 transition-colors ${
                activeTab === "info" ? "text-primary" : "text-secondary"
              }`}
            >
              <Info className="mr-2 h-[18px] w-[18px]" />
              <span className="font-bold">Info</span>
            </div>
            <div
              className={`border-b-2 transition-colors ${
                activeTab === "info"
                  ? "border-primary"
                  : "border-surface-300 group-hover:border-surface-400"
              }`}
            />
          </button>
          <button
            onClick={() => setActiveTab("exchange")}
            className="group flex flex-col"
          >
            <div
              className={`flex items-center px-4 py-2 transition-colors ${
                activeTab === "exchange" ? "text-primary" : "text-secondary"
              }`}
            >
              <ArrowLeftRight className="mr-2 h-[18px] w-[18px]" />
              <span className="font-bold">Exchange</span>
            </div>
            <div
              className={`border-b-2 transition-colors ${
                activeTab === "exchange"
                  ? "border-primary"
                  : "border-surface-300 group-hover:border-surface-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="flex flex-col space-y-8">
          {/* Referral link & Points */}
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            {/* Referral link */}
            <div className="flex flex-col md:order-1">
              <span className="text-primary text-3xl font-bold">Your referral link</span>
              <div className="mt-3 flex">
                <Input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="rounded-r-none min-w-0 flex-1"
                />
                <Button
                  onClick={handleCopyLink}
                  className="rounded-l-none shrink-0 gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </Button>
              </div>
              <div className="text-secondary text-sm mt-1">
                Share your personal link
              </div>
              <p className="text-[0.9rem] leading-7 text-secondary-600 dark:text-secondary-400 mt-3 max-w-lg">
                Notice that you can share your referral link in a direct link to your pets.
                This ability is on each context menu for your pet. The menu is named -
                Copy link with my referral.
              </p>
            </div>

            {/* Points */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-5 md:order-2 shrink-0">
              <MajorPoint
                name="Referrals"
                secondaryName="all users"
                value={stats.referrals}
                valueClassName="text-primary"
              />
              <MajorPoint
                name="Customers"
                secondaryName="paid users"
                value={stats.customers}
                valueClassName="text-primary"
              />
              <MajorPoint
                name="Earnings"
                secondaryName="total amount in PetCoins"
                value={stats.earnings}
                valueClassName="text-primary"
              />
              <MajorPoint
                name="Balance"
                secondaryName="current balance in PetCoins"
                value={stats.balance}
                valueClassName="text-accent"
              />
            </div>
          </div>

          {/* How it works */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <div className="grid grid-cols-1 gap-5 rounded-lg bg-focus-card-ground p-6 sm:p-10 sm:grid-cols-2 md:grid-cols-4">
              <StepCard
                step={1}
                title="Share your link with other breeders"
                icon={Heart}
              />
              <StepCard
                step={2}
                title="They sign up and run their paid payroll"
                icon={Wallet}
              />
              <StepCard
                step={3}
                title="You get 5% for each payment from your referrals in PetCoins"
                icon={Percent}
              />
              <StepCard
                step={4}
                title="You can exchange your PetCoins for paid services"
                icon={Gift}
              />
            </div>
          </div>

          {/* Performance Details */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">Performance details</h2>
            <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
              {referrals.length > 0 ? (
                <div className="grid">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_44px] md:grid-cols-[1fr_120px_120px] gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8">
                    <div>User</div>
                    <div className="hidden md:block">Is customer</div>
                    <div>Earnings</div>
                  </div>
                  {/* Rows */}
                  {referrals.map((referral, index) => (
                    <div
                      key={referral.id}
                      className={`grid grid-cols-[1fr_44px] md:grid-cols-[1fr_120px_120px] items-center gap-3 px-6 py-2 lg:px-8 ${
                        index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                      }`}
                    >
                      <div>{referral.name}</div>
                      <div className="hidden md:block">
                        {referral.isCustomer ? "Yes" : "No"}
                      </div>
                      <div>{referral.earnings}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-secondary p-8 text-center">
                  There are no referrals yet!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exchange Tab */}
      {activeTab === "exchange" && (
        <div className="flex flex-col space-y-8">
          {/* Header section */}
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <div className="flex flex-col space-y-2 md:order-1">
              <h2 className="text-2xl font-semibold">Exchange your PetCoins</h2>
              <p className="text-[0.9rem] leading-7 text-secondary-600 dark:text-secondary-400 max-w-xl">
                PetCoins on your Balance can be exchanged into paid services.
                All available services are represented below. The price of services
                is in PetCoins per month. Choose the number of months you want to
                receive a paid service and make an exchange. Have a pleasant time
                with our PRO services.
              </p>
            </div>
            <div className="shrink-0 md:order-2">
              <MajorPoint
                name="Balance"
                secondaryName="current balance in PetCoins"
                value={stats.balance}
                valueClassName="text-accent"
              />
            </div>
          </div>

          {/* Exchange cards */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              <ExchangeTierCard
                tier={EXCHANGE_TIERS[0]}
                colorClass="text-primary"
                borderColor="rgb(var(--primary))"
              />
              <ExchangeTierCard
                tier={EXCHANGE_TIERS[1]}
                colorClass="text-secondary-400"
                borderColor="rgb(var(--secondary-400))"
              />
            </div>
          </div>
        </div>
      )}
    </ContentPageLayout>
  );
}
