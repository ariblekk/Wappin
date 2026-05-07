"use server"

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

export async function getProfile() {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        let profile = await prisma.profile.findUnique({
            where: { userId: userId }
        });

        if (profile) {
            return { success: true, profile };
        }

        // Jika belum ada, buat profil default
        const apiKey = `wappin_${crypto.randomBytes(16).toString("hex")}`;
        profile = await prisma.profile.create({
            data: {
                userId: userId,
                plan: "Free",
                apiKey: apiKey
            }
        });

        return { success: true, profile };
    } catch (error) {
        console.error("Error fetching profile:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function regenerateApiKey() {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const newApiKey = `wappin_${crypto.randomBytes(16).toString("hex")}`;

        const profile = await prisma.profile.upsert({
            where: { userId: userId },
            update: { apiKey: newApiKey },
            create: {
                userId: userId,
                plan: "Free",
                apiKey: newApiKey
            }
        });

        return { success: true, apiKey: profile.apiKey };
    } catch (error) {
        console.error("Error regenerating API Key:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getUserIdByApiKey(apiKey: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { apiKey: apiKey }
        });

        if (profile) {
            return { success: true, userId: profile.userId, userCode: profile.user_code };
        }

        return { success: false, error: "Invalid API Key" };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getUserIdByUserCode(userCode: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { user_code: userCode }
        });

        if (profile) {
            return { success: true, userId: profile.userId, apiKey: profile.apiKey };
        }

        return { success: false, error: "Invalid User Code" };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function validateApiAccess(userCode: string, apiKey: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { 
                user_code: userCode,
                apiKey: apiKey 
            }
        });

        if (profile) {
            return { success: true, userId: profile.userId };
        }

        return { success: false, error: "Invalid User Code or API Key" };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
