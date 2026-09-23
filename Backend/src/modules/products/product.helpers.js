export const formatProductWithActivePrice = (product) => {
  // Sort historical prices descending by effectiveFrom
  const sortedPrices = (product.queensPrices || []).sort(
    (a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom)
  );

  const currentPriceRecord = sortedPrices[0] || null;
  const priceValue = currentPriceRecord ? Number(currentPriceRecord.price) : 0.0;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    unit: product.unit,
    active: product.active,
    // Expose both currentQueensPrice and queensPrice for test compatibility
    currentQueensPrice: priceValue,
    queensPrice: priceValue,
    priceHistoryCount: (product.queensPrices || []).length,
    queensPrices: product.queensPrices || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

export const buildProductFilter = (query) => {
  const filter = {};

  if (query.category) {
    filter.category = query.category;
  }
  if (query.active !== undefined) {
    filter.active = query.active === "true";
  }
  if (query.search) {
    filter.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { id: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { barcode: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return filter;
};