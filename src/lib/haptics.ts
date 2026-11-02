import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function nativeOnly(run: () => Promise<void>) {
  if (Platform.OS === 'web') {
    return;
  }
  void run();
}

export function hapticSuccess() {
  nativeOnly(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticError() {
  nativeOnly(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export function hapticSelection() {
  nativeOnly(() => Haptics.selectionAsync());
}
