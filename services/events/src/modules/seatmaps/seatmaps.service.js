import { prisma } from "@app/db";

export async function listSeatmaps(query) {
    const page = Number(query.page || 1);
    const size = Number(query.size || 20);
    const skip = (page - 1) * size;

    const where = {};
    if (query.search) {
        where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
        prisma.seatMap.count({ where }),
        prisma.seatMap.findMany({
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

export async function createSeatmap(data) {
    // data: { name, schema }
    if (!data.name || !data.schema) {
        const e = new Error('Name and schema are required');
        e.status = 400; throw e;
    }
    return prisma.seatMap.create({ data });
}

export async function getSeatmap(id) {
    return prisma.seatMap.findUnique({ where: { id } });
}

export async function deleteSeatmap(id) {
    return prisma.seatMap.delete({ where: { id } });
}
