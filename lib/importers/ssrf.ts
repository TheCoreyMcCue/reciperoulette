import { isIP } from "node:net";

/**
 * SSRF guards for server-side fetching. Pure functions; the fetcher applies
 * them at DNS-lookup time for every connection (so redirects and DNS
 * rebinding are covered too).
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function isPrivateV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0]!;
  // Embedded IPv4 tail (::ffff:1.2.3.4)
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = v4ToInt(v4[1]!);
    s = s.replace(v4[1]!, `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const [head, tail] = s.split("::") as [string, string | undefined];
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  if (tail === undefined && h.length !== 8) return null;
  const fill = 8 - h.length - t.length;
  if (fill < 0) return null;
  const parts = [...h, ...Array(tail !== undefined ? fill : 0).fill("0"), ...t].map((p) => parseInt(p || "0", 16));
  return parts.length === 8 && parts.every((p) => p >= 0 && p <= 0xffff) ? parts : null;
}

function isPrivateV6(ip: string): boolean {
  const p = expandV6(ip);
  if (!p) return true; // unparseable: refuse
  const [a, b] = p as [number, number];
  if (p.every((x) => x === 0)) return true; // ::
  if (p.slice(0, 7).every((x) => x === 0) && p[7] === 1) return true; // ::1
  // IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d) and NAT64 (64:ff9b::/96): check the embedded v4.
  const embedded = `${p[6]! >> 8}.${p[6]! & 255}.${p[7]! >> 8}.${p[7]! & 255}`;
  if (p.slice(0, 5).every((x) => x === 0) && (p[5] === 0xffff || p[5] === 0)) return isPrivateV4(embedded);
  if (a === 0x64 && b === 0xff9b) return isPrivateV4(embedded);
  if ((a & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((a & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((a & 0xff00) === 0xff00) return true; // multicast
  if (a === 0x2001 && b === 0x0db8) return true; // documentation
  if (a === 0x2002) return isPrivateV4(`${b >> 8}.${b & 255}.${p[2]! >> 8}.${p[2]! & 255}`); // 6to4
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  return true;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".intranet", ".corp"];

/** Validates scheme, credentials, port and obviously-internal hostnames. DNS is checked at connect time. */
export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid link.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("Only http and https links are supported.");
  if (url.username || url.password) throw new UnsafeUrlError("Links with credentials aren't supported.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Links on unusual ports aren't supported.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s)) || (!host.includes(".") && !isIP(host))) {
    throw new UnsafeUrlError("That link points to a private address.");
  }
  if (isIP(host) && isPrivateAddress(host)) throw new UnsafeUrlError("That link points to a private address.");
  return url;
}
