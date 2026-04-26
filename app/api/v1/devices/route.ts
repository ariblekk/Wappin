import { NextResponse } from 'next/server';
import { getUserIdByApiKey } from '@/app/actions/profiles';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: Request) {
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
        const { databases } = await createAdminClient();

        // Ambil daftar device milik user
        const devices = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
            [
                Query.equal("userId", userId),
                Query.orderDesc("$createdAt")
            ]
        );

        // Auto-wake sessions untuk device yang terhubung (opsional, tapi bagus untuk konsistensi)
        try {
            const { connectToWhatsApp, getSession } = await import("@/lib/whatsapp");
            for (const doc of devices.documents) {
                if (doc.status === 'connected' && !getSession(doc.$id)) {
                    connectToWhatsApp(doc.$id).catch(e => console.error(`Failed to wake session ${doc.$id}:`, e));
                }
            }
        } catch (e) {
            console.error("Failed to import whatsapp lib or wake sessions:", e);
        }

        return NextResponse.json({ 
            success: true, 
            devices: devices.documents.map(doc => ({
                id: doc.$id,
                name: doc.name,
                status: doc.status,
                createdAt: doc.$createdAt
            }))
        });

    } catch (error) {
        console.error("API Devices Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
