interface WelcomeMergeProps {
  onComplete?: () => void;
}

/**
 * WelcomeMerge - Step to merge duplicate records
 *
 * Shows potential duplicate records found by the system
 * and allows user to select which ones to merge.
 */
export function WelcomeMerge({ onComplete }: WelcomeMergeProps) {
  return (
    <div className="flex flex-col space-y-4">
      <p className="leading-7 text-secondary-700 dark:text-secondary-300">
        Our system identified these records as potential duplicates. Select
        duplicate records and click the submit button to merge the data.
      </p>

      {/* Placeholder for duplicate records list */}
      <div className="rounded-lg border border-dashed border-secondary-300 dark:border-secondary-600 p-6 text-center">
        <p className="text-secondary-500 dark:text-secondary-400">
          Duplicate records will be displayed here
        </p>
      </div>
    </div>
  );
}
