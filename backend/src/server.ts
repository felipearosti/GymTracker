import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { workoutRoutes } from './routes/workouts';
import { sessionRoutes } from './routes/sessions';
import { exerciseRoutes } from './routes/exercises';
import { bodyRoutes } from './routes/body';
import { coachRoutes } from './routes/coach';
import { profileRoutes } from './routes/profile';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });

  await app.register(workoutRoutes);
  await app.register(sessionRoutes);
  await app.register(exerciseRoutes);
  await app.register(bodyRoutes);
  await app.register(coachRoutes);
  await app.register(profileRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  const port = parseInt(process.env.PORT ?? '3000');
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Backend running on port ${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
