"use server"

import { createSessionClient } from "@/lib/appwrite-server";
import { Query, ID, Permission, Role } from "node-appwrite";
import { getLoggedInUser } from "./auth";
import { disconnectWhatsApp } from "@/lib/whatsapp";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!;

export async function getDevices() {
    try {
        const { account, databases } = await createSessionClient();
        
        // Parallel: get user and list documents. 
        // Appwrite permissions will ensure user only sees their own documents.
        const [user, devices] = await Promise.all([
            account.get(),
            databases.listDocuments(
                DB_ID,
                COL_ID,
                [Query.orderDesc("$createdAt")]
            )
        ]);

        if (!user) throw new Error("Unauthorized");

        // Auto-wake sessions for connected devices
        const { connectToWhatsApp, getSession } = await import("@/lib/whatsapp");
        for (const doc of devices.documents) {
            if (doc.status === 'connected' && !getSession(doc.$id)) {
                // Run in background
                connectToWhatsApp(doc.$id).catch(e => console.error(`Failed to wake session ${doc.$id}:`, e));
            }
        }

        return { success: true, devices: devices.documents };
    } catch (error) {
        console.error("Error fetching devices:", error);
        return { success: false, devices: [] };
    }
}


export async function createDevice(name: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        const device = await databases.createDocument(
            DB_ID,
            COL_ID,
            ID.unique(),
            {
                name,
                userId: user.$id,
                status: "connecting",
            },
            [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]
        );

        return { success: true, deviceId: device.$id };
    } catch (error) {
        console.error("Error creating device:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteDevice(deviceId: string) {
    try {
        const { account, databases } = await createSessionClient();
        
        // 1. Parallel: Verifikasi user dan ambil dokumen
        const [user, device] = await Promise.all([
            account.get(),
            databases.getDocument(DB_ID, COL_ID, deviceId)
        ]);

        if (!user) throw new Error("Unauthorized");
        if (device.userId !== user.$id) {
            throw new Error("Forbidden");
        }

        // 2. Putuskan koneksi WhatsApp jika aktif
        await disconnectWhatsApp(deviceId);

        // 3. Hapus dari Appwrite
        await databases.deleteDocument(DB_ID, COL_ID, deviceId);

        return { success: true };
    } catch (error) {
        console.error("Error deleting device:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getDevice(deviceId: string) {
    try {
        const { databases } = await createSessionClient();
        
        // Gunakan getLoggedInUser() agar mendapat manfaat caching
        const [user, device] = await Promise.all([
            getLoggedInUser(),
            databases.getDocument(DB_ID, COL_ID, deviceId)
        ]);

        if (!user) throw new Error("Unauthorized");
        if (device.userId !== user.$id) {
            throw new Error("Forbidden");
        }

        return { success: true, device };
    } catch (error: unknown) {
        const err = error as { code?: number; message?: string };
        if (err.code !== 404) {
            console.error("Error fetching device:", err);
        }
        return { success: false, error: err.message || "Unknown error" };
    }
}

export async function disconnectDevice(deviceId: string) {
    try {
        const { account, databases } = await createSessionClient();
        
        const [user, device] = await Promise.all([
            account.get(),
            databases.getDocument(DB_ID, COL_ID, deviceId)
        ]);

        if (!user) throw new Error("Unauthorized");
        if (device.userId !== user.$id) {
            throw new Error("Forbidden");
        }

        await disconnectWhatsApp(deviceId);

        await databases.updateDocument(DB_ID, COL_ID, deviceId, {
            status: 'disconnected',
            qr: null,
        });

        return { success: true };
    } catch (error) {
        console.error("Error disconnecting device:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getDeviceMessages(deviceId: string) {
    try {
        const { databases } = await createSessionClient();
        const messages = await databases.listDocuments(
            DB_ID,
            process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
            [
                Query.equal("deviceId", deviceId),
                Query.orderDesc("sentAt"),
                Query.limit(50)
            ]
        );
        return { success: true, messages: messages.documents };
    } catch (error) {
        console.error("Error fetching device messages:", error);
        return { success: false, messages: [] };
    }
}
