import { NextResponse } from 'next/server';
import { validateApiAccess } from '@/app/actions/profiles';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const apiKey = request.headers.get('x-api-key');
        const userCode = request.headers.get('x-user-code');
        
        if (!apiKey || !userCode) {
            return NextResponse.json({ 
                success: false, 
                error: "Missing x-api-key or x-user-code header" 
            }, { status: 401 });
        }

        // Validasi API Key dan User Code
        const authRes = await validateApiAccess(userCode, apiKey);
        if (!authRes.success || !authRes.userId) {
            return NextResponse.json({ success: false, error: "Invalid API Key or User Code" }, { status: 401 });
        }

        const userId = authRes.userId;

        // Ambil daftar device milik user
        const devices = await prisma.device.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // Auto-wake sessions untuk device yang terhubung
        try {
            const { connectToWhatsApp, getSession } = await import("@/lib/whatsapp");
            for (const device of devices) {
                if (device.status === 'connected' && !getSession(device.id)) {
                    connectToWhatsApp(device.id).catch(e => console.error(`Failed to wake session ${device.id}:`, e));
                }
            }
        } catch (e) {
            console.error("Failed to wake sessions:", e);
        }

        return NextResponse.json({ 
            success: true, 
            devices: devices.map(device => ({
                id: device.id,
                name: device.name,
                status: device.status,
                createdAt: device.createdAt
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
        const userCode = request.headers.get('x-user-code');
        
        if (!apiKey || !userCode) {
            return NextResponse.json({ 
                success: false, 
                error: "Missing x-api-key or x-user-code header" 
            }, { status: 401 });
        }

        // Validasi API Key dan User Code
        const authRes = await validateApiAccess(userCode, apiKey);
        if (!authRes.success || !authRes.userId) {
            return NextResponse.json({ success: false, error: "Invalid API Key or User Code" }, { status: 401 });
        }

        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ success: false, error: "Missing device name" }, { status: 400 });
        }

        const userId = authRes.userId;

        // Create device in Prisma
        const device = await prisma.device.create({
            data: {
                name,
                userId,
                status: "connecting",
            }
        });

        // Start WhatsApp connection
        const { connectToWhatsApp } = await import("@/lib/whatsapp");
        connectToWhatsApp(device.id).catch(e => console.error(`Failed to start session ${device.id}:`, e));

        // Poll for QR code (max 10 seconds)
        let qr = null;
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updatedDevice = await prisma.device.findUnique({
                where: { id: device.id }
            });
            if (updatedDevice?.qr) {
                qr = updatedDevice.qr;
                break;
            }
        }

        return NextResponse.json({
            success: true,
            deviceId: device.id,
            qr,
            status: qr ? 'connecting' : 'initializing',
            message: qr ? "QR code generated successfully" : "Device created, QR code is being generated. Please check back in a few seconds or poll GET /api/v1/devices"
        });

    } catch (error) {
        console.error("API Create Device Error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
