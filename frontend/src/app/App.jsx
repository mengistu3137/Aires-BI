// 1. React Built-ins
import React from "react";

// 2. Third-Party Packages (Alphabetized)
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";

// 3. Relative Imports (Alphabetized)
import { AppProviders } from "./providers/AppProviders.jsx";
import { router } from "./router/index.jsx";

export const App = () => {
	return (
		<AppProviders>
			
			<RouterProvider router={router} />
		</AppProviders>
	);
};