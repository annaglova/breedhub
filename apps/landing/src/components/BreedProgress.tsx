import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import * as React from "react";

export type Breed = {
  Name: string;
  PetProfileCount: number;
  KennelCount: number;
  PatronCount: number;
  AchievementProgress: number;
  LastAchievement: { Name: string };
};

export function BreedProgress({
  breed,
  mode = "col",
  simpleView = true,
}: {
  breed: Breed;
  mode?: "col" | "row";
  simpleView?: boolean;
}) {
  // Текст тултіпа
  const toolTipText = React.useMemo(
    () =>
      `${breed.Name}
Pet profiles - ${breed.PetProfileCount}
Kennels - ${breed.KennelCount}
Patrons - ${breed.PatronCount}
Breed's support level - ${breed.LastAchievement?.Name ?? "-"}`,
    [breed]
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex w-full items-center py-0.5 ${
              mode === "row" ? "flex-col" : ""
            } cursor-pointer`}
          >
            <div className="mr-2">
              {mode === "col" && (
                <>
                  <div className="lg:w-62 w-40 text-right sm:w-52">
                    {breed.Name}
                  </div>
                  {!simpleView && (
                    <div className="text-secondary text-md text-end">
                      Pet profiles: {breed.PetProfileCount}
                    </div>
                  )}
                </>
              )}
            </div>

            {mode === "row" && (
              <div className="flex w-full">
                <div className="flex w-full truncate">{breed.Name}</div>
                <div className="w-13 text-end">
                  {breed.AchievementProgress}%
                </div>
              </div>
            )}

            <div className="flex w-full items-center">
              <div className="from-primary-300 flex h-4 w-full items-center rounded-full bg-gradient-to-r via-pink-300 to-orange-300">
                <div className="mx-1 flex h-2 w-full items-center rounded-full bg-white ring-2 ring-white ring-offset-0">
                  <div
                    className="from-primary-400 my-auto h-2 rounded-full bg-gradient-to-r via-pink-400 to-orange-400"
                    style={{
                      width: `${breed.AchievementProgress}%`,
                    }}
                  ></div>
                </div>
              </div>
              {mode === "col" && (
                <div className="ml-2">
                  <div className="w-13">{breed.AchievementProgress}%</div>
                  {!simpleView && (
                    <div className="text-secondary text-md w-32">
                      {breed.LastAchievement?.Name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <pre className="text-xs">{toolTipText}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
