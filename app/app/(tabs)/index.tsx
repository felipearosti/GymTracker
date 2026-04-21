import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { Workout } from '../../src/types';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia!';
  if (h < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

function formatDate(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [todayData, setTodayData] = useState<{ today: Workout | null; rest: boolean; nextWorkout?: Workout } | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [todayRes, allRes] = await Promise.all([
        api.get<{ today: Workout | null; rest: boolean; nextWorkout?: Workout }>('/api/workouts/today'),
        api.get<Workout[]>('/api/workouts'),
      ]);
      setTodayData(todayRes);
      setAllWorkouts(allRes);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openWorkout = (workoutId: string) => {
    router.push(`/workout-preview/${workoutId}`);
  };

  const now = new Date();
  const todayWorkout = todayData?.today;
  const upcomingWorkouts = allWorkouts.filter((w) => todayWorkout ? w.id !== todayWorkout.id : true);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting()} 💪</Text>
        <Text style={styles.date}>{formatDate(now)}</Text>
      </View>

      {todayData?.rest ? (
        <View style={styles.restCard}>
          <Text style={styles.restTitle}>Dia de descanso 😴</Text>
          <Text style={styles.restSub}>Aproveite para recuperar!</Text>
        </View>
      ) : todayWorkout ? (
        <View style={styles.todayCard}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>HOJE — TREINO {todayWorkout.code}</Text>
          </View>
          <Text style={styles.todayName}>{todayWorkout.name}</Text>
          <Text style={styles.todayMeta}>
            {todayWorkout.exercises.length} exercícios · ~{Math.round(todayWorkout.exercises.reduce((a, e) => a + e.setsTarget * (e.restSeconds + 45), 0) / 60)} min
          </Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => openWorkout(todayWorkout.id)}
          >
            <Text style={styles.startBtnText}>VER TREINO</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {upcomingWorkouts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Próximos</Text>
          {upcomingWorkouts.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={styles.upcomingCard}
              onPress={() => openWorkout(w.id)}
              activeOpacity={0.7}
            >
              <View style={styles.upcomingLeft}>
                <Text style={styles.upcomingCode}>{w.code}</Text>
              </View>
              <View style={styles.upcomingRight}>
                <Text style={styles.upcomingName}>{w.name}</Text>
                <Text style={styles.upcomingMeta}>{w.exercises.length} exercícios</Text>
              </View>
              <Text style={styles.upcomingBtnText}>›</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#f9fafb' },
  date: { fontSize: 15, color: '#9ca3af', marginTop: 2 },
  restCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  restTitle: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  restSub: { fontSize: 14, color: '#9ca3af', marginTop: 6 },
  todayCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  todayBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  todayBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  todayName: { fontSize: 22, fontWeight: '700', color: '#f9fafb', marginBottom: 6 },
  todayMeta: { fontSize: 14, color: '#93c5fd', marginBottom: 20 },
  startBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#9ca3af', marginBottom: 12 },
  upcomingCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upcomingLeft: {
    width: 40,
    height: 40,
    backgroundColor: '#374151',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upcomingCode: { color: '#60a5fa', fontWeight: '700', fontSize: 16 },
  upcomingRight: { flex: 1 },
  upcomingName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  upcomingMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  upcomingBtn: { padding: 8 },
  upcomingBtnText: { color: '#60a5fa', fontSize: 18 },
});
