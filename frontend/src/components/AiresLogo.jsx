import React from "react";

export const AiresLogo = ({ className = "h-10 w-auto", showText = false }) => {
	return (
		<svg
			viewBox={showText ? "0 0 700 600" : "0 0 700 530"}
			className={className}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				{/* RED GRADIENTS */}
				<linearGradient id="airesRed3D" x1="20%" y1="100%" x2="70%" y2="0%">
					<stop offset="0%" stop-color="#7B0F16" />
					<stop offset="35%" stop-color="#A41821" />
					<stop offset="70%" stop-color="#D61F2C" />
					<stop offset="100%" stop-color="#8F1018" />
				</linearGradient>
				<linearGradient id="airesRedShadow" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="#4A050A" stop-opacity="0.85" />
					<stop offset="100%" stop-color="#8B0F17" stop-opacity="0.2" />
				</linearGradient>
				<linearGradient id="airesRedGloss" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.65" />
					<stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.15" />
					<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
				</linearGradient>

				{/* GREEN GRADIENTS */}
				<linearGradient id="airesGreen3D" x1="30%" y1="0%" x2="80%" y2="100%">
					<stop offset="0%" stop-color="#015233" />
					<stop offset="40%" stop-color="#017C4D" />
					<stop offset="75%" stop-color="#02A869" />
					<stop offset="100%" stop-color="#01663F" />
				</linearGradient>
				<linearGradient
					id="airesGreenShadow"
					x1="0%"
					y1="0%"
					x2="60%"
					y2="100%"
				>
					<stop offset="0%" stop-color="#00331F" stop-opacity="0.8" />
					<stop offset="100%" stop-color="#017C4D" stop-opacity="0.1" />
				</linearGradient>
				<linearGradient
					id="airesGreenGloss"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="100%"
				>
					<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6" />
					<stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.15" />
					<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
				</linearGradient>

				{/* ORANGE GRADIENTS */}
				<linearGradient id="airesOrange3D" x1="0%" y1="50%" x2="100%" y2="50%">
					<stop offset="0%" stop-color="#E55F00" />
					<stop offset="45%" stop-color="#FE7914" />
					<stop offset="85%" stop-color="#FFA04D" />
					<stop offset="100%" stop-color="#F26C05" />
				</linearGradient>
				<linearGradient
					id="airesOrangeGloss"
					x1="30%"
					y1="0%"
					x2="80%"
					y2="100%"
				>
					<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.75" />
					<stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.15" />
					<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
				</linearGradient>
			</defs>

			{/* 1. Red Leg */}
			<path
				d="M 85 510 L 295 68 L 375 68 L 255 365 L 185 510 Z"
				fill="url(#airesRed3D)"
			/>
			<path
				d="M 295 68 L 375 68 L 255 365 C 285 240, 275 140, 295 68 Z"
				fill="url(#airesRedShadow)"
			/>
			<path
				d="M 115 480 L 295 85 C 265 140, 230 260, 160 480 Z"
				fill="url(#airesRedGloss)"
			/>

			{/* 2. Green Leg */}
			<path
				d="M 368 68 L 440 68 L 542 365 L 425 365 Z"
				fill="url(#airesGreen3D)"
			/>
			<path
				d="M 368 68 L 410 68 L 425 150 L 380 150 Z"
				fill="url(#airesGreenShadow)"
			/>
			<path
				d="M 395 80 L 435 80 L 515 350 C 475 260, 440 180, 395 80 Z"
				fill="url(#airesGreenGloss)"
			/>

			{/* 3. Orange Crossbar Parallelogram */}
			<path
				d="M 255 365 L 542 365 L 615 510 L 330 510 Z"
				fill="url(#airesOrange3D)"
			/>
			<path
				d="M 320 375 L 535 375 L 575 450 C 460 410, 390 400, 320 375 Z"
				fill="url(#airesOrangeGloss)"
			/>

			{/* Optional Typography */}
			{showText && (
				<text
					x="350"
					y="575"
					textAnchor="middle"
					fontFamily="system-ui, sans-serif"
					fontSize="32"
					fontWeight="800"
					letterSpacing="4"
					fill="#017C4D"
				>
					AIRES COMMUNICATION PLC
				</text>
			)}
		</svg>
	);
};