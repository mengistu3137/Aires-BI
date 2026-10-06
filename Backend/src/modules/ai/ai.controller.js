import * as aiService from "./ai.service.js";

export const screenObservation = async (req, res, next) => {
    try {
        const result = await aiService.screenObservationAnomaly(req.params.observationId);
        res.status(200).json({ status: "success", data: result });
    } catch (error) {
        next(error);
    }
};

export const generateExecutiveBrief = async (req, res, next) => {
    try {
        const brief = await aiService.generateExecutiveBrief(req.body.surveyPeriodId);
        res.status(200).json({ status: "success", data: { brief } });
    } catch (error) {
        next(error);
    }
};