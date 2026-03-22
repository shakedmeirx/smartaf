import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY = 'positive_events_count';
const THRESHOLD = 3; // trigger after 3 positive events

export async function recordPositiveEvent(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const count = stored ? parseInt(stored, 10) : 0;
    const next = count + 1;
    await AsyncStorage.setItem(KEY, String(next));

    if (next >= THRESHOLD) {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
        // Reset so we don't prompt again too soon
        await AsyncStorage.setItem(KEY, '0');
      }
    }
  } catch {
    // Non-critical — silently ignore
  }
}
