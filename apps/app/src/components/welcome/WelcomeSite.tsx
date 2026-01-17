interface WelcomeSiteProps {
  onComplete?: () => void;
}

/**
 * WelcomeSite - Step to publish site
 *
 * Allows user to choose a domain name
 * and publish their kennel website.
 */
export function WelcomeSite({ onComplete }: WelcomeSiteProps) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Placeholder for site publishing */}
      <div className="rounded-lg border border-dashed border-secondary-300 dark:border-secondary-600 p-6 text-center">
        <p className="text-secondary-500 dark:text-secondary-400">
          Site publishing options will be displayed here
        </p>
      </div>
    </div>
  );
}
