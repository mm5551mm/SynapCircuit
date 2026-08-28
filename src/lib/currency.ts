export type CurrencyCode = "USD" | "EUR" | "SAR" | "AED" | "EGP";

export const CURRENCIES: Record<CurrencyCode, { symbol: string; rate: number; label: string }> = {
  USD: { symbol: "$", rate: 1, label: "US Dollar" },
  EUR: { symbol: "€", rate: 0.92, label: "Euro" },
  SAR: { symbol: "ر.س", rate: 3.75, label: "Saudi Riyal" },
  AED: { symbol: "د.إ", rate: 3.67, label: "UAE Dirham" },
  EGP: { symbol: "ج.م", rate: 49.1, label: "Egyptian Pound" },
};

export function convert(amountUsd: number, currency: CurrencyCode) {
  const c = CURRENCIES[currency] ?? CURRENCIES.USD;
  return amountUsd * c.rate;
}

export function formatMoney(amountUsd: number, currency: CurrencyCode = "USD") {
  const c = CURRENCIES[currency] ?? CURRENCIES.USD;
  const value = convert(amountUsd, currency);
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${c.symbol}${formatted}`;
}
