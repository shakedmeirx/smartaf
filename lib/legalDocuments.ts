import { AppLanguage } from '@/locales';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  badge: string;
  sections: LegalSection[];
};

export type LegalContactAction = {
  key: 'support' | 'privacy' | 'delete' | 'safety';
  title: string;
  body: string;
  icon: 'mail-outline' | 'shield-checkmark-outline' | 'trash-outline' | 'warning-outline';
  subject: string;
  templateLines: string[];
};

export const LEGAL_CONTACT_EMAIL = 'support@babysitconnect.app';

const LAST_UPDATED = {
  he: 'עודכן לאחרונה: 26.03.2026',
  en: 'Last updated: March 26, 2026',
} as const;

const TERMS_DOCUMENTS: Record<AppLanguage, LegalDocument> = {
  he: {
    title: 'תנאי שימוש',
    subtitle:
      'המסמך הזה מגדיר את תנאי השימוש ב-Smartaf עבור הורים, בייביסיטרים וכל משתמש אחר באפליקציה או בשירותים הנלווים.',
    badge: LAST_UPDATED.he,
    sections: [
      {
        title: '1. מהי Smartaf',
        paragraphs: [
          'Smartaf היא פלטפורמה דיגיטלית שמחברת בין הורים, משפחות, מטפלות ובייביסיטרים בישראל באמצעות פרופילים, חיפוש, צ׳אטים, בקשות ושירותים נלווים.',
          'שימוש באפליקציה, הרשמה לחשבון או המשך שימוש בשירות מהווים אישור לכך שקראת והסכמת לתנאים אלה ולמדיניות הפרטיות.',
        ],
      },
      {
        title: '2. מי רשאי להשתמש',
        bullets: [
          'השירות מיועד למשתמשים בגירים, או למי שמורשים להשתמש בו לפי הדין החל.',
          'עליך למסור מידע מדויק, עדכני ואמיתי ולשמור על פרטי ההתחברות שלך.',
          'אסור ליצור חשבון מטעה, להתחזות לאחר או להשתמש בשירות לצורך בלתי חוקי.',
        ],
      },
      {
        title: '3. תפקיד הפלטפורמה',
        bullets: [
          'Smartaf מספקת כלי חיפוש, התאמה, תקשורת וניהול בלבד.',
          'Smartaf אינה מעסיקה, אינה סוכנות כוח אדם ואינה צד להסכמה שבין הורה לבייביסיטר, אלא אם צוין במפורש אחרת בכתב.',
          'אימותים, המלצות, דירוגים, זמינות ופרטי פרופיל אינם מהווים התחייבות, מצג או אחריות מוחלטת להתאמה, אמינות, זמינות, חוקיות או הצלחת הקשר.',
        ],
      },
      {
        title: '4. פרופילים, תכנים והתנהגות',
        bullets: [
          'מותר לפרסם רק מידע ותוכן שיש לך זכות חוקית לשתף, כולל תמונות, פרטי ילדים, כתובות, המלצות והודעות.',
          'אסור לפרסם תוכן מטעה, פוגעני, מאיים, משמיץ, מפלה, ספאמי, מיני או בלתי חוקי.',
          'אסור לאסוף, להעתיק או לעשות שימוש במידע של משתמשים אחרים מעבר למטרה הסבירה של יצירת קשר לצורך שירותי טיפול בילדים.',
        ],
      },
      {
        title: '5. בקשות, משמרות ותשלומים',
        paragraphs: [
          'מחירים, זמינות, היקף השירות, תנאי ביטול, מיקום ומועדי עבודה נקבעים בסופו של דבר בין המשתמשים עצמם, אלא אם Smartaf מציעה מנגנון מפורש אחר בתוך האפליקציה.',
          'כל מחלוקת הנוגעת לביצוע השירות, הגעה, תשלום, ביטול, נזק או אחריות לטיפול בילדים היא בראש ובראשונה בין הצדדים שביצעו את ההתקשרות.',
        ],
      },
      {
        title: '6. בטיחות ודיווח',
        bullets: [
          'יש לפעול בשיקול דעת עצמאי לפני כל מפגש, מסירת כתובת, תיאום תשלום או שיתוף מידע אישי.',
          'אם נתקלת בהתנהגות מסוכנת, פוגענית או בלתי חוקית, יש לדווח דרך ערוצי הקשר של Smartaf באופן מיידי.',
          'האפליקציה אינה שירות חירום. במצב חירום יש לפנות לרשויות המוסמכות ללא דיחוי.',
        ],
      },
      {
        title: '7. השעיה, הגבלה וסיום שימוש',
        bullets: [
          'Smartaf רשאית להסיר תוכן, להקפיא או לסגור חשבון, להגביל גישה או לנקוט אמצעי בקרה אם עולה חשד להפרת תנאים, פגיעה בבטיחות או דרישה חוקית.',
          'משתמש רשאי להפסיק להשתמש בשירות בכל עת, ובכפוף לדין החל לבקש מחיקת חשבון ונתונים דרך מסך הקשר/המחיקה באפליקציה.',
        ],
      },
      {
        title: '8. אחריות מוגבלת',
        paragraphs: [
          'בכפוף לדין שאינו ניתן להתניה, השירות מסופק כפי שהוא ("As Is") וללא התחייבות לכך שיהיה זמין תמיד, נקי משגיאות, מתאים למטרה מסוימת או חף מהפרעות.',
          'Smartaf לא תישא באחריות לנזקים עקיפים, מיוחדים או תוצאתיים, או לנזקים הנובעים מהסתמכות על פרופילים, התקשרויות בין משתמשים, תכני משתמשים או מפגשים מחוץ לאפליקציה.',
        ],
      },
      {
        title: '9. דין חל ויצירת קשר',
        paragraphs: [
          'תנאים אלה כפופים לדין החל במדינת ישראל, מבלי לגרוע מזכויות צרכניות או זכויות קוגנטיות אחרות שאינן ניתנות לוויתור.',
          'לשאלות, פניות פרטיות, בקשות מחיקת חשבון או דיווחי בטיחות ניתן לפנות דרך מסך "צור קשר" באפליקציה או במייל support@babysitconnect.app.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Use',
    subtitle:
      'This document sets the terms that govern use of Smartaf by parents, babysitters, and any other user of the app or related services.',
    badge: LAST_UPDATED.en,
    sections: [
      {
        title: '1. What Smartaf is',
        paragraphs: [
          'Smartaf is a digital platform that connects parents, families, caregivers, and babysitters in Israel through profiles, search, chat, requests, and related tools.',
          'Using the app, creating an account, or continuing to use the service means you accept these terms together with the privacy policy.',
        ],
      },
      {
        title: '2. Who may use the service',
        bullets: [
          'The service is intended for adult users, or users otherwise authorized to use it under applicable law.',
          'You must provide accurate and current information and keep your login credentials secure.',
          'You may not impersonate another person, create a misleading account, or use the service for unlawful purposes.',
        ],
      },
      {
        title: '3. Platform role',
        bullets: [
          'Smartaf provides discovery, matching, communication, and management tools only.',
          'Smartaf is not an employer, staffing agency, or party to the service agreement between a parent and a babysitter unless expressly stated otherwise in writing.',
          'Verification, reviews, ratings, availability, and profile details do not amount to a guarantee of suitability, reliability, legality, or a successful match.',
        ],
      },
      {
        title: '4. Profiles, content, and conduct',
        bullets: [
          'You may upload only information and content that you have the legal right to share, including images, child details, addresses, recommendations, and messages.',
          'You may not upload misleading, abusive, threatening, defamatory, discriminatory, sexual, spammy, or unlawful content.',
          'You may not collect or reuse other users’ data beyond the reasonable purpose of arranging child-care services.',
        ],
      },
      {
        title: '5. Requests, shifts, and payments',
        paragraphs: [
          'Rates, availability, cancellations, locations, schedules, and service scope are ultimately agreed between the users unless Smartaf expressly provides another in-app mechanism.',
          'Any dispute regarding performance, attendance, payment, cancellation, damage, or service quality is primarily between the users who entered into the arrangement.',
        ],
      },
      {
        title: '6. Safety and reporting',
        bullets: [
          'Use independent judgment before meeting, sharing addresses, arranging payment, or disclosing personal information.',
          'Dangerous, abusive, or unlawful behavior should be reported through Smartaf’s contact channels immediately.',
          'The app is not an emergency service. In an emergency, contact the competent authorities without delay.',
        ],
      },
      {
        title: '7. Suspension and termination',
        bullets: [
          'Smartaf may remove content, suspend accounts, limit access, or take moderation action where there is a suspected breach, safety concern, or legal obligation.',
          'Users may stop using the service at any time and, subject to applicable law, may request account and data deletion through the in-app contact/deletion flow.',
        ],
      },
      {
        title: '8. Limited liability',
        paragraphs: [
          'To the extent permitted by law, the service is provided on an “as is” basis without any warranty that it will always be available, error-free, or fit for a particular purpose.',
          'Smartaf is not liable for indirect or consequential damages, or for harm arising from reliance on user profiles, user-generated content, off-platform interactions, or private arrangements between users.',
        ],
      },
      {
        title: '9. Governing law and contact',
        paragraphs: [
          'These terms are governed by the applicable laws of the State of Israel, without limiting any non-waivable consumer or statutory rights.',
          'Questions, privacy requests, account deletion requests, and safety reports can be submitted through the in-app contact page or by email at support@babysitconnect.app.',
        ],
      },
    ],
  },
};

const PRIVACY_DOCUMENTS: Record<AppLanguage, LegalDocument> = {
  he: {
    title: 'מדיניות פרטיות',
    subtitle:
      'מדיניות זו מסבירה איזה מידע אישי Smartaf אוספת, כיצד היא משתמשת בו, עם מי הוא עשוי להיות משותף, ומהן הזכויות והבחירות שלך.',
    badge: LAST_UPDATED.he,
    sections: [
      {
        title: '1. מי אנחנו',
        paragraphs: [
          'Smartaf מפעילה פלטפורמה לחיבור בין הורים לבייביסיטרים בישראל. המדיניות הזו חלה על האפליקציה, השירותים הנלווים, התמיכה והתקשורת שבוצעו באמצעותה.',
        ],
      },
      {
        title: '2. איזה מידע אנחנו אוספים',
        bullets: [
          'פרטי חשבון וזיהוי: שם, מספר טלפון, תפקידים בחשבון, מזהי משתמש ופרטי התחברות.',
          'פרטי פרופיל: תמונת פרופיל, תיאור אישי, שפות, ניסיון, זמינות, מחירים, המלצות, אזור מועדף ונתוני התאמה נוספים.',
          'פרטי משפחה או ילדים: מספר ילדים, גילאים, תאריכי לידה, שמות ילדים אם הוזנו, כתובת ועיר, והערות שהמשפחה בוחרת למסור.',
          'תקשורת ושימוש: צ׳אטים, בקשות, מודעות, משמרות, דירוגים, שמירות, סימונים ופעולות שבוצעו באפליקציה.',
          'מידע מיקום והרשאות מכשיר: מיקום מדויק או משוער, אם אישרת זאת, וכן טוקן להתראות דחיפה אם בחרת להפעיל התראות.',
          'מדיה ותוכן: תמונות, קבצים או טקסטים שהעלית או שלחת דרך השירות.',
        ],
      },
      {
        title: '3. למה אנחנו משתמשים במידע',
        bullets: [
          'ליצור ולנהל את החשבון שלך, לאפשר התחברות מאובטחת ולהציג את השירות בשפה ובתפקיד המתאימים.',
          'להתאים חיפושים, להציג פרופילים ומודעות רלוונטיים, ולאפשר שליחת בקשות, צ׳אטים ותיאומי טיפול.',
          'לשלוח עדכונים, התראות דחיפה, הודעות שירות ומידע תפעולי על פניות או התאמות.',
          'לבצע בקרה, מניעת הונאה, אבטחת מידע, אכיפת תנאים, טיפול בדיווחים ותמיכה למשתמשים.',
          'לעמוד בדרישות דין, ליישב מחלוקות, לשמור ראיות נחוצות ולנהל תהליכי מחיקה, תיקון או עיון במידע.',
        ],
      },
      {
        title: '4. עם מי המידע עשוי להיות משותף',
        bullets: [
          'עם משתמשים אחרים, בהתאם למה שבחרת לפרסם או לשלוח בפרופיל, בבקשה, במודעה או בצ׳אט.',
          'עם ספקי שירות טכנולוגיים שמסייעים לנו להפעיל את האפליקציה, כגון תשתיות backend, אחסון, אימות או התראות.',
          'עם Apple, Google או ספקי התחברות אחרים כאשר את/ה בוחר/ת להשתמש בהתחברות דרכם.',
          'עם רשויות מוסמכות, כאשר קיימת חובה חוקית, צו מחייב, צורך למנוע נזק, או צורך להגן על הזכויות, הביטחון והאכיפה של Smartaf ומשתמשיה.',
        ],
      },
      {
        title: '5. הרשאות, הסכמה ובחירה',
        paragraphs: [
          'כאשר האפליקציה מבקשת הרשאות כמו מיקום, תמונות או התראות, ניתן לסרב, לאשר, או לשנות את ההחלטה בהגדרות המכשיר. אם לא תאשר/י הרשאה מסוימת, ייתכן שחלק מהפיצ׳רים יפעלו באופן חלקי בלבד.',
          'אנחנו משתדלים לבקש רק מידע שנחוץ לתפקוד השירות ולמטרות שהוסברו לך. אם נבקש מידע נוסף, נסביר מדוע הוא נדרש.',
        ],
      },
      {
        title: '6. שמירה, מחיקה וזכויות',
        paragraphs: [
          'אנו שומרים מידע כל עוד החשבון פעיל ולמשך תקופה סבירה לאחר מכן לצורכי אבטחה, מניעת הונאה, טיפול במחלוקות, גיבוי, אכיפה או עמידה בדרישות חוק.',
          'ניתן לבקש מחיקת חשבון ונתונים דרך מסך הקשר/מחיקה באפליקציה או דרך מסך ההגדרות. במקרים מסוימים ייתכן שנידרש לשמור נתונים מסוימים מסיבות חוקיות, רגולטוריות, אבטחתיות או ראייתיות.',
          'לפי הדין החל, ובפרט בהתאם לזכויות עיון ותיקון מידע לפי סעיפים 13–14 לחוק הגנת הפרטיות, ניתן לפנות אלינו כדי לעיין במידע, לבקש תיקון, ולעיתים גם לבקש מחיקה או הגבלת שימוש.',
        ],
      },
      {
        title: '7. מידע על ילדים',
        paragraphs: [
          'האפליקציה מיועדת למבוגרים. אם את/ה הורה או אפוטרופוס, יש לשתף רק את המידע הדרוש באופן סביר לצורך מציאת טיפול מתאים, ולהימנע מהעלאת מידע עודף או רגיש שאינו נחוץ.',
        ],
      },
      {
        title: '8. יצירת קשר',
        paragraphs: [
          'לשאלות פרטיות, בקשות עיון/תיקון/מחיקה, דיווחי בטיחות ופניות כלליות ניתן לפנות דרך מסך "צור קשר" באפליקציה או במייל support@babysitconnect.app.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    subtitle:
      'This policy explains what personal data Smartaf collects, how it is used, who it may be shared with, and what rights and choices you have.',
    badge: LAST_UPDATED.en,
    sections: [
      {
        title: '1. Who we are',
        paragraphs: [
          'Smartaf operates a platform that connects parents and babysitters in Israel. This policy applies to the app, related services, support, and communications handled through it.',
        ],
      },
      {
        title: '2. What data we collect',
        bullets: [
          'Account and identity data: name, phone number, account roles, user identifiers, and sign-in details.',
          'Profile data: profile photo, personal bio, languages, experience, availability, rates, recommendations, preferred location, and other matching data.',
          'Family and child data: number of children, ages, birth dates, child names if entered, address and city, and family notes voluntarily provided.',
          'Communications and usage data: chats, requests, posts, shifts, ratings, saves, bookmarks, and actions taken in the app.',
          'Location and device permission data: precise or approximate location where you choose to share it, plus push notification tokens if you enable notifications.',
          'Media and content: images, files, and text you upload or send through the service.',
        ],
      },
      {
        title: '3. How we use the data',
        bullets: [
          'To create and manage your account, support secure sign-in, and show the service in the right language and role.',
          'To power search, matching, profiles, posts, requests, chats, and care coordination.',
          'To send service updates, push notifications, request alerts, and operational messages.',
          'To maintain security, prevent fraud, enforce the terms, handle reports, and provide support.',
          'To comply with legal obligations, resolve disputes, retain necessary evidence, and manage deletion, correction, or access requests.',
        ],
      },
      {
        title: '4. Who data may be shared with',
        bullets: [
          'Other users, to the extent you choose to publish or send information in a profile, request, post, or chat.',
          'Technology service providers that help us operate the app, such as backend, hosting, authentication, or notification vendors.',
          'Apple, Google, or other sign-in providers when you choose to authenticate through them.',
          'Competent authorities where required by law, binding request, safety needs, or the legitimate protection of Smartaf and its users.',
        ],
      },
      {
        title: '5. Permissions, consent, and choice',
        paragraphs: [
          'When the app asks for permissions such as location, photos, or notifications, you can allow, deny, or later change that choice in your device settings. Some features may be reduced if a permission is denied.',
          'We aim to request only information that is relevant to the service and to explain why extra data is needed when we ask for it.',
        ],
      },
      {
        title: '6. Retention, deletion, and rights',
        paragraphs: [
          'We keep data while your account is active and for a reasonable period afterward for security, fraud prevention, dispute handling, backup, enforcement, or legal compliance.',
          'You can request account and data deletion from the in-app contact/deletion flow or from settings. In some cases, we may need to retain limited data for legal, regulatory, security, or evidentiary reasons.',
          'Subject to applicable law, including privacy rights of access and correction, you may contact us to access your data, request correction, and in some cases request deletion or restriction of processing.',
        ],
      },
      {
        title: '7. Children’s information',
        paragraphs: [
          'The app is intended for adults. If you are a parent or guardian, please share only the child information reasonably necessary to arrange suitable care and avoid uploading unnecessary sensitive data.',
        ],
      },
      {
        title: '8. Contact',
        paragraphs: [
          'For privacy questions, access/correction/deletion requests, safety reports, or general support, contact us through the in-app contact page or by email at support@babysitconnect.app.',
        ],
      },
    ],
  },
};

const CONTACT_DESCRIPTIONS = {
  he: {
    title: 'צור קשר ובקשות משפטיות',
    subtitle:
      'כאן אפשר לפתוח פנייה מסודרת לתמיכה, פרטיות, מחיקת חשבון או דיווח בטיחות. הפנייה נשמרת במערכת ואינה תלויה באפליקציית המייל שלך.',
    badge: LAST_UPDATED.he,
    supportTitle: 'פנייה כללית לתמיכה',
    supportBody: 'שאלות כלליות, תקלות, בעיות כניסה או עזרה בשימוש באפליקציה.',
    privacyTitle: 'בקשת פרטיות / עיון / תיקון מידע',
    privacyBody: 'פנייה בנוגע לנתונים האישיים שלך, עיון במידע, תיקון מידע או בירור שימוש במידע.',
    deleteTitle: 'בקשת מחיקת חשבון ונתונים',
    deleteBody: 'פתיחת בקשה רשמית למחיקת החשבון והנתונים המשויכים אליו, בכפוף לדין החל ולחובות שימור.',
    safetyTitle: 'דיווח בטיחות או משתמש',
    safetyBody: 'דיווח על תוכן פוגעני, התחזות, הטרדה, סיכון לקטינים או שימוש אסור בפלטפורמה.',
    helperTitle: 'מה חשוב לדעת',
    helperBody:
      'מחיקת חשבון היא לא רק הסתרה או הקפאה. הפנייה שתישלח מכאן תפתח תהליך רשמי מול Smartaf, כולל אימות זהות במידת הצורך והסבר אם נדרש לשמור חלק מהמידע לפי חוק או לצורכי אבטחה.',
    openEmail: 'בחירת פנייה',
    directEmail: 'אימייל ישיר',
    noMailTitle: 'לא נמצא יישום דוא״ל',
    noMailBody: 'אפשר לפנות אלינו ישירות בכתובת support@babysitconnect.app.',
  },
  en: {
    title: 'Contact and legal requests',
    subtitle:
      'Use this page to open a structured support, privacy, deletion, or safety request. Your request is saved in the system and does not depend on your mail app.',
    badge: LAST_UPDATED.en,
    supportTitle: 'General support request',
    supportBody: 'General questions, bugs, sign-in problems, or help using the app.',
    privacyTitle: 'Privacy / access / correction request',
    privacyBody: 'Requests about your personal data, access rights, correction requests, or data-use questions.',
    deleteTitle: 'Account and data deletion request',
    deleteBody: 'Start a formal request to delete your account and associated data, subject to applicable law and retention obligations.',
    safetyTitle: 'Safety or user report',
    safetyBody: 'Report harmful content, impersonation, harassment, child-safety concerns, or prohibited use.',
    helperTitle: 'Important note',
    helperBody:
      'Account deletion is not the same as hiding or freezing an account. This flow is intended to initiate a formal Smartaf deletion request, including identity verification where needed and an explanation if some data must be retained for legal or security reasons.',
    openEmail: 'Choose request',
    directEmail: 'Direct email',
    noMailTitle: 'No mail app found',
    noMailBody: 'You can still contact us directly at support@babysitconnect.app.',
  },
} as const;

const CONTACT_ACTIONS: Record<AppLanguage, LegalContactAction[]> = {
  he: [
    {
      key: 'support',
      title: CONTACT_DESCRIPTIONS.he.supportTitle,
      body: CONTACT_DESCRIPTIONS.he.supportBody,
      icon: 'mail-outline',
      subject: 'פנייה כללית ל-Smartaf',
      templateLines: [
        'שלום צוות Smartaf,',
        '',
        'אני פונה בנושא הבא:',
        '',
        'פירוט הבעיה / הבקשה:',
        '',
      ],
    },
    {
      key: 'privacy',
      title: CONTACT_DESCRIPTIONS.he.privacyTitle,
      body: CONTACT_DESCRIPTIONS.he.privacyBody,
      icon: 'shield-checkmark-outline',
      subject: 'בקשת פרטיות / עיון / תיקון מידע ב-Smartaf',
      templateLines: [
        'שלום צוות Smartaf,',
        '',
        'אני מבקש/ת פנייה בנושא פרטיות:',
        'עיון במידע / תיקון מידע / בירור שימוש במידע / אחר',
        '',
        'פרטים והסבר:',
        '',
      ],
    },
    {
      key: 'delete',
      title: CONTACT_DESCRIPTIONS.he.deleteTitle,
      body: CONTACT_DESCRIPTIONS.he.deleteBody,
      icon: 'trash-outline',
      subject: 'בקשת מחיקת חשבון ונתונים ב-Smartaf',
      templateLines: [
        'שלום צוות Smartaf,',
        '',
        'אני מבקש/ת למחוק את החשבון שלי ואת הנתונים המשויכים אליו, בכפוף לדין החל.',
        '',
        'הערות / פרטים מזהים נוספים:',
        '',
      ],
    },
    {
      key: 'safety',
      title: CONTACT_DESCRIPTIONS.he.safetyTitle,
      body: CONTACT_DESCRIPTIONS.he.safetyBody,
      icon: 'warning-outline',
      subject: 'דיווח בטיחות / משתמש ב-Smartaf',
      templateLines: [
        'שלום צוות Smartaf,',
        '',
        'אני מבקש/ת לדווח על אירוע בטיחות / משתמש:',
        '',
        'שם או מזהה המשתמש/ת:',
        'פרטי האירוע:',
        '',
      ],
    },
  ],
  en: [
    {
      key: 'support',
      title: CONTACT_DESCRIPTIONS.en.supportTitle,
      body: CONTACT_DESCRIPTIONS.en.supportBody,
      icon: 'mail-outline',
      subject: 'General support request for Smartaf',
      templateLines: [
        'Hello Smartaf team,',
        '',
        'I am contacting you about the following issue:',
        '',
        'Details:',
        '',
      ],
    },
    {
      key: 'privacy',
      title: CONTACT_DESCRIPTIONS.en.privacyTitle,
      body: CONTACT_DESCRIPTIONS.en.privacyBody,
      icon: 'shield-checkmark-outline',
      subject: 'Privacy / access / correction request for Smartaf',
      templateLines: [
        'Hello Smartaf team,',
        '',
        'I would like to submit a privacy-related request:',
        'Access / correction / data-use question / other',
        '',
        'Details:',
        '',
      ],
    },
    {
      key: 'delete',
      title: CONTACT_DESCRIPTIONS.en.deleteTitle,
      body: CONTACT_DESCRIPTIONS.en.deleteBody,
      icon: 'trash-outline',
      subject: 'Account and data deletion request for Smartaf',
      templateLines: [
        'Hello Smartaf team,',
        '',
        'I would like to request deletion of my account and associated data, subject to applicable law.',
        '',
        'Additional identifying details:',
        '',
      ],
    },
    {
      key: 'safety',
      title: CONTACT_DESCRIPTIONS.en.safetyTitle,
      body: CONTACT_DESCRIPTIONS.en.safetyBody,
      icon: 'warning-outline',
      subject: 'Safety or user report for Smartaf',
      templateLines: [
        'Hello Smartaf team,',
        '',
        'I would like to report a safety issue or a user:',
        '',
        'User name or identifier:',
        'Incident details:',
        '',
      ],
    },
  ],
};

export function getLegalDocument(kind: 'terms' | 'privacy', lang: AppLanguage) {
  return kind === 'terms' ? TERMS_DOCUMENTS[lang] : PRIVACY_DOCUMENTS[lang];
}

export function getContactContent(lang: AppLanguage) {
  return {
    ...CONTACT_DESCRIPTIONS[lang],
    actions: CONTACT_ACTIONS[lang],
  };
}

export function getLegalFallbackRoute(
  origin: string | string[] | undefined,
  hasSession: boolean
): '/welcome' | '/about' | '/settings' {
  const normalizedOrigin = Array.isArray(origin) ? origin[0] : origin;

  if (normalizedOrigin === 'about') {
    return '/about';
  }

  if (normalizedOrigin === 'settings') {
    return '/settings';
  }

  return hasSession ? '/settings' : '/welcome';
}
