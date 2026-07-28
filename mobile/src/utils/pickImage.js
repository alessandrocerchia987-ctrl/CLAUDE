import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Launches the camera or the gallery (real photos only — no illustrated
// placeholders are ever generated) and returns a file object ready to
// append to a FormData body, or null if the user cancelled/denied access.
export async function pickImage(source = 'library') {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert('Permissão necessária', 'Ative o acesso à câmara/fotos nas definições do telefone.');
    return null;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
        });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const filename = asset.fileName || asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  return { uri: asset.uri, name: filename, type };
}

export function promptImageSource(onPicked) {
  Alert.alert('Escolher foto', 'De onde quer escolher a foto?', [
    { text: 'Câmara', onPress: async () => onPicked(await pickImage('camera')) },
    { text: 'Galeria', onPress: async () => onPicked(await pickImage('library')) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
