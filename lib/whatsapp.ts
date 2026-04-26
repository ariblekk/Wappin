import makeWASocket, {
    DisconnectReason,
    WASocket,
    Browsers,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import { getAppwriteAuthState } from './baileys-store';
import { createAdminClient } from './appwrite-server';
import pino from 'pino';
import { Query, Models } from "node-appwrite";
import fs from 'fs';
import path from 'path';

// Mock CacheStore untuk memenuhi interface Baileys tanpa library eksternal
const msgRetryCounterCache = {
    get: (key: string) => msgRetryCounterMap.get(key),
    set: (key: string, value: number) => msgRetryCounterMap.set(key, value),
    del: (key: string) => msgRetryCounterMap.delete(key),
    flushAll: () => msgRetryCounterMap.clear()
} as unknown as any;

const msgRetryCounterMap = new Map<string, number>();



interface AppwriteDevice extends Models.Document {
    name: string;
    userId: string;
    waName?: string;
    waImage?: string;
    phone?: string;
    status: string;
}




const sessions = new Map<string, WASocket>();



export async function connectToWhatsApp(deviceId: string) {
    if (sessions.has(deviceId)) {
        return sessions.get(deviceId);
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!;

    // Ambil data perangkat dengan retry logic untuk mengatasi lag database
    const fetchDeviceWithRetry = async (retries = 5, delay = 1000): Promise<AppwriteDevice | null> => {
        try {
            return await databases.getDocument(DB_ID, COL_ID, deviceId) as unknown as AppwriteDevice;
        } catch (e: unknown) {
            const appwriteErr = e as { code?: number };
            if (appwriteErr.code === 404 && retries > 0) {
                await new Promise(res => setTimeout(res, delay));
                return fetchDeviceWithRetry(retries - 1, delay * 2);
            }
            throw e;
        }
    };

    try {
        await fetchDeviceWithRetry();
    } catch (e: unknown) {
        const appwriteErr = e as { code?: number };
        if (appwriteErr.code === 404) {
            console.error(`🚫 Device ${deviceId} not found in Appwrite after retries. Aborting WhatsApp connection.`);
            return undefined; // Batalkan koneksi
        }

        console.error("Failed to fetch device name for browser config:", e);
    }



    const { state, saveCreds } = await getAppwriteAuthState(deviceId);

    // Gunakan cache untuk signal key agar koneksi lebih stabil
    const signalRepository = makeCacheableSignalKeyStore(state.keys, pino({ level: 'error' }));

    // Ambil versi WhatsApp Web terbaru agar tidak diblokir
    let version: [number, number, number] = [2, 3000, 1017571181]; // Fallback
    try {
        const { version: latestVersion, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using WA v${latestVersion.join('.')}, isLatest: ${isLatest}`);
        version = latestVersion;
    } catch (e) {
        console.warn("⚠️ Gagal mengambil versi terbaru Baileys, menggunakan fallback:", e);
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: signalRepository,
        },
        logger: pino({ level: 'error' }), // Ubah ke error untuk melihat issue penting
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), // Gunakan format standar yang lebih aman
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0, // 0 berarti tidak ada timeout untuk query (disarankan untuk stabilitas)
        keepAliveIntervalMs: 15000, // Interval keep-alive yang optimal
        generateHighQualityLinkPreview: true,
        syncFullHistory: false, // Kurangi beban sync history
        markOnlineOnConnect: true,
        retryRequestDelayMs: 2000,
        msgRetryCounterCache, // Tambahkan cache untuk retry pesan
        // Hindari memproses pesan yang terlalu lama (backlog)
        shouldIgnoreJid: (jid) => jid.endsWith('@g.us') && false, // Bisa disesuaikan jika ingin mengabaikan grup
    });

    sessions.set(deviceId, sock);

    sock.ev.on('creds.update', async (update) => {
        await saveCreds();
        
        // Tangkap nama profil dari creds jika tersedia
        if (update.me?.name) {
            const waName = update.me.name;
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
        }
    });

    // Listen for new messages
    sock.ev.on('messages.upsert', async (m) => {

        if (m.type === 'notify') {
            for (const msg of m.messages) {
                const jid = msg.key.remoteJid;

                if (!jid || jid === 'status@broadcast' || msg.key.fromMe) continue;

                const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

                if (!body) continue;

                // Auto Reply Logic
                try {

                    const { databases } = await createAdminClient();
                    const rules = await databases.listDocuments(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        "auto_replies",
                        [
                            Query.equal("deviceId", deviceId)
                        ]
                    );


                    for (const rule of rules.documents) {
                        let matched = false;
                        const keyword = rule.keyword.toLowerCase().trim();
                        const message = body.toLowerCase().trim();



                        if (rule.type === 'exact') {
                            matched = message === keyword;
                        } else if (rule.type === 'contains') {
                            matched = message.includes(keyword);
                        }

                        if (matched) {

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

        const contact = selfContact as unknown as {
            pushName?: string;
            pushname?: string;
            notify?: string;
            name?: string;
            verifiedName?: string;
        };
        const waName = contact.pushName || contact.pushname || contact.notify || contact.name || contact.verifiedName || '';
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
            const errorReason = (lastDisconnect?.error as Boom)?.output?.payload?.reason || (lastDisconnect?.error as unknown as { reason?: string })?.reason;
            const isConflict = statusCode === DisconnectReason.connectionReplaced || 
                              (statusCode === 440 && errorReason === 'conflict') ||
                              lastDisconnect?.error?.message?.includes('replaced');

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                  statusCode !== 401 && 
                                  !isConflict;

            console.log(`[WA] Connection closed for ${deviceId}. Reason: ${statusCode} (${errorReason}), Conflict: ${isConflict}, Reconnecting: ${shouldReconnect}`);

            // Hapus session dari memori agar bisa membuat koneksi baru
            sessions.delete(deviceId);

            if (isConflict) {
                console.warn(`[WA] Conflict detected for ${deviceId}. This session is active on another server/process. Aborting reconnect to prevent loop.`);
                try {
                    await databases.updateDocument(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                        deviceId,
                        { status: 'disconnected', qr: null }
                    );
                } catch {
                    // Abaikan jika gagal
                }
                return; // Berhenti di sini untuk konflik
            }

            if (shouldReconnect) {
                // Update status ke Appwrite
                try {
                    await databases.updateDocument(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                        deviceId,
                        { status: 'connecting' }
                    );
                } catch {
                    // Abaikan jika gagal
                }

                // Gunakan timeout yang sedikit lebih lama untuk memberikan waktu socket benar-benar bersih
                setTimeout(async () => {
                    try {
                        // Pastikan dokumen masih ada sebelum mencoba menghubungkan kembali
                        const device = await databases.getDocument(
                            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                            process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                            deviceId
                        );
                        
                        if (device) {
                            console.log(`[WA] Attempting to reconnect device ${deviceId}...`);
                            connectToWhatsApp(deviceId);
                        }
                    } catch {
                        console.error(`[WA] Reconnect aborted for ${deviceId}: Device document might be deleted.`);
                    }
                }, 5000);
            } else {
                // Jika tidak perlu reconnect (logout atau 401)
                console.warn(`[WA] Device ${deviceId} logged out or unauthorized. Cleaning up...`);
                
                // Hapus folder session lokal jika di-logout
                try {
                    const sessionDir = path.join(process.cwd(), 'storage', 'whatsapp-sessions', deviceId);
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                } catch (error) {
                    console.error(`Failed to delete local session on logout for ${deviceId}:`, error);
                }

                try {
                    await databases.updateDocument(
                        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                        deviceId,
                        {
                            status: 'disconnected',
                            qr: null
                        }
                    );
                } catch {
                    // Abaikan jika dokumen sudah dihapus
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
                        // Ambil nama dari berbagai kemungkinan (sock.user atau authState)
                        const user = sock.user as unknown as { pushName?: string; pushname?: string; name?: string; verifiedName?: string };
                        const waName = user?.pushName || user?.pushname || user?.name || user?.verifiedName || state.creds.me?.name || '';
                        
                        let waImage = '';
                        try {
                            if (sock.user?.id) {
                                waImage = await sock.profilePictureUrl(sock.user.id) || '';
                            }
                        } catch {
                            // Foto tidak tersedia atau privasi
                        }

                        // Hanya update jika data minimal tersedia (waName atau waImage)
                        if (waName || waImage) {
                            await databases.updateDocument(
                                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                                process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
                                deviceId,
                                { 
                                    ...(waName && { waName }), 
                                    ...(waImage && { waImage }) 
                                }
                            );
                        }
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
        // Sudah terdaftar DAN sock.user sudah ada = benar-benar siap kirim pesan
        if (sessions.get(deviceId) === s && s.user) return s;

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
                    const statusCode = (update.lastDisconnect?.error as Boom)?.output?.statusCode;
                    clearTimeout(timer);
                    s.ev.off('connection.update', listener);
                    
                    if (statusCode === DisconnectReason.loggedOut) {
                        reject(new Error("Perangkat telah keluar (Logged Out)."));
                    } else {
                        reject(new Error("Koneksi ditutup oleh WhatsApp (Status: " + statusCode + ")."));
                    }
                }
            };
            s.ev.on('connection.update', listener);
        });
    };

    try {
        // Tunggu sampai socket benar-benar siap (sock.user terdefinisi)
        if (!sock.user) {
            sock = await waitForOpen(sock);
        }

        const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text });
        return { success: true };
    } catch (err: unknown) {
        const error = err as Error & { output?: { statusCode?: number } };
        console.error(`[WA Send Error] ${deviceId}:`, error);

        // Jika error karena connection closed, coba bersihkan session & reconnect SEKALI
        if (error.message?.includes('Closed') || error.output?.statusCode === 428) {
            sessions.delete(deviceId);
            console.log(`[WA Retry] Koneksi terputus untuk device ${deviceId}. Mencoba menghubungkan ulang dalam 2 detik...`);
            
            try {
                await new Promise(res => setTimeout(res, 2000));
                const newSock = await connectToWhatsApp(deviceId);
                if (newSock) {
                    const readySock = await waitForOpen(newSock);
                    const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    await readySock.sendMessage(jid, { text });
                    return { success: true };
                }
            } catch (retryError) {
                console.error(`[WA Retry Failed] ${deviceId}:`, retryError);
                throw new Error(`Gagal menghubungkan ulang WhatsApp. Pastikan nomor di HP Anda aktif.`);
            }

            throw new Error("Koneksi terputus. Silakan coba lagi dalam beberapa saat.");
        }

        throw err;
    }
}
