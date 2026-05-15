import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSpace } from "@/components/dashboard/DashboardSpace";
import { RecentActivity } from "@/components/dashboard/widgets/RecentActivity";
import { SubscribeHero } from "@/components/dashboard/widgets/SubscribeHero";

describe("DashboardSpace", () => {
  it("renders all major sections by default", () => {
    render(<DashboardSpace />);
    expect(screen.getByText(/at a glance/i)).toBeInTheDocument();
    expect(screen.getByText(/schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/^calendar$/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    expect(screen.getByText(/^activity$/i)).toBeInTheDocument();
  });

  it("renders the Top kennels banner with the user's rank", () => {
    render(<DashboardSpace />);
    expect(screen.getByText(/top breeders/i)).toBeInTheDocument();
    expect(screen.getByText("#14")).toBeInTheDocument();
    expect(screen.getByText(/climb/i)).toBeInTheDocument();
  });

  it("hides the Subscribe hero when isPaid is true but keeps Top kennels", () => {
    render(<DashboardSpace isPaid />);
    expect(screen.queryByRole("heading", { name: /unlock your kennel page/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /upgrade to patron/i })).toBeNull();
    expect(screen.getByText(/top breeders/i)).toBeInTheDocument();
  });
});

describe("SubscribeHero", () => {
  it("shows the upgrade CTA when isPaid is false", () => {
    render(<SubscribeHero isPaid={false} />);
    expect(screen.getByRole("button", { name: /upgrade to patron/i })).toBeInTheDocument();
  });

  it("renders nothing when isPaid is true", () => {
    const { container } = render(<SubscribeHero isPaid />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("RecentActivity relative time formatting", () => {
  const NOW = new Date("2026-05-15T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const entry = (id: string, minutesAgo: number) => ({
    id,
    occurredAt: new Date(NOW.getTime() - minutesAgo * 60 * 1000),
    kind: "note" as const,
    title: `entry-${id}`,
  });

  it("labels entries under one hour as 'Just now'", () => {
    render(<RecentActivity entries={[entry("a", 30)]} />);
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it("uses '... hours ago' between 1 and 23 hours", () => {
    render(<RecentActivity entries={[entry("a", 60 * 5)]} />);
    expect(screen.getByText(/5 hours ago/i)).toBeInTheDocument();
  });

  it("uses 'Yesterday' for ~24 hours ago", () => {
    render(<RecentActivity entries={[entry("a", 60 * 24)]} />);
    expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
  });

  it("uses '... days ago' for 2–6 days", () => {
    render(<RecentActivity entries={[entry("a", 60 * 24 * 3)]} />);
    expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
  });
});
