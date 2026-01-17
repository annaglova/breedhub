import { ContentPageLayout } from "@/layouts/ContentPageLayout";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { MajorPoint } from "@ui/components/major-point";
import { toast } from "@breedhub/rxdb-store";
import { ArrowLeftRight, Copy, Gift, Heart, Info, Percent, Wallet } from "lucide-react";
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

/**
 * Tier exchange card
 */
function ExchangeTierCard({
  name,
  price,
  color,
  isComingSoon,
}: {
  name: string;
  price: number;
  color: "primary" | "secondary";
  isComingSoon?: boolean;
}) {
  const [months, setMonths] = useState(1);
  const colorClass = color === "primary" ? "text-primary" : "text-secondary-400";

  return (
    <div className={`card card-rounded p-6 relative ${isComingSoon ? "opacity-60" : ""}`}>
      {isComingSoon && (
        <div className="absolute top-2 right-0 bg-accent text-white text-xs font-bold uppercase px-2 py-0.5 rounded-l-full">
          Coming soon
        </div>
      )}
      <div className="flex flex-col items-center">
        <h3 className={`text-xl font-bold uppercase ${colorClass}`}>{name}</h3>
        <div className="mt-4 text-center">
          <span className={`text-4xl font-bold ${colorClass}`}>{price}</span>
          <span className="text-secondary-500 text-sm uppercase ml-2">PetCoins/month</span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Input
            type="number"
            value={months}
            onChange={(e) => setMonths(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 text-center"
            min={1}
            disabled={isComingSoon}
          />
          <span className="text-secondary-500">months</span>
        </div>
        <Button className="mt-4 w-full" disabled={isComingSoon}>
          Exchange for {price * months} PetCoins
        </Button>
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
                name="Professional"
                price={100}
                color="primary"
              />
              <ExchangeTierCard
                name="Prime"
                price={150}
                color="secondary"
                isComingSoon
              />
            </div>
          </div>
        </div>
      )}
    </ContentPageLayout>
  );
}
