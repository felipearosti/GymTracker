import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma/client';
import { askCoach, PRESET_PROMPTS } from '../lib/coach';

const USER_ID = 'user_default';
const DAILY_LIMIT = 10;

async function countTodayUserMessages() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.chatMessage.count({
    where: { userId: USER_ID, role: 'user', createdAt: { gte: start } },
  });
}

export async function coachRoutes(app: FastifyInstance) {
  // GET /api/coach/history — últimas mensagens
  app.get('/api/coach/history', async () => {
    const msgs = await prisma.chatMessage.findMany({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  });

  // GET /api/coach/limits — quantas mensagens restam hoje
  app.get('/api/coach/limits', async () => {
    const used = await countTodayUserMessages();
    return { used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) };
  });

  // GET /api/coach/presets — botões de ação pro app
  app.get('/api/coach/presets', async () => {
    return Object.entries(PRESET_PROMPTS).map(([id, prompt]) => ({ id, prompt }));
  });

  // POST /api/coach/message — envia mensagem, recebe resposta
  app.post<{ Body: { message?: string; presetId?: string } }>(
    '/api/coach/message',
    async (req, reply) => {
      const { message, presetId } = req.body ?? {};
      const text = presetId ? PRESET_PROMPTS[presetId] : message;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return reply.status(400).send({ error: 'message or presetId required' });
      }

      // Checa limite diário
      const used = await countTodayUserMessages();
      if (used >= DAILY_LIMIT) {
        return reply.status(429).send({
          error: `Limite diário de ${DAILY_LIMIT} mensagens atingido. Volta amanhã.`,
          used,
          limit: DAILY_LIMIT,
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return reply
          .status(500)
          .send({ error: 'GEMINI_API_KEY não configurada no backend/.env' });
      }

      // Salva mensagem do usuário
      const userMsg = await prisma.chatMessage.create({
        data: { userId: USER_ID, role: 'user', content: text },
      });

      // Histórico pra dar continuidade (últimas mensagens; o coach já limita)
      const history = await prisma.chatMessage.findMany({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const orderedHistory = history.reverse().slice(0, -1).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      try {
        const { text: reply_text, usage } = await askCoach(text, orderedHistory);

        const assistantMsg = await prisma.chatMessage.create({
          data: { userId: USER_ID, role: 'assistant', content: reply_text },
        });

        app.log.info(
          { usage },
          `Coach usage: in=${usage.inputTokens} out=${usage.outputTokens} cache_read=${usage.cacheReadTokens} cache_write=${usage.cacheCreationTokens}`,
        );

        return {
          user: { id: userMsg.id, role: 'user', content: userMsg.content, createdAt: userMsg.createdAt.toISOString() },
          assistant: {
            id: assistantMsg.id,
            role: 'assistant',
            content: assistantMsg.content,
            createdAt: assistantMsg.createdAt.toISOString(),
          },
          usage,
          remaining: DAILY_LIMIT - used - 1,
        };
      } catch (e: any) {
        app.log.error(e, 'Coach error');
        return reply.status(500).send({ error: e?.message ?? 'Erro no coach' });
      }
    },
  );

  // DELETE /api/coach/history — limpa tudo
  app.delete('/api/coach/history', async (_, reply) => {
    await prisma.chatMessage.deleteMany({ where: { userId: USER_ID } });
    return reply.status(204).send();
  });
}
