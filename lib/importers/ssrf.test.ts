import { describe, expect, it } from "vitest";
import { assertSafeUrl, isPrivateAddress } from "./ssrf";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
    "::ffff:7f00:1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::", "not-an-ip",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("assertSafeUrl", () => {
  it("accepts normal recipe links", () => {
    expect(assertSafeUrl("https://www.ah.nl/allerhande/recept/R-R1188256/x").hostname).toBe("www.ah.nl");
  });
  it.each([
    "file:///etc/passwd", "ftp://example.com/x", "javascript:alert(1)", "http://localhost:3000/", "http://foo.localhost/",
    "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data/", "http://printer.local/", "http://intranet/",
    "https://user:pass@example.com/", "https://example.com:8443/", "http://0x7f000001/", "not a url",
  ])("rejects %s", (u) => expect(() => assertSafeUrl(u)).toThrow());
});
