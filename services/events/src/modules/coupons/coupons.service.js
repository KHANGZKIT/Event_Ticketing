import { prisma } from "@app/db";
import { CreateCouponSchema, UpdateCouponSchema } from "./coupons.schema.js";

export async function listCoupons(query) {
    const page = Number(query.page || 1);
    const size = Number(query.size || 20);
    const skip = (page - 1) * size;

    const where = {};
    if (query.search) {
        where.code = { contains: query.search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
        prisma.coupon.count({ where }),
        prisma.coupon.findMany({
            where,
            skip,
            take: size,
            orderBy: { createdAt: 'desc' }
        })
    ]);

    return {
        items,
        total,
        page,
        pageSize: size,
        totalPages: Math.ceil(total / size)
    };
}

export async function createCoupon(data) {
    const valid = CreateCouponSchema.parse(data);

    const exist = await prisma.coupon.findUnique({ where: { code: valid.code } });
    if (exist) {
        const e = new Error('Coupon code already exists');
        e.status = 409; throw e;
    }

    return prisma.coupon.create({ data: valid });
}

export async function updateCoupon(id, data) {
    const valid = UpdateCouponSchema.parse(data);
    return prisma.coupon.update({ where: { id }, data: valid });
}

export async function deleteCoupon(id) {
    return prisma.coupon.delete({ where: { id } });
}

export async function getCoupon(id) {
    return prisma.coupon.findUnique({ where: { id } });
}

export async function validateCouponByCode(code) {
    const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
    });

    if (!coupon) {
        const e = new Error('Mã giảm giá không tồn tại');
        e.status = 404;
        throw e;
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        const e = new Error('Mã giảm giá đã hết hạn');
        e.status = 410;
        throw e;
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        const e = new Error('Mã giảm giá đã hết lượt sử dụng');
        e.status = 410;
        throw e;
    }

    return {
        valid: true,
        coupon: {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            usageLimit: coupon.usageLimit,
            usedCount: coupon.usedCount,
            expiresAt: coupon.expiresAt
        }
    };
}
