interface WelcomeTierSelectionProps {
  onComplete?: () => void;
}

/**
 * WelcomeTierSelection - Step to select subscription tier
 *
 * Allows user to choose the subscription tier
 * that best fits their needs.
 */
export function WelcomeTierSelection({
  onComplete,
}: WelcomeTierSelectionProps) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Placeholder for tier selection cards */}
      <div className="rounded-lg border border-dashed border-secondary-300 dark:border-secondary-600 p-6 text-center">
        <p className="text-secondary-500 dark:text-secondary-400">
          Subscription options coming soon
        </p>
      </div>
    </div>
  );
}
