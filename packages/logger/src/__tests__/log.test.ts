import { describe, it, expect, jest } from "@jest/globals";
import { log } from "..";

jest.spyOn(global.console, "log");

describe("@tutly/logger", () => {
  it("prints a message", () => {
    log("hello");
    expect(console.log).toHaveBeenCalled();
  });
});
