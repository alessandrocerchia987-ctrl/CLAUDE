import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import CandidateCard from '../../components/CandidateCard';
import FormField from '../../components/FormField';
import ChipSelect from '../../components/ChipSelect';
import TagListInput from '../../components/TagListInput';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';
import { AVAILABILITY_OPTIONS, EDUCATION_LEVELS, GENDER_OPTIONS } from '../../constants';

const initialFilters = {
  profession: '',
  location: '',
  gender: '',
  minAge: '',
  maxAge: '',
  minYearsExperience: '',
  educationLevel: '',
  availability: '',
  maxExpectedSalary: '',
  languages: [],
  verifiedOnly: false,
};

export default function CandidateSearchScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function runSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (filters.profession.trim()) params.set('profession', filters.profession.trim());
      if (filters.location.trim()) params.set('location', filters.location.trim());
      if (filters.gender) params.set('gender', filters.gender);
      if (filters.minAge) params.set('minAge', filters.minAge);
      if (filters.maxAge) params.set('maxAge', filters.maxAge);
      if (filters.minYearsExperience) params.set('minYearsExperience', filters.minYearsExperience);
      if (filters.educationLevel) params.set('educationLevel', filters.educationLevel);
      if (filters.availability) params.set('availability', filters.availability);
      if (filters.maxExpectedSalary) params.set('maxExpectedSalary', filters.maxExpectedSalary);
      if (filters.languages.length) params.set('language', filters.languages[0]);
      if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
      const { candidates: fetched } = await api.get(`/users?${params.toString()}`);
      setCandidates(fetched);
    } catch (err) {
      console.warn('Falha na pesquisa:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Procurar candidatos" />

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Nome, profissão..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters((s) => !s)}>
          <Ionicons name="options-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {showFilters ? (
        <FlatList
          style={styles.filterPanel}
          contentContainerStyle={{ padding: spacing.md }}
          data={[1]}
          keyExtractor={() => 'filters'}
          renderItem={() => (
            <View>
              <FormField label="Profissão" value={filters.profession} onChangeText={(v) => setFilter('profession', v)} placeholder="Ex: Pedreiro" />
              <FormField label="Localização" value={filters.location} onChangeText={(v) => setFilter('location', v)} placeholder="Ex: Nampula" />
              <ChipSelect label="Género" options={GENDER_OPTIONS} value={filters.gender} onChange={(v) => setFilter('gender', v || '')} />
              <View style={styles.row2}>
                <FormField
                  label="Idade mínima"
                  value={filters.minAge}
                  onChangeText={(v) => setFilter('minAge', v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <FormField
                  label="Idade máxima"
                  value={filters.maxAge}
                  onChangeText={(v) => setFilter('maxAge', v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  style={{ flex: 1 }}
                />
              </View>
              <FormField
                label="Anos mínimos de experiência"
                value={filters.minYearsExperience}
                onChangeText={(v) => setFilter('minYearsExperience', v.replace(/\D/g, ''))}
                keyboardType="number-pad"
              />
              <ChipSelect label="Escolaridade" options={EDUCATION_LEVELS} value={filters.educationLevel} onChange={(v) => setFilter('educationLevel', v || '')} />
              <ChipSelect label="Disponibilidade" options={AVAILABILITY_OPTIONS} value={filters.availability} onChange={(v) => setFilter('availability', v || '')} />
              <FormField
                label="Salário pretendido máximo (MZN)"
                value={filters.maxExpectedSalary}
                onChangeText={(v) => setFilter('maxExpectedSalary', v.replace(/\D/g, ''))}
                keyboardType="number-pad"
              />
              <TagListInput label="Línguas" values={filters.languages} onChange={(v) => setFilter('languages', v)} placeholder="Ex: Inglês" />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Apenas verificados</Text>
                <Switch value={filters.verifiedOnly} onValueChange={(v) => setFilter('verifiedOnly', v)} trackColor={{ true: colors.teal }} />
              </View>
              <View style={styles.filterActions}>
                <Button title="Limpar" variant="ghost" onPress={() => setFilters(initialFilters)} style={{ flex: 1, marginRight: spacing.sm }} />
                <Button title="Aplicar filtros" onPress={runSearch} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        />
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searched ? 'Nenhum candidato encontrado com estes critérios.' : 'Pesquise por candidatos ou use os filtros.'}
            </Text>
          }
          renderItem={({ item }) => (
            <CandidateCard candidate={item} onPress={() => navigation.navigate('CandidateDetail', { candidateId: item.id })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: colors.text },
  filterBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  filterPanel: { flex: 1 },
  row2: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  switchLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  filterActions: { flexDirection: 'row', marginBottom: spacing.xl },
  grid: { padding: spacing.xs },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
});
