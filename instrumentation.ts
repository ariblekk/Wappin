export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("🛠️  Server starting: Initializing connected WhatsApp devices...");
      
      const { default: prisma } = await import("./lib/prisma");
      
      // Fetch all devices with status 'connected'
      const devices = await prisma.device.findMany({
        where: { status: "connected" }
      });

      if (devices.length === 0) {
        console.log("ℹ️ No connected devices found to auto-wake.");
        return;
      }

      console.log(`🚀 Found ${devices.length} connected device(s). Waking up sessions...`);
      
      const { connectToWhatsApp } = await import("./lib/whatsapp");
      
      for (const device of devices) {
        console.log(`⏳ Auto-connecting device: ${device.name} (${device.id})`);
        connectToWhatsApp(device.id).catch(e => {
          console.error(`❌ Failed to auto-connect device ${device.id}:`, e);
        });
      }
      
    } catch (error) {
      console.error("❌ Failed to initialize WhatsApp devices on startup:", error);
    }
  }
}
