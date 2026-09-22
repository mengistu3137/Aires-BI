/**
 * Computes taxAmount and productPrice by extracting VAT out of the entered
 * totalPrice, based on organization VAT rules and the product's exemption status.
 *
 * The admin always enters the gross (tax-inclusive) price. The backend
 * splits that into the net product price and the tax portion.
 *
 * Scenario (taxable product):
 * Entered totalPrice: 50.00 ETB
 * VAT (15%):            7.50 ETB
 * Product Price: 50.00 - 7.50 = 42.50 ETB
 *
 * Scenario (exempt product, or org VAT disabled):
 * Entered totalPrice: 50.00 ETB
 * Product Price: 50.00 ETB (nothing extracted)
 */
export const computeProductTax = ({
  totalPrice,
  vatEnabled,
  vatRate,
  isTaxExempt,
}) => {
  const total = Number(totalPrice || 0);

  // If organization does not use VAT or the product is VAT-exempt,
  // the entered price passes through unchanged.
  if (!vatEnabled || isTaxExempt) {
    return {
      totalPrice: total,
      productPrice: total,
      taxAmount: 0.0,
    };
  }

  const rate = Number(vatRate || 15);
  const taxAmount = Number(((total * rate) / 100).toFixed(2));
  const productPrice = Number((total - taxAmount).toFixed(2));

  return {
    totalPrice: total,
    productPrice,
    taxAmount,
  };
};
