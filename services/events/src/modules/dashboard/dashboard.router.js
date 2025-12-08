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

// ==========================================
// 1. KPIS (Tối ưu dùng Aggregate)
// ==========================================
dashboardRouter.get("/kpis", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");

        // Tối ưu: Dùng aggregate tính tổng doanh thu trực tiếp từ DB
        const revenueAgg = await prisma.order.aggregate({
            _sum: { amount: true },
            where: { status: "paid", createdAt: { gte: start } }
        });
        const totalRevenue = revenueAgg._sum.amount || 0;

        // Tối ưu: Đếm số lượng đơn hàng
        const totalOrders = await prisma.order.count({
            where: { status: "paid", createdAt: { gte: start } }
        });

        // Tối ưu: Đếm số vé bán được (qua bảng Ticket có orderId)
        const ticketsSold = await prisma.ticket.count({
            where: {
                orderId: { not: null },
                createdAt: { gte: start } // Hoặc join với Order nếu cần chính xác theo ngày thanh toán
            }
        });

        // Tối ưu: Đếm trạng thái thanh toán bằng GroupBy
        const paymentStats = await prisma.payment.groupBy({
            by: ['status'],
            where: { OR: [{ paidAt: { gte: start } }, { createdAt: { gte: start } }] },
            _count: { status: true }
        });

        let ok = 0, failed = 0, refunded = 0, totalPayments = 0;
        paymentStats.forEach(p => {
            totalPayments += p._count.status;
            if (p.status === 'succeeded') ok = p._count.status;
            if (p.status === 'failed') failed = p._count.status;
            if (p.status === 'refunded') refunded = p._count.status;
        });
        const n = totalPayments || 1;

        // Upcoming Today
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        const upcomingToday = await prisma.show.count({
            where: { startsAt: { gte: todayStart, lte: todayEnd }, status: 'scheduled' }
        });

        // Attendees Today
        const attendeesToday = await prisma.ticket.count({
            where: { checkedInAt: { gte: todayStart, lte: todayEnd } }
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

// ==========================================
// 2. REVENUE CHART
// ==========================================
dashboardRouter.get("/revenue", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");
        const group = req.query.group || "day";

        // Vẫn phải lấy danh sách để map JS vì Prisma chưa hỗ trợ date_trunc dễ dàng cho mọi DB
        // Nhưng chỉ lấy 2 trường cần thiết để nhẹ
        const orders = await prisma.order.findMany({
            where: { status: "paid", createdAt: { gte: start } },
            select: { amount: true, createdAt: true }
        });

        const bucketKey = (date) => {
            const d = new Date(date);
            if (group === "week") {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay()); // Reset về chủ nhật/thứ 2
                return weekStart.toISOString().slice(0, 10);
            }
            if (group === "month") return d.toISOString().slice(0, 7);
            return d.toISOString().slice(0, 10);
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

// ==========================================
// 3. TOP EVENTS (Tối ưu GroupBy)
// ==========================================
dashboardRouter.get("/top-events", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");

        // Bước 1: Group By ShowId và tính tổng tiền
        const revenueByShow = await prisma.order.groupBy({
            by: ['showId'],
            _sum: { amount: true },
            where: { status: "paid", createdAt: { gte: start } },
            orderBy: { _sum: { amount: 'desc' } },
            take: 20 // Lấy top 20 show trước để xử lý
        });

        if (revenueByShow.length === 0) return res.json([]);

        // Bước 2: Lấy thông tin Event từ ShowId
        const showIds = revenueByShow.map(r => r.showId);
        const shows = await prisma.show.findMany({
            where: { id: { in: showIds } },
            select: { id: true, event: { select: { id: true, name: true } } }
        });

        // Bước 3: Gộp doanh thu theo Event (vì 1 Event có nhiều Show)
        const eventRevenueMap = new Map();

        for (const item of revenueByShow) {
            const show = shows.find(s => s.id === item.showId);
            if (show && show.event) {
                const eventId = show.event.id;
                const currentRev = eventRevenueMap.get(eventId) || { name: show.event.name, revenue: 0 };
                currentRev.revenue += (item._sum.amount || 0);
                eventRevenueMap.set(eventId, currentRev);
            }
        }

        const top = [...eventRevenueMap.values()]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        res.json(top);
    } catch (e) { next(e); }
});

// Endpoint Tickets & Users
dashboardRouter.get("/tickets/summary", ticketsCtrl.getTicketsSummary);
dashboardRouter.get("/tickets", ticketsCtrl.listTickets);
dashboardRouter.get("/users", usersCtrl.listUsers);

// Upcoming Shows
dashboardRouter.get("/upcoming-shows", async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '5', 10), 20);
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const shows = await prisma.show.findMany({
            where: { startsAt: { gte: today }, status: 'scheduled' },
            take: limit,
            orderBy: { startsAt: 'asc' },
            select: {
                id: true, startsAt: true,
                event: { select: { name: true } },
                _count: { select: { tickets: true, orders: true } }
            }
        });

        const result = shows.map(s => ({
            eventName: s.event?.name || 'N/A',
            showDate: s.startsAt,
            ticketsStatus: (s._count?.orders || 0) > 0 ? 'Paid' : 'N/A',
            sold: s._count?.orders || 0,
            total: s._count?.tickets || 0
        }));

        res.json(result);
    } catch (e) { next(e); }
});

// Ticket Sales Trends
dashboardRouter.get("/ticket-sales", async (req, res, next) => {
    try {
        const start = startOf(req.query.period || "all");
        const group = req.query.group || "day";

        // Tương tự revenue, dùng findMany nhưng chỉ select createdAt
        // Nếu DB lớn, nên cân nhắc raw query DATE_TRUNC
        const tickets = await prisma.ticket.findMany({
            where: { orderId: { not: null }, createdAt: { gte: start } },
            select: { createdAt: true }
        });

        const m = new Map();
        for (const t of tickets) {
            let key;
            const d = t.createdAt;
            if (group === 'week') {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                key = weekStart.toISOString().slice(0, 10);
            } else if (group === 'month') key = d.toISOString().slice(0, 7);
            else key = d.toISOString().slice(0, 10);

            m.set(key, (m.get(key) || 0) + 1);
        }

        const result = [...m.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        res.json(result);
    } catch (e) { next(e); }
});

// ==========================================
// 4. ACTIVE HOLDS (Tối ưu N+1 Query)
// ==========================================
dashboardRouter.get("/active-holds", async (req, res, next) => {
    try {
        const { redis } = await import("../../redis/client.js");

        // 1. Scan tất cả keys
        let keys = [];
        let cursor = '0';
        do {
            const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', 'hold:*', 'COUNT', 100);
            cursor = nextCursor;
            keys.push(...batch);
        } while (cursor !== '0');

        if (keys.length === 0) return res.json([]);

        // 2. Pipeline get tất cả value (nhanh hơn await từng cái)
        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.get(key));
        const results = await pipeline.exec(); // [[null, value1], [null, value2]...]

        const tempHolds = [];
        const userIds = new Set();
        const showIds = new Set();

        // 3. Parse JSON và gom ID
        results.forEach((result, index) => {
            if (result[0]) return; // Lỗi redis
            const raw = result[1];
            if (!raw) return;

            try {
                const holdData = JSON.parse(raw);
                const holdId = keys[index].replace('hold:', '');

                if (holdData.userId) userIds.add(holdData.userId);
                if (holdData.showId) showIds.add(holdData.showId);

                tempHolds.push({ holdId, ...holdData });
            } catch (e) { }
        });

        // 4. Fetch User và Show MỘT LẦN DUY NHẤT (Batch Query)
        const [users, shows] = await Promise.all([
            prisma.user.findMany({
                where: { id: { in: Array.from(userIds) } },
                select: { id: true, email: true, fullName: true }
            }),
            prisma.show.findMany({
                where: { id: { in: Array.from(showIds) } },
                select: { id: true, event: { select: { name: true } } }
            })
        ]);

        // Tạo Map để lookup nhanh
        const userMap = new Map(users.map(u => [u.id, u.fullName || u.email]));
        const userEmailMap = new Map(users.map(u => [u.id, u.email]));
        const showMap = new Map(shows.map(s => [s.id, s.event?.name || 'N/A']));

        // 5. Map dữ liệu trả về
        const now = Date.now();
        const holds = tempHolds.map(h => {
            const remainingSeconds = h.expiresAt ? Math.max(0, Math.floor((h.expiresAt - now) / 1000)) : 0;
            return {
                holdId: h.holdId,
                userId: h.userId,
                userEmail: userEmailMap.get(h.userId) || 'N/A', // Hiển thị email cho rõ ràng
                showId: h.showId,
                showName: showMap.get(h.showId) || 'N/A',
                eventName: showMap.get(h.showId) || 'N/A',
                seats: h.seats || [],
                expiresAt: h.expiresAt,
                remainingSeconds,
                createdAt: h.expiresAt ? new Date(h.expiresAt - 10 * 60 * 1000) : null
            };
        });

        holds.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
        res.json(holds);

    } catch (e) {
        console.error('[dashboard] /active-holds error:', e);
        next(e);
    }
});

// ==========================================
// 5. DELETE HOLD (Thêm Socket Emit)
// ==========================================
dashboardRouter.delete("/holds/:id", async (req, res, next) => {
    try {
        const holdId = req.params.id;
        if (!holdId) return res.status(400).json({ error: { message: 'Missing holdId' } });

        const { releaseHold } = await import("../holds/holds.redis.service.js");
        const result = await releaseHold(holdId);

        // --- PHẦN QUAN TRỌNG: BẮN SOCKET ---
        const io = req.app.get('socketio');
        if (io) {
            console.log(`🔌 [API] Force releasing hold: ${holdId}`);
            io.emit('server_force_release_hold', {
                holdId: holdId,
                message: 'Admin forced release'
            });
        }
        // ------------------------------------

        res.json({ ok: true, message: 'Hold released successfully', ...result });
    } catch (e) {
        console.error('[dashboard] /holds/:id DELETE error:', e);
        next(e);
    }
});