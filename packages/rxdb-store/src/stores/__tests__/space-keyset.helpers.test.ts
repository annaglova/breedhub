import { describe, expect, it } from "vitest";
import {
  buildNextKeysetCursor,
  buildNextKeysetCursorFromAdditional,
} from "../space-keyset.helpers";

describe("space-keyset.helpers", () => {
  describe("buildNextKeysetCursor", () => {
    it("returns null when record is missing", () => {
      expect(
        buildNextKeysetCursor(null, { field: "name", direction: "asc" }),
      ).toBeNull();
    });

    it("writes top-level value and tieBreaker when parameter is absent", () => {
      const cursor = buildNextKeysetCursor(
        { id: "r-1", name: "Alpha", rating: 10 },
        {
          field: "name",
          direction: "asc",
          tieBreaker: { field: "rating", direction: "desc" },
        },
      );

      expect(cursor).toBe(
        JSON.stringify({
          value: "Alpha",
          tieBreaker: 10,
          tieBreakerField: "rating",
        }),
      );
    });

    it("writes nested JSONB value when orderBy.parameter is set", () => {
      const cursor = buildNextKeysetCursor(
        {
          id: "r-1",
          metrics: { score: 9 },
          rank: 2,
        },
        {
          field: "metrics",
          parameter: "score",
          direction: "desc",
          tieBreaker: { field: "rank", direction: "desc" },
        },
      );

      expect(cursor).toBe(
        JSON.stringify({
          value: 9,
          tieBreaker: 2,
          tieBreakerField: "rank",
        }),
      );
    });

    it("writes nested JSONB tieBreaker when tieBreaker.parameter is set", () => {
      const cursor = buildNextKeysetCursor(
        {
          id: "r-1",
          metrics: { score: 9 },
          extra: { weight: 4 },
        },
        {
          field: "metrics",
          parameter: "score",
          direction: "desc",
          tieBreaker: {
            field: "extra",
            parameter: "weight",
            direction: "desc",
          },
        },
      );

      expect(cursor).toBe(
        JSON.stringify({
          value: 9,
          tieBreaker: 4,
          tieBreakerField: "extra",
        }),
      );
    });

    it("falls back to id when tieBreaker parameter value is missing", () => {
      const cursor = buildNextKeysetCursor(
        { id: "r-1", metrics: { score: 9 }, extra: {} },
        {
          field: "metrics",
          parameter: "score",
          direction: "desc",
          tieBreaker: {
            field: "extra",
            parameter: "weight",
            direction: "desc",
          },
        },
      );

      expect(cursor).toBe(
        JSON.stringify({
          value: 9,
          tieBreaker: "r-1",
          tieBreakerField: "extra",
        }),
      );
    });
  });

  describe("buildNextKeysetCursorFromAdditional", () => {
    it("prefers nested additional JSONB value over top-level when parameter is set", () => {
      const cursor = buildNextKeysetCursorFromAdditional(
        {
          id: "r-1",
          additional: { metrics: { score: 7 }, rank: 3 },
        },
        {
          field: "metrics",
          parameter: "score",
          direction: "desc",
          tieBreaker: { field: "rank", direction: "desc" },
        },
      );

      expect(cursor).toBe(
        JSON.stringify({
          value: 7,
          tieBreaker: 3,
          tieBreakerField: "rank",
        }),
      );
    });
  });
});
