import type { ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/services/apiClient";
import { POLL_DELAYS } from "@/lib/virtualAccountLifecycle";
import { scopeStorageKey, VirtualAccountOperationStore } from "@/lib/virtualAccountOperation";
import { operationContext, operationPage, serverOperation, sharedTestLocks, vaRequest, virtualAccount } from "@/test/virtualAccountFixtures";
import { useVirtualAccountOperation } from "./useVirtualAccountOperation";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "41" }, token: "test-token" },
  getProviderAccountOperations: vi.fn(), getVirtualAccounts: vi.fn(), requestVirtualAccount: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/services/apiClient", async (original) => ({ ...await original<typeof import("@/services/apiClient")>(), apiBaseUrl: "https://api.test/api" }));
vi.mock("@/services/providerAccountService", async (original) => ({ ...await original<typeof import("@/services/providerAccountService")>(),
  getProviderAccountOperations: mocks.getProviderAccountOperations, getVirtualAccounts: mocks.getVirtualAccounts,
  requestVirtualAccount: mocks.requestVirtualAccount,
}));

const advance = async (milliseconds = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); }); };
const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(() => useVirtualAccountOperation(), { wrapper }), client };
};

describe("VA hook GET-only polling", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    mocks.auth = { user: { id: "41" }, token: "test-token" };
    Object.defineProperty(navigator, "locks", { configurable: true, value: sharedTestLocks() });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    mocks.getProviderAccountOperations.mockResolvedValue(operationPage([serverOperation()]));
    mocks.getVirtualAccounts.mockResolvedValue([]);
  });
  afterEach(() => {
    cleanup(); vi.useRealTimers();
    delete (navigator as unknown as Record<string, unknown>).locks;
    delete (navigator as unknown as Record<string, unknown>).onLine;
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  it("discovers on mount, follows bounded backoff, and resumes only GET with Check status", async () => {
    const { result } = setup();
    await advance();
    expect(result.current.state.scope.operations[0].operationId).toBe("operation-one");
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledTimes(1);
    for (const delay of POLL_DELAYS) await advance(delay);
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledTimes(1 + POLL_DELAYS.length);
    expect(result.current.pollingPaused).toMatch(/Automatic status checks paused/);
    await advance(120000);
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledTimes(1 + POLL_DELAYS.length);
    await act(async () => { await result.current.refresh(); });
    await advance();
    expect(result.current.pollingPaused).toBe("");
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("pauses offline and hidden, then reconciles saved intent on reconnect and visibility", async () => {
    const { result } = setup();
    await advance();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => { window.dispatchEvent(new Event("offline")); });
    await advance(60000);
    expect(result.current.pollingPaused).toMatch(/offline/);
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => { window.dispatchEvent(new Event("online")); });
    await advance();
    expect(result.current.pollingPaused).toMatch(/hidden/);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    await advance();
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledTimes(2);
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it.each([401, 403])("suspends after GET HTTP %s until an explicit status check", async (status) => {
    mocks.getProviderAccountOperations.mockRejectedValueOnce(new ApiRequestError("Authorization required", status));
    const { result } = setup();
    await advance();
    expect(result.current.state.authorizationPaused).toBe(true);
    act(() => { window.dispatchEvent(new Event("online")); });
    await advance(120000);
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledTimes(1);
    expect(result.current.pollingPaused).toMatch(/authorized account/);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.state.authorizationPaused).toBe(false);
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("recovers a reservation from another tab's storage event without dispatching", async () => {
    mocks.getProviderAccountOperations.mockResolvedValue(operationPage());
    const { result } = setup();
    await advance();
    const store = new VirtualAccountOperationStore(() => localStorage, () => navigator.locks, () => "cross-tab-key");
    await act(async () => { await store.reserve(operationContext, 7, vaRequest, 0); });
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: scopeStorageKey(operationContext) })); });
    await advance();
    expect(result.current.state.scope.operations).toHaveLength(1);
    expect(result.current.blocked).toBe(true);
    expect(mocks.getProviderAccountOperations).toHaveBeenCalledWith(expect.objectContaining({ providerAccountId: 7, operationId: expect.any(String) }));
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("refreshes enrichment and the existing list cache, then stops unnecessary polling", async () => {
    mocks.getProviderAccountOperations.mockResolvedValue(operationPage());
    mocks.getVirtualAccounts.mockResolvedValueOnce([virtualAccount({ enrichment: { status: "running", next_attempt_at: null, updated_at: null } })])
      .mockResolvedValue([virtualAccount({ enrichment: { status: "complete", next_attempt_at: null, updated_at: null } })]);
    const { result, client } = setup();
    await advance();
    expect(result.current.state.accounts[0].enrichment.status).toBe("running");
    await advance(POLL_DELAYS[0]);
    expect(client.getQueryData(["nium-virtual-accounts", "41", "nium", "test-token"])).toEqual([virtualAccount({ enrichment: { status: "complete", next_attempt_at: null, updated_at: null } })]);
    await advance(300000);
    expect(mocks.getVirtualAccounts).toHaveBeenCalledTimes(2);
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("does not publish a stale user's delayed response into the next user's cache", async () => {
    let resolveOld: (value: ReturnType<typeof operationPage>) => void;
    mocks.getProviderAccountOperations.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const { result, rerender, client } = setup();
    await advance();
    mocks.auth = { user: { id: "42" }, token: "other-token" };
    mocks.getProviderAccountOperations.mockResolvedValue({ ...operationPage([serverOperation({ provider_account_id: 8, operation_id: "new-user-operation" })]),
      provider_account: { id: 8, status: "active" } });
    rerender();
    await advance();
    await act(async () => { resolveOld(operationPage([serverOperation({ operation_id: "old-user-operation" })])); });
    expect(result.current.state.scope.userId).toBe("42");
    expect(result.current.state.scope.operations[0].operationId).toBe("new-user-operation");
    expect(client.getQueryData(["nium-virtual-accounts", "41", "nium", "test-token"])).toBeUndefined();
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });
});
