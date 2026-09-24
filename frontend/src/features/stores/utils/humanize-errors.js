/**
 * Transforms raw database/backend error strings into clean, user-friendly UI messages.
 */
export const humanizeBenchmarkError = (errorMsg) => {
    if (!errorMsg) return null;

    // Intercept date interval overlap errors
    if (
        errorMsg.includes("overlaps with existing benchmark") ||
        errorMsg.includes("conflicts with an existing benchmark") ||
        errorMsg.includes("Price period overlaps")
    ) {
        // Extract dates using regex if raw ISO strings are present
        const isoDates = errorMsg.match(/\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?/g);
        if (isoDates && isoDates.length >= 1) {
            const formatDateStr = (dStr) =>
                new Date(dStr).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });

            const start = formatDateStr(isoDates[0]);
            const end = isoDates[1] ? formatDateStr(isoDates[1]) : "present";

            return {
                title: "Benchmark Date Overlap",
                message: `This effective date overlaps with an existing benchmark active from ${start} to ${end}.`,
                hint: `Adjust the start date to after ${end}, or edit the prior benchmark's end date.`,
            };
        }

        return {
            title: "Benchmark Date Overlap",
            message: errorMsg.replace(/\[[a-f0-9-]+\]/gi, "").trim(),
            hint: "Please select dates that do not overlap with existing price periods.",
        };
    }

    // Historical immutability rule
    if (errorMsg.includes("Historical/expired benchmark prices are immutable")) {
        return {
            title: "Historical Benchmark Locked",
            message: "Expired benchmark prices cannot be modified because they are preserved for historical audit accuracy.",
            hint: "Create a new benchmark price record starting today instead.",
        };
    }

    return {
        title: "Unable to Save Benchmark",
        message: errorMsg,
        hint: null,
    };
};