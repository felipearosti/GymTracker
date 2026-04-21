import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/services/api';

type Sex = 'M' | 'F';
type Goal = 'cutting' | 'bulking' | 'maintenance';
type Exp = 'beginner' | 'intermediate' | 'advanced';

type User = {
  id: string;
  name: string;
  birthDate: string | null;
  heightCm: number | null;
  sex: Sex | null;
  goal: Goal | null;
  experienceLevel: Exp | null;
};

type WeightEntry = { id: string; weightKg: number; recordedAt: string };

type ProfileResp = {
  user: User | null;
  latestWeight: { weightKg: number; recordedAt: string } | null;
  weightHistory: WeightEntry[];
};

const GOAL_LABEL: Record<Goal, string> = {
  cutting: 'Cutting',
  bulking: 'Bulking',
  maintenance: 'Manutenção',
};
const EXP_LABEL: Record<Exp, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // form state
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [exp, setExp] = useState<Exp | null>(null);
  const [newWeight, setNewWeight] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get<ProfileResp>('/api/profile');
      if (data.user) {
        setUser(data.user);
        setName(data.user.name ?? '');
        setBirthDate(data.user.birthDate ?? '');
        setHeightCm(data.user.heightCm != null ? String(data.user.heightCm) : '');
        setSex(data.user.sex);
        setGoal(data.user.goal);
        setExp(data.user.experienceLevel);
      }
      setWeightHistory(data.weightHistory);
      setLatestWeight(data.latestWeight?.weightKg ?? null);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao carregar perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveProfile = async () => {
    if (saving) return;
    if (!name.trim()) {
      Alert.alert('Nome obrigatório');
      return;
    }
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      Alert.alert('Data inválida', 'Use o formato AAAA-MM-DD (ex: 1997-03-15)');
      return;
    }
    const h = heightCm ? parseFloat(heightCm.replace(',', '.')) : null;
    if (h !== null && (isNaN(h) || h <= 0)) {
      Alert.alert('Altura inválida');
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/profile', {
        name: name.trim(),
        birthDate: birthDate || null,
        heightCm: h,
        sex,
        goal,
        experienceLevel: exp,
      });
      Alert.alert('✓ Perfil salvo');
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const addWeight = async () => {
    const w = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(w) || w <= 0 || w > 500) {
      Alert.alert('Peso inválido');
      return;
    }
    try {
      await api.post('/api/profile/weight', { weightKg: w });
      setNewWeight('');
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao registrar peso');
    }
  };

  const deleteWeight = (id: string) => {
    Alert.alert('Remover registro?', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/api/profile/weight/${id}`);
            load();
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Falha ao remover');
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor="#60a5fa"
        />
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Perfil 👤</Text>
      <Text style={styles.sub}>Essas infos são usadas pelo Coach pra personalizar respostas.</Text>

      <Text style={styles.sectionTitle}>Dados básicos</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Data de nascimento (AAAA-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="1997-03-15"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Altura (cm)</Text>
      <TextInput
        style={styles.input}
        value={heightCm}
        onChangeText={setHeightCm}
        placeholder="175"
        placeholderTextColor="#6b7280"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Sexo</Text>
      <View style={styles.chipRow}>
        {(['M', 'F'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, sex === v && styles.chipActive]}
            onPress={() => setSex(sex === v ? null : v)}
          >
            <Text style={[styles.chipText, sex === v && styles.chipTextActive]}>
              {v === 'M' ? 'Masculino' : 'Feminino'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Objetivo</Text>
      <View style={styles.chipRow}>
        {(Object.keys(GOAL_LABEL) as Goal[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, goal === v && styles.chipActive]}
            onPress={() => setGoal(goal === v ? null : v)}
          >
            <Text style={[styles.chipText, goal === v && styles.chipTextActive]}>
              {GOAL_LABEL[v]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Experiência</Text>
      <View style={styles.chipRow}>
        {(Object.keys(EXP_LABEL) as Exp[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, exp === v && styles.chipActive]}
            onPress={() => setExp(exp === v ? null : v)}
          >
            <Text style={[styles.chipText, exp === v && styles.chipTextActive]}>
              {EXP_LABEL[v]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.disabled]}
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? 'Salvando...' : 'Salvar perfil'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Peso</Text>
      {latestWeight != null ? (
        <Text style={styles.currentWeight}>Atual: {latestWeight}kg</Text>
      ) : (
        <Text style={styles.muted}>Nenhum registro ainda.</Text>
      )}

      <View style={styles.weightRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="ex: 78.5"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addWeight}>
          <Text style={styles.addText}>+ Registrar</Text>
        </TouchableOpacity>
      </View>

      {weightHistory.length > 0 && (
        <View style={styles.historyList}>
          {weightHistory.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={styles.historyItem}
              onLongPress={() => deleteWeight(w.id)}
            >
              <Text style={styles.historyWeight}>{w.weightKg}kg</Text>
              <Text style={styles.historyDate}>
                {new Date(w.recordedAt).toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.hint}>Toque e segure pra remover um registro.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  title: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  sub: { color: '#9ca3af', fontSize: 13, marginTop: 4, marginBottom: 20 },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  label: { color: '#9ca3af', fontSize: 13, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  currentWeight: { color: '#60a5fa', fontSize: 28, fontWeight: '700', marginVertical: 4 },
  muted: { color: '#6b7280', fontSize: 13, fontStyle: 'italic' },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  addBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  historyList: { marginTop: 16, gap: 6 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
  },
  historyWeight: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  historyDate: { color: '#9ca3af', fontSize: 13 },
  hint: { color: '#6b7280', fontSize: 11, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
});
