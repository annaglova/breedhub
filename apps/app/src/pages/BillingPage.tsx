import { ContentPageLayout } from "@/layouts/ContentPageLayout";
import { MajorPoint } from "@ui/components/major-point";
import { BarChart3, Crown } from "lucide-react";
import { useState } from "react";

/**
 * Transaction record for billing history
 */
interface Transaction {
  id: string;
  product: string;
  plan: string;
  period: string;
  status: string;
  price: number;
}

/**
 * Performance record for usage tracking
 */
interface PerformanceRecord {
  id: string;
  product: string;
  period: string;
  status: string;
}

/**
 * BillingPage - User billing and subscription management
 *
 * Features:
 * - Two tabs: Tiers and Performance
 * - Tiers tab: current plan, tier selection, transaction history
 * - Performance tab: usage tracking
 */
export function BillingPage() {
  const [activeTab, setActiveTab] = useState<"tiers" | "performance">("tiers");

  // Mock data - TODO: fetch from API
  const currentPlan = "PROFESSIONAL";
  const currentBreed = "Chihuahua";

  const transactions: Transaction[] = [
    {
      id: "1",
      product: "Professional",
      plan: "Monthly",
      period: "Jan 2026",
      status: "Active",
      price: 9.99,
    },
  ];

  const performanceRecords: PerformanceRecord[] = [
    {
      id: "1",
      product: "Professional",
      period: "Jan 2026",
      status: "Active",
    },
  ];

  return (
    <ContentPageLayout>
      {/* Header with tabs */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Billing</h1>

        {/* Tab buttons */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("tiers")}
            className="group flex flex-col"
          >
            <div
              className={`flex items-center px-4 py-2 transition-colors ${
                activeTab === "tiers" ? "text-primary" : "text-secondary"
              }`}
            >
              <Crown className="mr-2 h-[18px] w-[18px]" />
              <span className="font-bold">Tiers</span>
            </div>
            <div
              className={`border-b-2 transition-colors ${
                activeTab === "tiers"
                  ? "border-primary"
                  : "border-surface-300 group-hover:border-surface-400"
              }`}
            />
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className="group flex flex-col"
          >
            <div
              className={`flex items-center px-4 py-2 transition-colors ${
                activeTab === "performance" ? "text-primary" : "text-secondary"
              }`}
            >
              <BarChart3 className="mr-2 h-[18px] w-[18px]" />
              <span className="font-bold">Performance</span>
            </div>
            <div
              className={`border-b-2 transition-colors ${
                activeTab === "performance"
                  ? "border-primary"
                  : "border-surface-300 group-hover:border-surface-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tiers Tab */}
      {activeTab === "tiers" && (
        <div className="flex flex-col space-y-8">
          {/* Hero section */}
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <div className="flex flex-col space-y-2 md:order-1">
              <h2 className="text-2xl font-semibold">
                Select the most suitable tier
              </h2>
              <p className="text-[0.9rem] leading-7 text-secondary-600 dark:text-secondary-400 max-w-xl">
                Select the most suitable plan according to your needs among the
                presented tiers. To cancel a paid subscription select a FREE
                tier. It will be activated after the paid subscription expires.
                The field Breed is your default breed but you can change it. All
                amounts from the paid service you buy will be credited to the
                promotion of the chosen breed and will affect your rating as a
                patron of this breed.
              </p>
            </div>
            <div className="shrink-0 md:order-2">
              <MajorPoint
                name="Your plan"
                secondaryName="Monthly billing"
                value={currentPlan}
                valueClassName="text-accent"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-lg font-bold uppercase text-accent">
                  {currentBreed}
                </span>
                <button className="text-secondary-400 hover:text-secondary-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Tier changer placeholder */}
          <div className="rounded-lg border border-dashed border-secondary-300 dark:border-secondary-600 p-8 text-center">
            <p className="text-secondary-500 dark:text-secondary-400">
              Tier selection coming soon
            </p>
          </div>

          {/* Transaction Details */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">Details</h2>
            <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
              {transactions.length > 0 ? (
                <div className="grid">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_180px_100px] md:grid-cols-[1fr_120px_180px_100px_80px] gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8">
                    <div>Product</div>
                    <div className="hidden md:block">Plan</div>
                    <div>Period</div>
                    <div className="hidden sm:block">Status</div>
                    <div className="hidden md:block">Price, $</div>
                  </div>
                  {/* Rows */}
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_180px_100px] md:grid-cols-[1fr_120px_180px_100px_80px] items-center gap-3 px-6 py-2 lg:px-8 ${
                        index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                      }`}
                    >
                      <div>{transaction.product}</div>
                      <div className="hidden md:block">{transaction.plan}</div>
                      <div>{transaction.period}</div>
                      <div className="hidden sm:block">{transaction.status}</div>
                      <div className="hidden md:block">{transaction.price}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-secondary p-8 text-center">
                  There are no paid services yet!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <div className="flex flex-col space-y-8">
          {/* Hero section */}
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <div className="flex flex-col space-y-2 md:order-1">
              <h2 className="text-2xl font-semibold">
                View performance details
              </h2>
              <p className="text-[0.9rem] leading-7 text-secondary-600 dark:text-secondary-400">
                You can track your usage of paid services below.
              </p>
            </div>
            <div className="shrink-0 md:order-2">
              <MajorPoint
                name="Your plan"
                secondaryName="Monthly billing"
                value={currentPlan}
                valueClassName="text-accent"
              />
            </div>
          </div>

          {/* Performance Details */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">Details</h2>
            <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
              {performanceRecords.length > 0 ? (
                <div className="grid">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_60px] sm:grid-cols-[1fr_180px_60px] md:grid-cols-[1fr_180px_120px] gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8">
                    <div>Product</div>
                    <div className="hidden sm:block">Period</div>
                    <div>Status</div>
                  </div>
                  {/* Rows */}
                  {performanceRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className={`grid grid-cols-[1fr_60px] sm:grid-cols-[1fr_180px_60px] md:grid-cols-[1fr_180px_120px] items-center gap-3 px-6 py-2 lg:px-8 ${
                        index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                      }`}
                    >
                      <div>{record.product}</div>
                      <div className="hidden sm:block">{record.period}</div>
                      <div>{record.status}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-secondary p-8 text-center">
                  There are no paid services yet!
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </ContentPageLayout>
  );
}
