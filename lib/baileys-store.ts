import { 
    AuthenticationState, 
    AuthenticationCreds, 
    SignalDataTypeMap, 
    BufferJSON, 
    initAuthCreds,
    proto
} from '@whiskeysockets/baileys';
import prisma from './prisma';

/**
 * Baileys session store menggunakan Prisma Database.
 * Menghindari hilangnya sesi saat redeploy di platform ephemeral seperti Coolify.
 */
export async function getAuthState(deviceId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> {
    const writeData = async (data: unknown, type: string, id: string) => {
        try {
            await prisma.waSession.upsert({
                where: {
                    deviceId_dataType_dataId: {
                        deviceId,
                        dataType: type,
                        dataId: id,
                    }
                },
                update: {
                    content: JSON.stringify(data, BufferJSON.replacer)
                },
                create: {
                    deviceId,
                    dataType: type,
                    dataId: id,
                    content: JSON.stringify(data, BufferJSON.replacer)
                }
            });
        } catch (error) {
            console.error(`Error saving ${type}:${id} to database:`, error);
            throw error;
        }
    };

    const readData = async (type: string, id: string) => {
        try {
            const session = await prisma.waSession.findUnique({
                where: {
                    deviceId_dataType_dataId: {
                        deviceId,
                        dataType: type,
                        dataId: id,
                    }
                }
            });

            if (session) {
                return JSON.parse(session.content, BufferJSON.reviver);
            }
        } catch (error) {
            console.error(`Error reading ${type}:${id} from database:`, error);
        }
        return null;
    };

    const removeData = async (type: string, id: string) => {
        try {
            await prisma.waSession.deleteMany({
                where: {
                    deviceId,
                    dataType: type,
                    dataId: id
                }
            });
        } catch (error) {
            console.error(`Error removing ${type}:${id} from database:`, error);
            throw error;
        }
    };

    // Load credentials
    let creds: AuthenticationCreds | null = await readData('creds', 'main');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds', 'main');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
                    
                    // Batch read data dari database
                    const sessions = await prisma.waSession.findMany({
                        where: {
                            deviceId,
                            dataType: type,
                            dataId: { in: ids }
                        }
                    });

                    // Map hasil ke objek data
                    for (const id of ids) {
                        const session = sessions.find(s => s.dataId === id);
                        if (session) {
                            let value = JSON.parse(session.content, BufferJSON.reviver);
                            if (type === 'app-state-sync-key') {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    
                    return data;
                },
                set: async (data) => {
                    for (const [type, category] of Object.entries(data)) {
                        if (!category) continue;
                        for (const [id, value] of Object.entries(category)) {
                            if (value) {
                                await writeData(value, type, id);
                            } else {
                                await removeData(type, id);
                            }
                        }
                    }
                },
            },
        },
        saveCreds: async () => {
            await writeData(creds, 'creds', 'main');
        }
    };
}
