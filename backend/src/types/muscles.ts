export const MUSCLES = [
  'chest',
  'front_delt',
  'side_delt',
  'rear_delt',
  'triceps',
  'biceps',
  'forearm',
  'lats',
  'mid_back',
  'upper_back',
  'lower_back',
  'quads',
  'hamstrings',
  'glutes',
  'calves_gastro',
  'calves_soleus',
  'abs',
  'obliques',
] as const;

export type Muscle = typeof MUSCLES[number];
