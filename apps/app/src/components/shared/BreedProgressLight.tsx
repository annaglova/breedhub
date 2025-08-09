import { Breed } from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";

interface BreedProgressLightProps {
  breed: Breed;
  className?: string;
}

export function BreedProgressLight({
  breed,
  className = "",
}: BreedProgressLightProps) {
  // Якщо немає прогресу, не показуємо компонент
  if (!breed.AchievementProgress || breed.AchievementProgress <= 0) {
    return null;
  }

  // Функція для пошуку останнього досягнення (аналог findElementWithMaxPosition)
  const getLastAchievement = () => {
    // Поки що просто повертаємо placeholder, оскільки в нашій моделі немає Achievements
    return "Breed's support level";
  };

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
        <div>{getLastAchievement()}</div>
      </TooltipContent>
    </Tooltip>
  );
}
