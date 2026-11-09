/**
 * Minimal in-memory DynamoDB DocumentClient for tests and local UI smoke
 * tests. Supports just the subset of expressions this app uses:
 *  - Get / Put / Delete / Update / Query / TransactWrite
 *  - Conditions: attribute_exists(x), attribute_not_exists(x)
 *  - Updates: SET a = :v, b = if_not_exists(b, :v)  and  ADD n :v
 *  - Key conditions: X = :v [AND begins_with(Y, :v)]
 * Not a general emulator; extend as needed.
 */
type Item = Record<string, unknown>;
type Input = Record<string, unknown> & {
  TableName?: string;
  Key?: Item;
  Item?: Item;
  ConditionExpression?: string;
  UpdateExpression?: string;
  KeyConditionExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
  IndexName?: string;
  ScanIndexForward?: boolean;
  ReturnValues?: string;
  TransactItems?: Record<string, Input>[];
};

const awsError = (name: string, extra: object = {}) =>
  Object.assign(new Error(name), { name, ...extra });

export class FakeDynamo {
  items = new Map<string, Item>();
  calls: { command: string; input: Input }[] = [];

  private key(k: Item) {
    return `${String(k.PK)}\u0000${String(k.SK)}`;
  }

  private name(token: string, names: Record<string, string> = {}) {
    return token.startsWith("#") ? (names[token] ?? token) : token;
  }

  private checkCondition(existing: Item | undefined, input: Input) {
    const expr = input.ConditionExpression;
    if (!expr) return true;
    const m = expr.trim().match(/^(attribute_exists|attribute_not_exists)\((\S+)\)$/);
    if (!m) throw new Error(`FakeDynamo: unsupported condition ${expr}`);
    const attr = this.name(m[2]!, input.ExpressionAttributeNames);
    const has = existing !== undefined && existing[attr] !== undefined;
    return m[1] === "attribute_exists" ? has : !has;
  }

  private applyUpdate(item: Item, input: Input) {
    const names = input.ExpressionAttributeNames ?? {};
    const values = input.ExpressionAttributeValues ?? {};
    const expr = input.UpdateExpression ?? "";
    const parts = expr.split(/\b(SET|ADD|REMOVE)\b/).map((s) => s.trim()).filter(Boolean);
    const updated: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const kind = parts[i];
      const body = parts[i + 1] ?? "";
      const clauses: string[] = [];
      let depth = 0, cur = "";
      for (const ch of body) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) { clauses.push(cur); cur = ""; } else cur += ch;
      }
      if (cur.trim()) clauses.push(cur);
      for (const raw of clauses) {
        const c = raw.trim();
        if (kind === "SET") {
          const [lhs, rhs] = c.split("=").map((s) => s.trim()) as [string, string];
          const attr = this.name(lhs, names);
          const ine = rhs.match(/^if_not_exists\((\S+),\s*(:\w+)\)$/);
          item[attr] = ine ? (item[this.name(ine[1]!, names)] ?? values[ine[2]!]) : values[rhs];
          updated.push(attr);
        } else if (kind === "ADD") {
          const [lhs, rhs] = c.split(/\s+/) as [string, string];
          const attr = this.name(lhs, names);
          item[attr] = ((item[attr] as number | undefined) ?? 0) + (values[rhs] as number);
          updated.push(attr);
        } else if (kind === "REMOVE") {
          delete item[this.name(c, names)];
        }
      }
    }
    return updated;
  }

  private query(input: Input) {
    const names = input.ExpressionAttributeNames ?? {};
    const values = input.ExpressionAttributeValues ?? {};
    const expr = input.KeyConditionExpression ?? "";
    const m = expr.match(/^(\S+)\s*=\s*(:\w+)(?:\s+AND\s+begins_with\((\S+),\s*(:\w+)\))?$/);
    if (!m) throw new Error(`FakeDynamo: unsupported key condition ${expr}`);
    const hk = this.name(m[1]!, names);
    const hv = values[m[2]!];
    const rk = m[3] ? this.name(m[3], names) : undefined;
    const prefix = m[4] ? String(values[m[4]]) : undefined;
    const rangeKey = rk ?? (input.IndexName ? "GSI1SK" : "SK");
    let out = [...this.items.values()].filter(
      (it) => it[hk] === hv && (prefix === undefined || String(it[rk!] ?? "").startsWith(prefix)),
    );
    out.sort((a, b) => String(a[rangeKey]).localeCompare(String(b[rangeKey])));
    if (input.ScanIndexForward === false) out = out.reverse();
    return { Items: out.map((i) => structuredClone(i)) };
  }

  send = async (command: { constructor: { name: string }; input: Input }) => {
    const name = command.constructor.name;
    const input = command.input;
    this.calls.push({ command: name, input });
    switch (name) {
      case "GetCommand": {
        const it = this.items.get(this.key(input.Key!));
        return { Item: it ? structuredClone(it) : undefined };
      }
      case "PutCommand": {
        const k = this.key(input.Item!);
        if (!this.checkCondition(this.items.get(k), input)) throw awsError("ConditionalCheckFailedException");
        this.items.set(k, structuredClone(input.Item!));
        return {};
      }
      case "DeleteCommand":
        this.items.delete(this.key(input.Key!));
        return {};
      case "UpdateCommand": {
        const k = this.key(input.Key!);
        const existing = this.items.get(k);
        if (!this.checkCondition(existing, input)) throw awsError("ConditionalCheckFailedException");
        const item = existing ? structuredClone(existing) : { ...input.Key };
        const updated = this.applyUpdate(item, input);
        this.items.set(k, item);
        const attrs =
          input.ReturnValues === "ALL_NEW"
            ? structuredClone(item)
            : input.ReturnValues === "UPDATED_NEW"
              ? Object.fromEntries(updated.map((a) => [a, item[a]]))
              : undefined;
        return { Attributes: attrs };
      }
      case "QueryCommand":
        return this.query(input);
      case "TransactWriteCommand": {
        const ops = input.TransactItems ?? [];
        const reasons = ops.map((op) => {
          const [kind, body] = Object.entries(op)[0]!;
          const k = this.key((body.Key ?? body.Item)!);
          return { Code: this.checkCondition(this.items.get(k), body) ? "None" : "ConditionalCheckFailed", kind, body, k };
        });
        if (reasons.some((r) => r.Code !== "None")) {
          throw awsError("TransactionCanceledException", {
            CancellationReasons: reasons.map((r) => ({ Code: r.Code })),
          });
        }
        for (const r of reasons) {
          if (r.kind === "Put") this.items.set(r.k, structuredClone(r.body.Item!));
          else if (r.kind === "Delete") this.items.delete(r.k);
          else if (r.kind === "Update") {
            const it = this.items.get(r.k) ?? { ...r.body.Key };
            this.applyUpdate(it, r.body);
            this.items.set(r.k, it);
          }
        }
        return {};
      }
      default:
        throw new Error(`FakeDynamo: unsupported command ${name}`);
    }
  };
}

/** Installs a fresh fake as the app's DynamoDB client (see lib/db/client.ts). */
export function installFakeDynamo(table = "reciperoulette-test"): FakeDynamo {
  const fake = new FakeDynamo();
  (globalThis as unknown as { __rrDynamo: unknown }).__rrDynamo = { raw: fake, doc: fake, table };
  return fake;
}
