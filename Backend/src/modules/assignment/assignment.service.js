import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { formatAssignmentResponse } from "./assignment.helpers.js";

export const getMine = async (auditorId) => {
    const assignments = await prisma.surveyAssignment.findMany({
        where: { auditorId },
        include: {
            auditor: { select: { id: true, name: true, phone: true } },
            store: {
                include: { competitor: { select: { id: true, name: true, type: true } } },
            },
            surveyPeriod: true,
            items: {
                include: {
                    product: {
                        select: { id: true, name: true, category: true, unit: true, sku: true, barcode: true },
                    },
                },
            },
            audits: { select: { id: true, status: true, startedAt: true, completedAt: true } },
        },
        orderBy: { assignedAt: "desc" },
    });

    return assignments.map(formatAssignmentResponse);
};

export const getAll = async (query = {}) => {
    const where = {};
    if (query.auditorId) where.auditorId = query.auditorId;
    if (query.storeId) where.storeId = query.storeId;
    if (query.surveyPeriodId) where.surveyPeriodId = query.surveyPeriodId;
    if (query.status) where.status = query.status;

    const assignments = await prisma.surveyAssignment.findMany({
        where,
        include: {
            auditor: { select: { id: true, name: true, phone: true } },
            store: {
                include: { competitor: { select: { id: true, name: true, type: true } } },
            },
            surveyPeriod: true,
            items: {
                include: {
                    product: {
                        select: { id: true, name: true, category: true, unit: true, sku: true, barcode: true },
                    },
                },
            },
            audits: { select: { id: true, status: true } },
        },
        orderBy: { assignedAt: "desc" },
    });

    return assignments.map(formatAssignmentResponse);
};

export const getById = async (id) => {
    const assignment = await prisma.surveyAssignment.findUnique({
        where: { id },
        include: {
            auditor: { select: { id: true, name: true, phone: true } },
            store: { include: { competitor: true } },
            surveyPeriod: true,
            items: { include: { product: true } },
            audits: true,
        },
    });

    if (!assignment) {
        throw new ApiError(404, `Assignment '${id}' not found`);
    }

    return formatAssignmentResponse(assignment);
};

export const create = async (payload) => {
    const { auditorId, storeId, surveyPeriodId, productIds, status } = payload;

    const auditor = await prisma.user.findUnique({ where: { id: auditorId } });
    if (!auditor || !auditor.active) {
        throw new ApiError(400, "Assigned user must be an active system user.");
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.active) {
        throw new ApiError(400, `Physical store '${storeId}' does not exist or is inactive.`);
    }

    const period = await prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } });
    if (!period) {
        throw new ApiError(400, `Survey period '${surveyPeriodId}' does not exist.`);
    }
    if (period.status === "CLOSED") {
        throw new ApiError(400, "Cannot create assignments for a CLOSED survey period.");
    }

    const existing = await prisma.surveyAssignment.findUnique({
        where: {
            auditorId_storeId_surveyPeriodId: {
                auditorId,
                storeId,
                surveyPeriodId,
            },
        },
    });
    if (existing) {
        throw new ApiError(
            409,
            "An assignment already exists for this auditor at this store for this survey period."
        );
    }

    const createdAssignment = await prisma.$transaction(async (tx) => {
        const asn = await tx.surveyAssignment.create({
            data: {
                auditorId,
                storeId,
                surveyPeriodId,
                status: status || "NOT_STARTED",
            },
        });

        const itemRecords = productIds.map((pId) => ({
            assignmentId: asn.id,
            productId: pId,
            required: true,
        }));

        await tx.assignmentItem.createMany({
            data: itemRecords,
        });

        return tx.surveyAssignment.findUnique({
            where: { id: asn.id },
            include: {
                auditor: { select: { id: true, name: true, phone: true } },
                store: { include: { competitor: true } },
                surveyPeriod: true,
                items: { include: { product: true } },
            },
        });
    });

    return formatAssignmentResponse(createdAssignment);
};

export const update = async (id, payload, currentUser) => {
    const assignment = await prisma.surveyAssignment.findUnique({ where: { id } });
    if (!assignment) {
        throw new ApiError(404, `Assignment '${id}' not found`);
    }

    if (currentUser.role === "FIELD_AUDITOR" && assignment.auditorId !== currentUser.id) {
        throw new ApiError(403, "You can only update your own assigned field tasks.");
    }

    const data = {};
    if (payload.status) {
        data.status = payload.status;
        if (payload.status === "IN_PROGRESS" && !assignment.startedAt) {
            data.startedAt = new Date();
        }
        if (payload.status === "COMPLETED" && !assignment.completedAt) {
            data.completedAt = new Date();
        }
    }

    const updated = await prisma.surveyAssignment.update({
        where: { id },
        data,
        include: {
            auditor: { select: { id: true, name: true, phone: true } },
            store: { include: { competitor: true } },
            surveyPeriod: true,
            items: { include: { product: true } },
        },
    });

    return formatAssignmentResponse(updated);
};

export const assignmentService = {
    getMine,
    getAll,
    getById,
    create,
    update,
};