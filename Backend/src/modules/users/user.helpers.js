export const sanitizeUserRecord = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};

export const getRolePermissions = (role) => {
  const permissions = {
    ADMIN: ["MANAGE_USERS", "ASSIGN_SURVEYS", "VIEW_DASHBOARD", "EXPORT_DATA"],
    MANAGER: ["ASSIGN_SURVEYS", "VIEW_DASHBOARD", "EXPORT_DATA"],
    FIELD_AUDITOR: ["VIEW_ASSIGNMENT", "SUBMIT_SURVEY"],
  };
  return permissions[role] || [];
};