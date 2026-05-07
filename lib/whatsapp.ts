import makeWASocket, {
    DisconnectReason,
    WASocket,
    Browsers,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import { getAuthState } from './baileys-store';
import prisma from './prisma';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Mock CacheStore untuk memenuhi interface Baileys tanpa library eksternal
const msgRetryCounterCache = {
    get: (key: string) => msgRetryCounterMap.get(key),
    set: (key: string, value: number) => msgRetryCounterMap.set(key, value),
    del: (key: string) => msgRetryCounterMap.delete(key),
    flushAll: () => msgRetryCounterMap.clear()
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const msgRetryCounterMap = new Map<string, number>();

declare global {
    var waSessions: Map<string, WASocket> | undefined;
}

const sessions = globalThis.waSessions || new Map<string, WASocket>();
if (process.env.NODE_ENV !== 'production') {
    globalThis.waSessions = sessions;
}

export async function connectToWhatsApp(deviceId: string) {
    if (sessions.has(deviceId)) {
        return sessions.get(deviceId);
    }

    try {
        const device = await prisma.device.findUnique({
            where: { id: deviceId }
        });

        if (!device) {
            console.error(`🚫 Device ${deviceId} not found in database. Aborting WhatsApp connection.`);
            return undefined;
        }

        const { state, saveCreds } = await getAuthState(deviceId);
        const signalRepository = makeCacheableSignalKeyStore(state.keys, pino({ level: 'error' }));

        let version: [number, number, number] = [2, 3000, 1017571181];
        try {
            const { version: latestVersion } = await fetchLatestBaileysVersion();
            version = latestVersion;
        } catch {
            console.warn("⚠️ Gagal mengambil versi terbaru Baileys, menggunakan fallback.");
        }

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: signalRepository,
            },
            logger: pino({ level: 'error' }),
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 15000,
            markOnlineOnConnect: true,
            msgRetryCounterCache,
        });

        sessions.set(deviceId, sock);

        sock.ev.on('creds.update', async (update) => {
            await saveCreds();
            if (update.me?.name) {
                try {
                    await prisma.device.update({
                        where: { id: deviceId },
                        data: { waName: update.me.name }
                    });
                } catch {}
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    const jid = msg.key.remoteJid;
                    if (!jid || jid === 'status@broadcast' || msg.key.fromMe) continue;

                    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
                    if (!body) continue;

                    // Simpan pesan masuk ke database
                    try {
                        await prisma.message.create({
                            data: {
                                deviceId,
                                to: jid.split('@')[0],
                                text: body,
                                status: 'received'
                            }
                        });
                    } catch (err) {
                        console.error("[WA] Gagal menyimpan pesan masuk:", err);
                    }

                    try {
                        const rules = await prisma.autoReply.findMany({
                            where: { deviceId }
                        });

                        for (const rule of rules) {
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

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    await prisma.device.update({
                        where: { id: deviceId },
                        data: { status: 'connecting', qr: qr }
                    });
                } catch (err) {
                    console.error(`❌ Failed to update QR for device ${deviceId}:`, err);
                }
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

                sessions.delete(deviceId);

                if (shouldReconnect) {
                    try {
                        await prisma.device.update({
                            where: { id: deviceId },
                            data: { status: 'connecting' }
                        });
                        setTimeout(() => connectToWhatsApp(deviceId), 5000);
                    } catch {}
                } else {
                    try {
                        await prisma.device.update({
                            where: { id: deviceId },
                            data: { status: 'disconnected', qr: null }
                        });
                    } catch {}
                }
            } else if (connection === 'open') {
                try {
                    await prisma.device.update({
                        where: { id: deviceId },
                        data: {
                            status: 'connected',
                            phone: sock.user?.id.split(':')[0],
                            qr: null
                        }
                    });

                    // Update Profile Async
                    (async () => {
                        const waName = sock.user?.name || state.creds.me?.name || '';
                        let waImage = '';
                        try {
                            if (sock.user?.id) waImage = await sock.profilePictureUrl(sock.user.id) || '';
                        } catch {}

                        if (waName || waImage) {
                            await prisma.device.update({
                                where: { id: deviceId },
                                data: {
                                    ...(waName && { waName }),
                                    ...(waImage && { waImage })
                                }
                            });
                        }
                    })();
                } catch (e) {
                    console.error("Failed to update connected status:", e);
                }
            }
        });

        return sock;
    } catch (error) {
        console.error("Connection error:", error);
        return undefined;
    }
}

export function getSession(deviceId: string) {
    return sessions.get(deviceId);
}

export async function disconnectWhatsApp(deviceId: string) {
    const sock = sessions.get(deviceId);
    if (sock) {
        try {
            await sock.logout();
        } catch {}
        sock.ev.removeAllListeners('connection.update');
        sessions.delete(deviceId);
    }

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
    if (!sock) sock = await connectToWhatsApp(deviceId);
    if (!sock) throw new Error("Device tidak terhubung.");

    const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text });

    // Simpan pesan keluar ke database
    try {
        await prisma.message.create({
            data: {
                deviceId,
                to: to.replace(/[^0-9]/g, ''),
                text,
                status: 'sent'
            }
        });
    } catch (err) {
        console.error("[WA] Gagal menyimpan pesan keluar:", err);
    }

    return { success: true };
}
