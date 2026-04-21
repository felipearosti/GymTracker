/**
 * Modelo de fadiga muscular — baseado em Fitness-Fatigue Paradigm (Banister)
 * e EWMA (Exponentially Weighted Moving Average).
 *
 * Referências:
 *  - Banister et al. — modelo impulso-resposta clássico.
 *  - Williams et al. (2017) — EWMA para workload monitoring.
 *  - Literatura de hipertrofia: fadiga aguda recupera majoritariamente em 24–72h.
 *
 * Fórmula:
 *   raw(músculo, agora) = Σ_sets (peso × reps × loadFactor) × exp(-Δt_h × ln2 / T½)
 *   fadiga(músculo)     = 1 - exp(-raw / K_músculo)   // satura em [0, 1]
 *
 * Meia-vida T½ = 24h  → 48h resta 25%, 72h ≈ 12%.
 * K_músculo = max volume histórico observado daquele músculo em uma única sessão
 *             (auto-calibração). Fallback K = 1500 antes de ter histórico suficiente.
 * Consequência: ao fim de um treino pesado o músculo trabalhado fica em ~0.9–1.0.
 */

export const FATIGUE_HALF_LIFE_HOURS = 24;
export const FATIGUE_K_FALLBACK = 1200;
export const FATIGUE_K_RATIO = 0.35; // K = 35% do max histórico; sessão típica fica vermelha
export const FATIGUE_LOOKBACK_HOURS = 120; // 5 dias; depois disso a contribuição é < 3%

type SetWithLoads = {
  weight: number;
  reps: number;
  completedAt: Date;
  exercise: {
    muscleLoads: { muscle: string; loadFactor: number }[];
  };
};

type SessionForFatigue = {
  id: string;
  sets: SetWithLoads[];
};

/**
 * Calcula a fadiga atual (0..1) por músculo dado um conjunto de sessões.
 * @param sessions sessões recentes (idealmente últimos ~5 dias)
 * @param now referência temporal
 * @param kByMuscle teto de saturação por músculo (max volume histórico)
 */
export function computeFatigue(
  sessions: SessionForFatigue[],
  now: Date,
  kByMuscle: Record<string, number>,
): Record<string, number> {
  const decay = Math.LN2 / FATIGUE_HALF_LIFE_HOURS;
  const raw: Record<string, number> = {};

  for (const session of sessions) {
    for (const set of session.sets) {
      const deltaHours = (now.getTime() - set.completedAt.getTime()) / 3_600_000;
      if (deltaHours < 0) continue;
      if (deltaHours > FATIGUE_LOOKBACK_HOURS) continue;

      const weight = set.weight * set.reps * Math.exp(-deltaHours * decay);

      for (const ml of set.exercise.muscleLoads) {
        raw[ml.muscle] = (raw[ml.muscle] ?? 0) + weight * ml.loadFactor;
      }
    }
  }

  const out: Record<string, number> = {};
  for (const muscle of Object.keys(raw)) {
    const k = kByMuscle[muscle] ?? FATIGUE_K_FALLBACK;
    out[muscle] = 1 - Math.exp(-raw[muscle] / k);
  }
  return out;
}

/**
 * Dado o histórico completo de sessões, retorna o maior volume-por-músculo
 * observado em uma única sessão — usado como K de saturação por músculo.
 */
export function computeKByMuscle(
  sessions: SessionForFatigue[],
): Record<string, number> {
  const maxBySession: Record<string, number> = {};
  for (const session of sessions) {
    const perMuscle: Record<string, number> = {};
    for (const set of session.sets) {
      const vol = set.weight * set.reps;
      for (const ml of set.exercise.muscleLoads) {
        perMuscle[ml.muscle] = (perMuscle[ml.muscle] ?? 0) + vol * ml.loadFactor;
      }
    }
    for (const [muscle, vol] of Object.entries(perMuscle)) {
      if (vol > (maxBySession[muscle] ?? 0)) maxBySession[muscle] = vol;
    }
  }
  // K = 35% do máximo histórico. Assim:
  //   sessão = max           → fadiga ≈ 0.94 (vermelho vivo)
  //   sessão = 70% do max    → fadiga ≈ 0.86 (vermelho)
  //   sessão = 50% do max    → fadiga ≈ 0.76 (vermelho)
  //   sessão = 30% do max    → fadiga ≈ 0.58 (amarelo)
  const k: Record<string, number> = {};
  for (const [muscle, maxVol] of Object.entries(maxBySession)) {
    k[muscle] = Math.max(maxVol * FATIGUE_K_RATIO, FATIGUE_K_FALLBACK);
  }
  return k;
}
