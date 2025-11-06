import { Router } from "express";
import { prisma } from "@app/db";
import * as ticketsCtrl from "./tickets.controller.js";
import * as usersCtrl from "./users.controller.js";
export const dashboardRouter = Router();

const DAY = 24 * 60 * 60 * 1000;
const startOf = (period) => {
    const now = Date.now();
    if (period === "7") return new Date(now - 7 * DAY);
    if (period === "30") return new Date(now - 30 * DAY);
    return new Date(0);
};

// KPIs
dashboardRouter.get("/kpis", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");
        const orders = await prisma.order.findMany({
            where: { status: "paid", createdAt: { gte: start } },
            select: { id: true, amount: true, showId: true, createdAt: true }
        });
        const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);
        const totalOrders = orders.length;
        const ticketsSold = await prisma.ticket.count({
            where: { orderId: { in: orders.map(o => o.id) } }
        });

        const payments = await prisma.payment.findMany({
            where: { OR: [{ paidAt: { gte: start } }, { createdAt: { gte: start } }] },
            select: { status: true }
        });
        const n = payments.length || 1;
        const ok = payments.filter(p => p.status === 'succeeded').length;
        const failed = payments.filter(p => p.status === 'failed').length;
        const refunded = payments.filter(p => p.status === 'refunded').length;

        res.json({
            totalRevenue, totalOrders, ticketsSold,
            successRate: (ok / n) * 100,
            paymentRatios: {
                Succeeded: (ok / n) * 100, Failed: (failed / n) * 100, Refunded: (refunded / n) * 100
            }
        });
    } catch (e) { next(e); }
});

// Doanh thu theo ngày
dashboardRouter.get("/revenue", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");
        const orders = await prisma.order.findMany({
            where: { status: "paid", createdAt: { gte: start } },
            select: { amount: true, createdAt: true }
        });
        const m = new Map();
        for (const o of orders) {
            const d = o.createdAt.toISOString().slice(0, 10);
            m.set(d, (m.get(d) || 0) + (o.amount || 0));
        }
        res.json([...m.entries()].sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount })));
    } catch (e) { next(e); }
});

// Top events
dashboardRouter.get("/top-events", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");
        const orders = await prisma.order.findMany({
            where: { status: "paid", createdAt: { gte: start } },
            select: { amount: true, showId: true }
        });

        const shows = await prisma.show.findMany({
            where: { id: { in: [...new Set(orders.map(o => o.showId))] } },
            select: { id: true, eventId: true }
        });
        const showToEvent = new Map(shows.map(s => [s.id, s.eventId]));

        const revenueByEvent = new Map();
        for (const o of orders) {
            const evId = showToEvent.get(o.showId);
            if (!evId) continue;
            revenueByEvent.set(evId, (revenueByEvent.get(evId) || 0) + (o.amount || 0));
        }

        const events = await prisma.event.findMany({
            where: { id: { in: [...revenueByEvent.keys()] } },
            select: { id: true, name: true }
        });
        const nameById = new Map(events.map(e => [e.id, e.name]));

        const top = [...revenueByEvent.entries()]
            .map(([eventId, revenue]) => ({ name: nameById.get(eventId) || "N/A", revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        res.json(top);
    } catch (e) { next(e); }
});


dashboardRouter.get("/tickets/summary", ticketsCtrl.getTicketsSummary); // đã có
dashboardRouter.get("/tickets", ticketsCtrl.listTickets);               // ✦ mới
dashboardRouter.get("/users", usersCtrl.listUsers);

