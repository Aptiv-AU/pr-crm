"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { generateSlug } from "@/lib/slug/generate";
import { promises as dns } from "node:dns";
import net from "node:net";
import { isPrivateV4, isPrivateV6 } from "@/lib/net/ip-cidr";

/**
 * Resolve `hostname` via DNS and refuse if ANY returned address is private
 * or reserved. Throws (rather than returns) so callers using try/catch
 * treat it like a fetch failure. Defuses DNS rebinding and
 * `*.nip.io`-style tricks because we trust the resolver, not the string.
 */
async function assertPublicHost(hostname: string): Promise<void> {
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

async function downloadAndStorePhoto(url: string): Promise<string | null> {
  try {
    // Validate URL is a safe external HTTPS URL (prevent SSRF)
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:") return null;
    const hostname = parsed.hostname.toLowerCase();
    // First-pass string denylist — cheap belt-and-braces before DNS.
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("169.254.") || // link-local
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return null;
    }

    // Second pass: resolve to IPs and verify every returned address is public.
    // Defuses DNS rebinding and hostnames that encode private IPs (e.g. nip.io).
    await assertPublicHost(hostname);

    // Pin redirects manually — refuse any 3xx so an allowed host can't hop
    // to a private target mid-request.
    const res = await fetch(url, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;
    // M-10: refuse responses without a Content-Length. Previously a
    // missing header coerced to 0 and bypassed the size cap, then
    // arrayBuffer() read the full chunked body uncapped.
    const lengthHeader = res.headers.get("content-length");
    if (!lengthHeader) return null;
    const length = Number(lengthHeader);
    if (!Number.isFinite(length) || length <= 0) return null;
    if (length > 5 * 1024 * 1024) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(contentType)) return null;
    const buffer = await res.arrayBuffer();
    const file = new File([buffer], "contact-photo", { type: contentType });
    const { put } = await import("@vercel/blob");
    const blob = await put(`contact-photo-${Date.now()}`, file, { access: "public" });
    return blob.url;
  } catch {
    return null;
  }
}

async function resolvePhoto(photoInput: string | null): Promise<string | null> {
  if (!photoInput) return null;
  if (photoInput.startsWith("https://")) return downloadAndStorePhoto(photoInput);
  return photoInput; // already a Vercel Blob URL from file upload
}

export const createContact = action("createContact", async (formData: FormData) => {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const outlet = formData.get("outlet") as string | null;
  const beat = formData.get("beat") as string | null;
  const tier = formData.get("tier") as string | null;
  const initials = formData.get("initials") as string | null;
  const avatarBg = formData.get("avatarBg") as string | null;
  const avatarFg = formData.get("avatarFg") as string | null;
  const instagram = formData.get("instagram") as string | null;
  const twitter = formData.get("twitter") as string | null;
  const linkedin = formData.get("linkedin") as string | null;
  const notes = formData.get("notes") as string | null;
  const photo = await resolvePhoto(formData.get("photo") as string | null);

  if (
    !name ||
    !outlet ||
    !beat ||
    !tier ||
    !initials ||
    !avatarBg ||
    !avatarFg
  ) {
    throw new Error("All required fields must be provided");
  }

  const organizationId = await requireOrgId();

  const slug = await generateSlug("contact", organizationId, name);

  const contact = await db.contact.create({
    data: {
      organizationId,
      name,
      slug,
      email: email || null,
      phone: phone || null,
      outlet,
      beat,
      tier,
      health: "warm",
      initials: initials.toUpperCase().slice(0, 2),
      avatarBg,
      avatarFg,
      instagram: instagram || null,
      twitter: twitter || null,
      linkedin: linkedin || null,
      notes: notes || null,
      photo,
    },
  });

  return {
    data: { contactId: contact.id },
    revalidate: ["/contacts"],
    revalidateTags: [`contacts:${organizationId}`, `stats:${organizationId}`],
  };
});

export const updateContact = action(
  "updateContact",
  async (contactId: string, formData: FormData) => {
    const organizationId = await requireOrgId();
    const existing = await db.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new Error("Contact not found");

    const name = formData.get("name") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const outlet = formData.get("outlet") as string | null;
    const beat = formData.get("beat") as string | null;
    const tier = formData.get("tier") as string | null;
    const health = formData.get("health") as string | null;
    const initials = formData.get("initials") as string | null;
    const avatarBg = formData.get("avatarBg") as string | null;
    const avatarFg = formData.get("avatarFg") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const twitter = formData.get("twitter") as string | null;
    const linkedin = formData.get("linkedin") as string | null;
    const notes = formData.get("notes") as string | null;
    const photo = await resolvePhoto(formData.get("photo") as string | null);

    if (
      !name ||
      !outlet ||
      !beat ||
      !tier ||
      !health ||
      !initials ||
      !avatarBg ||
      !avatarFg
    ) {
      throw new Error("All required fields must be provided");
    }

    await db.contact.update({
      where: { id: contactId },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        outlet,
        beat,
        tier,
        health,
        initials: initials.toUpperCase().slice(0, 2),
        avatarBg,
        avatarFg,
        instagram: instagram || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
        notes: notes || null,
        photo,
      },
    });

    return {
      revalidate: ["/contacts", `/contacts/${contactId}`],
      revalidateTags: [
        `contact:${contactId}`,
        `contacts:${organizationId}`,
        `stats:${organizationId}`,
      ],
    };
  }
);
