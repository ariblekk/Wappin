import { NextResponse } from 'next/server';
import { getUserIdByApiKey } from '@/app/actions/profiles';
import prisma from '@/lib/prisma';
import { sendMessage } from '@/lib/whatsapp';

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
        const { phone, message, deviceId } = body;

        if (!phone || !message) {
            return NextResponse.json({ success: false, error: "Missing phone or message in request body" }, { status: 400 });
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

        // Format nomor telepon
        const cleanPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('0') 
            ? '62' + cleanPhone.slice(1) 
            : cleanPhone.startsWith('62') 
                ? cleanPhone 
                : '62' + cleanPhone;

        // Kirim pesan (sendMessage sudah menangani logging ke Prisma)
        try {
            const sendResult = await sendMessage(targetDeviceId, finalPhone, message);
            
            if (sendResult.success) {
                return NextResponse.json({ success: true, message: "Pesan berhasil dikirim" });
            } else {
                return NextResponse.json({ success: false, error: "Gagal mengirim pesan" }, { status: 500 });
            }
        } catch (sendError) {
            const errorMsg = (sendError as Error).message || "Gagal mengirim pesan";
            return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
