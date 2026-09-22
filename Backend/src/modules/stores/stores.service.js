import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";

export const getAll = async (query = {}) => {
    const where = {};
    if (query.competitorId) where.competitorId = query.competitorId;
    if (query.type) where.type = query.type;
    if (query.active !== undefined) where.active = query.active === "true";

    return prisma.store.findMany({
        where,
        include: {
            competitor: { select: { id: true, name: true, type: true } },
            _count: { select: { assignments: true, audits: true } },
        },
        orderBy: { name: "asc" },
    });
};

export const getById = async (id) => {
    const store = await prisma.store.findUnique({
        where: { id },
        include: {
            competitor: true,
            _count: { select: { assignments: true, audits: true } },
        },
    });

    if (!store) {
        throw new ApiError(404, `Physical store '${id}' not found`);
    }

    return store;
};

export const create = async (payload) => {
    const competitor = await prisma.competitor.findUnique({
        where: { id: payload.competitorId },
    });

    if (!competitor) {
        throw new ApiError(404, `Competitor business '${payload.competitorId}' does not exist.`);
    }

    return prisma.store.create({
        data: payload,
        include: { competitor: true },
    });
};

export const update = async (id, payload) => {
    await getById(id);
    return prisma.store.update({
        where: { id },
        data: payload,
        include: { competitor: true },
    });
};

export const remove = async (id) => {
    await getById(id);
    return prisma.store.delete({ where: { id } });
};

export const storeService = {
    getAll,
    getById,
    create,
    update,
    remove,
};