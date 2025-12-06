import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";

interface BreedProgressLightProps {
  breed: {
    AchievementProgress?: number;
    SupportLabel?: string;
  };
  className?: string;
}

export function BreedProgressLight({
  breed,
  className = "",
}: BreedProgressLightProps) {
  // Don't show progress bar if no progress
  if (!breed.AchievementProgress || breed.AchievementProgress <= 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex h-[10px] w-24 items-center rounded-full border border-primary-500 ${className}`}
        >
          <div
            className="bg-primary-500 mx-0.5 my-auto h-1.5 rounded-full"
            style={{
              width: `${breed.AchievementProgress}%`,
            }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={5}>
        <div>{breed.SupportLabel || "Breed's support level"}</div>
      </TooltipContent>
    </Tooltip>
  );
}
