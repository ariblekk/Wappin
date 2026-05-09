"use server"

import { connectToWhatsApp, sendMessage } from "@/lib/whatsapp";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function initiateWhatsApp(deviceId: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        // Pastikan device ini memang milik user tersebut
        const device = await prisma.device.findUnique({
            where: { id: deviceId }
        });
        
        if (!device || device.userId !== userId) {
            throw new Error("Forbidden");
        }

        // Panggil fungsi koneksi Baileys di background
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
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const device = await prisma.device.findUnique({
            where: { id: deviceId }
        });

        if (!device || device.userId !== userId) {
            throw new Error("Forbidden");
        }

        // sendMessage di lib/whatsapp sudah menyimpan log ke database
        await sendMessage(deviceId, to, text);
        
        return { success: true };
    } catch (error) {
        console.error("Error sending test message:", error);
        return { success: false, error: (error as Error).message };
    }
}
