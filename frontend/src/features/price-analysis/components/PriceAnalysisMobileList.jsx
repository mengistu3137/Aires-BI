import React from "react";
import { PriceAnalysisListItem } from "./PriceAnalysisListItem.jsx";

export const PriceAnalysisMobileList = ({ analyses = [] }) => {
  if (analyses.length === 0) return null;

  return (
    <div className="space-y-2">
      {analyses.map((analysis) => (
        <PriceAnalysisListItem key={analysis.id} analysis={analysis} />
      ))}
    </div>
  );
};
