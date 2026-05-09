"use server"

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { sendMessage } from "@/lib/whatsapp";
import type { Prisma } from "@prisma/client";

interface Recipient {
    phone: string;
    status: string;
}

export async function getBroadcasts() {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const broadcasts = await prisma.broadcast.findMany({
            where: { userId: userId },
            include: { device: true },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, broadcasts };
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
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

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

        const recipientData = recipientList.map(phone => ({ phone, status: "pending" }));

        const broadcast = await prisma.broadcast.create({
            data: {
                deviceId: formData.deviceId,
                userId: userId,
                name: formData.name,
                message: formData.message,
                recipients: recipientData as unknown as Prisma.InputJsonValue,
                status: status,
                total: recipientList.length,
                sent: 0,
                failed: 0,
                timestamp: timestamp
            }
        });

        if (!isScheduled) {
            processBroadcast(broadcast.id, formData.deviceId, formData.message, recipientList);
        }

        return { success: true, broadcastId: broadcast.id };
    } catch (error) {
        console.error("Error creating broadcast:", error);
        return { success: false, error: (error as Error).message };
    }
}
// Rest of file remains same...


export async function processBroadcast(
    broadcastId: string,
    deviceId: string,
    message: string,
    recipients: string[]
) {
    let sentCount = 0;
    let failedCount = 0;
    const recipientData: Recipient[] = recipients.map(phone => ({ phone, status: "pending" }));

    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
            await sendMessage(deviceId, recipient, message);
            sentCount++;
            recipientData[i].status = "sent";
        } catch (error) {
            console.error(`[Broadcast ${broadcastId}] Failed for ${recipient}:`, error);
            failedCount++;
            recipientData[i].status = "failed";
        }

        try {
            await prisma.broadcast.update({
                where: { id: broadcastId },
                data: {
                    sent: sentCount,
                    failed: failedCount,
                    recipients: recipientData as unknown as Prisma.InputJsonValue
                }
            });
        } catch (e) {
            console.error(`[Broadcast ${broadcastId}] Failed to update progress:`, e);
        }

        if (sentCount + failedCount < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }
    }

    try {
        await prisma.broadcast.update({
            where: { id: broadcastId },
            data: { status: "completed" }
        });
    } catch (e) {
        console.error(`[Broadcast ${broadcastId}] Failed to mark as completed:`, e);
    }
}

// Background Worker logic
if (typeof window === 'undefined') {
    const globalAny = globalThis as unknown as { broadcastWorkerStarted: boolean };
    if (!globalAny.broadcastWorkerStarted) {
        globalAny.broadcastWorkerStarted = true;
        
        setInterval(async () => {
            try {
                const now = Math.floor(Date.now() / 1000);
                const scheduledBroadcasts = await prisma.broadcast.findMany({
                    where: {
                        status: "pending",
                        timestamp: { lte: now }
                    },
                    take: 10
                });

                for (const doc of scheduledBroadcasts) {
                    try {
                        await prisma.broadcast.update({
                            where: { id: doc.id },
                            data: { status: "processing" }
                        });

                        const recipients = (doc.recipients as unknown as Recipient[]).map(r => r.phone);
                        processBroadcast(doc.id, doc.deviceId, doc.message, recipients);
                    } catch (err) {
                        console.error(`[Worker] Gagal memproses broadcast terjadwal ${doc.id}:`, err);
                    }
                }
            } catch {}
        }, 30000);
    }
}
