import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '../../src/services/api';
import { Workout } from '../../src/types';

export default function WorkoutPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Workout>(`/api/workouts/${id}`);
      setWorkout(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o treino.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startWorkout = async () => {
    if (!workout) return;
    setStarting(true);
    try {
      const session = await api.post<{ id: string }>('/api/sessions', { workoutId: workout.id });
      router.replace(`/workout/${session.id}`);
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar o treino.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!workout) return null;

  const estMin = Math.round(
    workout.exercises.reduce((a, e) => a + e.setsTarget * (e.restSeconds + 45), 0) / 60
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Treino ${workout.code}` }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.badge}>TREINO {workout.code}</Text>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.meta}>{workout.exercises.length} exercícios · ~{estMin} min</Text>
        </View>

        <Text style={styles.sectionTitle}>Exercícios</Text>
        {workout.exercises.map((ex, i) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseIndex}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {ex.setsTarget}× {ex.repsMin}–{ex.repsMax} reps · descanso {ex.restSeconds}s
                </Text>
              </View>
              {ex.youtubeUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(ex.youtubeUrl!)}>
                  <Text style={styles.videoLink}>▶ vídeo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startBtn, starting && styles.startBtnDisabled]}
          onPress={startWorkout}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>INICIAR TREINO</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 120 },
  header: { marginBottom: 20 },
  badge: {
    color: '#60a5fa', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6,
  },
  title: { color: '#f9fafb', fontSize: 26, fontWeight: '700' },
  meta: { color: '#9ca3af', fontSize: 14, marginTop: 4 },
  sectionTitle: {
    color: '#9ca3af', fontSize: 13, fontWeight: '700',
    textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: '#1f2937', borderRadius: 12, padding: 14, marginBottom: 10,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseIndex: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#374151',
    color: '#f9fafb', fontWeight: '700', textAlign: 'center', lineHeight: 28,
    marginRight: 12, fontSize: 13,
  },
  exerciseName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  exerciseMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  videoLink: { color: '#60a5fa', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  exerciseNotes: { color: '#6b7280', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16, backgroundColor: '#0b1220', borderTopWidth: 1, borderTopColor: '#1f2937',
  },
  startBtn: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
