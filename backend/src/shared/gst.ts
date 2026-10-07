import Decimal from 'decimal.js';
import { formatMoneyStr, toDecimal } from './money.js';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(gstin: string): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function extractStateCodeFromGstin(gstin: string): string | null {
  if (!isValidGstin(gstin)) return null;
  return gstin.trim().substring(0, 2);
}

export interface LineItemInput {
  description: string;
  hsnSac?: string | null;
  quantity: string | number;
  unit?: string | null;
  rate: string | number;
  discountPct?: string | number | null;
  taxRate: string | number;
}

export interface ComputedLineItem {
  position: number;
  description: string;
  hsnSac?: string | null;
  quantity: string;
  unit: string;
  rate: string;
  discountPct: string;
  taxRate: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
}

export interface ComputedInvoiceTotals {
  subtotal: string;
  discountTotal: string;
  taxableAmount: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
  taxTotal: string;
  roundOff: string;
  total: string;
  balanceDue: string;
  isInterState: boolean;
  items: ComputedLineItem[];
}

export function computeInvoiceTotals(
  tenantStateCode: string | undefined | null,
  placeOfSupply: string | undefined | null,
  items: LineItemInput[]
): ComputedInvoiceTotals {
  const isInterState = Boolean(
    tenantStateCode && placeOfSupply && tenantStateCode.trim() !== placeOfSupply.trim()
  );

  let subtotalAcc = new Decimal(0);
  let discountAcc = new Decimal(0);
  let taxableAcc = new Decimal(0);
  let taxAcc = new Decimal(0);

  const computedItems: ComputedLineItem[] = items.map((item, index) => {
    const qty = toDecimal(item.quantity || 1);
    const rate = toDecimal(item.rate || 0);
    const discPct = toDecimal(item.discountPct || 0);
    const taxRate = toDecimal(item.taxRate || 0);

    const gross = qty.times(rate);
    const discAmt = gross.times(discPct).dividedBy(100);
    const taxable = gross.minus(discAmt).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const tax = taxable.times(taxRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const lineTotal = taxable.plus(tax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    subtotalAcc = subtotalAcc.plus(gross);
    discountAcc = discountAcc.plus(discAmt);
    taxableAcc = taxableAcc.plus(taxable);
    taxAcc = taxAcc.plus(tax);

    return {
      position: index + 1,
      description: item.description,
      hsnSac: item.hsnSac || null,
      quantity: qty.toString(),
      unit: item.unit || 'NOS',
      rate: formatMoneyStr(rate),
      discountPct: discPct.toString(),
      taxRate: taxRate.toString(),
      taxableAmount: formatMoneyStr(taxable),
      taxAmount: formatMoneyStr(tax),
      lineTotal: formatMoneyStr(lineTotal),
    };
  });

  const subtotal = subtotalAcc.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const discountTotal = discountAcc.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const taxableAmount = taxableAcc.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const taxTotal = taxAcc.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);

  if (isInterState) {
    igst = taxTotal;
  } else {
    cgst = taxTotal.dividedBy(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    sgst = taxTotal.minus(cgst).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const unroundedTotal = taxableAmount.plus(taxTotal);
  const roundedTotal = unroundedTotal.round();
  const roundOff = roundedTotal.minus(unroundedTotal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    subtotal: formatMoneyStr(subtotal),
    discountTotal: formatMoneyStr(discountTotal),
    taxableAmount: formatMoneyStr(taxableAmount),
    cgst: formatMoneyStr(cgst),
    sgst: formatMoneyStr(sgst),
    igst: formatMoneyStr(igst),
    cess: '0.00',
    taxTotal: formatMoneyStr(taxTotal),
    roundOff: formatMoneyStr(roundOff),
    total: formatMoneyStr(roundedTotal),
    balanceDue: formatMoneyStr(roundedTotal),
    isInterState,
    items: computedItems,
  };
}
