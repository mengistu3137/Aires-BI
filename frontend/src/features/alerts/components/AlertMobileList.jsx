import React from "react";
import { AlertListItem } from "./AlertListItem.jsx";

export const AlertMobileList = ({ alerts = [] }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertListItem key={alert.id} alert={alert} />
      ))}
    </div>
  );
};
