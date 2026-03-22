import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import AppChip from '@/components/ui/AppChip';

type StatusBadgeStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'upcoming'
  | 'draft'
  | 'active';

type Props = {
  label: string;
  status?: StatusBadgeStatus;
  style?: StyleProp<ViewStyle>;
};

const toneByStatus: Record<StatusBadgeStatus, 'warning' | 'success' | 'error' | 'accent' | 'muted' | 'primary'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'error',
  completed: 'success',
  upcoming: 'accent',
  draft: 'muted',
  active: 'primary',
};

export default function StatusBadge({ label, status = 'pending', style }: Props) {
  return (
    <AppChip
      label={label}
      tone={toneByStatus[status]}
      size="sm"
      style={style}
    />
  );
}
