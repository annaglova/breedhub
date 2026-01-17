import { toast } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import { Copy, Link } from "lucide-react";
import { useState } from "react";

interface WelcomeReferralProps {
  onComplete?: () => void;
}

/**
 * WelcomeReferral - Step to share referral link
 *
 * Shows user's personal referral link and allows
 * them to copy and share it.
 */
export function WelcomeReferral({ onComplete }: WelcomeReferralProps) {
  // TODO: Get actual referral link from user data
  const [referralLink] = useState("https://breedhub.com/ref/abc123");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Link copied");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h3 className="text-primary text-xl font-semibold">Your personal referral link</h3>

      {/* Link display card */}
      <div className="flex items-center gap-3 rounded-lg bg-secondary-100 dark:bg-secondary-800 px-4 py-3">
        <Link className="h-5 w-5 text-secondary-500 dark:text-secondary-400 shrink-0" />
        <span className="text-secondary-700 dark:text-secondary-300 text-sm break-all">
          {referralLink}
        </span>
      </div>

      {/* Copy button */}
      <Button
        onClick={handleCopyLink}
        className="w-full gap-2 font-semibold"
      >
        <Copy className="h-4 w-4" />
        Copy to clipboard
      </Button>

      <p className="text-[0.9rem] leading-7 text-secondary-700 dark:text-secondary-300">
        Send this link to friends or share it on social media. For more details,
        visit the Referrals page. This step completes automatically once you
        reach 5 referrals.
      </p>
    </div>
  );
}
