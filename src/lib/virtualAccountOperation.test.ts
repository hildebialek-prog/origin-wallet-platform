import { describe, expect, it, vi } from "vitest";
import { VirtualAccountOperationTracker } from "@/lib/virtualAccountOperation";

describe("VirtualAccountOperationTracker", () => {
  it("reuses one operation ID for retries of the same logical request", () => {
    const createOperationId = vi.fn(() => "operation-one");
    const tracker = new VirtualAccountOperationTracker(createOperationId);

    expect(tracker.getOrCreate()).toBe("operation-one");
    expect(tracker.getOrCreate()).toBe("operation-one");
    expect(createOperationId).toHaveBeenCalledTimes(1);
  });

  it("uses a different operation ID only after an explicit reset", () => {
    const createOperationId = vi
      .fn<() => string>()
      .mockReturnValueOnce("operation-one")
      .mockReturnValueOnce("operation-two");
    const tracker = new VirtualAccountOperationTracker(createOperationId);

    expect(tracker.getOrCreate()).toBe("operation-one");
    tracker.reset();
    expect(tracker.getOrCreate()).toBe("operation-two");
  });

  it("restores an unresolved operation ID after the page is recreated", () => {
    const storage = window.sessionStorage;
    const storageKey = "test:virtual-account-operation";
    storage.removeItem(storageKey);
    const first = new VirtualAccountOperationTracker(() => "operation-one", storage, storageKey);

    expect(first.getOrCreate()).toBe("operation-one");

    const recreated = new VirtualAccountOperationTracker(() => "operation-two", storage, storageKey);
    expect(recreated.getOrCreate()).toBe("operation-one");

    recreated.reset();
    expect(storage.getItem(storageKey)).toBeNull();
  });
});
