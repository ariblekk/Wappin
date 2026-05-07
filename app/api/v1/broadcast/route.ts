import { NextResponse } from 'next/server';
import { getUserIdByApiKey } from '@/app/actions/profiles';
import prisma from '@/lib/prisma';
import { processBroadcast } from '@/app/actions/broadcast';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Missing x-api-key header" }, { status: 401 });
        }

        // Validasi API Key dan dapatkan userId
        const authRes = await getUserIdByApiKey(apiKey);
        if (!authRes.success || !authRes.userId) {
            return NextResponse.json({ success: false, error: "Invalid API Key" }, { status: 401 });
        }

        const userId = authRes.userId;
        const body = await request.json();
        const { name, message, recipients, deviceId } = body;

        if (!name || !message || !recipients) {
            return NextResponse.json({ success: false, error: "Missing name, message, or recipients in request body" }, { status: 400 });
        }

        // Parse recipients
        let recipientList: string[] = [];
        if (Array.isArray(recipients)) {
            recipientList = recipients.map(r => String(r).trim()).filter(r => r.length > 0);
        } else if (typeof recipients === 'string') {
            recipientList = recipients
                .split(/[\n,]+/)
                .map(r => r.trim())
                .filter(r => r.length > 0);
        }

        if (recipientList.length === 0) {
            return NextResponse.json({ success: false, error: "No valid recipients provided" }, { status: 400 });
        }

        // Cari deviceId jika tidak disertakan
        let targetDeviceId = deviceId;
        if (!targetDeviceId) {
            const device = await prisma.device.findFirst({
                where: {
                    userId: userId,
                    status: "connected"
                }
            });

            if (!device) {
                return NextResponse.json({ success: false, error: "No connected WhatsApp device found for this account" }, { status: 400 });
            }
            targetDeviceId = device.id;
        } else {
             // Validasi kepemilikan device
             const device = await prisma.device.findUnique({
                where: { id: targetDeviceId }
            });
            if (!device || device.userId !== userId) {
                return NextResponse.json({ success: false, error: "Forbidden: Device not found or not owned by you" }, { status: 403 });
            }
        }

        // Format nomor telepon recipients
        const cleanRecipients = recipientList.map(phone => {
            const clean = phone.replace(/\D/g, '');
            return clean.startsWith('0') ? '62' + clean.slice(1) : clean.startsWith('62') ? clean : '62' + clean;
        });

        const recipientData = cleanRecipients.map(phone => ({ phone, status: "pending" }));

        // Buat record broadcast di Prisma
        const broadcast = await prisma.broadcast.create({
            data: {
                deviceId: targetDeviceId,
                userId: userId,
                name: name,
                message: message,
                recipients: recipientData as unknown as Prisma.InputJsonValue,
                status: "processing",
                total: recipientData.length,
                sent: 0,
                failed: 0,
                timestamp: Math.floor(Date.now() / 1000)
            }
        });

        // Jalankan proses broadcast di background
        processBroadcast(broadcast.id, targetDeviceId, message, cleanRecipients);

        return NextResponse.json({ 
            success: true, 
            message: "Broadcast berhasil dibuat dan sedang diproses",
            broadcastId: broadcast.id 
        });

    } catch (error) {
        console.error("API Broadcast Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
