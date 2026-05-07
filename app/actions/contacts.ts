"use server"

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getContacts() {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const contacts = await prisma.contact.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, contacts };
    } catch (error) {
        console.error("Error fetching contacts:", error);
        return { success: false, contacts: [] };
    }
}

export async function createContact(data: { name: string; phone: string; tags?: string }) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const cleanPhone = data.phone.replace(/[^0-9]/g, '');

        await prisma.contact.create({
            data: {
                name: data.name,
                phone: cleanPhone,
                tags: data.tags || "",
                userId: userId
            }
        });

        revalidatePath("/dashboard/contacts");
        return { success: true };
    } catch (error) {
        console.error("Error creating contact:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function updateContact(id: string, data: { name: string; phone: string; tags?: string }) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const cleanPhone = data.phone.replace(/[^0-9]/g, '');

        await prisma.contact.update({
            where: { id },
            data: {
                name: data.name,
                phone: cleanPhone,
                tags: data.tags || ""
            }
        });

        revalidatePath("/dashboard/contacts");
        return { success: true };
    } catch (error) {
        console.error("Error updating contact:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteContact(contactId: string) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        await prisma.contact.delete({
            where: { id: contactId }
        });

        revalidatePath("/dashboard/contacts");
        return { success: true };
    } catch (error) {
        console.error("Error deleting contact:", error);
        return { success: false, error: (error as Error).message };
    }
}

