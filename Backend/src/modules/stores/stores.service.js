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
    // 1. Resolve competitor by UUID first
    let competitor = await prisma.competitor.findUnique({
        where: { id: payload.competitorId },
    });

    // 2. Resilient fallback: lookup by competitor name (case-insensitive) if a slug was passed (e.g. 'shoa' -> Shoa)
    if (!competitor) {
        competitor = await prisma.competitor.findFirst({
            where: {
                OR: [
                    { name: { equals: payload.competitorId, mode: "insensitive" } },
                    { name: { contains: payload.competitorId, mode: "insensitive" } },
                ],
            },
        });
    }

    if (!competitor) {
        throw new ApiError(404, `Competitor business '${payload.competitorId}' does not exist in database.`);
    }

    // Assign verified database UUID
    return prisma.store.create({
        data: {
            competitorId: competitor.id,
            name: payload.name.trim(),
            address: payload.address?.trim() || null,
            city: payload.city?.trim() || "Addis Ababa",
            area: payload.area?.trim() || null,
            type: payload.type || "FMCG",
            latitude: payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null,
            longitude: payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null,
            active: payload.active !== undefined ? Boolean(payload.active) : true,
        },
        include: { competitor: true },
    });
};

export const update = async (id, payload) => {
    await getById(id);

    // Sanitize payload: strip relational objects to prevent Prisma unknown argument errors
    const data = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.address !== undefined) data.address = payload.address?.trim() || null;
    if (payload.city !== undefined) data.city = payload.city?.trim() || "Addis Ababa";
    if (payload.area !== undefined) data.area = payload.area?.trim() || null;
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.active !== undefined) data.active = Boolean(payload.active);
    if (payload.latitude !== undefined) data.latitude = payload.latitude !== null ? Number(payload.latitude) : null;
    if (payload.longitude !== undefined) data.longitude = payload.longitude !== null ? Number(payload.longitude) : null;

    if (payload.competitorId) {
        let competitor = await prisma.competitor.findUnique({
            where: { id: payload.competitorId },
        });
        if (!competitor) {
            competitor = await prisma.competitor.findFirst({
                where: {
                    OR: [
                        { name: { equals: payload.competitorId, mode: "insensitive" } },
                        { name: { contains: payload.competitorId, mode: "insensitive" } },
                    ],
                },
            });
        }
        if (competitor) {
            data.competitorId = competitor.id;
        }
    }

    return prisma.store.update({
        where: { id },
        data,
        include: { competitor: true },
    });
};

export const remove = async (id) => {
    const store = await getById(id);

    const hasAudits = (store._count?.audits || 0) > 0;
    const hasAssignments = (store._count?.assignments || 0) > 0;

    // Safety guard: Protect historical audit & assignment integrity
    if (hasAudits || hasAssignments) {
        const deactivatedStore = await prisma.store.update({
            where: { id },
            data: { active: false },
            include: { competitor: true },
        });

        return {
            deactivated: true,
            message: "Store has historical audit records. It was deactivated instead of permanently deleted to preserve audit trails.",
            store: deactivatedStore,
        };
    }

    await prisma.store.delete({ where: { id } });
    return {
        deleted: true,
        message: "Physical store location removed successfully.",
    };
};

export const storeService = {
    getAll,
    getById,
    create,
    update,
    remove,
};