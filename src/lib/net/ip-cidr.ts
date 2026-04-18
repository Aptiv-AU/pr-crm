// IPv4/IPv6 CIDR helpers used by SSRF guards. Pure — no DNS.

export const PRIVATE_V4_CIDRS = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16", // link-local, incl. AWS/GCP metadata (169.254.169.254)
  "0.0.0.0/8",
  "100.64.0.0/10", // carrier-grade NAT
  "192.0.0.0/24",
  "192.0.2.0/24", // TEST-NET-1
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved
];

/** Parse a dotted-quad IPv4 into a u32, or NaN if malformed. */
function ipv4ToU32(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return NaN;
  let n = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return NaN;
    const v = Number(p);
    if (v < 0 || v > 255) return NaN;
    n = (n << 8) | v;
  }
  // >>> 0 forces unsigned interpretation
  return n >>> 0;
}

/**
 * Return true if `ip` (dotted-quad IPv4) falls inside `cidr` (e.g. "10.0.0.0/8").
 * Returns false on any parse failure — callers use this in deny-checks so
 * false means "this CIDR doesn't match", not "this IP is safe".
 */
export function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipN = ipv4ToU32(ip);
  const baseN = ipv4ToU32(base);
  if (Number.isNaN(ipN) || Number.isNaN(baseN)) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

export function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4_CIDRS.some((c) => ipv4InCidr(ip, c));
}

/**
 * Reject loopback, link-local, unique-local, and IPv4-mapped IPv6.
 * Not exhaustive, but covers the SSRF-relevant reserved ranges.
 */
export function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" || // loopback
    /^fe[89ab]/.test(lower) || // fe80::/10 link-local
    /^(fc|fd)/.test(lower) || // fc00::/7 unique-local
    lower.startsWith("::ffff:") // IPv4-mapped (::ffff:a.b.c.d)
  );
}
