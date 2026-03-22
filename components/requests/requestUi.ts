import type { RefObject } from 'react';
import { Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { getAppLanguage, strings } from '@/locales';

export function showHideError() {
  Alert.alert(strings.inboxDeleteErrorTitle, strings.inboxDeleteErrorMessage);
}

export function confirmHideRequest({
  swipeableRef,
  requestId,
  onHide,
  title,
  message,
}: {
  swipeableRef: RefObject<Swipeable | null>;
  requestId: string;
  onHide: (id: string) => Promise<void>;
  title: string;
  message: string;
}) {
  swipeableRef.current?.close();
  Alert.alert(
    title,
    message,
    [
      {
        text: strings.inboxDeleteConfirmCancel,
        style: 'cancel',
      },
      {
        text: strings.inboxDeleteConfirmOk,
        style: 'destructive',
        onPress: () => {
          void onHide(requestId).catch(() => {
            showHideError();
          });
        },
      },
    ]
  );
}

export function formatBadgeCount(value: number) {
  if (value <= 0) return null;
  return value > 9 ? '9+' : String(value);
}

export function formatPreviewTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const language = getAppLanguage();
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const now = new Date();
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();
  const sameWeek = Math.abs(now.getTime() - parsed.getTime()) < 6 * 24 * 60 * 60 * 1000;

  if (sameDay) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  if (sameWeek) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
    }).format(parsed);
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
  }).format(parsed);
}
