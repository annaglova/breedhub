import { render, screen } from "@testing-library/react";
import { InfoRow } from "../src/components/shared/InfoRow";

describe("InfoRow", () => {
  it("renders icon, labels, and content through the RTL bootstrap", () => {
    render(
      <div className="grid grid-cols-[16px_60px_1fr]">
        <InfoRow
          icon={<svg aria-label="Breed icon" />}
          label="Breed"
          subLabel="Origin"
        >
          <span>Ukrainian line</span>
        </InfoRow>
      </div>,
    );

    expect(screen.getByLabelText("Breed icon")).toBeInTheDocument();
    expect(screen.getByText("Breed")).toBeInTheDocument();
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Ukrainian line")).toBeInTheDocument();
  });
});
