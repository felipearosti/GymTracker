import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma/client';

const USER_ID = 'user_default';

export async function exerciseRoutes(app: FastifyInstance) {
  // GET /api/exercises/:id/history
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/api/exercises/:id/history',
    async (req) => {
      const limit = parseInt(req.query.limit ?? '10');
      const sets = await prisma.sessionSet.findMany({
        where: {
          exerciseId: req.params.id,
          session: { userId: USER_ID, finishedAt: { not: null } },
        },
        orderBy: { completedAt: 'desc' },
        take: limit * 10,
        include: { session: true },
      });

      // Group by session
      const bySession = new Map<string, typeof sets>();
      for (const set of sets) {
        const arr = bySession.get(set.sessionId) ?? [];
        arr.push(set);
        bySession.set(set.sessionId, arr);
      }

      return Array.from(bySession.entries())
        .slice(0, limit)
        .map(([sessionId, sessionSets]) => ({
          sessionId,
          date: sessionSets[0].session.startedAt,
          sets: sessionSets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps, rir: s.rir })),
        }));
    },
  );

  // GET /api/exercises/:id/last-performance
  app.get<{ Params: { id: string } }>(
    '/api/exercises/:id/last-performance',
    async (req, reply) => {
      const sets = await prisma.sessionSet.findMany({
        where: {
          exerciseId: req.params.id,
          session: { userId: USER_ID, finishedAt: { not: null } },
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
        include: { session: true },
      });

      if (sets.length === 0) return { sets: [], sessionDate: null };

      // Get the most recent session's sets
      const latestSessionId = sets[0].sessionId;
      const latestSets = sets.filter((s) => s.sessionId === latestSessionId);
      const sessionDate = latestSets[0].session.startedAt;

      return {
        sets: latestSets
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps, rir: s.rir })),
        sessionDate,
      };
    },
  );
}
