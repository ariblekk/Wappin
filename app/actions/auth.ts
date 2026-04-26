"use server"

import { createAdminClient, createSessionClient } from "@/lib/appwrite-server";
import { cookies } from "next/headers";
import { ID } from "node-appwrite";
import { cache } from "react";

export const getLoggedInUser = cache(async () => {
    try {
        const { account } = await createSessionClient();
        return await account.get();
    } catch {
        return null;
    }
});

export async function getAppwriteJWT() {
    try {
        const { account } = await createSessionClient();
        const jwt = await account.createJWT();
        return { success: true, jwt: jwt.jwt };
    } catch {
        return { success: false };
    }
}

export async function sendOtp(email: string) {
    try {
        const { account } = await createAdminClient();
        const sessionToken = await account.createEmailToken(ID.unique(), email);
        return { userId: sessionToken.userId, success: true };
    } catch (error) {
        console.error("Error:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function verifyOtp(userId: string, otp: string) {
    try {
        const { account } = await createAdminClient();
        const session = await account.createSession(userId, otp);

        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function logout() {
    try {
        (await cookies()).delete("appwrite-session");
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
