import { prisma } from "@app/db";

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL || "demo@seed.local";

async function cleanupDemoOrders() {
    console.log(`[cleanup] Looking for demo orders owned by ${DEMO_EMAIL}...`);

    const demoUser = await prisma.user.findUnique({
        where: { email: DEMO_EMAIL },
        select: { id: true, email: true },
    });

    if (!demoUser) {
        console.log("↳ Demo user not found. Nothing to clean.");
        return;
    }

    const orders = await prisma.order.findMany({
        where: { userId: demoUser.id },
        select: { id: true },
    });

    let releasedSeats = 0;

    for (const order of orders) {
        const released = await prisma.$transaction(async (tx) => {
            const { count } = await tx.ticket.updateMany({
                where: { orderId: order.id },
                data: { orderId: null },
            });

            await tx.payment.deleteMany({ where: { orderId: order.id } });
            await tx.order.delete({ where: { id: order.id } });

            return count;
        }, { timeout: 60000 });

        releasedSeats += released;
        console.log(`↳ Cleared order ${order.id}. Seats released: ${released}`);
    }

    await prisma.user.delete({ where: { id: demoUser.id } });

    console.log(`✓ Cleanup complete. Orders removed: ${orders.length}, seats released: ${releasedSeats}`);
    console.log(`✓ Deleted demo account ${DEMO_EMAIL}`);
}

cleanupDemoOrders()
    .catch((err) => {
        console.error("[cleanup] Failed:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

