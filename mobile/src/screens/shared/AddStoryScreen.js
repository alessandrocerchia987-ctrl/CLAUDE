import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormField from '../../components/FormField';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { pickImage } from '../../utils/pickImage';
import { useStories } from '../../context/StoriesContext';
import { colors, radius, spacing } from '../../theme/colors';

export default function AddStoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { refresh } = useStories();
  const [photo, setPhoto] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  async function choosePhoto(source) {
    const file = await pickImage(source);
    if (file) setPhoto(file);
  }

  async function handlePost() {
    if (!photo) {
      Alert.alert('Foto necessária', 'É preciso tirar ou escolher uma foto real para publicar uma story.');
      return;
    }
    setPosting(true);
    try {
      // TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this call — free for now.
      const formData = new FormData();
      formData.append('photo', photo);
      if (caption.trim()) formData.append('caption', caption.trim());
      await api.postForm('/stories', formData);
      await refresh();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Não foi possível publicar', err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova story</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />
        ) : (
          <View style={styles.pickers}>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => choosePhoto('camera')}>
              <Ionicons name="camera" size={30} color={colors.white} />
              <Text style={styles.pickerText}>Câmara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => choosePhoto('library')}>
              <Ionicons name="images" size={30} color={colors.white} />
              <Text style={styles.pickerText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {photo ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <FormField
            value={caption}
            onChangeText={setCaption}
            placeholder="Adicionar legenda (opcional)"
            placeholderTextColor={colors.placeholder}
            style={{ marginBottom: spacing.sm }}
          />
          <View style={styles.footerActions}>
            <Button title="Trocar foto" variant="ghost" onPress={() => setPhoto(null)} style={{ flex: 1, marginRight: spacing.sm }} />
            <Button title="Publicar" variant="coral" onPress={handlePost} loading={posting} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  body: { flex: 1 },
  pickers: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  pickerBtn: {
    width: 110,
    height: 110,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pickerText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  preview: { flex: 1, width: '100%' },
  footer: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerActions: { flexDirection: 'row' },
});
