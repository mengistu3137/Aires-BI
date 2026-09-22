export const PILOT_USERS = [
    {
        id: "USR-001",
        name: "Dawit Haile",
        phone: "+251911223344",
        email: "dawit.auditor@aires.et",
        role: "FIELD_AUDITOR",
        active: true,
    },
    {
        id: "USR-002",
        name: "Tigist Alemu",
        phone: "+251922334455",
        email: "tigist.manager@aires.et",
        role: "MANAGER",
        active: true,
    },
    {
        id: "USR-003",
        name: "Admin Aires",
        phone: "+251933445566",
        email: "admin@aires.et",
        role: "ADMIN",
        active: true,
    },
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
    { id: "Veg-04", name: "Carrot", category: "Fresh", unit: "kg", queensPrice: 42.0, active: true },
    { id: "Dry-01", name: "Wheat Flour 5kg", category: "Dry", unit: "pcs", queensPrice: 380.0, active: true },
    { id: "Dry-02", name: "Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", queensPrice: 890.0, active: true },
    { id: "Dry-03", name: "Sugar 1kg", category: "Sensitive", unit: "kg", queensPrice: 110.0, active: true },
    { id: "Dry-04", name: "Spaghetti 500g", category: "Non-Sensitive", unit: "pcs", queensPrice: 75.0, active: true },
];

export const PILOT_PERIOD = {
    id: "2026-W39",
    startDate: "2026-09-21",
    endDate: "2026-09-25",
    status: "OPEN",
};

export const PILOT_ASSIGNMENTS = [
    {
        id: "ASN-001",
        auditorId: "USR-001",
        competitorId: "shoa",
        marketName: "Shoa Supermarket",
        surveyPeriodId: "2026-W39",
        items: ["Veg-01", "Veg-02", "Veg-03", "Dry-01", "Dry-02"],
        status: "IN_PROGRESS",
        assignedAt: "2026-09-21T07:00:00+03:00",
    },
    {
        id: "ASN-002",
        auditorId: "USR-001",
        competitorId: "allmart",
        marketName: "Allmart Supermarket",
        surveyPeriodId: "2026-W39",
        items: ["Veg-01", "Veg-02", "Dry-02", "Dry-03"],
        status: "IN_PROGRESS",
        assignedAt: "2026-09-21T07:30:00+03:00",
    },
    {
        id: "ASN-003",
        auditorId: "USR-001",
        competitorId: "fresh-corner",
        marketName: "Fresh Corner Market",
        surveyPeriodId: "2026-W39",
        items: ["Veg-01", "Veg-03", "Veg-04"],
        status: "NOT_STARTED",
        assignedAt: "2026-09-21T08:00:00+03:00",
    },
];

export const PILOT_ENTRIES = [
    // Red Onion (Veg-01, Queens Price: 64.00)
    {
        id: "SUR-00001",
        itemId: "Veg-01",
        competitorId: "shoa",
        marketName: "Shoa Supermarket",
        auditorId: "USR-001",
        surveyPeriodId: "2026-W39",
        price: 62.0,
        unit: "kg",
        latitude: 9.032,
        longitude: 38.7469,
        accuracy: 8,
        timestamp: "2026-09-21T07:28:31+03:00",
        syncStatus: "SYNCED",
    },
    {
        id: "SUR-00002",
        itemId: "Veg-01",
        competitorId: "allmart",
        marketName: "Allmart Supermarket",
        auditorId: "USR-001",
        surveyPeriodId: "2026-W39",
        price: 58.6, // Cheapest -> Index = 64 / 58.60 = 1.092 -> PRICE_DOWN
        unit: "kg",
        latitude: 9.0285,
        longitude: 38.7512,
        accuracy: 6,
        timestamp: "2026-09-21T07:45:10+03:00",
        syncStatus: "SYNCED",
    },
    {
        id: "SUR-00003",
        itemId: "Veg-01",
        competitorId: "garment-market",
        marketName: "Garment Market",
        auditorId: "USR-001",
        surveyPeriodId: "2026-W39",
        price: 60.6,
        unit: "kg",
        latitude: 8.9801,
        longitude: 38.7299,
        accuracy: 10,
        timestamp: "2026-09-21T08:15:20+03:00",
        syncStatus: "SYNCED",
    },
    // Sunflower Oil 5L (Dry-02, Queens Price: 890.00)
    {
        id: "SUR-00004",
        itemId: "Dry-02",
        competitorId: "shoa",
        marketName: "Shoa Supermarket",
        auditorId: "USR-001",
        surveyPeriodId: "2026-W39",
        price: 940.0, // Index = 890 / 940 = 0.946 -> PRICE_UP
        unit: "pcs",
        latitude: 9.032,
        longitude: 38.7469,
        accuracy: 8,
        timestamp: "2026-09-21T07:35:12+03:00",
        syncStatus: "SYNCED",
    },
    // Sugar 1kg (Dry-03, Queens Price: 110.00)
    {
        id: "SUR-00005",
        itemId: "Dry-03",
        competitorId: "allmart",
        marketName: "Allmart Supermarket",
        auditorId: "USR-001",
        surveyPeriodId: "2026-W39",
        price: 110.0, // Index = 1.00 -> KEEP
        unit: "kg",
        latitude: 9.0285,
        longitude: 38.7512,
        accuracy: 7,
        timestamp: "2026-09-21T07:50:45+03:00",
        syncStatus: "SYNCED",
    },
];