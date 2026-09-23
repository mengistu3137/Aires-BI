import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";

export const getAll = async () => {
    return prisma.surveyPeriod.findMany({
        orderBy: { startDate: "desc" },
        include: {
            _count: { select: { assignments: true, audits: true, priceAnalyses: true } },
        },
    });
};

export const getActive = async () => {
    const activePeriod = await prisma.surveyPeriod.findFirst({
        where: { status: "OPEN" },
        orderBy: { startDate: "desc" },
        include: {
            _count: { select: { assignments: true, audits: true } },
        },
    });

    return activePeriod;
};

export const getById = async (id) => {
    const period = await prisma.surveyPeriod.findUnique({
        where: { id },
        include: {
            _count: { select: { assignments: true, audits: true, priceAnalyses: true } },
        },
    });

    if (!period) {
        throw new ApiError(404, `Survey period '${id}' not found`);
    }

    return period;
};

export const create = async (payload) => {
    const exists = await prisma.surveyPeriod.findUnique({ where: { id: payload.id } });
    if (exists) {
        throw new ApiError(409, `Survey period '${payload.id}' already exists.`);
    }

    // If opening, ensure previous open periods are safely managed if desired
    return prisma.surveyPeriod.create({
        data: {
            ...payload,
            startDate: new Date(payload.startDate),
            endDate: new Date(payload.endDate),
        },
    });
};

export const updateStatus = async (id, status) => {
    await getById(id);
    return prisma.surveyPeriod.update({
        where: { id },
        data: { status },
    });
};

export const periodService = {
    getAll,
    getActive,
    getById,
    create,
    updateStatus,
};