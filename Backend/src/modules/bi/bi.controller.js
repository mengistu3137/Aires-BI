import { biService } from "./bi.service.js";

export const getAnalytics = async (req, res, next) => {
    try {
        const data = await biService.getBIAnalytics(req.query);
        res.status(200).json({ status: "success", data });
    } catch (error) {
        next(error);
    }
};

export const getExport = async (req, res, next) => {
    try {
        const flatRows = await biService.getExportData(req.query.periodId);
        res.status(200).json({
            status: "success",
            results: flatRows.length,
            data: { exportRows: flatRows },
        });
    } catch (error) {
        next(error);
    }
};

export const biController = {
    getAnalytics,
    getExport,
};