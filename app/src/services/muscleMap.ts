/**
 * Mapeia os slugs internos (backend / seed) para os slugs aceitos
 * pela lib `react-native-body-highlighter`.
 *
 * A lib agrupa subdivisões (ex.: os 3 deltoides viram "deltoids",
 * lats+upper_back+mid_back viram "upper-back"), então quando vários
 * músculos nossos caem no mesmo slug da lib, usamos o MAX de fadiga.
 */

export type LibSlug =
  | 'trapezius'
  | 'triceps'
  | 'forearm'
  | 'adductors'
  | 'calves'
  | 'neck'
  | 'deltoids'
  | 'chest'
  | 'biceps'
  | 'abs'
  | 'quadriceps'
  | 'obliques'
  | 'tibialis'
  | 'knees'
  | 'upper-back'
  | 'lower-back'
  | 'hamstring'
  | 'gluteal'
  | 'abductors';

export const OUR_TO_LIB: Record<string, LibSlug> = {
  chest: 'chest',
  upper_chest: 'chest',
  lower_chest: 'chest',
  triceps: 'triceps',
  biceps: 'biceps',
  front_delt: 'deltoids',
  side_delt: 'deltoids',
  rear_delt: 'deltoids',
  shoulders: 'deltoids',
  lats: 'upper-back',
  mid_back: 'upper-back',
  upper_back: 'upper-back',
  back: 'upper-back',
  rhomboids: 'upper-back',
  traps: 'trapezius',
  lower_back: 'lower-back',
  forearm: 'forearm',
  forearms: 'forearm',
  quads: 'quadriceps',
  quadriceps: 'quadriceps',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  hamstring: 'hamstring',
  calves_gastro: 'calves',
  calves_soleus: 'calves',
  calves: 'calves',
  abs: 'abs',
  lower_abs: 'abs',
  core: 'abs',
  obliques: 'obliques',
  adductors: 'adductors',
  abductors: 'abductors',
};

/** Label em português para exibição. */
export const LIB_LABEL_PT: Record<LibSlug, string> = {
  trapezius: 'Trapézio',
  triceps: 'Tríceps',
  forearm: 'Antebraço',
  adductors: 'Adutores',
  calves: 'Panturrilhas',
  neck: 'Pescoço',
  deltoids: 'Ombros',
  chest: 'Peito',
  biceps: 'Bíceps',
  abs: 'Abdômen',
  quadriceps: 'Quadríceps',
  obliques: 'Oblíquos',
  tibialis: 'Tibial',
  knees: 'Joelhos',
  'upper-back': 'Costas',
  'lower-back': 'Lombar',
  hamstring: 'Posteriores',
  gluteal: 'Glúteos',
  abductors: 'Abdutores',
};

/**
 * Converte fadiga interna {slug: 0..1} → {libSlug: 0..1},
 * combinando múltiplos slugs no mesmo libSlug via MAX.
 */
export function mapFatigueToLib(fatigue: Record<string, number>): Record<LibSlug, number> {
  const out = {} as Record<LibSlug, number>;
  for (const [slug, val] of Object.entries(fatigue)) {
    const lib = OUR_TO_LIB[slug];
    if (!lib) continue;
    if ((out[lib] ?? 0) < val) out[lib] = val;
  }
  return out;
}

/**
 * Interpola cor verde → amarelo → vermelho conforme fadiga 0..1.
 * Retorna hex string.
 */
export function fatigueColor(v: number): string {
  const clamped = Math.max(0, Math.min(1, v));
  // verde #22c55e  (34,197,94)
  // amarelo #eab308 (234,179,8)
  // vermelho #ef4444 (239,68,68)
  let r: number, g: number, b: number;
  if (clamped < 0.5) {
    const t = clamped / 0.5;
    r = Math.round(34 + (234 - 34) * t);
    g = Math.round(197 + (179 - 197) * t);
    b = Math.round(94 + (8 - 94) * t);
  } else {
    const t = (clamped - 0.5) / 0.5;
    r = Math.round(234 + (239 - 234) * t);
    g = Math.round(179 + (68 - 179) * t);
    b = Math.round(8 + (68 - 8) * t);
  }
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
