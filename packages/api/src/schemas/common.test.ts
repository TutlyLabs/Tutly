import { describe, expect, it } from "vitest";

import { paginationSchema, sandpackFilesSchema } from "./common";

describe("sandpackFilesSchema", () => {
  it("accepts the shapes Sandpack actually produces", () => {
    // Sandpack allows a bare string or a file object, and attaches its own
    // metadata alongside `code`. Rejecting any of these would break submission.
    expect(
      sandpackFilesSchema.safeParse({
        "/App.tsx": "export default () => null;",
        "/index.ts": { code: "import './App';" },
        "/hidden.ts": { code: "x", hidden: true, readOnly: true, active: false },
        "/empty.ts": {},
      }).success,
    ).toBe(true);
  });

  it("accepts an empty file map", () => {
    expect(sandpackFilesSchema.safeParse({}).success).toBe(true);
  });

  it("rejects entries that carry no recoverable contents", () => {
    // These used to be silently dropped, so a submission could lose a file
    // without anyone being told. Failing loudly is the point of the schema.
    for (const bad of [null, 42, ["a"]]) {
      expect(sandpackFilesSchema.safeParse({ "/a.ts": bad }).success).toBe(
        false,
      );
    }
  });

  it("rejects a non-string code field", () => {
    expect(
      sandpackFilesSchema.safeParse({ "/a.ts": { code: 1 } }).success,
    ).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("applies defaults", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 10 });
  });

  it("bounds limit so a caller cannot request the whole table", () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});
