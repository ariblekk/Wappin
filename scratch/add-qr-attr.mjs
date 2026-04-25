import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function run() {
    try {
        await databases.createStringAttribute('main', 'devices', 'qr', 1000, false);
        console.log('Attribute "qr" created successfully');
    } catch (e) {
        console.log('Note:', e.message);
    }
}

run();
