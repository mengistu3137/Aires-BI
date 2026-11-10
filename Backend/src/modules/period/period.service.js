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
    const exists = await prisma.surveyPeriod.findUnique({
        where: { id: payload.id },
    });
    if (exists) {
        throw new ApiError(409, `Survey period '${payload.id}' already exists.`);
    }

    const periodName = payload.name || payload.description || `Survey Cycle ${payload.id}`;
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    // 1. Create main survey cycle (e.g. Week 46 Survey Cycle)
    const mainPeriod = await prisma.surveyPeriod.create({
        data: {
            id: payload.id,
            name: periodName,
            status: payload.status || "OPEN",
            startDate,
            endDate,
        },
    });

    // 2. Automatically generate daily cycles for each day between startDate and endDate
    const startMidnight = new Date(startDate);
    startMidnight.setHours(0, 0, 0, 0);
    const endMidnight = new Date(endDate);
    endMidnight.setHours(0, 0, 0, 0);

    const diffDays = Math.round((endMidnight - startMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays >= 1 && diffDays <= 31) {
        const current = new Date(startMidnight);

        while (current <= endMidnight) {
            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            // "November 9, 2026 Daily survey"
            const formattedDate = dayStart.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
            });
            const dailyName = `${formattedDate} Daily survey`;

            const yyyy = dayStart.getFullYear();
            const mm = String(dayStart.getMonth() + 1).padStart(2, "0");
            const dd = String(dayStart.getDate()).padStart(2, "0");
            const dailyId = `${payload.id}-Daily-${yyyy}-${mm}-${dd}`;

            try {
                await prisma.surveyPeriod.upsert({
                    where: { id: dailyId },
                    update: {
                        name: dailyName,
                        startDate: dayStart,
                        endDate: dayEnd,
                    },
                    create: {
                        id: dailyId,
                        name: dailyName,
                        startDate: dayStart,
                        endDate: dayEnd,
                        status: payload.status || "OPEN",
                    },
                });
            } catch (err) {
                console.warn(`[Auto-Cycle] Skipped daily cycle ${dailyId}:`, err.message);
            }

            current.setDate(current.getDate() + 1);
        }
    }

    return mainPeriod;
};

export const update = async (id, payload) => {
    await getById(id);
    const data = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.startDate !== undefined) data.startDate = new Date(payload.startDate);
    if (payload.endDate !== undefined) data.endDate = new Date(payload.endDate);

    return prisma.surveyPeriod.update({
        where: { id },
        data,
    });
};

export const updateStatus = async (id, status) => {
    await getById(id);
    return prisma.surveyPeriod.update({
        where: { id },
        data: { status },
    });
};

export const remove = async (id) => {
    const period = await getById(id);

    if (period._count?.assignments > 0 || period._count?.audits > 0) {
        throw new ApiError(
            400,
            `Cannot delete cycle '${period.name}' because it has ${period._count?.assignments || 0} active assignments or audits.`
        );
    }

    await prisma.priceAnalysis.deleteMany({
        where: { surveyPeriodId: id },
    });

    // Also remove child daily cycles if they have no assignments/audits
    await prisma.surveyPeriod.deleteMany({
        where: {
            id: { startsWith: `${id}-DAILY-` },
            assignments: { none: {} },
            audits: { none: {} },
        },
    });

    await prisma.surveyPeriod.delete({
        where: { id },
    });

    return { deleted: true, message: `Survey cycle '${period.name}' deleted successfully.` };
};

export const periodService = {
    getAll,
    getActive,
    getById,
    create,
    update,
    updateStatus,
    remove,
};