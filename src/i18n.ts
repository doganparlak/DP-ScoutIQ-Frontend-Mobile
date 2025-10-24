// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: 
    {
      appName: 'ScoutIQ',
      createAccount: 'Create your account',
      signupSubtitle: 'Join the scouting revolution.',
      email: 'E-mail',
      password: 'Password',
      forgotPassword: 'Did you forget your password?',
      greeting: 'Spot the next star before anyone else.',
      noAccount: 'Don’t have an account yet?',
      placeholderEmail: 'you@club.com',
      placeholderPassword: '••••••••',
      pwAtLeast8: 'At least 8 characters',
      pwLetter: 'Contains a letter (A–Z or a–z)',
      pwNumber: 'Contains a number (0–9)',
      dob: 'Date of birth',
      placeholderDob: 'YYYY-MM-DD',
      country: 'Country',
      selectCountry: 'Select your country',
      searchCountry: 'Search country...',
      newsletter: 'Subscribe to newsletter',
      agreeTerms: 'I agree to the Terms & Privacy',
      signup: 'Sign up',
      haveAccount: 'Already have an account?',
      login: 'Log in',
      close: 'Close',
      signupFailed: 'Sign up failed. Please try again.'
    }
  },
  tr: {
    translation: 
    {
      appName: 'ScoutIQ',
      createAccount: 'Hesabını oluştur',
      signupSubtitle: 'Keşif devrimine katıl.',
      email: 'E-posta',
      password: 'Şifre',
      forgotPassword: 'Şifreni mi unuttun?',
      greeting: 'Bir sonraki yıldızı herkesten önce keşfet.',
      noAccount: 'Henüz hesabın yok mu?',
      placeholderEmail: 'sen@kulup.com',
      placeholderPassword: '••••••••',
      pwAtLeast8: 'En az 8 karakter',
      pwLetter: 'En az bir harf içermeli (A–Z veya a–z)',
      pwNumber: 'En az bir rakam içermeli (0–9)',
      dob: 'Doğum tarihi',
      placeholderDob: 'YYYY-AA-GG',
      country: 'Ülke',
      selectCountry: 'Ülkeni seç',
      searchCountry: 'Ülke ara...',
      newsletter: 'Bültene abone ol',
      agreeTerms: 'Şartlar ve Gizlilik’i kabul ediyorum',
      signup: 'Kayıt ol',
      haveAccount: 'Zaten hesabın var mı?',
      login: 'Giriş yap',
      close: 'Kapat',
      signupFailed: 'Kayıt başarısız. Lütfen tekrar dene.'
    }
  },
} as const;

// (Optional but nice) Strong-typing for i18next based on your resources:
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: typeof resources['en']; // keys under the 'translation' namespace
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',          // your Welcome screen will change this to 'tr' as needed
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
