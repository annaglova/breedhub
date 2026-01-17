import { ContentPageLayout } from "@/layouts/ContentPageLayout";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { MajorPoint } from "@ui/components/major-point";
import { toast } from "@breedhub/rxdb-store";
import { Check, DollarSign, Gift, Heart, Minus, Plus } from "lucide-react";
import { useState } from "react";

/**
 * Gift record for history tracking
 */
interface GiftRecord {
  id: string;
  user: string;
  date: string;
  amount: number;
  isAnonymous: boolean;
}

/**
 * Gift tier configuration
 */
interface GiftTier {
  name: string;
  description: string;
  price: number;
  featuresHeader: string;
  features: string[];
}

const GIFT_TIER: GiftTier = {
  name: "Professional",
  description: "Best for a professional breeder",
  price: 100,
  featuresHeader: "Everything in free forever and",
  features: [
    "Litter management",
    "Kennel management",
    "An ability to manage the publicity of your data",
  ],
};

/**
 * MakeGiftCard - Card for purchasing gift subscriptions
 */
function MakeGiftCard({
  tier,
  onBuy,
}: {
  tier: GiftTier;
  onBuy?: (months: number) => void;
}) {
  const [months, setMonths] = useState(1);

  const decrement = () => setMonths((m) => Math.max(0, m - 1));
  const increment = () => setMonths((m) => Math.min(40, m + 1));

  const handleBuy = () => {
    if (months > 0) {
      onBuy?.(months);
      toast.success(`Purchased ${months} month(s) of ${tier.name} gift!`);
    }
  };

  return (
    <div
      className="card card-rounded relative flex flex-col items-center p-6 outline outline-2 outline-offset-2 outline-primary border-primary md:flex-row md:items-start"
    >
      {/* Gift Image */}
      <div className="order-2 md:order-1 shrink-0">
        <Gift className="h-40 w-40 text-primary/30" strokeWidth={1} />
      </div>

      {/* Tier Info */}
      <div className="order-1 md:order-2 flex w-full flex-col px-6 md:border-r md:border-border">
        <div className="text-center text-3xl font-bold uppercase">
          {tier.name}
        </div>
        <span className="text-center text-base font-bold uppercase text-secondary">
          One month access
        </span>
        <div className="mt-6 space-y-2">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-accent font-bold shrink-0 mt-0.5" />
              <span className="text-sm leading-5">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Price & Actions */}
      <div className="order-3 flex w-full flex-col items-center space-y-3 px-6 mt-6 md:mt-0">
        <div className="text-accent text-4xl font-semibold leading-tight tracking-tight">
          ${tier.price}
        </div>

        <div className="w-full">
          <div className="text-secondary text-center mb-1">Amount</div>
          <div className="flex h-10">
            <Button
              variant="secondary"
              className="rounded-r-none h-full px-4"
              onClick={decrement}
              disabled={months <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={months}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setMonths(Math.max(0, Math.min(40, val)));
              }}
              className="rounded-none text-center flex-1 h-full"
            />
            <Button
              variant="default"
              className="rounded-l-none h-full px-4"
              onClick={increment}
              disabled={months >= 40}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button className="w-full gap-2" disabled={months === 0} onClick={handleBuy}>
          <DollarSign className="h-4 w-4" />
          Buy a gift
        </Button>
      </div>
    </div>
  );
}

/**
 * TransferGift - Component for transferring gifts to other users
 */
function TransferGift({
  balance,
  tierName,
  onTransfer,
}: {
  balance: number;
  tierName: string;
  onTransfer?: (userId: string, months: number, isAnonymous: boolean) => void;
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [months, setMonths] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const decrement = () => setMonths((m) => Math.max(0, m - 1));
  const increment = () => setMonths((m) => Math.min(Math.max(balance, 1), m + 1));

  const handleTransfer = () => {
    if (selectedUser && months > 0 && months <= balance) {
      onTransfer?.(selectedUser, months, isAnonymous);
      toast.success(`Gift of ${months} month(s) sent${isAnonymous ? " anonymously" : ""}!`);
      setSelectedUser("");
      setMonths(1);
    }
  };

  const canTransfer = selectedUser && months > 0 && months <= balance;

  return (
    <div className="card card-rounded flex flex-col items-center px-6 py-5 md:flex-row">
      {/* Balance Info */}
      <div className="flex shrink-0 flex-col space-y-1 px-6">
        <div className="text-accent text-center text-5xl font-semibold leading-tight tracking-tight">
          {balance}
        </div>
        <div className="text-center text-3xl font-bold uppercase">
          {tierName}
        </div>
        <span className="text-center text-base font-bold uppercase text-secondary">
          One month access
        </span>
      </div>

      {/* Gift Image */}
      <div className="shrink-0 py-4 md:py-0">
        <Gift className="h-28 w-28 text-primary/30" strokeWidth={1} />
      </div>

      {/* Form */}
      <div className="relative flex w-full flex-col justify-center px-6">
        {/* Anonymous toggle - top right */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-secondary text-sm hidden sm:block">Send gift as an anonymous</span>
          <span className="text-secondary text-sm sm:hidden">Anonymous</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* User input */}
        <div className="mb-3">
          <div className="text-secondary mb-1">User</div>
          <Input
            type="text"
            placeholder="Search for a user..."
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Amount + Button */}
        <div>
          <div className="text-secondary mb-1">Amount</div>
          <div className="flex gap-3">
            <Input
              type="number"
              value={months}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setMonths(Math.max(0, Math.min(balance, val)));
              }}
              className="flex-1"
            />
            <Button className="gap-2 hidden sm:flex" disabled={!canTransfer} onClick={handleTransfer}>
              <Gift className="h-4 w-4" />
              Make a gift
            </Button>
            <Button className="sm:hidden px-4" disabled={!canTransfer} onClick={handleTransfer}>
              <Gift className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * GiftPage - User gift management
 *
 * Features:
 * - Two tabs: My gifts and Gifts for me
 * - My gifts tab: buy gifts, transfer to friends, gift history (receivers)
 * - Gifts for me tab: received gifts history (senders)
 */
export function GiftPage() {
  const [activeTab, setActiveTab] = useState<"my-gifts" | "gifts-for-me">("my-gifts");

  // Mock data - TODO: fetch from API
  const giftBalance = 3;
  const currentBreed = "Chihuahua";
  const totalPresents = 24;

  const sentGifts: GiftRecord[] = [
    { id: "1", user: "John Doe", date: "Jan 15, 2026", amount: 1, isAnonymous: false },
    { id: "2", user: "Jane Smith", date: "Jan 10, 2026", amount: 2, isAnonymous: true },
  ];

  const receivedGifts: GiftRecord[] = [
    { id: "1", user: "Anonymous", date: "Jan 12, 2026", amount: 1, isAnonymous: true },
    { id: "2", user: "Mike Johnson", date: "Jan 5, 2026", amount: 3, isAnonymous: false },
  ];

  return (
    <ContentPageLayout>
      {/* Header with tabs */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Gifts</h1>

        {/* Tab buttons */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("my-gifts")}
            className="group flex flex-col"
          >
            <div
              className={`flex items-center px-4 py-2 transition-colors ${
                activeTab === "my-gifts" ? "text-primary" : "text-secondary"
              }`}
            >
              <Gift className="mr-2 h-[18px] w-[18px]" />
              <span className="font-bold">My gifts</span>
            </div>
            <div
              className={`border-b-2 transition-colors ${
                activeTab === "my-gifts"
                  ? "border-primary"
                  : "border-surface-300 group-hover:border-surface-400"
              }`}
            />
          </button>
          <button
            onClick={() => setActiveTab("gifts-for-me")}
            className="group flex flex-col"
          >
            <div
              className={`flex items-center px-4 py-2 transition-colors ${
                activeTab === "gifts-for-me" ? "text-primary" : "text-secondary"
              }`}
            >
              <Heart className="mr-2 h-[18px] w-[18px]" />
              <span className="font-bold">Gifts for me</span>
            </div>
            <div
              className={`border-b-2 transition-colors ${
                activeTab === "gifts-for-me"
                  ? "border-primary"
                  : "border-surface-300 group-hover:border-surface-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* My Gifts Tab */}
      {activeTab === "my-gifts" && (
        <div className="flex flex-col space-y-8">
          {/* Hero section */}
          <div className="flex flex-col md:flex-row">
            <div className="order-2 mr-20 mt-8 flex flex-col space-y-2 md:order-1 md:mt-0">
              <h2 className="text-2xl font-semibold">Make a present to your friends</h2>
              <p className="text-secondary leading-7">
                Delight your friends with pleasant gifts.<br />
                Choose a gift you want to buy. Select an amount of gifts
                and make a payment. After a payment is processed you will
                get chosen gifts on your balance and be able to redirect
                them to your friends.<br />
                Notice the field Breed from above. This is your default
                breed but you can change it. All amounts from the presents
                you buy will be credited to the promotion of the chosen
                breed and will affect your rating as a patron of this breed.
              </p>
            </div>
            <div className="order-1 ml-auto shrink-0 text-end md:order-2">
              <div className="flex items-center space-x-3">
                <span className="text-accent text-xl font-bold uppercase">
                  {currentBreed}
                </span>
                <button className="text-secondary-400 hover:text-secondary-600">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Buy a gift */}
          <MakeGiftCard
            tier={GIFT_TIER}
            onBuy={(months) => {
              console.log("Buying gift:", months, "months");
              // TODO: Implement purchase logic
            }}
          />

          {/* Your gifts balance */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">Your gifts balance</h2>
            <div className="w-full sm:flex sm:justify-center">
              <TransferGift
                balance={giftBalance}
                tierName={GIFT_TIER.name}
                onTransfer={(userId, months, isAnonymous) => {
                  console.log("Transferring gift:", { userId, months, isAnonymous });
                  // TODO: Implement transfer logic
                }}
              />
            </div>
          </div>

          {/* Gifts history */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">Gifts history</h2>
            <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
              {sentGifts.length > 0 ? (
                <div className="grid">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_44px] sm:grid-cols-[1fr_100px_44px] md:grid-cols-[120px_1fr_120px_120px] gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8">
                    <div className="hidden md:block">Date</div>
                    <div>User</div>
                    <div className="hidden sm:block">Anonymously</div>
                    <div>Amount</div>
                  </div>
                  {/* Rows */}
                  {sentGifts.map((gift, index) => (
                    <div
                      key={gift.id}
                      className={`grid grid-cols-[1fr_44px] sm:grid-cols-[1fr_100px_44px] md:grid-cols-[120px_1fr_120px_120px] items-center gap-3 px-6 py-2 lg:px-8 ${
                        index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                      }`}
                    >
                      <div className="hidden md:block">{gift.date}</div>
                      <div>{gift.user}</div>
                      <div className="hidden sm:block">
                        {gift.isAnonymous && <Check className="h-4 w-4 text-secondary-400 font-semibold" />}
                      </div>
                      <div>{gift.amount}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-secondary p-8 text-center font-medium">
                  There are no gifts yet!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gifts for Me Tab */}
      {activeTab === "gifts-for-me" && (
        <div className="flex flex-col space-y-8">
          {/* Hero section */}
          <div className="flex flex-col md:flex-row">
            <div className="order-2 mr-20 mt-8 flex flex-col space-y-2 md:order-1 md:mt-0">
              <h2 className="text-2xl font-semibold">Enjoy your presents</h2>
              <p className="text-secondary leading-7">
                You can hide Users' names in your Settings and receive
                gifts anonymously.
              </p>
            </div>
            <div className="order-1 ml-auto shrink-0 md:order-2">
              <MajorPoint
                name="Presents"
                secondaryName="your total gifts amount"
                value={totalPresents}
                valueClassName="text-accent"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-2xl font-semibold">Details</h2>
            <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
              {receivedGifts.length > 0 ? (
                <div className="grid">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_44px] sm:grid-cols-[100px_1fr_44px] md:grid-cols-[120px_1fr_180px_120px] gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8">
                    <div className="hidden sm:block">Date</div>
                    <div className="hidden md:block">User</div>
                    <div>Product</div>
                    <div>Amount</div>
                  </div>
                  {/* Rows */}
                  {receivedGifts.map((gift, index) => (
                    <div
                      key={gift.id}
                      className={`grid grid-cols-[1fr_44px] sm:grid-cols-[100px_1fr_44px] md:grid-cols-[120px_1fr_180px_120px] items-center gap-3 px-6 py-2 lg:px-8 ${
                        index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                      }`}
                    >
                      <div className="hidden sm:block">{gift.date}</div>
                      <div className="hidden md:block">{gift.isAnonymous ? "Anonymous" : gift.user}</div>
                      <div>Professional</div>
                      <div>{gift.amount}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-secondary p-8 text-center font-medium">
                  There are no gifts yet!
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </ContentPageLayout>
  );
}
