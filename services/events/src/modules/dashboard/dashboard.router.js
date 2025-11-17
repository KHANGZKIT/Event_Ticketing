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
    if (period === "90") return new Date(now - 90 * DAY);
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

        // Upcoming Today: số shows diễn ra hôm nay
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const upcomingToday = await prisma.show.count({
            where: {
                startsAt: { gte: todayStart, lte: todayEnd },
                status: 'scheduled'
            }
        });

        // Attendees Today: số người đã check-in hôm nay
        const attendeesToday = await prisma.ticket.count({
            where: {
                checkedInAt: { gte: todayStart, lte: todayEnd }
            }
        });

        res.json({
            totalRevenue, totalOrders, ticketsSold,
            successRate: (ok / n) * 100,
            upcomingToday,
            attendeesToday,
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
        const group = req.query.group || "day"; // day, week, month

        const orders = await prisma.order.findMany({
            where: { status: "paid", createdAt: { gte: start } },
            select: { amount: true, createdAt: true }
        });

        const bucketKey = (date) => {
            const d = new Date(date);
            if (group === "week") {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return weekStart.toISOString().slice(0, 10); // YYYY-MM-DD (Mon)
            }
            if (group === "month") {
                return d.toISOString().slice(0, 7); // YYYY-MM
            }
            return d.toISOString().slice(0, 10); // YYYY-MM-DD
        };

        const m = new Map();
        for (const o of orders) {
            const key = bucketKey(o.createdAt);
            m.set(key, (m.get(key) || 0) + (o.amount || 0));
        }

        const result = [...m.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount }));

        res.json(result);
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

// Upcoming Shows
dashboardRouter.get("/upcoming-shows", async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '5', 10), 20);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const shows = await prisma.show.findMany({
            where: {
                startsAt: { gte: today },
                status: 'scheduled'
            },
            take: limit,
            orderBy: { startsAt: 'asc' },
            select: {
                id: true,
                startsAt: true,
                event: {
                    select: { name: true }
                },
                _count: {
                    select: {
                        tickets: true,
                        orders: true
                    }
                }
            }
        });

        const result = shows.map(s => {
            const totalTickets = s._count?.tickets || 0;
            const soldTickets = s._count?.orders || 0;
            const status = soldTickets > 0 ? 'Paid' : 'N/A';
            
            return {
                eventName: s.event?.name || 'N/A',
                showDate: s.startsAt,
                ticketsStatus: status,
                sold: soldTickets,
                total: totalTickets
            };
        });

        res.json(result);
    } catch (e) { next(e); }
});

// Ticket Sales Trends (theo thời gian)
dashboardRouter.get("/ticket-sales", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");
        const group = req.query.group || "day"; // day, week, month
        
        const orders = await prisma.order.findMany({
            where: { 
                status: "paid", 
                createdAt: { gte: start } 
            },
            select: { 
                id: true,
                createdAt: true,
                showId: true
            }
        });

        // Nếu không có orders, trả về mảng rỗng
        if (orders.length === 0) {
            return res.json([]);
        }

        const orderIds = orders.map(o => o.id);

        // Đếm số tickets bán được theo thời gian
        const tickets = await prisma.ticket.findMany({
            where: {
                orderId: { in: orderIds },
                createdAt: { gte: start }
            },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' }
        });

        const m = new Map();
        for (const t of tickets) {
            const d = t.createdAt;
            let key;
            if (group === 'week') {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                weekStart.setHours(0, 0, 0, 0);
                key = weekStart.toISOString().slice(0, 10);
            } else if (group === 'month') {
                key = d.toISOString().slice(0, 7); // YYYY-MM
            } else {
                key = d.toISOString().slice(0, 10); // YYYY-MM-DD
            }
            m.set(key, (m.get(key) || 0) + 1);
        }

        const result = [...m.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        res.json(result);
    } catch (e) { next(e); }
});

