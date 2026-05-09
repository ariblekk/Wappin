"use server"

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getAutoReplies() {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const replies = await prisma.autoReply.findMany({
            where: { userId: userId },
            include: { device: true },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, replies };
    } catch (error) {
        console.error("Error fetching auto-replies:", error);
        return { success: false, replies: [] };
    }
}

export async function createAutoReply(data: { 
    keyword: string; 
    response: string; 
    type: string;
    deviceId: string;
}) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        await prisma.autoReply.create({
            data: {
                keyword: data.keyword,
                response: data.response,
                type: data.type,
                deviceId: data.deviceId,
                userId: userId
            }
        });

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
    type: string;
    deviceId: string;
}) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        await prisma.autoReply.update({
            where: { id },
            data: {
                keyword: data.keyword,
                response: data.response,
                type: data.type,
                deviceId: data.deviceId
            }
        });

        revalidatePath("/dashboard/auto-reply");
        return { success: true };
    } catch (error) {
        console.error("Error updating auto-reply:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteAutoReply(id: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        await prisma.autoReply.delete({
            where: { id }
        });

        revalidatePath("/dashboard/auto-reply");
        return { success: true };
    } catch (error) {
        console.error("Error deleting auto-reply:", error);
        return { success: false, error: (error as Error).message };
    }
}

