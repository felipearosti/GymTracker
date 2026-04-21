import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma/client';

const USER_ID = 'user_default';

export async function workoutRoutes(app: FastifyInstance) {
  app.get('/api/workouts', async () => {
    return prisma.workout.findMany({
      orderBy: { order: 'asc' },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { muscleLoads: true },
        },
      },
    });
  });

  app.get('/api/workouts/today', async () => {
    const now = new Date();
    // JS getDay(): 0=Sun, 1=Mon ... 6=Sat; schema: 1=Mon...5=Fri
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? null : jsDay === 6 ? null : jsDay;

    if (dayOfWeek === null) {
      const nextWorkout = await prisma.workout.findFirst({ orderBy: { order: 'asc' } });
      return { today: null, rest: true, nextWorkout };
    }

    const workout = await prisma.workout.findFirst({
      where: { dayOfWeek },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { muscleLoads: true },
        },
      },
    });

    return { today: workout, rest: false };
  });

  app.get('/api/workouts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { muscleLoads: true },
        },
      },
    });
    if (!workout) return reply.code(404).send({ error: 'Workout not found' });
    return workout;
  });
}
