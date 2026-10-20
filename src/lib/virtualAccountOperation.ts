export type OperationIdFactory = () => string;

const defaultOperationIdFactory: OperationIdFactory = () => crypto.randomUUID();

export class VirtualAccountOperationTracker {
  private operationId: string | null;

  constructor(
    private readonly createOperationId: OperationIdFactory = defaultOperationIdFactory,
    private readonly storage?: Storage,
    private readonly storageKey = "origin-wallet:virtual-account-operation",
  ) {
    this.operationId = storage?.getItem(storageKey) || null;
  }

  getOrCreate(): string {
    if (this.operationId === null) {
      this.operationId = this.createOperationId();
      this.storage?.setItem(this.storageKey, this.operationId);
    }

    return this.operationId;
  }

  reset(): void {
    this.operationId = null;
    this.storage?.removeItem(this.storageKey);
  }

  current(): string | null {
    return this.operationId;
  }
}
