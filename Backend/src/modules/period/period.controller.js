import { periodService } from "./period.service.js";

export const getAll = async (req, res, next) => {
    try {
        const periods = await periodService.getAll();
        res.status(200).json({ status: "success", results: periods.length, data: { periods } });
    } catch (error) {
        next(error);
    }
};

export const getActive = async (req, res, next) => {
    try {
        const period = await periodService.getActive();
        res.status(200).json({ status: "success", data: { period } });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req, res, next) => {
    try {
        const period = await periodService.getById(req.params.id);
        res.status(200).json({ status: "success", data: { period } });
    } catch (error) {
        next(error);
    }
};

export const create = async (req, res, next) => {
    try {
        const period = await periodService.create(req.body);
        res.status(201).json({ status: "success", message: "Survey period created", data: { period } });
    } catch (error) {
        next(error);
    }
};

export const updateStatus = async (req, res, next) => {
    try {
        const period = await periodService.updateStatus(req.params.id, req.body.status);
        res.status(200).json({ status: "success", message: `Period status updated to ${req.body.status}`, data: { period } });
    } catch (error) {
        next(error);
    }
};

export const periodController = {
    getAll,
    getActive,
    getById,
    create,
    updateStatus,
};