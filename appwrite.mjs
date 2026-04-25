import { Client, Databases, Storage, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COL_DEVICES = process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID;
const COL_MESSAGES = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID;
const COL_BROADCASTS = process.env.NEXT_PUBLIC_APPWRITE_BROADCASTS_COLLECTION_ID;
const COL_CONTACTS    = "contacts";
const COL_AUTO_REPLY  = "auto_replies";
const BUCKET_SESSIONS = process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_BUCKET_ID || "sessions";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function createDatabase() {
    try {
        await databases.create(DB_ID, 'Main Database');
        console.log(`✅ Database '${DB_ID}' created.`);
    } catch {
        console.log(`⚠️  Database '${DB_ID}' already exists.`);
    }
}

async function createBucket(bucketId, name) {
    try {
        await storage.createBucket(bucketId, name, [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ], false); // second param is file security, set to false for bucket-level security
        console.log(`✅ Bucket '${name}' (${bucketId}) created.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`⚠️  Bucket '${bucketId}' already exists.`);
        } else {
            console.log(`❌ Failed to create bucket '${bucketId}': ${e.message}`);
        }
    }
}

async function createCollection(colId, name) {
    try {
        await databases.createCollection(DB_ID, colId, name, [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ]);
        console.log(`✅ Collection '${name}' (${colId}) created.`);
    } catch {
        console.log(`⚠️  Collection '${colId}' already exists.`);
    }
}

async function attr(colId, name, type, opts = {}) {
    const { size, required = false, defaultValue = null, enumValues, min = null, max = null } = opts;
    try {
        process.stdout.write(`   [${type}] ${name}... `);
        if (type === 'string') {
            await databases.createStringAttribute(DB_ID, colId, name, size ?? 255, required, defaultValue);
        } else if (type === 'enum') {
            await databases.createEnumAttribute(DB_ID, colId, name, enumValues, required, defaultValue);
        } else if (type === 'boolean') {
            await databases.createBooleanAttribute(DB_ID, colId, name, required, defaultValue);
        } else if (type === 'integer') {
            await databases.createIntegerAttribute(DB_ID, colId, name, required, min, max, defaultValue);
        } else if (type === 'datetime') {
            await databases.createDatetimeAttribute(DB_ID, colId, name, required, defaultValue);
        }
        console.log('✅');
    } catch (e) {
        if (e.code === 409 || e.message?.includes('already exists')) {
            console.log('skipped (already exists)');
        } else {
            console.log(`❌ ${e.message}`);
        }
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
// Schema Definitions
// ─────────────────────────────────────────────────────────────

async function setupDevices() {
    console.log('\n📱 Collection: devices');
    await createCollection(COL_DEVICES, 'Devices');
    await sleep(500);
    await attr(COL_DEVICES, 'name', 'string', { size: 255, required: true });
    await attr(COL_DEVICES, 'status', 'string', { size: 50, required: true });
    await attr(COL_DEVICES, 'userId', 'string', { size: 50, required: true });
    await attr(COL_DEVICES, 'phone', 'string', { size: 30 });
    await attr(COL_DEVICES, 'qr', 'string', { size: 2000 });
    await attr(COL_DEVICES, 'session', 'string', { size: 8000 });
    await attr(COL_DEVICES, 'waName', 'string', { size: 255 });
    await attr(COL_DEVICES, 'waImage', 'string', { size: 2048 });
}

async function setupMessages() {
    console.log('\n💬 Collection: messages');
    await createCollection(COL_MESSAGES, 'Messages');
    await sleep(500);
    await attr(COL_MESSAGES, 'deviceId', 'string', { size: 50, required: true });
    await attr(COL_MESSAGES, 'userId', 'string', { size: 50, required: true });
    await attr(COL_MESSAGES, 'to', 'string', { size: 20, required: true });
    await attr(COL_MESSAGES, 'body', 'string', { size: 4096, required: true });
    await attr(COL_MESSAGES, 'status', 'enum', { enumValues: ['pending', 'sent', 'failed'], required: true });
    await attr(COL_MESSAGES, 'error', 'string', { size: 512 });
    await attr(COL_MESSAGES, 'sentAt', 'datetime');
}

async function setupBroadcasts() {
    console.log('\n📢 Collection: broadcasts');
    await createCollection(COL_BROADCASTS, 'Broadcasts');
    await sleep(500);
    await attr(COL_BROADCASTS, 'deviceId', 'string', { size: 50, required: true });
    await attr(COL_BROADCASTS, 'userId', 'string', { size: 50, required: true });
    await attr(COL_BROADCASTS, 'name', 'string', { size: 255, required: true });
    await attr(COL_BROADCASTS, 'title', 'string', { size: 255, required: true });
    await attr(COL_BROADCASTS, 'message', 'string', { size: 4096, required: true });
    await attr(COL_BROADCASTS, 'body', 'string', { size: 4096, required: true });
    await attr(COL_BROADCASTS, 'recipients', 'string', { size: 65535 });
    await attr(COL_BROADCASTS, 'status', 'enum', { enumValues: ['pending', 'processing', 'completed', 'failed'], required: true });
    await attr(COL_BROADCASTS, 'total', 'integer', { defaultValue: 0 });
    await attr(COL_BROADCASTS, 'sent', 'integer', { defaultValue: 0 });
    await attr(COL_BROADCASTS, 'failed', 'integer', { defaultValue: 0 });
    await attr(COL_BROADCASTS, 'timestamp', 'integer');
}

async function setupContacts() {
    console.log('\n👥 Collection: contacts');
    await createCollection(COL_CONTACTS, 'Contacts');
    await sleep(500);
    await attr(COL_CONTACTS, 'name', 'string', { size: 255, required: true });
    await attr(COL_CONTACTS, 'phone', 'string', { size: 30, required: true });
    await attr(COL_CONTACTS, 'tags', 'string', { size: 255 }); // Comma separated tags
    await attr(COL_CONTACTS, 'userId', 'string', { size: 50, required: true });
}

async function setupAutoReplies() {
    console.log('\n🤖 Collection: auto_replies');
    await createCollection(COL_AUTO_REPLY, 'Auto Replies');
    await sleep(500);
    await attr(COL_AUTO_REPLY, 'keyword', 'string', { size: 255, required: true });
    await attr(COL_AUTO_REPLY, 'response', 'string', { size: 4096, required: true });
    await attr(COL_AUTO_REPLY, 'type', 'enum', { enumValues: ['exact', 'contains'], required: true });
    await attr(COL_AUTO_REPLY, 'deviceId', 'string', { size: 50, required: true });
    await attr(COL_AUTO_REPLY, 'userId', 'string', { size: 50, required: true });
}

async function setupBuckets() {
    console.log('\n📁 Storage Buckets');
    await createBucket(BUCKET_SESSIONS, 'WhatsApp Sessions');
}

// ─────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────

async function setup() {
    console.log('🔧 Starting Wapping Appwrite setup...');
    console.log(`   Endpoint : ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
    console.log(`   Project  : ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`);
    console.log(`   Database : ${DB_ID}\n`);

    await createDatabase();
    await setupDevices();
    await setupMessages();
    await setupBroadcasts();
    await setupContacts();
    await setupAutoReplies();
    await setupBuckets();

    console.log('\n🚀 Setup selesai! Semua koleksi, atribut, dan bucket sudah siap.');
}

setup().catch(e => console.error('\n❌ Setup failed:', e.message));
