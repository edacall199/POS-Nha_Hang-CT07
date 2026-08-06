import { prisma } from '../lib/prisma';

let cachedTaxRate: number | null = null;
let cacheExpiry = 0;

export async function getTaxRate(): Promise<number> {
  const now = Date.now();
  if (cachedTaxRate !== null && now < cacheExpiry) {
    return cachedTaxRate;
  }

  const config = await prisma.storeConfig.findFirst({ where: { id: 'default' } });
  cachedTaxRate = config ? Number(config.taxRate) : 0.08;
  cacheExpiry = now + 60_000; // Cache for 1 minute
  return cachedTaxRate;
}

export function clearTaxRateCache() {
  cachedTaxRate = null;
  cacheExpiry = 0;
}
