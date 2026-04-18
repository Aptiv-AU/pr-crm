"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { generateSlug } from "@/lib/slug/generate";

export const createSupplier = action("createSupplier", async (formData: FormData) => {
  const name = formData.get("name") as string | null;
  const serviceCategory = formData.get("serviceCategory") as string | null;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const website = formData.get("website") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!name || !serviceCategory) {
    throw new Error("Name and service category are required");
  }

  const organizationId = await requireOrgId();

  const slug = await generateSlug("supplier", organizationId, name);

  const supplier = await db.supplier.create({
    data: {
      organizationId,
      name,
      slug,
      serviceCategory,
      email: email || null,
      phone: phone || null,
      website: website || null,
      notes: notes || null,
    },
  });

  return { data: { supplierId: supplier.id }, revalidate: ["/suppliers"] };
});

async function assertSupplierInOrg(supplierId: string, orgId: string): Promise<void> {
  const found = await db.supplier.findFirst({
    where: { id: supplierId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Supplier not found");
}

export const updateSupplier = action(
  "updateSupplier",
  async (supplierId: string, formData: FormData) => {
    const organizationId = await requireOrgId();
    await assertSupplierInOrg(supplierId, organizationId);

    const name = formData.get("name") as string | null;
    const serviceCategory = formData.get("serviceCategory") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const website = formData.get("website") as string | null;
    const notes = formData.get("notes") as string | null;
    const ratingStr = formData.get("rating") as string | null;

    if (!name || !serviceCategory) {
      throw new Error("Name and service category are required");
    }

    const rating = ratingStr ? parseInt(ratingStr, 10) : null;

    await db.supplier.update({
      where: { id: supplierId },
      data: {
        name,
        serviceCategory,
        email: email || null,
        phone: phone || null,
        website: website || null,
        notes: notes || null,
        rating: rating && !isNaN(rating) ? rating : null,
      },
    });

    return { revalidate: ["/suppliers", `/suppliers/${supplierId}`] };
  }
);

export const createSupplierContact = action(
  "createSupplierContact",
  async (formData: FormData) => {
    const supplierId = formData.get("supplierId") as string | null;
    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;

    if (!supplierId || !name) {
      throw new Error("Supplier and contact name are required");
    }

    const organizationId = await requireOrgId();
    await assertSupplierInOrg(supplierId, organizationId);

    await db.supplierContact.create({
      data: {
        supplierId,
        name,
        role: role || null,
        email: email || null,
        phone: phone || null,
      },
    });

    return { revalidate: [`/suppliers/${supplierId}`] };
  }
);

export const updateSupplierContact = action(
  "updateSupplierContact",
  async (supplierContactId: string, formData: FormData) => {
    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;

    if (!name) {
      throw new Error("Contact name is required");
    }

    const organizationId = await requireOrgId();
    const existing = await db.supplierContact.findFirst({
      where: { id: supplierContactId, supplier: { organizationId } },
      select: { supplierId: true },
    });

    if (!existing) {
      throw new Error("Supplier contact not found");
    }

    await db.supplierContact.update({
      where: { id: supplierContactId },
      data: {
        name,
        role: role || null,
        email: email || null,
        phone: phone || null,
      },
    });

    return { revalidate: [`/suppliers/${existing.supplierId}`] };
  }
);

export const deleteSupplierContact = action(
  "deleteSupplierContact",
  async (supplierContactId: string) => {
    const organizationId = await requireOrgId();
    const existing = await db.supplierContact.findFirst({
      where: { id: supplierContactId, supplier: { organizationId } },
      select: { supplierId: true },
    });

    if (!existing) {
      throw new Error("Supplier contact not found");
    }

    await db.supplierContact.delete({
      where: { id: supplierContactId },
    });

    return { revalidate: [`/suppliers/${existing.supplierId}`] };
  }
);
