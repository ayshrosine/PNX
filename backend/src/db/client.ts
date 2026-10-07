import { PrismaClient, Prisma } from '@prisma/client';
import { config } from '../config/index.js';

let prismaInstance: PrismaClient | null = null;
let dbConnected = false;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

export async function checkDbConnection(): Promise<boolean> {
  if (!config.databaseUrl || config.databaseUrl.includes('yourpassword')) {
    dbConnected = false;
    return false;
  }
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    return true;
  } catch (err) {
    dbConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return dbConnected;
}

export async function withTenantTx<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const prisma = getPrismaClient();
  return prisma.$transaction(
    async (tx) => {
      try {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`;
      } catch (e) {
        // Fallback if set_config is not available or outside postgres session
      }
      return fn(tx);
    },
    { timeout: 15000, isolationLevel: 'ReadCommitted' }
  );
}

export const prisma = getPrismaClient();
