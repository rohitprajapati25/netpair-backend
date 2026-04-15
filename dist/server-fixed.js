import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { server } from './app.js';
import connectDb from './db/db.js';
import { superAdmin } from "./utils/superAdmin.js";
const startServer = async () => {
    try {
        await connectDb();
        console.log("✅ MongoDB Connected!");
        await superAdmin();
        console.log("✅ SuperAdmin Ready!");
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🚀 Server + Socket.io running on http://localhost:${PORT}`);
            console.log("⚡ Real-time employee sync enabled!");
        });
    }
    catch (error) {
        console.error('💥 Startup Error:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server-fixed.js.map