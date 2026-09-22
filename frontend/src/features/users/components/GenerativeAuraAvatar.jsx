// milki-frontend/src/features/users/components/GenerativeAuraAvatar.jsx
// 1. React Built-ins
import React from "react";

const hashString = (str) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return Math.abs(hash);
};

export const GenerativeAuraAvatar = ({ name, email, size = "md" }) => {
	const seedKey = `${name}-${email}`;
	const hash = hashString(seedKey);

	const gradientPairs = [
		{ from: "#1748d6", to: "#648cff" },
		{ from: "#ff7f11", to: "#ffb067" },
		{ from: "#059669", to: "#34d399" },
	];

	const pair = gradientPairs[hash % gradientPairs.length];
	const initials =
		name
			?.split(" ")
			.map((n) => n[0])
			.slice(0, 2)
			.join("")
			.toUpperCase() || "M";

	const sizeClasses =
		size === "sm"
			? "h-8 w-8 text-xs"
			: "h-10 w-10 sm:h-11 sm:w-11 text-xs sm:text-sm";

	return (
		<div
			className={`relative shrink-0 select-none items-center justify-center rounded-full flex border border-primary-100/40 bg-surface/50 shadow-soft overflow-hidden group ${sizeClasses}`}
		>
			<div
				className="absolute inset-0 opacity-80"
				style={{
					background: `linear-gradient(135deg, ${pair.from} 0%, ${pair.to} 100%)`,
				}}
			/>
			<div
				className="absolute h-7 w-7 rounded-full blur-md opacity-70 animate-float"
				style={{
					background: pair.to,
					top: "10%",
					left: "30%",
				}}
			/>
			<img
				src="/logo.png"
				alt="Milki Flow Brand Seal"
				className="absolute -right-2 -bottom-2 h-7 w-7 object-contain opacity-25 select-none pointer-events-none transform rotate-12 transition-transform duration-300 group-hover:scale-110"
			/>
			<span className="relative z-10 font-black tracking-tight text-white drop-shadow-md">
				{initials}
			</span>
		</div>
	);
};