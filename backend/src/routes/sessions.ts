import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma/client';

const USER_ID = 'user_default';

export async function sessionRoutes(app: FastifyInstance) {
  // POST /api/sessions — start session
  app.post<{ Body: { workoutId: string } }>('/api/sessions', async (req, reply) => {
    const { workoutId } = req.body;
    if (!workoutId) return reply.status(400).send({ error: 'workoutId required' });

    const session = await prisma.session.create({
      data: { userId: USER_ID, workoutId },
      include: { workout: true },
    });
    return reply.status(201).send(session);
  });

  // GET /api/sessions/active — sessão em andamento (finishedAt = null)
  app.get('/api/sessions/active', async () => {
    const active = await prisma.session.findFirst({
      where: { userId: USER_ID, finishedAt: null },
      orderBy: { startedAt: 'desc' },
      include: { workout: true, sets: true },
    });
    if (!active) return { active: null };
    return {
      active: {
        id: active.id,
        workoutId: active.workoutId,
        workoutCode: active.workout.code,
        workoutName: active.workout.name,
        startedAt: active.startedAt.toISOString(),
        setsCount: active.sets.length,
      },
    };
  });

  // GET /api/sessions — list history
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/api/sessions', async (req) => {
    const limit = parseInt(req.query.limit ?? '20');
    const offset = parseInt(req.query.offset ?? '0');

    const sessions = await prisma.session.findMany({
      where: { userId: USER_ID },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        workout: true,
        sets: { include: { exercise: true } },
      },
    });

    return sessions.map((s) => {
      const totalVolume = s.sets.reduce((acc, set) => acc + set.weight * set.reps, 0);
      const durationMs = s.finishedAt
        ? s.finishedAt.getTime() - s.startedAt.getTime()
        : null;
      return { ...s, totalVolume, durationMs };
    });
  });

  // GET /api/sessions/:id
  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (req, reply) => {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        workout: {
          include: {
            exercises: { orderBy: { order: 'asc' }, include: { muscleLoads: true } },
          },
        },
        sets: { orderBy: { completedAt: 'asc' }, include: { exercise: true } },
      },
    });
    if (!session) return reply.status(404).send({ error: 'Session not found' });
    return session;
  });

  // DELETE /api/sessions/:id
  app.delete<{ Params: { id: string } }>('/api/sessions/:id', async (req, reply) => {
    try {
      await prisma.sessionSet.deleteMany({ where: { sessionId: req.params.id } });
      await prisma.session.delete({ where: { id: req.params.id } });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Session not found' });
    }
  });

  // POST /api/sessions/:id/finish
  app.post<{ Params: { id: string }; Body: { notes?: string } }>(
    '/api/sessions/:id/finish',
    async (req, reply) => {
      const session = await prisma.session.update({
        where: { id: req.params.id },
        data: { finishedAt: new Date(), notes: req.body?.notes },
      });
      return session;
    },
  );

  // POST /api/sessions/:id/sets
  app.post<{
    Params: { id: string };
    Body: { exerciseId: string; setNumber: number; weight: number; reps: number; rir?: number };
  }>('/api/sessions/:id/sets', async (req, reply) => {
    const { exerciseId, setNumber, weight, reps, rir } = req.body;
    if (!exerciseId || setNumber == null || weight == null || reps == null) {
      return reply.status(400).send({ error: 'exerciseId, setNumber, weight, reps required' });
    }

    const set = await prisma.sessionSet.create({
      data: { sessionId: req.params.id, exerciseId, setNumber, weight, reps, rir },
      include: { exercise: true },
    });
    return reply.status(201).send(set);
  });

  // DELETE /api/sessions/:id/sets — remove um set específico por exerciseId+setNumber
  app.delete<{
    Params: { id: string };
    Querystring: { exerciseId?: string; setNumber?: string };
  }>('/api/sessions/:id/sets', async (req, reply) => {
    const { exerciseId, setNumber } = req.query;
    if (!exerciseId || !setNumber) {
      return reply.status(400).send({ error: 'exerciseId e setNumber required' });
    }
    const deleted = await prisma.sessionSet.deleteMany({
      where: {
        sessionId: req.params.id,
        exerciseId,
        setNumber: parseInt(setNumber),
      },
    });
    if (deleted.count === 0) {
      return reply.status(404).send({ error: 'Set não encontrado' });
    }
    return reply.status(204).send();
  });

  // GET /api/sessions/:id/report
  app.get<{ Params: { id: string } }>('/api/sessions/:id/report', async (req, reply) => {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        workout: true,
        sets: {
          include: {
            exercise: { include: { muscleLoads: true } },
          },
        },
      },
    });
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    // Find previous session for same workout
    const prevSession = await prisma.session.findFirst({
      where: {
        userId: USER_ID,
        workoutId: session.workoutId,
        id: { not: session.id },
        finishedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      include: { sets: { include: { exercise: true } } },
    });

    const currentVolume = session.sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
    const prevVolume = prevSession
      ? prevSession.sets.reduce((acc, s) => acc + s.weight * s.reps, 0)
      : null;

    // Volume by muscle
    const muscleVolume: Record<string, number> = {};
    for (const set of session.sets) {
      for (const ml of set.exercise.muscleLoads) {
        muscleVolume[ml.muscle] = (muscleVolume[ml.muscle] ?? 0) + set.weight * set.reps * ml.loadFactor;
      }
    }

    // Progressions / stagnations per exercise
    const progressions: Array<{ exercise: string; change: string }> = [];
    const stagnations: Array<{ exercise: string; note: string }> = [];

    if (prevSession) {
      const grouped = new Map<string, typeof session.sets>();
      for (const set of session.sets) {
        const arr = grouped.get(set.exerciseId) ?? [];
        arr.push(set);
        grouped.set(set.exerciseId, arr);
      }
      const prevGrouped = new Map<string, typeof prevSession.sets>();
      for (const set of prevSession.sets) {
        const arr = prevGrouped.get(set.exerciseId) ?? [];
        arr.push(set);
        prevGrouped.set(set.exerciseId, arr);
      }

      for (const [exerciseId, sets] of grouped) {
        const prev = prevGrouped.get(exerciseId);
        if (!prev) continue;

        const curMaxWeight = Math.max(...sets.map((s) => s.weight));
        const prevMaxWeight = Math.max(...prev.map((s) => s.weight));
        const curTotalReps = sets.reduce((a, s) => a + s.reps, 0);
        const prevTotalReps = prev.reduce((a, s) => a + s.reps, 0);
        const name = sets[0].exercise.name;

        if (curMaxWeight > prevMaxWeight) {
          progressions.push({ exercise: name, change: `+${curMaxWeight - prevMaxWeight}kg` });
        } else if (curTotalReps > prevTotalReps) {
          progressions.push({ exercise: name, change: `+${curTotalReps - prevTotalReps} reps` });
        } else if (curMaxWeight === prevMaxWeight && curTotalReps === prevTotalReps) {
          stagnations.push({ exercise: name, note: 'mesmo peso/reps' });
        }
      }
    }

    const durationMs = session.finishedAt
      ? session.finishedAt.getTime() - session.startedAt.getTime()
      : Date.now() - session.startedAt.getTime();

    return {
      session: { id: session.id, workout: session.workout, startedAt: session.startedAt, finishedAt: session.finishedAt },
      currentVolume,
      prevVolume,
      volumeDelta: prevVolume != null ? currentVolume - prevVolume : null,
      volumeDeltaPercent: prevVolume != null && prevVolume > 0 ? ((currentVolume - prevVolume) / prevVolume) * 100 : null,
      muscleVolume,
      progressions,
      stagnations,
      durationMs,
    };
  });
}
