import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';

/**
 * Baileys session store menggunakan local file system dengan cache memory.
 * useMultiFileAuthState digunakan sebagai dasar penyimpanan permanen, 
 * namun performa ditingkatkan dengan makeCacheableSignalKeyStore di sisi socket.
 */
export async function getAppwriteAuthState(deviceId: string) {
    // Tentukan direktori penyimpanan session
    const sessionsDir = path.join(process.cwd(), 'storage', 'whatsapp-sessions');
    const sessionDir = path.join(sessionsDir, deviceId);

    // Pastikan folder ada
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    return {
        state,
        saveCreds
    };
}

