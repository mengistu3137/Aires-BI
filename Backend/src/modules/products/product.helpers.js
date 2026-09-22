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
    ];
  }

  return filter;
};