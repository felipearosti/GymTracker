export interface MuscleLoad {
  id: string;
  muscle: string;
  loadFactor: number;
}

export interface Exercise {
  id: string;
  workoutId: string;
  name: string;
  order: number;
  setsTarget: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  youtubeUrl?: string;
  notes?: string;
  muscleLoads: MuscleLoad[];
}

export interface Workout {
  id: string;
  code: string;
  name: string;
  dayOfWeek: number;
  order: number;
  exercises: Exercise[];
}

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  completedAt: string;
  exercise: Exercise;
}

export interface Session {
  id: string;
  userId: string;
  workoutId: string;
  workout: Workout;
  startedAt: string;
  finishedAt?: string;
  notes?: string;
  sets: SessionSet[];
  totalVolume?: number;
  durationMs?: number;
}

export interface LastPerformance {
  sets: Array<{ setNumber: number; weight: number; reps: number; rir?: number }>;
  sessionDate: string | null;
}

export interface SessionReport {
  session: { id: string; workout: Workout; startedAt: string; finishedAt?: string };
  currentVolume: number;
  prevVolume: number | null;
  volumeDelta: number | null;
  volumeDeltaPercent: number | null;
  muscleVolume: Record<string, number>;
  progressions: Array<{ exercise: string; change: string }>;
  stagnations: Array<{ exercise: string; note: string }>;
  durationMs: number;
}
