import { priceAnalysisService } from "./price-analysis.service.js";

export const calculateProductAnalysis = async (req, res, next) => {
  try {
    const analysis = await priceAnalysisService.calculateProductAnalysis({
      productId: req.body.productId,
      surveyPeriodId: req.body.surveyPeriodId,
      notes: req.body.notes,
    });

    res.status(200).json({
      status: "success",
      message: "Price analysis calculated successfully",
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

export const recalculateSurveyPeriodAnalysis = async (req, res, next) => {
  try {
    const result = await priceAnalysisService.recalculateSurveyPeriodAnalysis(
      req.body.surveyPeriodId,
    );

    res.status(200).json({
      status: "success",
      message: "Survey period price analyses recalculation completed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPriceAnalysisById = async (req, res, next) => {
  try {
    const analysis = await priceAnalysisService.getPriceAnalysisById(
      req.params.id,
    );

    res.status(200).json({
      status: "success",
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductSurveyPeriodAnalysis = async (req, res, next) => {
  try {
    const analysis = await priceAnalysisService.getProductSurveyPeriodAnalysis(
      req.params.productId,
      req.params.surveyPeriodId,
    );

    res.status(200).json({
      status: "success",
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

export const listPriceAnalyses = async (req, res, next) => {
  try {
    const result = await priceAnalysisService.listPriceAnalyses(req.query);

    res.status(200).json({
      status: "success",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const exportPriceAnalysisExcel = async (req, res, next) => {
  try {
    const { buffer, filename } =
      await priceAnalysisService.generatePriceAnalysisExcel({
        surveyPeriodId: req.query.surveyPeriodId,
      });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

export const priceAnalysisController = {
  calculateProductAnalysis,
  recalculateSurveyPeriodAnalysis,
  getPriceAnalysisById,
  getProductSurveyPeriodAnalysis,
  listPriceAnalyses,
  exportPriceAnalysisExcel,
};
