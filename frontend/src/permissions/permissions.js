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
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_FIELD_PROGRESS,
        PERMISSIONS.FLAG_OBSERVATION_REVIEW,
        PERMISSIONS.REQUEST_RECALCULATION,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.DECIDE_PRICE_ACTIONS,
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
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
        PERMISSIONS.VIEW_ASSIGNMENT,
    ],
    FIELD_AUDITOR: [
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
};

const STORAGE_KEY = "aires_custom_role_permissions";

export const getStoredPermissions = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
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
    const permissionsMap = getStoredPermissions();
    const allowed = permissionsMap[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    return allowed.includes(permission);
};

// Check if a role has access to view a specific sidebar page
export const canRoleViewPage = (role, pageId) => {
    if (!role || !pageId) return false;
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