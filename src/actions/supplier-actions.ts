"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();

  if (!org) {
    throw new Error("Organization not found");
  }

  return org.id;
}

export async function createSupplier(formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const serviceCategory = formData.get("serviceCategory") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const website = formData.get("website") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!name || !serviceCategory) {
      return { error: "Name and service category are required" };
    }

    const organizationId = await getOrganizationId();

    const supplier = await db.supplier.create({
      data: {
        organizationId,
        name,
        serviceCategory,
        email: email || null,
        phone: phone || null,
        website: website || null,
        notes: notes || null,
      },
    });

    revalidatePath("/suppliers");

    return { success: true, supplierId: supplier.id };
  } catch (error) {
    console.error("createSupplier error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create supplier",
    };
  }
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const serviceCategory = formData.get("serviceCategory") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const website = formData.get("website") as string | null;
    const notes = formData.get("notes") as string | null;
    const ratingStr = formData.get("rating") as string | null;

    if (!name || !serviceCategory) {
      return { error: "Name and service category are required" };
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

    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${supplierId}`);

    return { success: true };
  } catch (error) {
    console.error("updateSupplier error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update supplier",
    };
  }
}

export async function createSupplierContact(formData: FormData) {
  try {
    const supplierId = formData.get("supplierId") as string | null;
    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;

    if (!supplierId || !name) {
      return { error: "Supplier and contact name are required" };
    }

    await db.supplierContact.create({
      data: {
        supplierId,
        name,
        role: role || null,
        email: email || null,
        phone: phone || null,
      },
    });

    revalidatePath(`/suppliers/${supplierId}`);

    return { success: true };
  } catch (error) {
    console.error("createSupplierContact error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create supplier contact",
    };
  }
}

export async function updateSupplierContact(supplierContactId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;

    if (!name) {
      return { error: "Contact name is required" };
    }

    const existing = await db.supplierContact.findUnique({
      where: { id: supplierContactId },
      select: { supplierId: true },
    });

    if (!existing) {
      return { error: "Supplier contact not found" };
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

    revalidatePath(`/suppliers/${existing.supplierId}`);

    return { success: true };
  } catch (error) {
    console.error("updateSupplierContact error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update supplier contact",
    };
  }
}

export async function deleteSupplierContact(supplierContactId: string) {
  try {
    const existing = await db.supplierContact.findUnique({
      where: { id: supplierContactId },
      select: { supplierId: true },
    });

    if (!existing) {
      return { error: "Supplier contact not found" };
    }

    await db.supplierContact.delete({
      where: { id: supplierContactId },
    });

    revalidatePath(`/suppliers/${existing.supplierId}`);

    return { success: true };
  } catch (error) {
    console.error("deleteSupplierContact error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete supplier contact",
    };
  }
}
