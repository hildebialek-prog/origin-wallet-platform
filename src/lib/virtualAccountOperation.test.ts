import { beforeEach, describe, expect, it, vi } from "vitest";
import { blocksAssignment, operationIdentity, safeProjection, scopeStorageKey, VirtualAccountOperationStore } from "./virtualAccountOperation";
import { operationContext as context, serverOperation, sharedTestLocks, vaRequest } from "@/test/virtualAccountFixtures";

describe("durable VA reservation", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  const store = (locks = sharedTestLocks(), createId = vi.fn(() => "operation-one")) =>
    new VirtualAccountOperationStore(() => localStorage, () => locks, createId);

  it("reserves one key across concurrent tabs and double clicks", async () => {
    const locks = sharedTestLocks();
    const createId = vi.fn(() => "operation-one");
    const first = store(locks, createId);
    const second = store(locks, vi.fn(() => "operation-two"));
    const reservations = await Promise.all([first.reserve(context, 7, vaRequest, 0), second.reserve(context, 7, vaRequest, 0), first.reserve(context, 7, vaRequest, 0)]);
    expect(reservations.filter((item) => item.created)).toHaveLength(1);
    expect(new Set(reservations.map((item) => item.operation.operationId)).size).toBe(1);
    expect((await first.read(context)).operations).toHaveLength(1);
    expect(createId).toHaveBeenCalledTimes(1);
  });

  it("a stale tab resumes a concurrently completed assignment instead of reserving another key", async () => {
    const locks = sharedTestLocks();
    const first = store(locks);
    const secondId = vi.fn(() => "operation-two");
    const second = store(locks, secondId);
    await first.reserve(context, 7, vaRequest, 0);
    await first.update(context, (scope) => { scope.operations[0].server = safeProjection(serverOperation({ status: "assigned", virtual_account_id: 87 })); });
    expect((await second.reserve(context, 7, vaRequest, 0)).created).toBe(false);
    expect(secondId).not.toHaveBeenCalled();
    // A deliberate fresh action, after reviewing generation 1, can reserve a new request.
    expect((await second.reserve(context, 7, vaRequest, 1)).created).toBe(true);
  });

  it("restores abandoned dispatch intent after reload and never expires its authority block", async () => {
    await store().reserve(context, 7, vaRequest, 0);
    const reloaded = store(sharedTestLocks(), vi.fn(() => "replacement"));
    const restored = await reloaded.read(context);
    expect(restored.operations[0]).toMatchObject({ operationId: "operation-one", submission: "dispatching", request: vaRequest });
    expect((await reloaded.reserve(context, 7, { ...vaRequest, currency: "EUR" }, 1)).created).toBe(false);
  });

  it("fails closed when storage writes fail or Web Locks are unavailable", async () => {
    const failing = new VirtualAccountOperationStore(() => ({ getItem: () => null, setItem: () => { throw new Error("Quota"); } }) as unknown as Storage, () => sharedTestLocks());
    await expect(failing.reserve(context, 7, vaRequest, 0)).rejects.toThrow(/shared request storage/);
    const unlocked = new VirtualAccountOperationStore(() => localStorage, () => undefined);
    await expect(unlocked.reserve(context, 7, vaRequest, 0)).rejects.toThrow(/shared request storage/);
  });

  it("does not overwrite corrupt saved state", async () => {
    localStorage.setItem(scopeStorageKey(context), "broken");
    await expect(store().reserve(context, 7, vaRequest, 0)).rejects.toThrow();
    expect(localStorage.getItem(scopeStorageKey(context))).toBe("broken");
  });

  it.each(["old-key", JSON.stringify({ version: 1, operationId: "old-key", request: vaRequest })])("retains legacy tracking without binding it to a guessed API/account identity", async (legacy) => {
    const key = "origin-wallet:virtual-account-operation:41";
    sessionStorage.setItem(key, legacy);
    const tracker = store();
    await tracker.migrateLegacy(context, sessionStorage);
    expect((await tracker.read(context)).legacy[0].operationId).toBe("old-key");
    expect(sessionStorage.getItem(key)).toBe(legacy);
    await expect(tracker.reserve(context, 7, vaRequest, 0)).rejects.toThrow();
  });

  it("isolates environments and users and uses account plus key as identity", async () => {
    const tracker = store();
    await tracker.reserve(context, 7, vaRequest, 0);
    expect((await tracker.read({ ...context, userId: "42" })).operations).toEqual([]);
    expect((await tracker.read({ ...context, environment: "https://other.test/api" })).operations).toEqual([]);
    expect(operationIdentity(7, "same-key")).not.toBe(operationIdentity(8, "same-key"));
  });

  it("persists only safe operation metadata, without tokens, banking details or provider payment numbers", async () => {
    const tracker = store();
    await tracker.reserve(context, 7, { ...vaRequest, token: "secret-token" } as typeof vaRequest, 0);
    await tracker.update(context, (scope) => { scope.operations[0].server = safeProjection({ ...serverOperation(), provider_payment_id: "sensitive-bank-number", raw: "private-evidence" } as ReturnType<typeof serverOperation>); });
    const saved = localStorage.getItem(scopeStorageKey(context));
    expect(saved).not.toMatch(/secret-token|sensitive-bank-number|private-evidence/);
    expect(blocksAssignment((await tracker.read(context)).operations[0])).toBe(true);
  });
});
