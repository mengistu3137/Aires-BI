import { NAVIGATION } from "@/app/config/navigation.js";

export const PERMISSIONS = {
    // Infrastructure & Super Admin capabilities
    SYSTEM_CONFIG: "SYSTEM_CONFIG",
    MANAGE_USERS: "MANAGE_USERS",
    IMPERSONATE_USER: "IMPERSONATE_USER",
    DISPATCH_SURVEYS: "DISPATCH_SURVEYS",
    FINAL_QC_APPROVAL: "FINAL_QC_APPROVAL", // Approve or Reject field observations
    RUN_ANALYSIS_MODELS: "RUN_ANALYSIS_MODELS",

    // Operations
    MANAGE_AUDITORS: "MANAGE_AUDITORS",
    EDIT_BENCHMARKS: "EDIT_BENCHMARKS", // Set / update Queens benchmark prices
    GENERATE_INTELLIGENCE_REPORT: "GENERATE_INTELLIGENCE_REPORT",
    CREATE_PRODUCT: "CREATE_PRODUCT",
    EDIT_PRODUCT: "EDIT_PRODUCT",

    // Client Admin (Queens Admin) & Shared Analytics
    VIEW_DASHBOARD: "VIEW_DASHBOARD",
    VIEW_FIELD_PROGRESS: "VIEW_FIELD_PROGRESS",
    FLAG_OBSERVATION_REVIEW: "FLAG_OBSERVATION_REVIEW",
    REQUEST_RECALCULATION: "REQUEST_RECALCULATION",
    EXPORT_DATA: "EXPORT_DATA",
    DECIDE_PRICE_ACTIONS: "DECIDE_PRICE_ACTIONS",
    CREATE_CLIENT_USERS: "CREATE_CLIENT_USERS",

    // Field Operations (Auditors)
    VIEW_ASSIGNMENT: "VIEW_ASSIGNMENT",
    SUBMIT_SURVEY: "SUBMIT_SURVEY",
};

export const DEFAULT_ROLE_PERMISSIONS = {
    SUPER_ADMIN: [
        PERMISSIONS.SYSTEM_CONFIG,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.IMPERSONATE_USER,
        PERMISSIONS.DISPATCH_SURVEYS,
        PERMISSIONS.FINAL_QC_APPROVAL,
        PERMISSIONS.RUN_ANALYSIS_MODELS,
        PERMISSIONS.MANAGE_AUDITORS,
        PERMISSIONS.EDIT_BENCHMARKS,
        PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
        PERMISSIONS.CREATE_PRODUCT,
        PERMISSIONS.EDIT_PRODUCT,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.FLAG_OBSERVATION_REVIEW,
        PERMISSIONS.REQUEST_RECALCULATION,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.DECIDE_PRICE_ACTIONS,
        PERMISSIONS.CREATE_CLIENT_USERS,
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
    ADMIN: [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.DISPATCH_SURVEYS,
        PERMISSIONS.FINAL_QC_APPROVAL,
        PERMISSIONS.RUN_ANALYSIS_MODELS,
        PERMISSIONS.MANAGE_AUDITORS,
        PERMISSIONS.EDIT_BENCHMARKS,
        PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
        PERMISSIONS.CREATE_PRODUCT,
        PERMISSIONS.EDIT_PRODUCT,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.FLAG_OBSERVATION_REVIEW,
        PERMISSIONS.REQUEST_RECALCULATION,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.DECIDE_PRICE_ACTIONS,
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
    AIRES_ANALYST: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.RUN_ANALYSIS_MODELS,
        PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.REQUEST_RECALCULATION,
    ],
    MANAGER: [
        // Queens Admin: Strictly analytical and review by default
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.FLAG_OBSERVATION_REVIEW,
        PERMISSIONS.REQUEST_RECALCULATION,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.DECIDE_PRICE_ACTIONS,
        PERMISSIONS.CREATE_CLIENT_USERS,
        PERMISSIONS.CREATE_PRODUCT,
        PERMISSIONS.EDIT_PRODUCT,
        PERMISSIONS.EDIT_BENCHMARKS,
        PERMISSIONS.FINAL_QC_APPROVAL,
        PERMISSIONS.RUN_ANALYSIS_MODELS,
        PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
        PERMISSIONS.VIEW_ASSIGNMENT,
    ],
    QUEENS_GM: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.DECIDE_PRICE_ACTIONS,
    ],
    QUEENS_ANALYST: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
        PERMISSIONS.EXPORT_DATA,
    ],
    FIELD_AUDITOR: [
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
};

const STORAGE_KEY = "aires_custom_role_permissions";
const SCHEMA_KEY = "aires_permissions_schema";
const SCHEMA_VERSION = 3;
const INTRODUCED_PRIVILEGES = [
    PERMISSIONS.GENERATE_INTELLIGENCE_REPORT,
    PERMISSIONS.CREATE_PRODUCT,
    PERMISSIONS.EDIT_PRODUCT,
    PERMISSIONS.EDIT_BENCHMARKS,
    PERMISSIONS.FINAL_QC_APPROVAL,
    PERMISSIONS.RUN_ANALYSIS_MODELS,
];

const applyNewPrivilegeDefaults = (stored) => {
    const version = Number(localStorage.getItem(SCHEMA_KEY) || "1");
    if (version >= SCHEMA_VERSION || !stored || typeof stored !== "object") return stored;

    const next = { ...stored };
    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
        if (!Array.isArray(next[role])) continue;
        const additions = INTRODUCED_PRIVILEGES.filter(
            (permission) =>
                DEFAULT_ROLE_PERMISSIONS[role].includes(permission) && !next[role].includes(permission),
        );
        if (additions.length) next[role] = [...next[role], ...additions];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
    return next;
};

export const getStoredPermissions = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = applyNewPrivilegeDefaults(JSON.parse(stored));
            const next = { ...parsed };
            let changed = false;
            for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
                if (!Array.isArray(next[role])) {
                    next[role] = [...DEFAULT_ROLE_PERMISSIONS[role]];
                    changed = true;
                }
            }
            if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        }
    } catch {
        // fallback
    }
    return DEFAULT_ROLE_PERMISSIONS;
};

export const saveStoredPermissions = (newPermissions) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPermissions));
    window.dispatchEvent(new Event("permissions_updated"));
};

export const hasPermission = (role, permission) => {
    if (!role || !permission) return false;
    if (role === "SUPER_ADMIN") return true;
    const permissionsMap = getStoredPermissions();
    const allowed = permissionsMap[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    return allowed.includes(permission);
};

// Check if a role has access to view a specific sidebar page
export const canRoleViewPage = (role, pageId) => {
    if (!role || !pageId) return false;
    if (role === "SUPER_ADMIN") return true;
    const customPagesKey = "aires_custom_role_pages";
    try {
        const stored = localStorage.getItem(customPagesKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed[role]) return parsed[role].includes(pageId);
        }
    } catch {
        // fallback to default navigation.js
    }
    const navItem = NAVIGATION.find((n) => n.id === pageId);
    return navItem ? navItem.roles.includes(role) : false;
};

export const saveRolePageAccess = (role, allowedPageIds) => {
    const customPagesKey = "aires_custom_role_pages";
    let current = {};
    try {
        const stored = localStorage.getItem(customPagesKey);
        if (stored) current = JSON.parse(stored);
    } catch {
        current = {};
    }
    current[role] = allowedPageIds;
    localStorage.setItem(customPagesKey, JSON.stringify(current));
    window.dispatchEvent(new Event("navigation_updated"));
};