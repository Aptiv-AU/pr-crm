import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireOrgId } from "@/lib/server/org";
import crypto from "node:crypto";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Verify magic bytes match one of our allowed image formats. The declared
 * `file.type` is client-controlled, so we sniff the actual bytes.
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - JPEG: FF D8 FF
 * - WebP: 52 49 46 46 .. .. .. .. 57 45 42 50
 */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size first (cheap; avoids reading a huge buffer just to reject)
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Preliminary allowlist against client-declared type
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Magic-byte verification
    const headerBytes = new Uint8Array(
      await file.slice(0, 12).arrayBuffer()
    );
    const sniffed = sniffImageMime(headerBytes);
    if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
      return NextResponse.json(
        { error: "File contents do not match an allowed image type" },
        { status: 400 }
      );
    }
    if (sniffed !== file.type) {
      return NextResponse.json(
        { error: "Declared file type does not match contents" },
        { status: 400 }
      );
    }

    // Check if Blob token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Fallback for local dev: return a placeholder
      return NextResponse.json({ url: `/api/placeholder-image?name=${encodeURIComponent(file.name)}` });
    }

    // H-7: per-org prefix + opaque UUID. Previously the client filename
    // was used as the key — flat namespace across all tenants, control
    // characters in the URL, no addRandomSuffix on older SDK versions.
    const orgId = await requireOrgId();
    const ext = MIME_TO_EXT[sniffed] ?? "bin";
    const key = `${orgId}/uploads/${crypto.randomUUID()}.${ext}`;
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: sniffed,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
