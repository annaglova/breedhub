import { describe, expect, it } from "vitest";
import {
  buildCompositeNextCursor,
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

  describe("buildCompositeNextCursor", () => {
    it("returns null when lastRecord is missing", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: undefined,
          orderBy: { field: "name", direction: "asc" },
        }),
      ).toBeNull();
    });

    it("returns null when hasMorePages is explicitly false", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: { id: "r-1", name: "Alpha" },
          orderBy: { field: "name", direction: "asc" },
          hasMorePages: false,
        }),
      ).toBeNull();
    });

    it("builds a cursor when hasMorePages is undefined", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: { id: "r-1", name: "Alpha", rating: 9 },
          orderBy: {
            field: "name",
            direction: "asc",
            tieBreaker: { field: "rating", direction: "desc" },
          },
        }),
      ).toBe(
        JSON.stringify({
          value: "Alpha",
          tieBreaker: 9,
          tieBreakerField: "rating",
        }),
      );
    });

    it("builds a cursor when hasMorePages is true", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: { id: "r-1", name: "Alpha" },
          orderBy: { field: "name", direction: "asc" },
          hasMorePages: true,
        }),
      ).toBe(
        JSON.stringify({
          value: "Alpha",
          tieBreaker: "r-1",
          tieBreakerField: "id",
        }),
      );
    });

    it("coalesces a missing orderBy field value to null", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: { id: "r-1" },
          orderBy: { field: "name", direction: "asc" },
        }),
      ).toBe(
        JSON.stringify({
          value: null,
          tieBreaker: "r-1",
          tieBreakerField: "id",
        }),
      );
    });

    it("falls back to id when tieBreaker.field is missing", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: { id: "r-1", name: "Alpha" },
          orderBy: {
            field: "name",
            direction: "asc",
          },
        }),
      ).toBe(
        JSON.stringify({
          value: "Alpha",
          tieBreaker: "r-1",
          tieBreakerField: "id",
        }),
      );
    });

    it("writes the composite cursor shape using order and tieBreaker fields", () => {
      expect(
        buildCompositeNextCursor({
          lastRecord: { id: "r-1", name: "Alpha", rank: 3 },
          orderBy: {
            field: "name",
            direction: "asc",
            tieBreaker: { field: "rank", direction: "asc" },
          },
        }),
      ).toBe(
        JSON.stringify({
          value: "Alpha",
          tieBreaker: 3,
          tieBreakerField: "rank",
        }),
      );
    });
  });
});
