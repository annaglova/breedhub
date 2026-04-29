// @vitest-environment jsdom

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const callRpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/SpaceContext", () => ({
  useSelectedEntity: () => ({ id: "contact-1", slug: "ada" }),
}));

vi.mock("@breedhub/rxdb-store", () => ({
  spaceStore: {
    callRpc: callRpcMock,
    isFullscreen: { value: true },
  },
}));

vi.mock("@preact/signals-react/runtime", () => ({
  useSignals: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

describe("ContactJudgeTab RPC cache path", () => {
  beforeEach(() => {
    callRpcMock.mockReset();
    callRpcMock.mockResolvedValue({
      data: [
        {
          id: "root-1",
          name: "BIS",
          competition_order: 1,
          has_entry: true,
          international_judgment: false,
          has_children: false,
        },
      ],
      error: null,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("loads judge tree levels through spaceStore.callRpc", async () => {
    const { ContactJudgeTab } = await import(
      "../../src/components/contact/tabs/ContactJudgeTab"
    );

    render(<ContactJudgeTab />);

    await waitFor(() => expect(callRpcMock).toHaveBeenCalledTimes(1));
    expect(callRpcMock).toHaveBeenCalledWith(
      "get_contact_judge_tree_level",
      {
        p_contact_id: "contact-1",
        p_parent_id: null,
      },
      { cacheTtlMs: 120_000 },
    );
  });
});
