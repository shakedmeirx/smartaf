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
 * Normalized notification permission state for app-level UI flows.
 */
export type PushPermissionState = 'granted' | 'denied' | 'blocked';

async function ensureAndroidNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Smartaf',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C6FE0',
    });
  }
}

function normalizePermissionState(
  status: Notifications.NotificationPermissionsStatus
): PushPermissionState {
  if (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }

  return status.canAskAgain === false ? 'blocked' : 'denied';
}

/**
 * Requests notification permission and returns the resulting state.
 * Safe to call multiple times.
 */
export async function ensurePushPermission(): Promise<PushPermissionState> {
  await ensureAndroidNotificationChannel();

  const existingPermissions = await Notifications.getPermissionsAsync();
  const existingState = normalizePermissionState(existingPermissions);

  if (existingState === 'granted' || existingPermissions.canAskAgain === false) {
    return existingState;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return normalizePermissionState(requestedPermissions);
}

async function getExistingPushPermission(): Promise<PushPermissionState> {
  await ensureAndroidNotificationChannel();
  const existingPermissions = await Notifications.getPermissionsAsync();
  return normalizePermissionState(existingPermissions);
}

async function saveCurrentUserPushToken(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

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
  if (!user) {
    return;
  }

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
 * Requests push permission, obtains the Expo push token, and saves it to
 * the push_tokens table for the currently authenticated user.
 * Safe to call multiple times — uses upsert so it stays idempotent.
 */
export async function registerPushToken(): Promise<PushPermissionState> {
  const permissionState = await ensurePushPermission();

  if (permissionState !== 'granted') {
    return permissionState;
  }
  await saveCurrentUserPushToken();

  return 'granted';
}

export async function syncPushTokenIfPermitted(): Promise<PushPermissionState> {
  const permissionState = await getExistingPushPermission();

  if (permissionState !== 'granted') {
    return permissionState;
  }

  await saveCurrentUserPushToken();
  return 'granted';
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
