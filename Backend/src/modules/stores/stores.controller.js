import { storeService } from "./stores.service.js";

export const getAll = async (req, res, next) => {
    try {
        const stores = await storeService.getAll(req.query);
        res.status(200).json({ status: "success", results: stores.length, data: { stores } });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req, res, next) => {
    try {
        const store = await storeService.getById(req.params.id);
        res.status(200).json({ status: "success", data: { store } });
    } catch (error) {
        next(error);
    }
};

export const create = async (req, res, next) => {
    try {
        const store = await storeService.create(req.body);
        res.status(201).json({ status: "success", message: "Physical store registered with GPS lock", data: { store } });
    } catch (error) {
        next(error);
    }
};

export const update = async (req, res, next) => {
    try {
        const store = await storeService.update(req.params.id, req.body);
        res.status(200).json({ status: "success", message: "Store updated", data: { store } });
    } catch (error) {
        next(error);
    }
};

export const remove = async (req, res, next) => {
    try {
        const result = await storeService.remove(req.params.id);
        res.status(200).json({
            status: "success",
            message: result.message,
            deactivated: Boolean(result.deactivated),
            data: result.store || null,
        });
    } catch (error) {
        next(error);
    }
};

export const storeController = {
    getAll,
    getById,
    create,
    update,
    remove,
};