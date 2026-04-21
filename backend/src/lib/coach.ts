/**
 * Coach de musculação usando Google Gemini 2.5 Flash.
 *
 * Gemini 2.5 Flash é gratuito no tier free do Google AI Studio
 * (15 req/min, 1500 req/dia). Não precisa cartão.
 *
 * Estratégia de custo/performance:
 *  - System instruction para identidade + planos (estável, repetido)
 *  - User content traz dados dinâmicos (fadiga + sessões recentes)
 *  - Histórico limitado a últimas N trocas
 *  - Limite diário no route
 */
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../prisma/client';
import { computeFatigue, computeKByMuscle, FATIGUE_LOOKBACK_HOURS } from './fatigue';

const USER_ID = 'user_default';
const MODEL = 'gemini-2.5-flash';
const MAX_TOKENS = 800;
const HISTORY_MESSAGE_LIMIT = 10;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

const GOAL_LABEL: Record<string, string> = {
  cutting: 'cutting (perder gordura)',
  bulking: 'bulking (ganhar massa)',
  maintenance: 'manutenção',
};
const EXP_LABEL: Record<string, string> = {
  beginner: 'iniciante',
  intermediate: 'intermediário',
  advanced: 'avançado',
};

function ageFromBirth(d: Date | null | undefined): number | null {
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export async function buildProfile() {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) return null;
  const latestWeight = await prisma.bodyMetric.findFirst({
    where: { userId: USER_ID, weightKg: { not: null } },
    orderBy: { recordedAt: 'desc' },
    select: { weightKg: true },
  });
  const parts: string[] = [];
  parts.push(`Nome: ${user.name}`);
  const age = ageFromBirth(user.birthDate);
  if (age != null) parts.push(`Idade: ${age} anos`);
  if (user.sex) parts.push(`Sexo: ${user.sex === 'M' ? 'masculino' : 'feminino'}`);
  if (user.heightCm) parts.push(`Altura: ${user.heightCm}cm`);
  if (latestWeight?.weightKg) parts.push(`Peso atual: ${latestWeight.weightKg}kg`);
  if (user.goal) parts.push(`Objetivo: ${GOAL_LABEL[user.goal] ?? user.goal}`);
  if (user.experienceLevel) parts.push(`Experiência: ${EXP_LABEL[user.experienceLevel] ?? user.experienceLevel}`);
  return parts.length > 1 ? parts.join(' | ') : null;
}

export async function buildContext() {
  const profile = await buildProfile();
  const workouts = await prisma.workout.findMany({
    orderBy: { order: 'asc' },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { muscleLoads: true },
      },
    },
  });

  const recentSessions = await prisma.session.findMany({
    where: { userId: USER_ID, finishedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
    take: 8,
    include: {
      workout: true,
      sets: { include: { exercise: true } },
    },
  });

  const now = new Date();
  const lookbackMs = FATIGUE_LOOKBACK_HOURS * 3_600_000;
  const fatigueSessions = await prisma.session.findMany({
    where: { userId: USER_ID, startedAt: { gte: new Date(now.getTime() - lookbackMs) } },
    include: { sets: { include: { exercise: { include: { muscleLoads: true } } } } },
  });
  const historyForK = await prisma.session.findMany({
    where: { userId: USER_ID },
    select: {
      id: true,
      sets: {
        select: {
          weight: true,
          reps: true,
          completedAt: true,
          exercise: { select: { muscleLoads: { select: { muscle: true, loadFactor: true } } } },
        },
      },
    },
  });
  const fatigue = computeFatigue(fatigueSessions, now, computeKByMuscle(historyForK));

  const sessionSummaries = recentSessions.map((s) => {
    const volume = s.sets.reduce((acc, set) => acc + set.weight * set.reps, 0);
    type ExStat = {
      name: string;
      sets: number;
      topWeight: number;
      totalReps: number;
      rirs: number[];
    };
    const byExercise = new Map<string, ExStat>();
    for (const set of s.sets) {
      const cur = byExercise.get(set.exerciseId) ?? {
        name: set.exercise.name,
        sets: 0,
        topWeight: 0,
        totalReps: 0,
        rirs: [],
      };
      cur.sets += 1;
      cur.topWeight = Math.max(cur.topWeight, set.weight);
      cur.totalReps += set.reps;
      if (set.rir != null) cur.rirs.push(set.rir);
      byExercise.set(set.exerciseId, cur);
    }
    const exercisesSummary = Array.from(byExercise.values())
      .map((e) => {
        const avgRir =
          e.rirs.length > 0
            ? ` | RIR médio ${(e.rirs.reduce((a, b) => a + b, 0) / e.rirs.length).toFixed(1)}`
            : '';
        return `${e.name} ${e.sets}x (max ${e.topWeight}kg, ${e.totalReps} reps${avgRir})`;
      })
      .join('; ');
    return {
      date: s.startedAt.toISOString().slice(0, 10),
      workout: `${s.workout.code} - ${s.workout.name}`,
      volumeKg: Math.round(volume),
      exercises: exercisesSummary,
    };
  });

  // Detecta progressões e estagnações comparando as 2 últimas sessões do mesmo treino
  const trendsByWorkout = new Map<
    string,
    { progressions: string[]; stagnations: string[]; regressions: string[] }
  >();
  const sessionsByWorkout = new Map<string, typeof recentSessions>();
  for (const s of recentSessions) {
    const arr = sessionsByWorkout.get(s.workoutId) ?? [];
    arr.push(s);
    sessionsByWorkout.set(s.workoutId, arr);
  }
  for (const [workoutId, sList] of sessionsByWorkout) {
    if (sList.length < 2) continue;
    const [curr, prev] = sList; // já estão em ordem desc (mais recente primeiro)
    const aggSets = (sess: typeof curr) => {
      const m = new Map<string, { name: string; maxW: number; totalReps: number }>();
      for (const set of sess.sets) {
        const cur = m.get(set.exerciseId) ?? { name: set.exercise.name, maxW: 0, totalReps: 0 };
        cur.maxW = Math.max(cur.maxW, set.weight);
        cur.totalReps += set.reps;
        m.set(set.exerciseId, cur);
      }
      return m;
    };
    const currAgg = aggSets(curr);
    const prevAgg = aggSets(prev);
    const progressions: string[] = [];
    const stagnations: string[] = [];
    const regressions: string[] = [];
    for (const [exId, c] of currAgg) {
      const p = prevAgg.get(exId);
      if (!p) continue;
      if (c.maxW > p.maxW) {
        progressions.push(`${c.name}: +${c.maxW - p.maxW}kg no peso máx`);
      } else if (c.totalReps > p.totalReps) {
        progressions.push(`${c.name}: +${c.totalReps - p.totalReps} reps totais`);
      } else if (c.maxW < p.maxW) {
        regressions.push(`${c.name}: -${p.maxW - c.maxW}kg`);
      } else if (c.maxW === p.maxW && c.totalReps === p.totalReps) {
        stagnations.push(c.name);
      }
    }
    const workoutCode = curr.workout.code;
    trendsByWorkout.set(workoutCode, { progressions, stagnations, regressions });
  }

  const fatigueSummary = Object.entries(fatigue)
    .sort((a, b) => b[1] - a[1])
    .map(([m, v]) => `${m}: ${(v * 100).toFixed(0)}%`)
    .join(', ');

  return { profile, workouts, sessionSummaries, fatigueSummary, trendsByWorkout };
}

export async function askCoach(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
) {
  const ctx = await buildContext();

  const stablePlans = ctx.workouts
    .map((w) => {
      const exList = w.exercises
        .map(
          (e) =>
            `  - ${e.name} (${e.setsTarget}x${e.repsMin}-${e.repsMax}, descanso ${e.restSeconds}s)`,
        )
        .join('\n');
      return `Treino ${w.code} — ${w.name}:\n${exList}`;
    })
    .join('\n\n');

  const systemInstruction =
    'Você é um coach de musculação experiente, direto e baseado em ciência (hipertrofia, progressão, recuperação, RIR/RPE, volume landmarks, Schoenfeld/Helms/Nippard). ' +
    'Responde em português do Brasil, tom informal mas técnico. ' +
    'Respostas curtas (máx 4 parágrafos) a menos que o usuário peça mais detalhe. ' +
    '\n\nREGRAS DE CALIBRAÇÃO (importante):\n' +
    '- Para sugestões numéricas (peso, reps), prefira RANGES (ex: "15-18kg, 8-10 reps") em vez de valor único.\n' +
    '- Se o histórico do usuário não tem dado suficiente, DIGA isso explicitamente e peça pra ele registrar mais sessões.\n' +
    '- Nunca invente exercícios, pesos anteriores ou datas que não estejam no contexto abaixo.\n' +
    '- Se ele perguntar sobre um exercício que não está no plano dele, avise e sugira adicionar.\n' +
    '- RIR baixo (0-1) = treino pesado/próximo à falha. RIR alto (3+) = sobra na tank.\n' +
    '- Use a fadiga atual pra recomendar ou desencorajar treinar determinado grupo hoje.\n\n' +
    (ctx.profile ? `PERFIL DO USUÁRIO:\n${ctx.profile}\n\n` : '') +
    `PLANO DE TREINOS DO USUÁRIO:\n\n${stablePlans}`;

  const trendsBlock =
    ctx.trendsByWorkout.size > 0
      ? '\n\nTENDÊNCIAS (comparando 2 últimas sessões de cada treino):\n' +
        Array.from(ctx.trendsByWorkout.entries())
          .map(([code, t]) => {
            const lines: string[] = [`Treino ${code}:`];
            if (t.progressions.length) lines.push(`  ✅ Progrediu: ${t.progressions.join('; ')}`);
            if (t.stagnations.length) lines.push(`  ⚠️ Estagnou: ${t.stagnations.join(', ')}`);
            if (t.regressions.length) lines.push(`  🔻 Regrediu: ${t.regressions.join('; ')}`);
            return lines.join('\n');
          })
          .join('\n')
      : '';

  const dynamicContext =
    `FADIGA ATUAL POR MÚSCULO (0-100%):\n${ctx.fatigueSummary || '(sem dados recentes)'}\n\n` +
    `ÚLTIMAS ${ctx.sessionSummaries.length} SESSÕES CONCLUÍDAS (mais recente primeiro):\n` +
    ctx.sessionSummaries
      .map(
        (s) =>
          `- ${s.date} | ${s.workout} | volume ${s.volumeKg}kg\n  ${s.exercises || '(sem exercícios registrados)'}`,
      )
      .join('\n') +
    trendsBlock +
    '\n\nPERGUNTA DO USUÁRIO:\n' +
    userMessage;

  // Gemini usa role "user" e "model" (não "assistant").
  const contents = [
    ...history.slice(-HISTORY_MESSAGE_LIMIT).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: dynamicContext }] },
  ];

  const resp = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: MAX_TOKENS,
      temperature: 0.7,
    },
  });

  const text = resp.text ?? '';
  const usage = resp.usageMetadata;

  return {
    text,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      cacheReadTokens: usage?.cachedContentTokenCount ?? 0,
      cacheCreationTokens: 0,
    },
  };
}

export const PRESET_PROMPTS: Record<string, string> = {
  analyze_last:
    'Analise minha última sessão de treino. O que foi bom, o que foi ruim, e o que devo ajustar na próxima?',
  suggest_weights:
    'Pelo meu histórico recente, sugira os pesos pra fazer no meu próximo treino planejado. Seja específico (exercício + peso + reps).',
  stagnation:
    'Estou sentindo que estaguei. Olha meu histórico e me diz se realmente tá estagnado, em quais exercícios, e o que fazer.',
  weekly_review:
    'Faz um balanço da minha semana: volume, grupos musculares mais e menos trabalhados, e se tem desbalanço.',
};
