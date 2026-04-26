"use server"

import { createSessionClient, createAdminClient } from "@/lib/appwrite-server";
import { Query, ID } from "node-appwrite";
import { getLoggedInUser } from "./auth";
import crypto from "crypto";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COL_PROFILES = "profiles";

export async function getProfile() {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();

        const profiles = await databases.listDocuments(
            DB_ID,
            COL_PROFILES,
            [
                Query.equal("user_code", user.$id)
            ]
        );

        if (profiles.documents.length > 0) {
            return { success: true, profile: profiles.documents[0] };
        }

        // Jika belum ada, buat profil default
        const apiKey = `wappin_${crypto.randomBytes(16).toString("hex")}`;
        const newProfile = await databases.createDocument(
            DB_ID,
            COL_PROFILES,
            ID.unique(),
            {
                user_code: user.$id,
                plan: "Free",
                apikey: apiKey
            }
        );

        return { success: true, profile: newProfile };
    } catch (error) {
        console.error("Error fetching profile:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function regenerateApiKey() {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();

        const profiles = await databases.listDocuments(
            DB_ID,
            COL_PROFILES,
            [
                Query.equal("user_code", user.$id)
            ]
        );

        const newApiKey = `wappin_${crypto.randomBytes(16).toString("hex")}`;

        if (profiles.documents.length > 0) {
            const docId = profiles.documents[0].$id;
            await databases.updateDocument(
                DB_ID,
                COL_PROFILES,
                docId,
                {
                    apikey: newApiKey
                }
            );
            return { success: true, apiKey: newApiKey };
        } else {
            // Buat baru jika belum ada
            await databases.createDocument(
                DB_ID,
                COL_PROFILES,
                ID.unique(),
                {
                    user_code: user.$id,
                    plan: "Free",
                    apikey: newApiKey
                }
            );
            return { success: true, apiKey: newApiKey };
        }
    } catch (error) {
        console.error("Error regenerating API Key:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getUserIdByApiKey(apiKey: string) {
    try {
        const { databases } = await createAdminClient();

        const profiles = await databases.listDocuments(
            DB_ID,
            COL_PROFILES,
            [
                Query.equal("apikey", apiKey)
            ]
        );

        if (profiles.documents.length > 0) {
            return { success: true, userId: profiles.documents[0].user_code };
        }

        return { success: false, error: "Invalid API Key" };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
