import { NextResponse } from 'next/server';
import { getUserIdByApiKey } from '@/app/actions/profiles';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
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

        // Format nomor telepon
        const cleanPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('0') 
            ? '62' + cleanPhone.slice(1) 
            : cleanPhone.startsWith('62') 
                ? cleanPhone 
                : '62' + cleanPhone;

        const jid = `${finalPhone}@s.whatsapp.net`;

        // Simpan log awal (pending)
        const messageDoc = await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
            'unique()',
            {
                deviceId: targetDeviceId,
                userId: userId,
                to: finalPhone,
                body: message,
                status: 'pending',
                sentAt: new Date().toISOString()
            }
        );

        // Kirim pesan
        try {
            const sendResult = await sendMessage(targetDeviceId, jid, message);
            
            if (sendResult.success) {
                // Update ke sent
                await databases.updateDocument(
                    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
                    messageDoc.$id,
                    { status: 'sent' }
                );
                return NextResponse.json({ success: true, message: "Pesan berhasil dikirim" });
            } else {
                const errorMsg = (sendResult as unknown as { error?: string }).error || "Gagal mengirim pesan";
                // Update ke failed
                await databases.updateDocument(
                    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
                    messageDoc.$id,
                    { status: 'failed', error: errorMsg.slice(0, 500) }
                );
                return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
            }
        } catch (sendError) {
            const errorMsg = (sendError as Error).message || "Gagal mengirim pesan";
            // Update ke failed
            await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
                messageDoc.$id,
                { status: 'failed', error: errorMsg.slice(0, 500) }
            );
            return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
