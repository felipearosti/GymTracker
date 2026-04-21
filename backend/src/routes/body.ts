import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma/client';
import {
  computeFatigue,
  computeKByMuscle,
  FATIGUE_LOOKBACK_HOURS,
} from '../lib/fatigue';

const USER_ID = 'user_default';

export async function bodyRoutes(app: FastifyInstance) {
  // GET /api/body/fatigue — fadiga atual por músculo (0..1)
  app.get('/api/body/fatigue', async () => {
    const now = new Date();

    // Sessões recentes pra calcular fadiga atual
    const lookbackMs = FATIGUE_LOOKBACK_HOURS * 3_600_000;
    const recent = await prisma.session.findMany({
      where: {
        userId: USER_ID,
        startedAt: { gte: new Date(now.getTime() - lookbackMs) },
      },
      include: {
        sets: {
          include: { exercise: { include: { muscleLoads: true } } },
        },
      },
    });

    // Histórico completo (só sets + loads) pra calibrar K
    const history = await prisma.session.findMany({
      where: { userId: USER_ID },
      select: {
        id: true,
        sets: {
          select: {
            weight: true,
            reps: true,
            completedAt: true,
            exercise: {
              select: { muscleLoads: { select: { muscle: true, loadFactor: true } } },
            },
          },
        },
      },
    });

    const kByMuscle = computeKByMuscle(history);
    const fatigue = computeFatigue(recent, now, kByMuscle);

    return { fatigue, computedAt: now.toISOString() };
  });
}
