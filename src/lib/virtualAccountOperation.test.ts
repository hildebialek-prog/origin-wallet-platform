import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VirtualAccountOperationTracker,
  type VirtualAccountRequestSnapshot,
} from "@/lib/virtualAccountOperation";

const usdRequest: VirtualAccountRequestSnapshot = {
  providerCode: "nium",
  currency: "USD",
  accountCategory: "SELF_FUNDING_ACCOUNT",
  accountType: "LOCAL",
};

describe("VirtualAccountOperationTracker", () => {
  const storageKey = "test:virtual-account-operation";

  beforeEach(() => window.sessionStorage.removeItem(storageKey));

  it("reuses the operation ID and original parameters for a retry", () => {
    const createOperationId = vi.fn(() => "operation-one");
    const tracker = new VirtualAccountOperationTracker(createOperationId);

    expect(tracker.getOrCreate(usdRequest)).toEqual({ version: 1, operationId: "operation-one", request: usdRequest });
    expect(tracker.getOrCreate({ ...usdRequest })).toEqual({
      version: 1,
      operationId: "operation-one",
      request: usdRequest,
    });
    expect(createOperationId).toHaveBeenCalledTimes(1);
  });

  it("restores the operation ID and immutable request parameters after reload", () => {
    const first = new VirtualAccountOperationTracker(() => "operation-one", window.sessionStorage, storageKey);
    first.getOrCreate(usdRequest);

    const recreated = new VirtualAccountOperationTracker(() => "operation-two", window.sessionStorage, storageKey);
    expect(recreated.current()).toEqual({ version: 1, operationId: "operation-one", request: usdRequest });

    const returned = recreated.current();
    if (returned) returned.request.currency = "EUR";
    expect(recreated.current()?.request.currency).toBe("USD");
  });

  it("never reuses an unresolved operation ID with changed parameters", () => {
    const tracker = new VirtualAccountOperationTracker(() => "operation-one");
    tracker.getOrCreate(usdRequest);

    const changedRequest = { ...usdRequest, currency: "EUR" };
    expect(tracker.matches(changedRequest)).toBe(false);
    expect(() => tracker.getOrCreate(changedRequest)).toThrow(/different virtual account request parameters/i);
    expect(tracker.current()?.request).toEqual(usdRequest);
  });

  it("creates a distinct operation only after a deliberate reset", () => {
    const createOperationId = vi
      .fn<() => string>()
      .mockReturnValueOnce("operation-one")
      .mockReturnValueOnce("operation-two");
    const tracker = new VirtualAccountOperationTracker(createOperationId, window.sessionStorage, storageKey);

    tracker.getOrCreate(usdRequest);
    tracker.reset();

    const eurRequest = { ...usdRequest, currency: "EUR" };
    expect(tracker.getOrCreate(eurRequest)).toEqual({
      version: 1,
      operationId: "operation-two",
      request: eurRequest,
    });
  });

  it("clears stored state only when reset after confirmed success", () => {
    const tracker = new VirtualAccountOperationTracker(() => "operation-one", window.sessionStorage, storageKey);
    tracker.getOrCreate(usdRequest);

    expect(window.sessionStorage.getItem(storageKey)).not.toBeNull();
    tracker.reset();
    expect(tracker.current()).toBeNull();
    expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("preserves and blocks legacy ID-only state until an explicit reset", () => {
    window.sessionStorage.setItem(storageKey, "operation-one");

    const tracker = new VirtualAccountOperationTracker(() => "operation-two", window.sessionStorage, storageKey);
    expect(tracker.current()).toBeNull();
    expect(tracker.hasUnrestorableOperation()).toBe(true);
    expect(() => tracker.getOrCreate(usdRequest)).toThrow(/cannot be retried safely/i);
    expect(window.sessionStorage.getItem(storageKey)).toBe("operation-one");

    tracker.reset();
    expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  });
});
