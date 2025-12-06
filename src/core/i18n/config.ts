export const defaultLocale = 'en';

export const timeZone = 'Europe/Amsterdam';

export const locales = [defaultLocale, 'ru', 'es'] as const;

export const localesMap = [
  { key: 'en', title: 'English' },
  { key: 'ru', title: 'Русский' },
  { key: 'es', title: 'Español' },
];
