import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(val: string | number | Decimal | undefined | null): Decimal {
  if (val === undefined || val === null || val === '') return new Decimal(0);
  return new Decimal(val);
}

export function formatMoneyStr(val: string | number | Decimal): string {
  return toDecimal(val).toFixed(2);
}

export function formatInrCurrency(val: string | number | Decimal): string {
  const num = toDecimal(val).toNumber();
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function numberToWordsInr(amount: number | string | Decimal): string {
  const dec = toDecimal(amount);
  const integerPart = Math.floor(dec.abs().toNumber());
  const paisePart = dec.minus(integerPart).times(100).round().toNumber();

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const r = n % 10;
    return tens[t] + (r > 0 ? ' ' + ones[r] : '');
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (h > 0) res += ones[h] + ' Hundred';
    if (rest > 0) res += (h > 0 ? ' and ' : '') + convertTwoDigits(rest);
    return res;
  }

  if (integerPart === 0 && paisePart === 0) return 'Zero Rupees Only';

  let n = integerPart;
  const parts: string[] = [];

  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  if (crores > 0) parts.push(convertThreeDigits(crores) + ' Crore');

  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  if (lakhs > 0) parts.push(convertTwoDigits(lakhs) + ' Lakh');

  const thousands = Math.floor(n / 1000);
  n %= 1000;
  if (thousands > 0) parts.push(convertTwoDigits(thousands) + ' Thousand');

  if (n > 0) parts.push(convertThreeDigits(n));

  let words = parts.join(' ') + ' Rupees';
  if (paisePart > 0) {
    words += ' and ' + convertTwoDigits(paisePart) + ' Paise';
  }
  return words + ' Only';
}
