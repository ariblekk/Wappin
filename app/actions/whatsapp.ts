"use server"

import { connectToWhatsApp, sendMessage } from "@/lib/whatsapp";
import { getLoggedInUser } from "./auth";
import { createSessionClient } from "@/lib/appwrite-server";

export async function initiateWhatsApp(deviceId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        // Pastikan device ini memang milik user tersebut
        const { databases } = await createSessionClient();
        const device = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
            deviceId
        );
        
        if (device.userId !== user.$id) {
            throw new Error("Forbidden");
        }

        // Panggil fungsi koneksi Baileys di background
        // Ini akan mengupdate status & QR di Appwrite secara otomatis lewat lib/whatsapp.ts
        connectToWhatsApp(deviceId).catch(err => {
            console.error(`Failed to connect device ${deviceId}:`, err);
        });

        return { success: true };
    } catch (error) {
        console.error("Error initiating WhatsApp:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function sendTestMessage(deviceId: string, to: string, text: string): Promise<{ success: true } | { success: false, error: string }> {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        const device = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
            deviceId
        );

        if (device.userId !== user.$id) {
            throw new Error("Forbidden");
        }

        await sendMessage(deviceId, to, text);
        return { success: true };
    } catch (error) {
        console.error("Error sending test message:", error);
        return { success: false, error: (error as Error).message };
    }
}
