import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications look while the app is foregrounded
// (we handle them via the in-app banner, so show nothing natively)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Requests push permission, obtains the Expo push token, and saves it to
 * the push_tokens table for the currently authenticated user.
 * Safe to call multiple times — uses upsert so it stays idempotent.
 */
export async function registerPushToken(): Promise<void> {
  // Physical device required — simulators can't receive push notifications
  if (!Device.isDevice) return;

  // Android: create the default notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BabysitConnect',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C6FE0',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Expo SDK 51+ requires a projectId. Read it from app.json extra.eas.projectId
  // (or eas.json via easConfig). Without this the call throws and no token is saved.
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  if (!projectId) {
    console.warn(
      '[pushNotifications] No EAS projectId found — push token registration skipped.\n' +
      'Add "extra": { "eas": { "projectId": "YOUR_EAS_PROJECT_ID" } } to app.json\n' +
      'Get your project ID from https://expo.dev or by running: eas init'
    );
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
}

/**
 * Calls the send-push edge function to deliver a push notification
 * to another user (identified by their user_id).
 * Fire-and-forget: errors are logged but never thrown to the caller.
 */
export async function sendPushToUser(
  recipientUserId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: { recipientUserId, title, body, data },
    });
  } catch (err) {
    console.warn('sendPushToUser failed:', err);
  }
}
