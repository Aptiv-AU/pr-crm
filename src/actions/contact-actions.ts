"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { slugify, ensureUniqueSlug } from "@/lib/slug/slugify";

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
    // Block private/local network ranges
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

    const res = await fetch(url);
    if (!res.ok) return null;
    const length = Number(res.headers.get("content-length") ?? 0);
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
  const publication = formData.get("publication") as string | null;
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
    !publication ||
    !beat ||
    !tier ||
    !initials ||
    !avatarBg ||
    !avatarFg
  ) {
    throw new Error("All required fields must be provided");
  }

  const organizationId = await requireOrgId();

  const slug = await ensureUniqueSlug(slugify(name), async (candidate) => {
    const existing = await db.contact.findFirst({
      where: { organizationId, slug: candidate },
      select: { id: true },
    });
    return existing !== null;
  });

  const contact = await db.contact.create({
    data: {
      organizationId,
      name,
      slug,
      email: email || null,
      phone: phone || null,
      outlet: publication,
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

  return { data: { contactId: contact.id }, revalidate: ["/contacts"] };
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
    const publication = formData.get("publication") as string | null;
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
      !publication ||
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
        outlet: publication,
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

    return { revalidate: ["/contacts", `/contacts/${contactId}`] };
  }
);
