import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma/client';

const USER_ID = 'user_default';

const SEX_VALUES = ['M', 'F'] as const;
const GOAL_VALUES = ['cutting', 'bulking', 'maintenance'] as const;
const EXP_VALUES = ['beginner', 'intermediate', 'advanced'] as const;

type Sex = (typeof SEX_VALUES)[number];
type Goal = (typeof GOAL_VALUES)[number];
type Exp = (typeof EXP_VALUES)[number];

function isOneOf<T extends readonly string[]>(arr: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (arr as readonly string[]).includes(v);
}

export async function profileRoutes(app: FastifyInstance) {
  // GET /api/profile — user + último peso + últimos pesos
  app.get('/api/profile', async () => {
    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    if (!user) return { user: null, latestWeight: null, weightHistory: [] };

    const weightHistory = await prisma.bodyMetric.findMany({
      where: { userId: USER_ID, weightKg: { not: null } },
      orderBy: { recordedAt: 'desc' },
      take: 20,
      select: { id: true, recordedAt: true, weightKg: true },
    });

    const latestWeight = weightHistory[0] ?? null;

    return {
      user: {
        id: user.id,
        name: user.name,
        birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
        heightCm: user.heightCm,
        sex: user.sex,
        goal: user.goal,
        experienceLevel: user.experienceLevel,
      },
      latestWeight: latestWeight
        ? { weightKg: latestWeight.weightKg, recordedAt: latestWeight.recordedAt.toISOString() }
        : null,
      weightHistory: weightHistory.map((w) => ({
        id: w.id,
        weightKg: w.weightKg,
        recordedAt: w.recordedAt.toISOString(),
      })),
    };
  });

  // PUT /api/profile — atualiza campos do perfil
  app.put<{
    Body: {
      name?: string;
      birthDate?: string | null;
      heightCm?: number | null;
      sex?: Sex | null;
      goal?: Goal | null;
      experienceLevel?: Exp | null;
    };
  }>('/api/profile', async (req, reply) => {
    const b = req.body ?? {};
    const data: Record<string, unknown> = {};

    if (b.name !== undefined) {
      if (typeof b.name !== 'string' || b.name.trim().length === 0) {
        return reply.status(400).send({ error: 'name inválido' });
      }
      data.name = b.name.trim();
    }
    if (b.birthDate !== undefined) {
      data.birthDate = b.birthDate ? new Date(b.birthDate) : null;
    }
    if (b.heightCm !== undefined) {
      if (b.heightCm !== null && (typeof b.heightCm !== 'number' || b.heightCm <= 0)) {
        return reply.status(400).send({ error: 'heightCm inválido' });
      }
      data.heightCm = b.heightCm;
    }
    if (b.sex !== undefined) {
      if (b.sex !== null && !isOneOf(SEX_VALUES, b.sex)) {
        return reply.status(400).send({ error: 'sex deve ser M ou F' });
      }
      data.sex = b.sex;
    }
    if (b.goal !== undefined) {
      if (b.goal !== null && !isOneOf(GOAL_VALUES, b.goal)) {
        return reply.status(400).send({ error: 'goal inválido' });
      }
      data.goal = b.goal;
    }
    if (b.experienceLevel !== undefined) {
      if (b.experienceLevel !== null && !isOneOf(EXP_VALUES, b.experienceLevel)) {
        return reply.status(400).send({ error: 'experienceLevel inválido' });
      }
      data.experienceLevel = b.experienceLevel;
    }

    const updated = await prisma.user.update({ where: { id: USER_ID }, data });
    return {
      id: updated.id,
      name: updated.name,
      birthDate: updated.birthDate ? updated.birthDate.toISOString().slice(0, 10) : null,
      heightCm: updated.heightCm,
      sex: updated.sex,
      goal: updated.goal,
      experienceLevel: updated.experienceLevel,
    };
  });

  // POST /api/profile/weight — registra peso atual
  app.post<{ Body: { weightKg?: number; recordedAt?: string } }>(
    '/api/profile/weight',
    async (req, reply) => {
      const { weightKg, recordedAt } = req.body ?? {};
      if (typeof weightKg !== 'number' || weightKg <= 0 || weightKg > 500) {
        return reply.status(400).send({ error: 'weightKg inválido' });
      }
      const created = await prisma.bodyMetric.create({
        data: {
          userId: USER_ID,
          weightKg,
          recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        },
      });
      return {
        id: created.id,
        weightKg: created.weightKg,
        recordedAt: created.recordedAt.toISOString(),
      };
    },
  );

  // DELETE /api/profile/weight/:id — remove registro de peso
  app.delete<{ Params: { id: string } }>('/api/profile/weight/:id', async (req, reply) => {
    const m = await prisma.bodyMetric.findUnique({ where: { id: req.params.id } });
    if (!m || m.userId !== USER_ID) {
      return reply.status(404).send({ error: 'registro não encontrado' });
    }
    await prisma.bodyMetric.delete({ where: { id: req.params.id } });
    return reply.status(204).send();
  });
}
