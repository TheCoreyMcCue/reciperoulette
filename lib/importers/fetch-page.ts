import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import zlib from "node:zlib";
import { assertSafeUrl, isPrivateAddress, UnsafeUrlError } from "./ssrf";

export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type FetchedPage = { url: string; status: number; contentType: string; body: string };

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

/** DNS lookup that refuses private/internal addresses. Runs for every connection, defeating DNS rebinding. */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as unknown as LookupAddress[];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (bad || !list.length) {
      return callback(new UnsafeUrlError("That link points to a private address."), "", 4);
    }
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0]!.address, list[0]!.family);
  });
};

type Options = { timeoutMs?: number; maxBytes?: number; maxRedirects?: number; accept?: string };

function requestOnce(url: URL, opts: Required<Options>, signal: AbortSignal): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: {
          "user-agent": BROWSER_UA,
          accept: opts.accept,
          "accept-language": "nl-NL,nl;q=0.9,en;q=0.8",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
        }
        const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (c: Buffer) => {
          size += c.length;
          if (size > opts.maxBytes) {
            req.destroy();
            reject(new FetchError("That page is too large to read."));
            return;
          }
          chunks.push(c);
        });
        stream.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
        stream.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function decode(body: Buffer, contentType: string): string {
  const charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

/** Fetches a public web page with SSRF protection, redirects (re-validated), a timeout and a size cap. */
export async function fetchPage(rawUrl: string, options: Options = {}): Promise<FetchedPage> {
  const opts: Required<Options> = {
    timeoutMs: options.timeoutMs ?? 10_000,
    maxBytes: options.maxBytes ?? 3_000_000,
    maxRedirects: options.maxRedirects ?? 5,
    accept: options.accept ?? "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  };
  const signal = AbortSignal.timeout(opts.timeoutMs);
  let url = assertSafeUrl(rawUrl);
  try {
    for (let hop = 0; hop <= opts.maxRedirects; hop++) {
      const res = await requestOnce(url, opts, signal);
      if (res.status >= 300 && res.status < 400 && res.headers.location) {
        url = assertSafeUrl(new URL(res.headers.location, url).toString());
        continue;
      }
      const contentType = String(res.headers["content-type"] ?? "");
      return { url: url.toString(), status: res.status, contentType, body: decode(res.body, contentType) };
    }
    throw new FetchError("That link redirects too many times.");
  } catch (err) {
    if (err instanceof UnsafeUrlError || err instanceof FetchError) throw err;
    const e = err as Error & { code?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") throw new FetchError("That page took too long to load.");
    if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN") throw new FetchError("We couldn't find that website. Check the link.");
    throw new FetchError("We couldn't load that page.");
  }
}
