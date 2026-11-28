import React from "react";
import LoginAuditPanel from "../components/LoginAuditPanel.jsx";

export const LoginAuditPage = () => (
	<div className="mx-auto max-w-6xl space-y-5 pb-16 px-1 sm:px-0">
		<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
			<h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
				Login Audit
			</h1>
			<p className="mt-0.5 text-xs text-slate-500">
				Who signed in, how long they stayed, and the device, address, and location they used.
			</p>
		</div>
		<LoginAuditPanel />
	</div>
);
