"use server"

import { createSessionClient, createAdminClient } from "@/lib/appwrite-server";
import { Query, ID, Permission, Role } from "node-appwrite";
import { getLoggedInUser } from "./auth";
import { sendMessage } from "@/lib/whatsapp";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_BROADCASTS_COLLECTION_ID!;

export async function getBroadcasts() {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        const broadcasts = await databases.listDocuments(
            DB_ID,
            COL_ID,
            [
                Query.equal("userId", user.$id),
                Query.orderDesc("$createdAt"),
                Query.limit(50)
            ]
        );

        return { success: true, broadcasts: broadcasts.documents };
    } catch (error) {
        console.error("Error fetching broadcasts:", error);
        return { success: false, broadcasts: [] };
    }
}

export async function createBroadcast(formData: {
    deviceId: string;
    name: string;
    message: string;
    recipients: string;
    scheduleTime?: string;
}) {
    try {
        const user = await getLoggedInUser();
        if (!user) throw new Error("Unauthorized");

        const { databases } = await createSessionClient();
        
        // Clean and parse recipients
        const recipientList = formData.recipients
            .split(/[\n,]+/)
            .map(r => r.trim())
            .filter(r => r.length > 0);

        if (recipientList.length === 0) throw new Error("No recipients provided");

        const isScheduled = !!formData.scheduleTime;
        const status = isScheduled ? "pending" : "processing";
        const timestamp = isScheduled 
            ? Math.floor(new Date(formData.scheduleTime!).getTime() / 1000) 
            : Math.floor(Date.now() / 1000);

        // Create the broadcast record
        const broadcast = await databases.createDocument(
            DB_ID,
            COL_ID,
            ID.unique(),
            {
                deviceId: formData.deviceId,
                userId: user.$id,
                name: formData.name,
                title: formData.name, // Map to title for compatibility
                message: formData.message,
                body: formData.message, // Map to body for compatibility
                recipients: JSON.stringify(recipientList),
                status: status,
                total: recipientList.length,
                sent: 0,
                failed: 0,
                timestamp: timestamp
            },
            [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]
        );

        // Start sending in background if not scheduled
        if (!isScheduled) {
            processBroadcast(broadcast.$id, formData.deviceId, formData.message, recipientList);
        }

        return { success: true, broadcastId: broadcast.$id };
    } catch (error) {
        console.error("Error creating broadcast:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function processBroadcast(
    broadcastId: string, 
    deviceId: string, 
    message: string, 
    recipients: string[]
) {

    const { databases } = await createAdminClient();
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {

        try {
            await sendMessage(deviceId, recipient, message);
            sentCount++;

        } catch (error) {
            console.error(`[Broadcast ${broadcastId}] Failed for ${recipient}:`, error);
            failedCount++;
        }

        // Update progress in Appwrite
        try {
            await databases.updateDocument(DB_ID, COL_ID, broadcastId, {
                sent: sentCount,
                failed: failedCount
            });
        } catch (e) {
            console.error(`[Broadcast ${broadcastId}] Failed to update progress:`, e);
        }

        // Delay to avoid being flagged as spam (2-5 seconds)
        if (sentCount + failedCount < recipients.length) {

            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }
    }

    // Mark as completed

    try {
        await databases.updateDocument(DB_ID, COL_ID, broadcastId, {
            status: "completed"
        });
    } catch (e) {
        console.error(`[Broadcast ${broadcastId}] Failed to mark as completed:`, e);
    }
}

let workerStarted = false;

function startBroadcastWorker() {
    if (workerStarted) return;
    workerStarted = true;

    // Jalankan setiap 30 detik
    setInterval(async () => {
        try {
            const { databases } = await createAdminClient();
            const now = Math.floor(Date.now() / 1000);

            // Cari broadcast yang dijadwalkan dan sudah jatuh tempo
            const scheduledBroadcasts = await databases.listDocuments(
                DB_ID,
                COL_ID,
                [
                    Query.equal("status", "pending"),
                    Query.lessThanEqual("timestamp", now),
                    Query.limit(10)
                ]
            );

            for (const doc of scheduledBroadcasts.documents) {
                try {
                    // Update status menjadi processing agar tidak diambil lagi oleh worker lain
                    await databases.updateDocument(DB_ID, COL_ID, doc.$id, {
                        status: "processing"
                    });

                    const recipients = JSON.parse(doc.recipients);
                    // Jalankan proses broadcast di background
                    processBroadcast(doc.$id, doc.deviceId, doc.message || doc.body, recipients);
                } catch (err) {
                    console.error(`[Worker] Gagal memproses broadcast terjadwal ${doc.$id}:`, err);
                }
            }
        } catch {
            // Abaikan error koneksi database berkala
        }
    }, 30000);
}

// Jalankan worker secara otomatis saat modul dimuat di server
if (typeof window === 'undefined') {
    startBroadcastWorker();
}
