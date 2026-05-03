import { NextResponse } from 'next/server';
import { getUserIdByApiKey } from '@/app/actions/profiles';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query, ID, Permission, Role } from 'node-appwrite';

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

        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ success: false, error: "Missing device name" }, { status: 400 });
        }

        const userId = authRes.userId;
        const { databases } = await createAdminClient();

        // Create device document
        const device = await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
            ID.unique(),
            {
                name,
                userId,
                status: "connecting",
            },
            [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
            ]
        );

        // Start WhatsApp connection
        const { connectToWhatsApp } = await import("@/lib/whatsapp");
        connectToWhatsApp(device.$id).catch(e => console.error(`Failed to start session ${device.$id}:`, e));

        // Poll for QR code (max 10 seconds)
        let qr = null;
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updatedDevice = await databases.getDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                device.$id
            );
            if (updatedDevice.qr) {
                qr = updatedDevice.qr;
                break;
            }
        }

        return NextResponse.json({
            success: true,
            deviceId: device.$id,
            qr,
            status: qr ? 'connecting' : 'initializing',
            message: qr ? "QR code generated successfully" : "Device created, QR code is being generated. Please check back in a few seconds or poll GET /api/v1/devices"
        });

    } catch (error) {
        console.error("API Create Device Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
