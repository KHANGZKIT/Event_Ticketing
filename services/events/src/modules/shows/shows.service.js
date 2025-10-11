import { prisma } from '@app/db';
export async function getShow(id) {
    const s = await prisma.show.findUnique({ where: { id } });
    if (!s) { const e = new Error('Show not found'); e.status = 404; throw e; }
    return s;
}
