interface WelcomeCoverProps {
  onComplete?: () => void;
}

/**
 * WelcomeCover - Step to customize default cover
 *
 * Allows user to customize their default cover
 * to make public pages stand out.
 */
export function WelcomeCover({ onComplete }: WelcomeCoverProps) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Placeholder for cover customization */}
      <div className="rounded-lg border border-dashed border-secondary-300 dark:border-secondary-600 p-6 text-center">
        <p className="text-secondary-500 dark:text-secondary-400">
          Cover customization options will be displayed here
        </p>
      </div>
    </div>
  );
}
