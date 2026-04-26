import { NextResponse } from 'next/server';
import { getUserIdByApiKey } from '@/app/actions/profiles';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query, ID, Permission, Role } from 'node-appwrite';
import { processBroadcast } from '@/app/actions/broadcast';

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

        // Parse recipients (bisa array atau string dipisahkan koma/\n)
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

        const { databases } = await createAdminClient();

        // Cari deviceId jika tidak disertakan
        let targetDeviceId = deviceId;
        if (!targetDeviceId) {
            const devices = await databases.listDocuments(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                [
                    Query.equal("userId", userId),
                    Query.equal("status", "connected"),
                    Query.limit(1)
                ]
            );

            if (devices.documents.length === 0) {
                return NextResponse.json({ success: false, error: "No connected WhatsApp device found for this account" }, { status: 400 });
            }
            targetDeviceId = devices.documents[0].$id;
        }

        const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
        const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_BROADCASTS_COLLECTION_ID!;

        // Format nomor telepon recipients
        const formattedRecipients = recipientList.map(phone => {
            const cleanPhone = phone.replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('0') 
                ? '62' + cleanPhone.slice(1) 
                : cleanPhone.startsWith('62') 
                    ? cleanPhone 
                    : '62' + cleanPhone;
            return `${finalPhone}@s.whatsapp.net`;
        });

        // Buat record broadcast
        const broadcast = await databases.createDocument(
            DB_ID,
            COL_ID,
            ID.unique(),
            {
                deviceId: targetDeviceId,
                userId: userId,
                name: name,
                title: name,
                message: message,
                body: message,
                recipients: JSON.stringify(formattedRecipients),
                status: "processing",
                total: formattedRecipients.length,
                sent: 0,
                failed: 0,
                timestamp: Math.floor(Date.now() / 1000)
            },
            [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
            ]
        );

        // Jalankan proses broadcast di background
        processBroadcast(broadcast.$id, targetDeviceId, message, formattedRecipients);

        return NextResponse.json({ 
            success: true, 
            message: "Broadcast berhasil dibuat dan sedang diproses",
            broadcastId: broadcast.$id 
        });

    } catch (error) {
        console.error("API Broadcast Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
