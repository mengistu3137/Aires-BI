import Groq from "groq-sdk";
import { GROQ_API_KEY } from "./env.js";

export const groq = new Groq({
    apiKey: GROQ_API_KEY || "missing_key",
});

let cachedModelIds = null;
let lastFetchedAt = 0;

/**
 * Dynamically queries Groq to find the exact live models active for your API key.
 * Caches in-memory for 1 hour to preserve sub-200ms inference speeds.
 */
export const getActiveGroqModel = async (type = "fast") => {
    const now = Date.now();

    if (!cachedModelIds || now - lastFetchedAt > 60 * 60 * 1000) {
        try {
            const response = await groq.models.list();
            cachedModelIds = new Set((response.data || []).map((m) => m.id));
            lastFetchedAt = now;
            console.log(
                "⚡ [Groq AI] Active models available for key:",
                Array.from(cachedModelIds),
            );
        } catch (err) {
            console.warn("⚠️ [Groq AI] Could not query live model list, using defaults:", err.message);
            cachedModelIds = new Set();
        }
    }

    // Candidates ordered by speed and JSON compliance
    const fastCandidates = [
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
        "qwen/qwen3.8-27b",
        "gemma2-9b-it",
        "llama3-8b-8192",
    ];

    const reasoningCandidates = [
        "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "llama3-70b-8192",
    ];

    const candidates = type === "fast" ? fastCandidates : reasoningCandidates;

    for (const candidate of candidates) {
        if (cachedModelIds.has(candidate)) {
            return candidate;
        }
    }

    // Fallback: Pick any non-audio text model from your live list
    const anyLiveModel = Array.from(cachedModelIds).find(
        (id) => !id.includes("whisper") && !id.includes("orpheus") && !id.includes("guard"),
    );

    return anyLiveModel || (type === "fast" ? "openai/gpt-oss-20b" : "openai/gpt-oss-120b");
};