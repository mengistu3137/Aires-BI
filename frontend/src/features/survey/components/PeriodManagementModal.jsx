import React, { useState } from "react";
import { usePeriods } from "../hooks/usePeriods.js";

export const PeriodManagementModal = ({ isOpen, onClose }) => {
  const { periods, createPeriod, updateStatus } = usePeriods();

  const [id, setId] = useState("2026-W40");
  const [name, setName] = useState("Week 40 Retail Survey Cycle 2026");
  const [startDate, setStartDate] = useState("2026-09-28T00:00:00Z");
  const [endDate, setEndDate] = useState("2026-10-04T23:59:59Z");
  const [status, setStatus] = useState("OPEN");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createPeriod({ id, name, startDate, endDate, status });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Survey Cycle Management</h2>
            <p className="text-xs text-slate-500">Configure weekly retail price survey cycles</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Existing Periods */}
        <div className="space-y-2">
          <label className="font-semibold text-xs text-slate-700">Existing Cycles</label>
          <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50">
            {periods.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{p.id}</span>
                  <span className="text-slate-500 ml-2">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === "OPEN"
                        ? "bg-emerald-50 text-[#017C4D]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.status === "OPEN" && (
                    <button
                      type="button"
                      onClick={() => updateStatus({ id: p.id, status: "CLOSED" })}
                      className="text-[10px] font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      Close Cycle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create New Period Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs border-t border-slate-100 pt-3">
          <h3 className="font-bold text-slate-800">Launch New Survey Cycle</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Period ID</label>
              <input
                type="text"
                required
                placeholder="YYYY-Www (e.g. 2026-W40)"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 font-mono focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cycle Description</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer"
            >
              Create Period
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};