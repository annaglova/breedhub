import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Link } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h3 className="text-primary text-xl font-semibold">Your referral link</h3>

      <div className="flex">
        <Input
          className="flex-1 rounded-r-none"
          value={referralLink}
          readOnly
          disabled
        />
        <Button
          onClick={handleCopyLink}
          className="shrink-0 rounded-l-none gap-2"
          variant="default"
        >
          <Link className="h-4 w-4" />
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>

      <p className="text-sm text-secondary-500 dark:text-secondary-400">
        Share your personal link with friends
      </p>

      <p className="leading-7 text-secondary-700 dark:text-secondary-300">
        Send this link to friends or share it on social media. For more details,
        visit the Referrals page. This step completes automatically once you
        reach 5 referrals.
      </p>
    </div>
  );
}
