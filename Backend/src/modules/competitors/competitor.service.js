import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";

export const getAll = async (activeOnly = false) => {
    const where = activeOnly ? { active: true } : {};
    return prisma.competitor.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
            stores: true,
            _count: {
                select: { stores: true },
            },
        },
    });
};

export const getById = async (id) => {
    const competitor = await prisma.competitor.findUnique({
        where: { id },
        include: {
            stores: true,
            _count: {
                select: { stores: true },
            },
        },
    });

    if (!competitor) {
        throw new ApiError(404, `Competitor '${id}' not found`);
    }

    return competitor;
};

export const create = async (payload) => {
    const exists = await prisma.competitor.findUnique({
        where: { id: payload.id },
    });

    if (exists) {
        throw new ApiError(409, `Competitor with ID '${payload.id}' already exists.`);
    }

    return prisma.competitor.create({
        data: payload,
    });
};

export const update = async (id, payload) => {
    await getById(id);
    return prisma.competitor.update({
        where: { id },
        data: payload,
    });
};

export const remove = async (id) => {
    await getById(id);
    return prisma.competitor.delete({
        where: { id },
    });
};

export const competitorService = {
    getAll,
    getById,
    create,
    update,
    remove,
};