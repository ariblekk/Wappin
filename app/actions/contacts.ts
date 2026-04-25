"use server"

import { createSessionClient } from "@/lib/appwrite-server";
import { Query, ID, Permission, Role } from "node-appwrite";
import { getLoggedInUser } from "./auth";
import { revalidatePath } from "next/cache";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COL_ID = "contacts";

export async function getContacts() {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        const contacts = await databases.listDocuments(
            DB_ID,
            COL_ID,
            [
                Query.equal("userId", user.$id),
                Query.orderDesc("$createdAt"),
                Query.limit(100)
            ]
        );

        return { success: true, contacts: contacts.documents };
    } catch (error) {
        console.error("Error fetching contacts:", error);
        return { success: false, contacts: [] };
    }
}

export async function createContact(data: { name: string; phone: string; tags?: string }) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        // Clean phone number (only digits)
        const cleanPhone = data.phone.replace(/[^0-9]/g, '');

        await databases.createDocument(
            DB_ID,
            COL_ID,
            ID.unique(),
            {
                name: data.name,
                phone: cleanPhone,
                tags: data.tags || "",
                userId: user.$id
            },
            [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]
        );

        revalidatePath("/dashboard/contacts");
        return { success: true };
    } catch (error) {
        console.error("Error creating contact:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function updateContact(id: string, data: { name: string; phone: string; tags?: string }) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        // Clean phone number
        const cleanPhone = data.phone.replace(/[^0-9]/g, '');

        await databases.updateDocument(
            DB_ID,
            COL_ID,
            id,
            {
                name: data.name,
                phone: cleanPhone,
                tags: data.tags || ""
            }
        );

        revalidatePath("/dashboard/contacts");
        return { success: true };
    } catch (error) {
        console.error("Error updating contact:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteContact(contactId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        await databases.deleteDocument(DB_ID, COL_ID, contactId);

        revalidatePath("/dashboard/contacts");
        return { success: true };
    } catch (error) {
        console.error("Error deleting contact:", error);
        return { success: false, error: (error as Error).message };
    }
}
