import { Query } from "node-appwrite";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("🛠️  Server starting: Initializing connected WhatsApp devices...");
      
      const { createAdminClient } = await import("./lib/appwrite-server");
      const { databases } = await createAdminClient();
      
      const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
      const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!;
      
      if (!DB_ID || !COL_ID) {
        console.warn("⚠️ Appwrite DB or Collection ID not set in env variables.");
        return;
      }

      // Fetch all devices with status 'connected'
      const response = await databases.listDocuments(DB_ID, COL_ID, [
        Query.equal("status", "connected")
      ]);

      if (response.documents.length === 0) {
        console.log("ℹ️ No connected devices found to auto-wake.");
        return;
      }

      console.log(`🚀 Found ${response.documents.length} connected device(s). Waking up sessions...`);
      
      const { connectToWhatsApp } = await import("./lib/whatsapp");
      
      for (const device of response.documents) {
        console.log(`⏳ Auto-connecting device: ${device.name} (${device.$id})`);
        connectToWhatsApp(device.$id).catch(e => {
          console.error(`❌ Failed to auto-connect device ${device.$id}:`, e);
        });
      }
      
    } catch (error) {
      console.error("❌ Failed to initialize WhatsApp devices on startup:", error);
    }
  }
}
