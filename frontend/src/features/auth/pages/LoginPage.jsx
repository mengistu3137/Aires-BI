import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useLogin.js";
import { useAuth } from "@/hooks/useAuth.js";
import { PwaInstallBanner } from "@/pwa/PwaInstallBanner.jsx";

export const LoginPage = () => {
	const navigate = useNavigate();
	const { isAuthenticated, role } = useAuth();
	const loginMutation = useLogin(navigate);

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const identifierInputRef = useRef(null);

	// Autofocus identifier on mount
	useEffect(() => {
		if (identifierInputRef.current) {
			identifierInputRef.current.focus();
		}
	}, []);

	// If already authenticated, redirect immediately based on role
	useEffect(() => {
		if (isAuthenticated) {
			if (role === "FIELD_AUDITOR") {
				navigate("/survey", { replace: true });
			} else {
				navigate("/dashboard", { replace: true });
			}
		}
	}, [isAuthenticated, role, navigate]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setErrorMessage("");

		if (!identifier.trim()) {
			setErrorMessage("Please enter your phone number or email.");
			return;
		}

		if (!password) {
			setErrorMessage("Please enter your password.");
			return;
		}

		loginMutation.mutate(
			{ identifier: identifier.trim(), password },
			{
				onError: (err) => {
					setErrorMessage(
						err.message ||
							"Invalid credentials. Please verify your phone/email and password.",
					);
				},
			},
		);
	};

	return (
		<div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto w-full max-w-sm">
				{/* Brand Header */}
<div className="text-center space-y-3 mb-6">
  <div className="flex justify-center">
    <img
      src="/aires-logo.svg"
      alt="Aires Communication"
      className="h-16 w-auto object-contain drop-shadow-xs"
    />
  </div>
  <div>
    {/* Connected AIRESBI Brand Header */}
    <div className="flex items-baseline justify-center font-black tracking-tight leading-none select-none">
      <span className="text-2xl sm:text-3xl tracking-tight text-[#A41821]">
        AIRES
      </span>
      <span className="text-3xl sm:text-4xl font-black tracking-tighter text-[#017C4D] -ml-0.5">
        BI
      </span>
    </div>
    
    <p className="text-xs font-medium text-slate-400 mt-2">
      Aires Business intelligence
    </p>
  </div>
</div>

				{/* Login Form Card */}
				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
					<form onSubmit={handleSubmit} className="space-y-4" noValidate>
						{/* Inline Error Alert */}
						{errorMessage && (
							<div
								role="alert"
								className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-[#A41821]"
							>
								<svg
									className="h-4 w-4 flex-none mt-0.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span className="font-semibold leading-tight">
									{errorMessage}
								</span>
							</div>
						)}

						{/* Identifier Input (Phone or Email) */}
						<div>
							<label
								htmlFor="identifier"
								className="block text-xs font-bold text-slate-700 mb-1.5"
							>
								Phone Number or Email
							</label>
							<input
								ref={identifierInputRef}
								id="identifier"
								name="username"
								type="text"
								autoComplete="username"
								inputMode="text"
								required
								placeholder="+2519... or user@aires.et"
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								disabled={loginMutation.isPending}
								className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition disabled:bg-slate-100"
							/>
						</div>

						{/* Password Input with Show/Hide */}
						<div>
							<label
								htmlFor="password"
								className="block text-xs font-bold text-slate-700 mb-1.5"
							>
								Password
							</label>
							<div className="relative">
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									required
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={loginMutation.isPending}
									className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition disabled:bg-slate-100"
								/>
								<button
									type="button"
									tabIndex={-1}
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? (
										<svg
											className="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1.8}
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
											/>
										</svg>
									) : (
										<svg
											className="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1.8}
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1.8}
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									)}
								</button>
							</div>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loginMutation.isPending}
							className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
						>
							{loginMutation.isPending ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
									<span>Signing in...</span>
								</>
							) : (
								<span>Sign In </span>
							)}
						</button>
					</form>
				</div>

				{/* Security / System Footer */}
				<p className="text-center text-[11px] text-slate-400 mt-6">
					 Aires Business intelligence
				</p>
			</div>
			 <PwaInstallBanner />
		</div>
	);
};