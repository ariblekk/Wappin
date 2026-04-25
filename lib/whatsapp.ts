import makeWASocket, {
    DisconnectReason,
    WASocket
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import { getAppwriteAuthState } from './baileys-store';
import { createAdminClient } from './appwrite-server';
import pino from 'pino';
import { Query, Models } from "node-appwrite";
import fs from 'fs';
import path from 'path';



interface AppwriteDevice extends Models.Document {
    name: string;
    userId: string;
    waName?: string;
    waImage?: string;
    phone?: string;
    status: string;
}

const logger = pino({ level: 'warn' });


const sessions = new Map<string, WASocket>();



export async function connectToWhatsApp(deviceId: string) {
    if (sessions.has(deviceId)) {
        return sessions.get(deviceId);
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!;

    // Ambil data perangkat dengan retry logic untuk mengatasi lag database
    let deviceName = 'Web Browser';
    let device: AppwriteDevice | null = null;
    
    const fetchDeviceWithRetry = async (retries = 5, delay = 1000): Promise<AppwriteDevice | null> => {
        try {
            return await databases.getDocument(DB_ID, COL_ID, deviceId) as unknown as AppwriteDevice;
        } catch (e: unknown) {
            const appwriteErr = e as { code?: number };
            if (appwriteErr.code === 404 && retries > 0) {
                console.log(`⚠️ Device ${deviceId} not found, retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(res => setTimeout(res, delay));
                return fetchDeviceWithRetry(retries - 1, delay * 2);
            }
            throw e;
        }
    };

    try {
        device = await fetchDeviceWithRetry();
        if (device) deviceName = device.name;
    } catch (e: unknown) {
        const appwriteErr = e as { code?: number };
        if (appwriteErr.code === 404) {
            console.error(`🚫 Device ${deviceId} not found in Appwrite after retries. Aborting WhatsApp connection.`);
            return undefined; // Batalkan koneksi
        }

        console.error("Failed to fetch device name for browser config:", e);
    }



    const { state, saveCreds } = await getAppwriteAuthState(deviceId);
    const version: [number, number, number] = [6, 7, 21];


    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        // Ini akan muncul di WhatsApp -> Linked Devices
        browser: ['Wappin', `Wappin (${deviceName})`, '1.0.0']
    });

    sessions.set(deviceId, sock);

    sock.ev.on('creds.update', saveCreds);

    // Listen for new messages
    sock.ev.on('messages.upsert', async (m) => {
        console.log(`[WA Event] messages.upsert type: ${m.type}`);
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                const jid = msg.key.remoteJid;
                console.log(`[WA Message] Received from ${jid}. fromMe: ${msg.key.fromMe}`);
                if (!jid || jid === 'status@broadcast' || msg.key.fromMe) continue;

                const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
                console.log(`[WA Message] Body content: "${body}"`);
                if (!body) continue;

                // Auto Reply Logic
                try {
                    console.log(`[AutoReply] Checking rules for device: ${deviceId}`);
                    const { databases } = await createAdminClient();
                    const rules = await databases.listDocuments(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        "auto_replies",
                        [
                            Query.equal("deviceId", deviceId)
                        ]
                    );
                    console.log(`[AutoReply] Found ${rules.documents.length} rules in Appwrite.`);

                    for (const rule of rules.documents) {
                        let matched = false;
                        const keyword = rule.keyword.toLowerCase().trim();
                        const message = body.toLowerCase().trim();

                        console.log(`[AutoReply] Testing rule: "${keyword}" (${rule.type}) against "${message}"`);

                        if (rule.type === 'exact') {
                            matched = message === keyword;
                        } else if (rule.type === 'contains') {
                            matched = message.includes(keyword);
                        }

                        if (matched) {
                            console.log(`[AutoReply] ✅ MATCH FOUND! Sending response: "${rule.response}"`);
                            await sock.sendMessage(jid, { text: rule.response });
                            break; 
                        }
                    }
                } catch (err) {
                    console.error("[AutoReply] ❌ Error in logic:", err);
                }
            }
        }
    });

    // Tangkap nama WA dari event contacts.upsert
    // sock.user hanya berisi id & lid saat koneksi, nama datang lewat event ini
    sock.ev.on('contacts.upsert', async (contacts) => {
        const selfId = sock.user?.id;
        if (!selfId) return;

        const selfContact = contacts.find(c => c.id === selfId || c.id.split(':')[0] === selfId.split(':')[0]);
        if (!selfContact) return;

        const waName = selfContact.notify || selfContact.name || '';
        if (!waName) return;

        const { databases } = await createAdminClient();
        try {
            await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                deviceId,
                { waName }
            );
        } catch {
            // Abaikan jika gagal
        }
    });



    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            console.log(`[WA Connection] Closed. Reason: ${statusCode}`);
        }
        
        const { databases } = await createAdminClient();

        if (qr) {
            // Update QR di Appwrite secara otomatis lewat lib/whatsapp.ts

            // Retry helper: dokumen mungkin belum committed di Appwrite saat QR pertama kali muncul
            const updateQR = async (retries = 5, delay = 500): Promise<void> => {
                try {
                    await databases.updateDocument(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                        deviceId,
                        { status: 'connecting', qr: qr }
                    );
                } catch (err: unknown) {
                    const appwriteErr = err as { code?: number };
                    if (appwriteErr.code === 404 && retries > 0) {
                        await new Promise(res => setTimeout(res, delay));
                        return updateQR(retries - 1, delay * 2);
                    }
                    console.error(`❌ Failed to update QR for device ${deviceId}:`, err);
                    // Jika dokumen tidak ditemukan setelah semua retry, tutup session ini
                    if (appwriteErr.code === 404) {
                        sock.end(undefined);
                        sessions.delete(deviceId);
                    }
                }
            };

            await updateQR();
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

            if (shouldReconnect) {
                console.log(`[WA Connection] Reconnecting device ${deviceId} in 5 seconds...`);
                setTimeout(async () => {
                    // Cek apakah dokumen masih ada sebelum reconnect
                    try {
                        await databases.getDocument(
                            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                            deviceId
                        );
                        connectToWhatsApp(deviceId);
                    } catch {
                        console.log(`🚫 Device ${deviceId} no longer exists or inaccessible, stopping reconnection.`);
                        sessions.delete(deviceId);
                    }
                }, 5000);
            } else {

                sessions.delete(deviceId);
                try {
                    await databases.updateDocument(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                        deviceId,
                        {
                            status: 'disconnected',
                            session: null,
                            qr: null
                        }
                    );
                } catch {
                    // Ignore error if document already deleted
                }
            }
        } else if (connection === 'open') {
            sessions.set(deviceId, sock);
            try {
                // Update status utama dulu
                await databases.updateDocument(
                    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                    deviceId,
                    {
                        status: 'connected',
                        phone: sock.user?.id.split(':')[0],
                        qr: null
                    }
                );

                // Update profil WA dengan retry (atribut baru butuh waktu untuk aktif di Appwrite)
                const updateProfile = async (retries = 3, delay = 3000): Promise<void> => {
                    try {
                        // notify = nama yang user set sendiri di WA (pushname)
                        const waName = sock.user?.notify || sock.user?.name || '';
                        let waImage = '';
                        try {
                            if (sock.user?.id) {
                                waImage = await sock.profilePictureUrl(sock.user.id) || '';
                            }
                        } catch {
                            // Foto tidak tersedia atau privasi
                        }
                        await databases.updateDocument(
                            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                            deviceId,
                            { waName, waImage }
                        );
                // Listen for new messages

                    } catch (e: unknown) {
                        const err = e as { code?: number; message?: string };
                        if (retries > 0) {
                            console.error(`⚠️  Failed to update WA profile (retry in ${delay}ms):`, err.message);
                            await new Promise(r => setTimeout(r, delay));
                            return updateProfile(retries - 1, delay);
                        }
                        console.error('❌ Failed to update WA profile after retries:', err.message);
                    }
                };
                updateProfile();
            } catch (e) {
                console.error("Failed to update connected status:", e);
            }
        }
    });

    return sock;
}

export function getSession(deviceId: string) {
    return sessions.get(deviceId);
}
export async function disconnectWhatsApp(deviceId: string) {
    const sock = sessions.get(deviceId);
    if (sock) {
        try {
            await sock.logout();
        } catch {
            // Ignore if already disconnected
        }
        sock.ev.removeAllListeners('connection.update');
        sessions.delete(deviceId);
    }

    // Delete local session folder
    try {
        const sessionDir = path.join(process.cwd(), 'storage', 'whatsapp-sessions', deviceId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.error(`Failed to delete local session for ${deviceId}:`, error);
    }
}


export async function sendMessage(deviceId: string, to: string, text: string) {
    let sock = sessions.get(deviceId);

    // Jika session tidak ada di memory, coba connect
    if (!sock) {
        sock = await connectToWhatsApp(deviceId);
    }

    if (!sock) {
        throw new Error("Device tidak terhubung.");
    }

    // Helper untuk menunggu socket sampai status 'open'
    const waitForOpen = async (s: WASocket, timeout = 10000) => {
        if (sessions.get(deviceId) === s) return s; // Sudah terdaftar di map = sudah pernah 'open'

        return new Promise<WASocket>((resolve, reject) => {
            const timer = setTimeout(() => {
                s.ev.removeAllListeners('connection.update');
                reject(new Error("Gagal terhubung ke WhatsApp (Timeout). Pastikan perangkat sudah di-scan."));
            }, timeout);

            const listener = (update: Partial<import('@whiskeysockets/baileys').ConnectionState>) => {
                const { connection } = update;
                if (connection === 'open') {
                    clearTimeout(timer);
                    s.ev.off('connection.update', listener);
                    resolve(s);
                } else if (connection === 'close') {
                    // Jika close permanen saat menunggu, stop
                    const statusCode = (update.lastDisconnect?.error as Boom)?.output?.statusCode;
                    if (statusCode === DisconnectReason.loggedOut) {
                        clearTimeout(timer);
                        s.ev.off('connection.update', listener);
                        reject(new Error("Perangkat telah keluar (Logged Out)."));
                    }
                }
            };
            s.ev.on('connection.update', listener);
        });
    };

    try {
        // Jika sock baru saja dibuat atau belum 'open', tunggu dulu
        if (!sessions.has(deviceId)) {
            sock = await waitForOpen(sock);
        }

        const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text });
        return { success: true };
    } catch (err: unknown) {
        const error = err as Error & { output?: { statusCode?: number } };
        console.error(`[WA Send Error] ${deviceId}:`, error);

        // Jika error karena connection closed, coba bersihkan session & lempar error
        if (error.message?.includes('Closed') || error.output?.statusCode === 428) {
            sessions.delete(deviceId);
            throw new Error("Koneksi terputus. Silakan coba lagi dalam beberapa saat.");
        }

        throw err;
    }
}
