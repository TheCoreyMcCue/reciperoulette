export class EmailTakenError extends Error {
  constructor() {
    super("An account with that email already exists.");
    this.name = "EmailTakenError";
  }
}

export class NotFoundError extends Error {
  constructor(what = "Item") {
    super(`${what} not found.`);
    this.name = "NotFoundError";
  }
}

export function isConditionalCheckFailed(err: unknown): boolean {
  return err instanceof Error && err.name === "ConditionalCheckFailedException";
}

/** For TransactWrite: true if the item at `index` failed its condition. */
export function transactionConditionFailedAt(err: unknown, index: number): boolean {
  if (!(err instanceof Error) || err.name !== "TransactionCanceledException") return false;
  const reasons = (err as Error & { CancellationReasons?: { Code?: string }[] }).CancellationReasons;
  return reasons?.[index]?.Code === "ConditionalCheckFailed";
}
