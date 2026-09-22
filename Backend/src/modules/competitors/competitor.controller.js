import { competitorService } from "./competitor.service.js";

export const getAll = async (req, res, next) => {
    try {
        const activeOnly = req.query.active === "true";
        const competitors = await competitorService.getAll(activeOnly);
        res.status(200).json({
            status: "success",
            results: competitors.length,
            data: { competitors },
        });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req, res, next) => {
    try {
        const competitor = await competitorService.getById(req.params.id);
        res.status(200).json({
            status: "success",
            data: { competitor },
        });
    } catch (error) {
        next(error);
    }
};

export const create = async (req, res, next) => {
    try {
        const competitor = await competitorService.create(req.body);
        res.status(201).json({
            status: "success",
            message: "Competitor registered successfully",
            data: { competitor },
        });
    } catch (error) {
        next(error);
    }
};

export const update = async (req, res, next) => {
    try {
        const competitor = await competitorService.update(req.params.id, req.body);
        res.status(200).json({
            status: "success",
            message: "Competitor updated successfully",
            data: { competitor },
        });
    } catch (error) {
        next(error);
    }
};

export const remove = async (req, res, next) => {
    try {
        await competitorService.remove(req.params.id);
        res.status(200).json({
            status: "success",
            message: "Competitor removed successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const competitorController = {
    getAll,
    getById,
    create,
    update,
    remove,
};