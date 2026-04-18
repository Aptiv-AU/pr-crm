import { describe, it, expect } from "vitest";
import { ipv4InCidr, isPrivateV4, isPrivateV6 } from "./ip-cidr";

describe("ipv4InCidr", () => {
  it("matches inside the range", () => {
    expect(ipv4InCidr("10.0.0.1", "10.0.0.0/8")).toBe(true);
    expect(ipv4InCidr("10.255.255.255", "10.0.0.0/8")).toBe(true);
    expect(ipv4InCidr("169.254.169.254", "169.254.0.0/16")).toBe(true);
  });

  it("rejects outside the range", () => {
    expect(ipv4InCidr("11.0.0.1", "10.0.0.0/8")).toBe(false);
    expect(ipv4InCidr("8.8.8.8", "10.0.0.0/8")).toBe(false);
  });

  it("returns false on malformed IPs or CIDRs", () => {
    expect(ipv4InCidr("not-an-ip", "10.0.0.0/8")).toBe(false);
    expect(ipv4InCidr("10.0.0.1", "invalid")).toBe(false);
    expect(ipv4InCidr("10.0.0.1", "10.0.0.0/33")).toBe(false);
  });

  it("handles /32 (single-host) ranges", () => {
    expect(ipv4InCidr("1.2.3.4", "1.2.3.4/32")).toBe(true);
    expect(ipv4InCidr("1.2.3.5", "1.2.3.4/32")).toBe(false);
  });
});

describe("isPrivateV4", () => {
  it("flags RFC1918 private ranges", () => {
    expect(isPrivateV4("10.1.2.3")).toBe(true);
    expect(isPrivateV4("172.16.0.1")).toBe(true);
    expect(isPrivateV4("192.168.1.1")).toBe(true);
  });

  it("flags loopback and link-local", () => {
    expect(isPrivateV4("127.0.0.1")).toBe(true);
    expect(isPrivateV4("169.254.169.254")).toBe(true); // EC2/GCP metadata
  });

  it("flags carrier-grade NAT and reserved", () => {
    expect(isPrivateV4("100.64.0.1")).toBe(true);
    expect(isPrivateV4("224.0.0.1")).toBe(true);
  });

  it("lets public IPs through", () => {
    expect(isPrivateV4("8.8.8.8")).toBe(false);
    expect(isPrivateV4("1.1.1.1")).toBe(false);
    expect(isPrivateV4("151.101.0.133")).toBe(false);
  });
});

describe("isPrivateV6", () => {
  it("flags loopback and link-local", () => {
    expect(isPrivateV6("::1")).toBe(true);
    expect(isPrivateV6("fe80::1")).toBe(true);
  });

  it("flags unique-local fc00::/7", () => {
    expect(isPrivateV6("fc00::1")).toBe(true);
    expect(isPrivateV6("fd12:3456::1")).toBe(true);
  });

  it("flags IPv4-mapped", () => {
    expect(isPrivateV6("::ffff:127.0.0.1")).toBe(true);
  });

  it("lets public IPv6 through", () => {
    expect(isPrivateV6("2001:4860:4860::8888")).toBe(false);
    expect(isPrivateV6("2606:4700:4700::1111")).toBe(false);
  });
});
