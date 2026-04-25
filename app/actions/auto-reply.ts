"use server"

import { createSessionClient } from "@/lib/appwrite-server";
import { Query, ID, Permission, Role } from "node-appwrite";
import { getLoggedInUser } from "./auth";
import { revalidatePath } from "next/cache";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COL_ID = "auto_replies";

export async function getAutoReplies() {
    try {
        const { databases } = await createSessionClient();
        
        const [user, replies] = await Promise.all([
            getLoggedInUser(),
            databases.listDocuments(
                DB_ID,
                COL_ID,
                [
                    Query.orderDesc("$createdAt"),
                    Query.limit(100)
                ]
            )
        ]);

        if (!user) throw new Error("Unauthorized");

        return { success: true, replies: replies.documents };
    } catch (error) {
        console.error("Error fetching auto-replies:", error);
        return { success: false, replies: [] };
    }
}

export async function createAutoReply(data: { 
    keyword: string; 
    response: string; 
    type: "exact" | "contains";
    deviceId: string;
}) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();

        await databases.createDocument(
            DB_ID,
            COL_ID,
            ID.unique(),
            {
                keyword: data.keyword,
                response: data.response,
                type: data.type,
                deviceId: data.deviceId,
                userId: user.$id
            },
            [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]
        );

        revalidatePath("/dashboard/auto-reply");
        return { success: true };
    } catch (error) {
        console.error("Error creating auto-reply:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function updateAutoReply(id: string, data: { 
    keyword: string; 
    response: string; 
    type: "exact" | "contains";
    deviceId: string;
}) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();

        await databases.updateDocument(
            DB_ID,
            COL_ID,
            id,
            {
                keyword: data.keyword,
                response: data.response,
                type: data.type,
                deviceId: data.deviceId
            }
        );

        revalidatePath("/dashboard/auto-reply");
        return { success: true };
    } catch (error) {
        console.error("Error updating auto-reply:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteAutoReply(id: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        await databases.deleteDocument(DB_ID, COL_ID, id);

        revalidatePath("/dashboard/auto-reply");
        return { success: true };
    } catch (error) {
        console.error("Error deleting auto-reply:", error);
        return { success: false, error: (error as Error).message };
    }
}
