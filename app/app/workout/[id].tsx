import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform, AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { Exercise, LastPerformance, Session, SessionSet } from '../../src/types';
import { useWorkoutStore } from '../../src/stores/workoutStore';

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

interface SetDraft {
  weight: string;
  reps: string;
  completed: boolean;
}

interface ExerciseState {
  sets: SetDraft[];
  lastPerf: LastPerformance | null;
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setActiveSession, addCompletedSet } = useWorkoutStore();

  const [session, setSession] = useState<Session | null>(null);
  const [exerciseState, setExerciseState] = useState<Record<string, ExerciseState>>({});
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<{ active: boolean; remaining: number; total: number }>({
    active: false, remaining: 0, total: 0,
  });

  const startTime = useRef<number>(Date.now());
  const restEndsAt = useRef<number>(0);
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const restInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [sessionData, lastPerfs] = await Promise.all([
        api.get<Session>(`/api/sessions/${id}`),
        Promise.resolve({}),
      ]);
      setSession(sessionData);
      setActiveSession(sessionData);
      // Usa horário local do cliente pra evitar drift de relógio servidor/celular.
      // startTime já foi inicializado no mount; só ajustamos pra trás se a sessão
      // já existia (ex: usuário voltou a um treino em andamento) usando o delta
      // do server contra ele mesmo (Date.now() do server ≈ now()).
      // Para sessão recém-criada, mantém o Date.now() local do mount.

      const initState: Record<string, ExerciseState> = {};
      for (const exercise of sessionData.workout.exercises) {
        const lastPerf = await api.get<LastPerformance>(`/api/exercises/${exercise.id}/last-performance`).catch(() => null);
        const sets: SetDraft[] = Array.from({ length: exercise.setsTarget }, (_, i) => ({
          weight: lastPerf?.sets[i]?.weight?.toString() ?? '',
          reps: lastPerf?.sets[i]?.reps?.toString() ?? '',
          completed: false,
        }));
        initState[exercise.id] = { sets, lastPerf };
      }
      setExerciseState(initState);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o treino.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    elapsedInterval.current = setInterval(() => {
      setElapsed(Date.now() - startTime.current);
    }, 1000);

    // Quando app volta do background, recalcula o timer imediatamente
    // (setInterval pausa em background no Android).
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setElapsed(Date.now() - startTime.current);
      if (restEndsAt.current > 0) {
        const remainingMs = restEndsAt.current - Date.now();
        if (remainingMs <= 0) {
          if (restInterval.current) clearInterval(restInterval.current);
          restInterval.current = null;
          setRestTimer((prev) => ({ active: false, remaining: 0, total: prev.total }));
        } else {
          setRestTimer((prev) => ({ ...prev, remaining: Math.ceil(remainingMs / 1000) }));
        }
      }
    });

    return () => {
      if (elapsedInterval.current) clearInterval(elapsedInterval.current);
      if (restInterval.current) clearInterval(restInterval.current);
      sub.remove();
    };
  }, [load]);

  const startRestTimer = (seconds: number) => {
    if (restInterval.current) clearInterval(restInterval.current);
    restEndsAt.current = Date.now() + seconds * 1000;
    setRestTimer({ active: true, remaining: seconds, total: seconds });
    restInterval.current = setInterval(() => {
      const remainingMs = restEndsAt.current - Date.now();
      if (remainingMs <= 0) {
        clearInterval(restInterval.current!);
        restInterval.current = null;
        setRestTimer((prev) => ({ active: false, remaining: 0, total: prev.total }));
        return;
      }
      setRestTimer((prev) => ({ ...prev, remaining: Math.ceil(remainingMs / 1000) }));
    }, 250);
  };

  const completeSet = async (exercise: Exercise, setIndex: number) => {
    const state = exerciseState[exercise.id];
    if (!state) return;
    const draft = state.sets[setIndex];
    const weight = parseFloat(draft.weight);
    const reps = parseInt(draft.reps);
    if (isNaN(weight) || isNaN(reps) || reps <= 0) {
      Alert.alert('Preencha peso e repetições antes de confirmar.');
      return;
    }

    try {
      const set = await api.post<SessionSet>(`/api/sessions/${id}/sets`, {
        exerciseId: exercise.id,
        setNumber: setIndex + 1,
        weight,
        reps,
      });
      addCompletedSet(set);
      setExerciseState((prev) => {
        const updated = { ...prev };
        const updatedSets = [...updated[exercise.id].sets];
        updatedSets[setIndex] = { ...updatedSets[setIndex], completed: true };
        updated[exercise.id] = { ...updated[exercise.id], sets: updatedSets };
        return updated;
      });
      startRestTimer(exercise.restSeconds);
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a série.');
    }
  };

  const uncompleteSet = (exercise: Exercise, setIndex: number) => {
    Alert.alert(
      'Desmarcar série?',
      'A série será removida e você poderá editar os valores.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desmarcar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.del(
                `/api/sessions/${id}/sets?exerciseId=${exercise.id}&setNumber=${setIndex + 1}`,
              );
              setExerciseState((prev) => {
                const updated = { ...prev };
                const updatedSets = [...updated[exercise.id].sets];
                updatedSets[setIndex] = { ...updatedSets[setIndex], completed: false };
                updated[exercise.id] = { ...updated[exercise.id], sets: updatedSets };
                return updated;
              });
            } catch {
              Alert.alert('Erro', 'Não foi possível desmarcar a série.');
            }
          },
        },
      ],
    );
  };

  const updateField = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setExerciseState((prev) => {
      const updated = { ...prev };
      const updatedSets = [...updated[exerciseId].sets];
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      updated[exerciseId] = { ...updated[exerciseId], sets: updatedSets };
      return updated;
    });
  };

  const finishWorkout = () => {
    Alert.alert('Finalizar treino?', 'Confirma que terminou o treino de hoje?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: async () => {
          setFinishing(true);
          try {
            await api.post(`/api/sessions/${id}/finish`, {});
            router.replace(`/report/${id}`);
          } catch {
            Alert.alert('Erro', 'Não foi possível finalizar o treino.');
            setFinishing(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!session) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Treino {session.workout.code}</Text>
        <Text style={styles.topTimer}>{formatElapsed(elapsed)}</Text>
      </View>

      {restTimer.active && (
        <View style={styles.restBanner}>
          <Text style={styles.restText}>
            Descanso: {restTimer.remaining}s / {restTimer.total}s
          </Text>
          <View style={styles.restBar}>
            <View style={[styles.restBarFill, { width: `${(restTimer.remaining / restTimer.total) * 100}%` }]} />
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {session.workout.exercises.map((exercise) => {
          const state = exerciseState[exercise.id];
          if (!state) return null;
          const lastPerf = state.lastPerf;

          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {exercise.youtubeUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(exercise.youtubeUrl!)}>
                    <Text style={styles.videoBtn}>▶ vídeo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.targetText}>
                {exercise.setsTarget}×{exercise.repsMin}–{exercise.repsMax} reps · {exercise.restSeconds}s descanso
              </Text>

              {lastPerf?.sets && lastPerf.sets.length > 0 && (
                <Text style={styles.lastPerf}>
                  Último: {lastPerf.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}
                </Text>
              )}

              <View style={styles.setsHeader}>
                <Text style={styles.setsHeaderText}>Série</Text>
                <Text style={styles.setsHeaderText}>Peso (kg)</Text>
                <Text style={styles.setsHeaderText}>Reps</Text>
                <Text style={styles.setsHeaderText}>✓</Text>
              </View>

              {state.sets.map((draft, i) => (
                <View key={i} style={[styles.setRow, draft.completed && styles.setRowDone]}>
                  <Text style={styles.setNum}>{i + 1}</Text>
                  <TextInput
                    style={[styles.setInput, draft.completed && styles.setInputDone]}
                    value={draft.weight}
                    onChangeText={(v) => updateField(exercise.id, i, 'weight', v)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor="#4b5563"
                    editable={!draft.completed}
                  />
                  <TextInput
                    style={[styles.setInput, draft.completed && styles.setInputDone]}
                    value={draft.reps}
                    onChangeText={(v) => updateField(exercise.id, i, 'reps', v)}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor="#4b5563"
                    editable={!draft.completed}
                  />
                  <TouchableOpacity
                    style={[styles.checkBtn, draft.completed && styles.checkBtnDone]}
                    onPress={() =>
                      draft.completed ? uncompleteSet(exercise, i) : completeSet(exercise, i)
                    }
                  >
                    <Text style={styles.checkText}>{draft.completed ? '✓' : '○'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.finishBtn, finishing && styles.finishBtnDisabled]}
          onPress={finishWorkout}
          disabled={finishing}
        >
          {finishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.finishBtnText}>FINALIZAR TREINO</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  backBtn: { padding: 4 },
  backText: { color: '#60a5fa', fontSize: 22 },
  topTitle: { color: '#f9fafb', fontSize: 17, fontWeight: '700' },
  topTimer: { color: '#9ca3af', fontSize: 15, fontFamily: 'monospace' },
  restBanner: {
    backgroundColor: '#1e3a5f', padding: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#2563eb',
  },
  restText: { color: '#93c5fd', fontSize: 13, marginBottom: 6 },
  restBar: { height: 4, backgroundColor: '#374151', borderRadius: 2, overflow: 'hidden' },
  restBarFill: { height: '100%', backgroundColor: '#2563eb' },
  scroll: { flex: 1 },
  exerciseCard: { margin: 16, marginBottom: 8, backgroundColor: '#1f2937', borderRadius: 14, padding: 16 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  exerciseName: { color: '#f9fafb', fontSize: 16, fontWeight: '700', flex: 1 },
  videoBtn: { color: '#60a5fa', fontSize: 13, marginLeft: 8 },
  targetText: { color: '#6b7280', fontSize: 12, marginBottom: 4 },
  lastPerf: { color: '#9ca3af', fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  setsHeader: { flexDirection: 'row', marginBottom: 6 },
  setsHeaderText: { flex: 1, color: '#4b5563', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  setRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
    backgroundColor: '#111827', borderRadius: 8, padding: 6,
  },
  setRowDone: { backgroundColor: '#14532d' },
  setNum: { flex: 1, color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  setInput: {
    flex: 1, color: '#f9fafb', fontSize: 15, textAlign: 'center',
    borderWidth: 1, borderColor: '#374151', borderRadius: 6, padding: 6, marginHorizontal: 2,
  },
  setInputDone: { borderColor: '#16a34a', color: '#86efac' },
  checkBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, paddingVertical: 6, backgroundColor: '#374151',
  },
  checkBtnDone: { backgroundColor: '#16a34a' },
  checkText: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  finishBtn: {
    margin: 16, backgroundColor: '#dc2626', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  finishBtnDisabled: { opacity: 0.5 },
  finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
