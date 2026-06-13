import "dotenv/config";
import prisma from "./src/utils/prisma.js";

async function test() {
  try {
    const targetId = "e8ec0d39-5add-4834-b0f9-95cd7cbde540";
    console.log(`Deleting test order ${targetId}...`);
    const deleted = await prisma.order.delete({
      where: { id: targetId }
    });
    console.log("Deleted successfully:", deleted);
  } catch (err) {
    console.error("Error deleting order:", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
