/**
 * Normalizes Ethiopian phone numbers:
 * - Returns "" if input is empty (allows optional phone when email is provided)
 * - Converts local format "09..." or "07..." -> "+2519..." / "+2517..."
 * - Accepts "+2519..." / "+2517..." directly
 * - Accepts "9..." / "7..." -> "+2519..." / "+2517..."
 * - Truncates any extra digits beyond standard 9 digits
 */
export const normalizeEthiopianPhone = (input) => {
    if (!input) return "";

    let raw = String(input).trim().replace(/[^\d+]/g, "");

    // If user cleared the input or left only "+", return empty
    if (raw === "" || raw === "+" || raw === "+2" || raw === "+25" || raw === "+251") {
        return "";
    }

    // Remove country code variations to isolate the 9-digit local number
    if (raw.startsWith("+251")) {
        raw = raw.slice(4);
    } else if (raw.startsWith("251")) {
        raw = raw.slice(3);
    }

    // Strip leading zero if typed as 09... or 07...
    if (raw.startsWith("0")) {
        raw = raw.slice(1);
    }

    // Extract only digits and strictly cap at 9 digits
    const digits = raw.replace(/\D/g, "").slice(0, 9);

    return digits.length > 0 ? `+251${digits}` : "";
};

/**
 * Universal login identifier normalizer:
 * Leaves email addresses untouched.
 * Normalizes any phone number (local 09..., 07... or international +251...) to +2519XXXXXXXX.
 */
export const normalizeLoginIdentifier = (val) => {
    if (!val) return "";
    const trimmed = val.trim();

    // If input contains '@' or alphabetical characters, treat as email
    if (trimmed.includes("@") || /[a-zA-Z]/.test(trimmed)) {
        return trimmed.toLowerCase();
    }

    // Normalize phone number
    const normalized = normalizeEthiopianPhone(trimmed);
    return normalized || trimmed;
};