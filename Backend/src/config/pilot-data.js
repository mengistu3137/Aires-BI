export const PILOT_CATEGORIES = [
    "Ultra-Sensitive",
    "Sensitive",
    "Non-Sensitive",
    "Dry",
    "Fresh",
];

export const PILOT_COMPETITORS = [
    { id: "allmart", name: "Allmart", market: "Allmart Supermarket", type: "FMCG", active: true },
    { id: "abadir", name: "Abadir", market: "Abadir Supermarket", type: "FMCG", active: true },
    { id: "shoa", name: "Shoa", market: "Shoa Supermarket", type: "FMCG", active: true },
    { id: "bambis", name: "Bambis", market: "Bambis Supermarket", type: "FMCG", active: true },
    { id: "fresh-corner", name: "Fresh Corner", market: "Fresh Corner Market", type: "Fresh", active: true },
    { id: "garment-market", name: "Garment Vegetable Market", market: "Garment Market", type: "Fresh", active: true },
    { id: "straight-market", name: "Straight Market", market: "Straight Fresh Market", type: "Fresh", active: true },
];

export const PILOT_PRODUCTS = [
    { id: "Veg-01", name: "Red Onion", category: "Fresh", unit: "kg", queensPrice: 64.0, active: true },
    { id: "Veg-02", name: "Potato", category: "Fresh", unit: "kg", queensPrice: 48.0, active: true },
    { id: "Veg-03", name: "Tomato", category: "Fresh", unit: "kg", queensPrice: 55.0, active: true },
    { id: "Dry-01", name: "Wheat Flour 5kg", category: "Dry", unit: "pcs", queensPrice: 380.0, active: true },
    { id: "Dry-02", name: "Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", queensPrice: 890.0, active: true },
    { id: "Dry-03", name: "Sugar 1kg", category: "Sensitive", unit: "kg", queensPrice: 110.0, active: true },
];

export const PERMISSIONS = {
    ADMIN: ["MANAGE_USERS", "ASSIGN_SURVEYS", "VIEW_DASHBOARD", "EXPORT_DATA"],
    MANAGER: ["ASSIGN_SURVEYS", "VIEW_DASHBOARD", "EXPORT_DATA"],
    FIELD_AUDITOR: ["VIEW_ASSIGNMENT", "SUBMIT_SURVEY"],
};