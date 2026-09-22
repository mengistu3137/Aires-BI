import { assignmentService } from "./assignment.service.js";

export const getMine = async (req, res, next) => {
    try {
        const assignments = await assignmentService.getMine(req.user.id);
        res.status(200).json({
            status: "success",
            results: assignments.length,
            data: { assignments },
        });
    } catch (error) {
        next(error);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const assignments = await assignmentService.getAll(req.query);
        res.status(200).json({
            status: "success",
            results: assignments.length,
            data: { assignments },
        });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req, res, next) => {
    try {
        const assignment = await assignmentService.getById(req.params.id);
        res.status(200).json({
            status: "success",
            data: { assignment },
        });
    } catch (error) {
        next(error);
    }
};

export const create = async (req, res, next) => {
    try {
        const assignment = await assignmentService.create(req.body);
        res.status(201).json({
            status: "success",
            message: "Assignment dispatched with product checklist",
            data: { assignment },
        });
    } catch (error) {
        next(error);
    }
};

export const update = async (req, res, next) => {
    try {
        const assignment = await assignmentService.update(
            req.params.id,
            req.body,
            req.user
        );
        res.status(200).json({
            status: "success",
            message: "Assignment updated",
            data: { assignment },
        });
    } catch (error) {
        next(error);
    }
};

export const assignmentController = {
    getMine,
    getAll,
    getById,
    create,
    update,
};