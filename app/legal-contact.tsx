import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useSegments } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import AppTextArea from '@/components/ui/AppTextArea';
import LegalScreenLayout from '@/components/legal/LegalScreenLayout';
import { BabyCityPalette, BabyCityShadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getAppLanguage } from '@/locales';
import {
  getContactContent,
  getLegalFallbackRoute,
  LEGAL_CONTACT_EMAIL,
  type LegalContactAction,
} from '@/lib/legalDocuments';
import { supabase } from '@/lib/supabase';

type LegalActionKey = LegalContactAction['key'];

type SearchParams = {
  origin?: string | string[];
  action?: string | string[];
  topic?: string | string[];
  targetUserId?: string | string[];
  targetProfileId?: string | string[];
  targetRole?: string | string[];
};

const FORM_COPY = {
  he: {
    formTitle: 'פרטי הפנייה',
    formHint: 'הפנייה נשמרת במערכת Smartaf כדי שנוכל לטפל בה ולעדכן אותך בלי להסתמך על אפליקציית המייל.',
    nameLabel: 'שם מלא',
    namePlaceholder: 'איך נקרא לך?',
    emailLabel: 'אימייל ליצירת קשר',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'טלפון',
    phonePlaceholder: '050-000-0000',
    messageLabel: 'פרטי הפנייה',
    messagePlaceholder: 'תאר/י את הבקשה או את האירוע בצורה ברורה ככל האפשר...',
    submit: 'שליחת פנייה',
    successTitle: 'הפנייה נשלחה',
    successBody: 'קיבלנו את הפנייה שלך ונחזור אליך בהקדם האפשרי.',
    errorTitle: 'אי אפשר לשלוח כרגע',
    submitFailure: 'לא הצלחנו לשמור את הפנייה כרגע. נסו שוב בעוד רגע או פנו אלינו במייל הישיר.',
    requiredFields: 'יש למלא שם, אימייל ותיאור קצר של הפנייה.',
    invalidEmail: 'נראה שכתובת האימייל לא תקינה.',
    requestIdPrefix: 'מספר פנייה',
    directEmailHint: 'אם את/ה מעדיפ/ה, אפשר גם לפנות ישירות במייל',
    supportTopicLabel: 'נושא',
    supportTopicPrefix: 'נושא משני',
    safetyTargetUser: 'מזהה המשתמש המדווח',
    safetyTargetProfile: 'מזהה הפרופיל המדווח',
    safetyTargetRole: 'סוג הפרופיל המדווח',
  },
  en: {
    formTitle: 'Request details',
    formHint: 'Your request is stored in Smartaf so we can review it and follow up without depending on your mail app.',
    nameLabel: 'Full name',
    namePlaceholder: 'What should we call you?',
    emailLabel: 'Contact email',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'Phone',
    phonePlaceholder: '+972-50-000-0000',
    messageLabel: 'Request details',
    messagePlaceholder: 'Describe the request or incident as clearly as possible...',
    submit: 'Send request',
    successTitle: 'Request sent',
    successBody: 'We received your request and will get back to you as soon as possible.',
    errorTitle: 'Unable to send right now',
    submitFailure: 'We could not save the request right now. Please try again shortly or use the direct email option.',
    requiredFields: 'Please provide your name, email, and a short description of the request.',
    invalidEmail: 'That email address looks invalid.',
    requestIdPrefix: 'Request ID',
    directEmailHint: 'If you prefer, you can still contact us directly by email',
    supportTopicLabel: 'Topic',
    supportTopicPrefix: 'Sub-topic',
    safetyTargetUser: 'Reported user ID',
    safetyTargetProfile: 'Reported profile ID',
    safetyTargetRole: 'Reported profile type',
  },
} as const;

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isLegalActionKey(value: string | undefined): value is LegalActionKey {
  return value === 'support' || value === 'privacy' || value === 'delete' || value === 'safety';
}

function buildSuggestedMessage({
  action,
  language,
  topic,
  targetUserId,
  targetProfileId,
  targetRole,
}: {
  action: LegalContactAction;
  language: 'he' | 'en';
  topic?: string;
  targetUserId?: string;
  targetProfileId?: string;
  targetRole?: string;
}) {
  const copy = FORM_COPY[language];
  const lines = [...action.templateLines];

  if (topic) {
    lines.push(`${copy.supportTopicPrefix}: ${topic}`);
    lines.push('');
  }

  if (action.key === 'safety') {
    if (targetRole) lines.push(`${copy.safetyTargetRole}: ${targetRole}`);
    if (targetUserId) lines.push(`${copy.safetyTargetUser}: ${targetUserId}`);
    if (targetProfileId) lines.push(`${copy.safetyTargetProfile}: ${targetProfileId}`);
    if (targetRole || targetUserId || targetProfileId) {
      lines.push('');
    }
  }

  return lines.join('\n');
}

export default function LegalContactScreen() {
  const { session, dbUser } = useAuth();
  const params = useLocalSearchParams<SearchParams>();
  const segments = useSegments();
  const language = getAppLanguage();
  const copy = FORM_COPY[language];
  const content = getContactContent(language);
  const fallbackRoute = getLegalFallbackRoute(params.origin, !!session);
  const currentRoute = segments[segments.length - 1] ?? 'legal-contact';
  const targetUserId = getParamValue(params.targetUserId);
  const targetProfileId = getParamValue(params.targetProfileId);
  const targetRole = getParamValue(params.targetRole);
  const topic = getParamValue(params.topic);

  const defaultAction = useMemo<LegalActionKey>(() => {
    const requestedAction = getParamValue(params.action);
    if (isLegalActionKey(requestedAction)) {
      return requestedAction;
    }

    if (currentRoute === 'account-deletion') {
      return 'delete';
    }

    return 'support';
  }, [currentRoute, params.action]);

  const [selectedAction, setSelectedAction] = useState<LegalActionKey>(defaultAction);
  const [name, setName] = useState(dbUser?.name?.trim() ?? '');
  const [email, setEmail] = useState(dbUser?.email?.trim() || session?.user.email?.trim() || '');
  const [phone, setPhone] = useState(dbUser?.phone?.trim() ?? '');
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const action = useMemo(
    () => content.actions.find((item) => item.key === selectedAction) ?? content.actions[0],
    [content.actions, selectedAction]
  );

  const suggestedMessage = useMemo(
    () =>
      buildSuggestedMessage({
        action,
        language,
        topic,
        targetUserId,
        targetProfileId,
        targetRole,
      }),
    [action, language, targetProfileId, targetRole, targetUserId, topic]
  );

  useEffect(() => {
    setSelectedAction(defaultAction);
  }, [defaultAction]);

  useEffect(() => {
    setName(prev => prev || dbUser?.name?.trim() || '');
  }, [dbUser?.name]);

  useEffect(() => {
    const nextEmail = dbUser?.email?.trim() || session?.user.email?.trim() || '';
    setEmail(prev => prev || nextEmail);
  }, [dbUser?.email, session?.user.email]);

  useEffect(() => {
    setPhone(prev => prev || dbUser?.phone?.trim() || '');
  }, [dbUser?.phone]);

  useEffect(() => {
    setMessage(suggestedMessage);
    setRequestId(null);
  }, [suggestedMessage]);

  async function handleOpenDirectEmail() {
    const url = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(action.subject)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(content.noMailTitle, content.noMailBody);
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(content.noMailTitle, content.noMailBody);
    }
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      Alert.alert(copy.errorTitle, copy.requiredFields);
      return;
    }

    if (!trimmedEmail.includes('@')) {
      Alert.alert(copy.errorTitle, copy.invalidEmail);
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: dbUser?.id ?? null,
          request_type: action.key,
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone || null,
          subject: action.subject,
          message: trimmedMessage,
          metadata: {
            origin: getParamValue(params.origin) ?? null,
            route: currentRoute,
            topic: topic ?? null,
            target_role: targetRole ?? null,
            target_user_id: targetUserId ?? null,
            target_profile_id: targetProfileId ?? null,
          },
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      setRequestId(data?.id ?? null);
      Alert.alert(copy.successTitle, copy.successBody);
    } catch {
      Alert.alert(copy.errorTitle, copy.submitFailure);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LegalScreenLayout
      title={content.title}
      subtitle={content.subtitle}
      badge={content.badge}
      fallbackRoute={fallbackRoute}
    >
      <AppCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.infoIcon}>
            <MaterialIcons name="support-agent" size={22} color={BabyCityPalette.primary} />
          </View>
          <View style={styles.infoText}>
            <AppText variant="h3" weight="700">
              {content.directEmail}
            </AppText>
            <AppText variant="body" tone="muted">
              {LEGAL_CONTACT_EMAIL}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => void handleOpenDirectEmail()}
          style={styles.directEmailButton}
        >
          <AppText variant="caption" weight="700" style={styles.directEmailButtonText}>
            {copy.directEmailHint}
          </AppText>
        </TouchableOpacity>
      </AppCard>

      <View style={styles.actionStack}>
        {content.actions.map((item) => {
          const isSelected = item.key === selectedAction;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.88}
              onPress={() => setSelectedAction(item.key)}
            >
              <AppCard style={[styles.actionCard, isSelected && styles.actionCardSelected]}>
                <MaterialIcons
                  name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={isSelected ? BabyCityPalette.primary : BabyCityPalette.outline}
                />

                <View style={styles.actionContent}>
                  <View style={styles.actionText}>
                    <AppText variant="h3" weight="700">
                      {item.title}
                    </AppText>
                    <AppText variant="body" tone="muted">
                      {item.body}
                    </AppText>
                    <AppText variant="caption" weight="700" style={styles.actionLabel}>
                      {content.openEmail}
                    </AppText>
                  </View>

                  <View style={[styles.actionIcon, isSelected && styles.actionIconSelected]}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={isSelected ? BabyCityPalette.onPrimary : BabyCityPalette.primary}
                    />
                  </View>
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppCard style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formHeaderIcon}>
            <Ionicons name={action.icon} size={22} color={BabyCityPalette.primary} />
          </View>
          <View style={styles.formHeaderText}>
            <AppText variant="h3" weight="700">
              {copy.formTitle}
            </AppText>
            <AppText variant="body" tone="muted">
              {copy.formHint}
            </AppText>
          </View>
        </View>

        {requestId ? (
          <View style={styles.requestIdBadge}>
            <AppText variant="caption" weight="700" style={styles.requestIdText}>
              {`${copy.requestIdPrefix}: ${requestId}`}
            </AppText>
          </View>
        ) : null}

        <AppInput
          label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          value={name}
          onChangeText={setName}
          recessed
        />

        <AppInput
          label={copy.emailLabel}
          placeholder={copy.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textAlign="left"
          recessed
        />

        <AppInput
          label={copy.phoneLabel}
          placeholder={copy.phonePlaceholder}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textAlign="left"
          recessed
        />

        <AppTextArea
          label={copy.messageLabel}
          placeholder={copy.messagePlaceholder}
          value={message}
          onChangeText={setMessage}
        />

        <AppPrimaryButton
          label={copy.submit}
          loading={submitting}
          onPress={() => void handleSubmit()}
        />
      </AppCard>

      <AppCard style={styles.helperCard}>
        <AppText variant="h3" weight="700" style={styles.helperTitle}>
          {content.helperTitle}
        </AppText>
        <AppText variant="body" tone="muted">
          {content.helperBody}
        </AppText>
      </AppCard>
    </LegalScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    padding: 20,
    borderRadius: 28,
    gap: 14,
  },
  infoHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  infoText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  directEmailButton: {
    alignSelf: 'flex-end',
  },
  directEmailButtonText: {
    color: BabyCityPalette.primary,
  },
  actionStack: {
    gap: 12,
  },
  actionCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...BabyCityShadows.soft,
  },
  actionCardSelected: {
    borderWidth: 1.5,
    borderColor: `${BabyCityPalette.primary}35`,
    backgroundColor: '#fdfaff',
  },
  actionContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  actionText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  actionLabel: {
    color: BabyCityPalette.primary,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}10`,
  },
  actionIconSelected: {
    backgroundColor: BabyCityPalette.primary,
  },
  formCard: {
    padding: 20,
    borderRadius: 28,
    gap: 16,
  },
  formHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  formHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  formHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  requestIdBadge: {
    alignSelf: 'flex-end',
    backgroundColor: `${BabyCityPalette.primary}12`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestIdText: {
    color: BabyCityPalette.primary,
  },
  helperCard: {
    padding: 20,
    borderRadius: 28,
    gap: 10,
  },
  helperTitle: {
    marginBottom: 8,
  },
});
