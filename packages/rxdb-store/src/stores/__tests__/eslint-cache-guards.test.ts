import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import eslintConfig from "../../../../../eslint.config.js";

describe("cache ESLint guards", () => {
  it("flags direct optional additional-field reads outside the helper", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: eslintConfig,
    });

    const [result] = await eslint.lintText(
      [
        "const record = { additional: {} as Record<string, unknown> };",
        "const name = 'contact_id';",
        "record.additional?.[name];",
      ].join("\n"),
      {
        filePath: "apps/app/src/cache-guard-demo.ts",
      },
    );

    expect(
      result.messages.some((message) =>
        message.message.includes("use getChildField"),
      ),
    ).toBe(true);
  });

  it("allows the blessed getChildField access pattern", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: eslintConfig,
    });

    const [result] = await eslint.lintText(
      [
        "import { getChildField } from '@breedhub/rxdb-store';",
        "const record = { additional: { contact_id: 'contact-1' } };",
        "getChildField(record, 'contact_id');",
      ].join("\n"),
      {
        filePath: "apps/app/src/cache-guard-demo.ts",
      },
    );

    expect(
      result.messages.filter((message) =>
        message.message.includes("use getChildField"),
      ),
    ).toEqual([]);
  });
});
