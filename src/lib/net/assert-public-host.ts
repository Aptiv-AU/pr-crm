import { promises as dns } from "node:dns";
import net from "node:net";
import { isPrivateV4, isPrivateV6 } from "@/lib/net/ip-cidr";

/**
 * Resolve `hostname` via DNS and refuse if ANY returned address is private
 * or reserved. Throws (rather than returns) so callers using try/catch treat
 * it like a fetch failure. Defuses DNS rebinding and `*.nip.io`-style tricks
 * because we trust the resolver, not the string.
 *
 * Pair with a string denylist (cheap pre-flight) and `redirect: "manual"` on
 * the eventual fetch to refuse 3xx hops to a different (potentially private)
 * host mid-request.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  const [v4, v6] = await Promise.all([
    dns.resolve4(hostname).catch(() => [] as string[]),
    dns.resolve6(hostname).catch(() => [] as string[]),
  ]);
  const addrs = [...v4, ...v6];
  if (addrs.length === 0) {
    throw new Error(`DNS resolution failed for ${hostname}`);
  }
  for (const addr of addrs) {
    if (net.isIPv4(addr) && isPrivateV4(addr)) {
      throw new Error(`Refusing private IPv4: ${addr}`);
    }
    if (net.isIPv6(addr) && isPrivateV6(addr)) {
      throw new Error(`Refusing private IPv6: ${addr}`);
    }
  }
}

/**
 * Validate a public HTTPS URL: protocol https, hostname not on the cheap
 * link-local/RFC1918 string denylist, and DNS-resolved addresses all public.
 * Throws on failure with a caller-friendly message. Returns the parsed URL
 * for downstream use.
 */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Only https URLs are allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("169.254.") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error(`Refusing private host: ${hostname}`);
  }
  await assertPublicHost(hostname);
  return parsed;
}
