/**
 * Normalizes Ethiopian phone numbers:
 * - Auto-prepends +251
 * - Strips leading 0 (e.g. 09... -> +2519...)
 * - Truncates any input beyond 9 digits (total 13 chars including +251)
 * - Tolerates pastes with spaces, dashes, or redundant country codes
 */
export const normalizeEthiopianPhone = (input) => {
    if (!input) return "+251";

    let raw = String(input).trim().replace(/[^\d+]/g, "");

    // Strip existing country code prefix variations
    if (raw.startsWith("+251")) {
        raw = raw.slice(4);
    } else if (raw.startsWith("251")) {
        raw = raw.slice(3);
    }

    // Strip leading zero if pasted as 09... or 07...
    if (raw.startsWith("0")) {
        raw = raw.slice(1);
    }

    // Extract only digits and strictly truncate to 9 digits maximum
    const digits = raw.replace(/\D/g, "").slice(0, 9);

    return `+251${digits}`;
};