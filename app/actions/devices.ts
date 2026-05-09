"use server"

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { disconnectWhatsApp } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

export async function getDevices() {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const devices = await prisma.device.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // Auto-wake sessions for connected devices
        const { connectToWhatsApp, getSession } = await import("@/lib/whatsapp");
        for (const device of devices) {
            if (device.status === 'connected' && !getSession(device.id)) {
                // Run in background
                connectToWhatsApp(device.id).catch(e => console.error(`Failed to wake session ${device.id}:`, e));
            }
        }

        return { success: true, devices };
    } catch (error) {
        console.error("Error fetching devices:", error);
        return { success: false, devices: [] };
    }
}

export async function createDevice(name: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const device = await prisma.device.create({
            data: {
                name,
                userId: userId,
                status: "connecting",
            }
        });

        return { success: true, deviceId: device.id };
    } catch (error) {
        console.error("Error creating device:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteDevice(deviceId: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const device = await prisma.device.findUnique({
            where: { id: deviceId }
        });

        if (!device) throw new Error("Device not found");
        if (device.userId !== userId) throw new Error("Forbidden");

        // 2. Putuskan koneksi WhatsApp jika aktif
        await disconnectWhatsApp(deviceId);

        // 3. Hapus dari Prisma
        await prisma.device.delete({
            where: { id: deviceId }
        });

        revalidatePath("/dashboard/devices");
        return { success: true };
    } catch (error) {
        console.error("Error deleting device:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getDevice(deviceId: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const device = await prisma.device.findUnique({
            where: { id: deviceId }
        });

        if (!device) throw new Error("Device not found");
        if (device.userId !== userId) throw new Error("Forbidden");

        return { success: true, device };
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("Error fetching device:", err);
        return { success: false, error: err.message || "Unknown error" };
    }
}

export async function disconnectDevice(deviceId: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const device = await prisma.device.findUnique({
            where: { id: deviceId }
        });

        if (!device) throw new Error("Device not found");
        if (device.userId !== userId) throw new Error("Forbidden");

        await disconnectWhatsApp(deviceId);

        await prisma.device.update({
            where: { id: deviceId },
            data: {
                status: 'disconnected',
                qr: null,
            }
        });

        revalidatePath("/dashboard/devices");
        return { success: true };
    } catch (error) {
        console.error("Error disconnecting device:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getDeviceMessages(deviceId: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const messages = await prisma.message.findMany({
            where: { deviceId },
            orderBy: { sentAt: 'desc' },
            take: 50
        });

        return { success: true, messages };
    } catch (error) {
        console.error("Error fetching device messages:", error);
        return { success: false, messages: [] };
    }
}
