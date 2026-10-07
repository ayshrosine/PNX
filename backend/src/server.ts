import { app } from './app.js';
import { config } from './config/index.js';
import { checkDbConnection } from './db/client.js';

async function bootstrap() {
  const isConnected = await checkDbConnection();
  if (isConnected) {
    console.log('✅ PostgreSQL / Supabase database connected successfully via Prisma');
  } else {
    console.log('ℹ️ Running with active In-Memory Indian B2B demo datastore (Ready for Supabase keys)');
  }

  app.listen(config.port, () => {
    console.log(`🚀 PNX Collections Backend running on http://localhost:${config.port}`);
    console.log(`📡 API Base: http://localhost:${config.port}/api/v1`);
    console.log(`🌐 Public Portal: http://localhost:${config.port}/public/invoices/:token`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during backend bootstrap:', err);
  process.exit(1);
});
