import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import StoriesBar from '../../components/StoriesBar';
import JobCard from '../../components/JobCard';
import CandidateCard from '../../components/CandidateCard';
import CreditsPill from '../../components/CreditsPill';
import { useAuth } from '../../context/AuthContext';
import { useStories } from '../../context/StoriesContext';
import { api } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';

export default function EmployerHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { stories, refresh: refreshStories } = useStories();
  const [tab, setTab] = useState('vagas');
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ jobs: myJobs }, { candidates: allCandidates }] = await Promise.all([
        api.get('/jobs/mine'),
        api.get('/users'),
      ]);
      setJobs(myJobs);
      setCandidates(allCandidates);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshStories();
    }, [load, refreshStories])
  );

  function onRefresh() {
    setRefreshing(true);
    load();
    refreshStories();
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Emprego Já" right={<CreditsPill credits={user.credits} />} />
      <StoriesBar
        stories={stories}
        currentUser={user}
        onAddStory={() => navigation.navigate('AddStory')}
        onOpenUserStories={(group) => navigation.navigate('StoryViewer', { group })}
      />

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'vagas' && styles.tabBtnActive]} onPress={() => setTab('vagas')}>
          <Text style={[styles.tabText, tab === 'vagas' && styles.tabTextActive]}>Vagas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'candidatos' && styles.tabBtnActive]} onPress={() => setTab('candidatos')}>
          <Text style={[styles.tabText, tab === 'candidatos' && styles.tabTextActive]}>Candidatos</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : tab === 'vagas' ? (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Ainda não publicou nenhuma vaga. Toque em "Publicar" para começar.</Text>
          }
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => navigation.navigate('EmployerJobDetail', { jobId: item.id })} />
          )}
        />
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Ainda não há candidatos registados.</Text>}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tabBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  tabBtnActive: { backgroundColor: colors.navy },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  grid: { padding: spacing.xs },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
});
