export const PERMISSIONS = {
    MANAGE_USERS: "MANAGE_USERS",
    ASSIGN_SURVEYS: "ASSIGN_SURVEYS",
    VIEW_DASHBOARD: "VIEW_DASHBOARD",
    EXPORT_DATA: "EXPORT_DATA",
    VIEW_ASSIGNMENT: "VIEW_ASSIGNMENT",
    SUBMIT_SURVEY: "SUBMIT_SURVEY",
};

export const ROLE_PERMISSIONS = {
    ADMIN: [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.ASSIGN_SURVEYS,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
    MANAGER: [
        PERMISSIONS.ASSIGN_SURVEYS,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
    FIELD_AUDITOR: [
        PERMISSIONS.VIEW_ASSIGNMENT,
        PERMISSIONS.SUBMIT_SURVEY,
    ],
};

/**
 * Checks whether a given role holds the requested permission
 */
export const hasPermission = (role, permission) => {
    if (!role || !permission) return false;
    const allowed = ROLE_PERMISSIONS[role] || [];
    return allowed.includes(permission);
};