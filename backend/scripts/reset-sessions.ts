/**
 * Limpa todas as sessões e sets (mantém workouts, exercises e muscle loads).
 * Uso: npx tsx scripts/reset-sessions.ts
 */
import { prisma } from '../src/prisma/client';

async function main() {
  const sets = await prisma.sessionSet.deleteMany();
  const sessions = await prisma.session.deleteMany();
  console.log(`Removidos ${sets.count} sets e ${sessions.count} sessões.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
