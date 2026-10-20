export type OperationIdFactory = () => string;

export interface VirtualAccountRequestSnapshot {
  providerCode: string;
  currency: string;
  accountCategory: string;
  accountType: string;
}

export interface VirtualAccountOperation {
  version: 1;
  operationId: string;
  request: VirtualAccountRequestSnapshot;
}

const defaultOperationIdFactory: OperationIdFactory = () => crypto.randomUUID();

const copyOperation = (operation: VirtualAccountOperation): VirtualAccountOperation => ({
  ...operation,
  request: { ...operation.request },
});

const isRequestSnapshot = (value: unknown): value is VirtualAccountRequestSnapshot => {
  if (!value || typeof value !== "object") return false;

  const request = value as Record<string, unknown>;
  return ["providerCode", "currency", "accountCategory", "accountType"].every(
    (key) => typeof request[key] === "string" && request[key] !== "",
  );
};

const isOperation = (value: unknown): value is VirtualAccountOperation => {
  if (!value || typeof value !== "object") return false;

  const operation = value as Record<string, unknown>;
  return operation.version === 1 && typeof operation.operationId === "string" && isRequestSnapshot(operation.request);
};

const requestsMatch = (left: VirtualAccountRequestSnapshot, right: VirtualAccountRequestSnapshot) =>
  left.providerCode === right.providerCode &&
  left.currency === right.currency &&
  left.accountCategory === right.accountCategory &&
  left.accountType === right.accountType;

export class VirtualAccountOperationTracker {
  private operation: VirtualAccountOperation | null = null;
  private legacyOperationId: string | null = null;

  constructor(
    private readonly createOperationId: OperationIdFactory = defaultOperationIdFactory,
    private readonly storage?: Storage,
    private readonly storageKey = "origin-wallet:virtual-account-operation",
  ) {
    const storedValue = storage?.getItem(storageKey);

    if (storedValue) {
      try {
        const parsed: unknown = JSON.parse(storedValue);
        if (isOperation(parsed)) this.operation = copyOperation(parsed);
        else this.legacyOperationId = storedValue;
      } catch {
        this.legacyOperationId = storedValue;
      }
    }
  }

  getOrCreate(request: VirtualAccountRequestSnapshot): VirtualAccountOperation {
    if (this.legacyOperationId) {
      throw new Error("The saved operation cannot be retried safely because its original request parameters are unavailable.");
    }

    if (this.operation && !requestsMatch(this.operation.request, request)) {
      throw new Error("This operation belongs to different virtual account request parameters.");
    }

    if (this.operation === null) {
      this.operation = {
        version: 1,
        operationId: this.createOperationId(),
        request: { ...request },
      };
      this.storage?.setItem(this.storageKey, JSON.stringify(this.operation));
    }

    return copyOperation(this.operation);
  }

  matches(request: VirtualAccountRequestSnapshot): boolean {
    return this.operation === null || requestsMatch(this.operation.request, request);
  }

  hasUnrestorableOperation(): boolean {
    return this.legacyOperationId !== null;
  }

  reset(): void {
    this.operation = null;
    this.legacyOperationId = null;
    this.storage?.removeItem(this.storageKey);
  }

  current(): VirtualAccountOperation | null {
    return this.operation ? copyOperation(this.operation) : null;
  }
}
