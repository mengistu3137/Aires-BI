import { apiClient } from "../client.js";



export const screenObservationAIRequest = async (observationId) => {
    const response = await apiClient.get(`/ai/screen-observation/${observationId}`);
    console.log("screenObservationAIRequest response:", response);
    return response.data?.data;
};

export const generateExecutiveBriefAIRequest = async (surveyPeriodId) => {
    const response = await apiClient.post("/ai/executive-brief", { surveyPeriodId });
    return response.data?.data?.brief;
};