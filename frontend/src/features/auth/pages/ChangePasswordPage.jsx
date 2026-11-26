import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth.js";
import { changePasswordRequest } from "@/services/api/auth.api.js";

const homeForRole = (role) => (role === "FIELD_AUDITOR" ? "/survey" : "/dashboard");

export const ChangePasswordPage = () => {
	const navigate = useNavigate();
	const { isAuthenticated, user, updateUser, logout } = useAuth();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPasswords, setShowPasswords] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const mustChange = Boolean(user?.mustChangePassword);

	useEffect(() => {
		if (!isAuthenticated) {
			navigate("/login", { replace: true });
			return;
		}
		if (!mustChange) {
			navigate(homeForRole(user?.role), { replace: true });
		}
	}, [isAuthenticated, mustChange, navigate, user?.role]);

	if (!isAuthenticated || !mustChange) {
		return null;
	}

	const handleSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");

		if (!currentPassword || !newPassword || !confirmPassword) {
			setErrorMessage("Enter the issued password and your new password.");
			return;
		}

		if (newPassword.length < 8) {
			setErrorMessage("The new password must be at least 8 characters.");
			return;
		}

		if (newPassword !== confirmPassword) {
			setErrorMessage("The new password and confirmation do not match.");
			return;
		}

		if (newPassword === currentPassword) {
			setErrorMessage("Choose a password that is different from the one you were given.");
			return;
		}

		setIsSaving(true);
		try {
			const response = await changePasswordRequest({
				currentPassword,
				newPassword,
			});
			const updatedUser = response?.data?.user;
			updateUser({
				...(updatedUser || {}),
				mustChangePassword: false,
			});
			toast.success("Password updated");
			navigate(homeForRole(updatedUser?.role || user?.role), { replace: true });
		} catch (error) {
			setErrorMessage(error.message || "The password could not be updated.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto w-full max-w-sm">
				<div className="mb-6 space-y-3 text-center">
					<div className="flex justify-center">
						<img
							src="/aires-logo.svg"
							alt="Aires Communication"
							className="h-16 w-auto object-contain drop-shadow-xs"
						/>
					</div>
					<div className="flex items-baseline justify-center font-black leading-none tracking-tight select-none">
						<span className="text-2xl tracking-tight text-[#A41821] sm:text-3xl">AIRES</span>
						<span className="-ml-0.5 text-3xl font-black tracking-tighter text-[#017C4D] sm:text-4xl">
							BI
						</span>
					</div>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
					<h1 className="text-base font-black text-slate-900">Set your password</h1>
					<p className="mt-1 text-xs leading-relaxed text-slate-500">
						This account was opened with a password issued by an administrator. Choose your own
						password before continuing.
					</p>

					<form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
						{errorMessage && (
							<div
								role="alert"
								className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs font-semibold leading-tight text-[#A41821]"
							>
								{errorMessage}
							</div>
						)}

						<label className="block">
							<span className="mb-1.5 block text-xs font-bold text-slate-700">Issued password</span>
							<input
								type={showPasswords ? "text" : "password"}
								autoComplete="current-password"
								value={currentPassword}
								onChange={(event) => setCurrentPassword(event.target.value)}
								disabled={isSaving}
								className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-hidden transition focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] disabled:bg-slate-100"
							/>
						</label>

						<label className="block">
							<span className="mb-1.5 block text-xs font-bold text-slate-700">New password</span>
							<input
								type={showPasswords ? "text" : "password"}
								autoComplete="new-password"
								value={newPassword}
								onChange={(event) => setNewPassword(event.target.value)}
								disabled={isSaving}
								className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-hidden transition focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] disabled:bg-slate-100"
							/>
						</label>

						<label className="block">
							<span className="mb-1.5 block text-xs font-bold text-slate-700">Confirm new password</span>
							<input
								type={showPasswords ? "text" : "password"}
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								disabled={isSaving}
								className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-hidden transition focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] disabled:bg-slate-100"
							/>
						</label>

						<button
							type="button"
							onClick={() => setShowPasswords((current) => !current)}
							className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800"
						>
							{showPasswords ? "Hide passwords" : "Show passwords"}
						</button>

						<button
							type="submit"
							disabled={isSaving}
							className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#A41821] py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#7F1219] disabled:opacity-50"
						>
							{isSaving ? "Saving..." : "Save password and continue"}
						</button>
					</form>
				</div>

				<button
					type="button"
					onClick={() => {
						logout();
						navigate("/login", { replace: true });
					}}
					className="mt-4 w-full cursor-pointer text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
				>
					Sign out
				</button>
			</div>
		</div>
	);
};
