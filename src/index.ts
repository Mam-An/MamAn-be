import "dotenv/config";
import app from "./server.js";
import prisma from "./utils/prisma.js";
import { initNotificationScheduler } from "./api/notification/scheduler.service.js";
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        await prisma.$connect();
        await prisma.$queryRaw `SELECT 1`;
        console.log("Database connected successfully");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
        });
        initNotificationScheduler();
        const shutdown = async () => {
            try {
                await prisma.$disconnect();
                process.exit(0);
            }
            catch (err) {
                console.error('Shutdown error:', err);
                process.exit(1);
            }
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    }
    catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
}
startServer();
