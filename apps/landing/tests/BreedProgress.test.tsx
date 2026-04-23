import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreedProgress, type Breed } from "../src/components/BreedProgress";

describe("BreedProgress", () => {
  it("renders breed name and progress width", () => {
    const breed: Breed = {
      Name: "Labrador Retriever",
      PetProfileCount: 128,
      KennelCount: 18,
      PatronCount: 7,
      AchievementProgress: 64,
      LastAchievement: { Name: "Gold" },
    };

    const { container } = render(<BreedProgress breed={breed} />);

    expect(screen.getByText(breed.Name)).toBeInTheDocument();
    expect(screen.getByText("64%")).toBeInTheDocument();

    const progressFill = container.querySelector('[style*="width: 64%"]');
    expect(progressFill).toBeInTheDocument();
    expect(progressFill).toHaveStyle({ width: "64%" });
  });
});
