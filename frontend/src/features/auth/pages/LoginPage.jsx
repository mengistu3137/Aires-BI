import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useLogin.js";
import { useAuth } from "@/hooks/useAuth.js";
import { PILOT_USERS } from "@/data/pilotData.js";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const loginMutation = useLogin(navigate);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ identifier, password });
  };

  const handleQuickLogin = (role) => {
    const persona = PILOT_USERS.find((u) => u.role === role) || PILOT_USERS[0];
    setAuth({
      user: persona,
      token: "demo-jwt-token-aires",
    });

    if (role === "FIELD_AUDITOR") {
      navigate("/survey");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header with Actual Aires Ribbon Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="/aires-logo.svg"
              alt="Aires Communication"
              className="h-24 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-2xl font-black tracking-tight text-[#A41821]">
                AIRES
              </h1>
              <span className="rounded-md text-[#017C4D] px-2 py-0.5 text-md font-black  uppercase tracking-wider">
                BUSINESS INTELLIGENCE
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Business Intelligence & Field Price Collection Platform
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number or Email
              </label>
              <input
                type="text"
                required
                placeholder="+251... or name@aires.et"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loginMutation.isPending
                ? "Authenticating..."
                : "Sign In to Aires-BI"}
            </button>
          </form>

          {/* Quick Pilot Persona Access */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="block text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Pilot Access (Single Click)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("FIELD_AUDITOR")}
                className="rounded-xl border border-red-200 bg-red-50/60 p-2 text-center text-xs font-bold text-[#A41821] hover:bg-red-100/60 transition cursor-pointer"
              >
                Auditor
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("MANAGER")}
                className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-center text-xs font-bold text-[#017C4D] hover:bg-emerald-100/60 transition cursor-pointer"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("ADMIN")}
                className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-center text-xs font-bold text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <p className="text-center text-[11px] text-slate-400">
          Encrypted Field Audit Transmission • Aires Enterprise 2026
        </p>
      </div>
    </div>
  );
};