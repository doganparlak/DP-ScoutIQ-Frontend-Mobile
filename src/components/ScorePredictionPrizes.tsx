import { Check, ChevronLeft, Gift, Medal, Trophy, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { submitPrizeClaim, type PrizeWin } from '@/services/scorePrediction';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { predictionWeekLabel } from '@/utils/predictionPresentation';
import { prizeNote, prizeText, type PredictionPrizes } from '@/utils/predictionPrizes';

export default function ScorePredictionPrizes({ prizes, weekStart, roundId, canClaim, claimed, onClaimed, startWithClaim = false, history, onBack, tr, visible, onClose }: {
  history?: { wins: PrizeWin[]; loading: boolean; error: boolean; onRetry: () => void; onSelect: (win: PrizeWin) => void }; onBack?: () => void; startWithClaim?: boolean; prizes?: PredictionPrizes; weekStart: string; roundId: number; canClaim: boolean; claimed: boolean; onClaimed: () => void; tr: boolean; visible: boolean; onClose: () => void;
}) {
  const { styles: s, color, muted } = useThemedStyles(getStyles);
  const { height } = useWindowDimensions();
  const [form, setForm] = React.useState(false), [email, setEmail] = React.useState(''), [phone, setPhone] = React.useState('');
  const [sending, setSending] = React.useState(false), [error, setError] = React.useState('');
  const busy = React.useRef(false), mounted = React.useRef(true), activeRound = React.useRef(roundId);
  activeRound.current = roundId;
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  React.useEffect(() => { setForm(false); setEmail(''); setPhone(''); setError(''); }, [roundId]);
  React.useEffect(() => { if (!visible || !canClaim) { setForm(false); setError(''); } else if (startWithClaim && !claimed) { setForm(true); } }, [visible, canClaim, startWithClaim, claimed, roundId]);
  const emailValue = email.trim(), phoneValue = phone.trim();
  const validEmail = !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const phoneDigits = phoneValue.replace(/\D/g, '').length;
  const validPhone = !phoneValue || (/^\+?[0-9 ()-]+$/.test(phoneValue) && phoneDigits >= 7 && phoneDigits <= 15);
  const validContact = !!(emailValue || phoneValue) && validEmail && validPhone;
  const note = prizes?.note ? prizeNote(prizes.note, tr) : '';
  async function submit() {
    if (busy.current || !validContact) return;
    const submittingRound = roundId;
    busy.current = true; setSending(true); setError('');
    Keyboard.dismiss();
    try {
      await submitPrizeClaim(submittingRound, email.trim(), phone.trim());
      if (mounted.current && activeRound.current === submittingRound) { onClaimed(); setForm(false); setEmail(''); setPhone(''); }
    } catch {
      if (mounted.current && activeRound.current === submittingRound) setError(tr ? 'Talebin gönderilemedi. Lütfen yeniden dene.' : 'Your claim could not be submitted. Please try again.');
    } finally { busy.current = false; if (mounted.current) setSending(false); }
  }
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onBack || onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.backdrop}><View style={[s.modal, { maxHeight: height * .86, ...(history ? { height: Math.min(760, height * .86) } : {}) }]} accessibilityViewIsModal>
      <View style={s.header}>
        <View style={s.icon}>{history ? <Medal size={23} color={color} /> : <Gift size={23} color={color} />}</View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={s.title}>{history ? (tr ? 'Ödüllerim' : 'My Prizes') : form ? (tr ? 'Ödülünü Talep Et' : 'Claim Your Prize') : (tr ? 'Haftanın Ödülleri' : 'Weekly Prizes')}</Text>
          <Text style={s.caption}>{history ? (tr ? 'Kazandığın haftalar ve talep durumları' : 'Your winning weeks and claim status') : predictionWeekLabel(weekStart, tr)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Kapat' : 'Close'} hitSlop={8} style={s.close} onPress={onClose}><X size={21} color={muted} /></Pressable>
      </View>
      {history && !!history.wins.length && <View style={s.selectorWrap}>
        <Text style={s.label}>{tr ? 'HAFTA SEÇ' : 'SELECT WEEK'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.weeks}>
          {history.wins.map(win => <Pressable key={win.roundId} accessibilityRole="button" accessibilityState={{ selected: win.roundId === roundId, disabled: sending }} disabled={sending} onPress={() => history.onSelect(win)} style={[s.week, win.roundId === roundId && s.selectedWeek]}>
            <Text style={s.weekTitle}>{predictionWeekLabel(win.weekStart, tr)}</Text>
            <View style={s.weekStatus}><View style={[s.dot, win.claimed && s.claimedDot]} /><Text style={[s.status, win.claimed && s.claimedStatus]}>{win.claimed ? (tr ? 'Talep alındı' : 'Claim received') : (tr ? 'Talep bekliyor' : 'Unclaimed')}</Text></View>
          </Pressable>)}
        </ScrollView>
      </View>}
      <ScrollView style={history ? { flex: 1 } : undefined} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {history?.loading && <ActivityIndicator color={color} />}
        {history?.error && <><Text style={s.error}>{tr ? 'Ödüllerin yüklenemedi. Lütfen yeniden dene.' : 'Your prizes could not be loaded. Please try again.'}</Text><Pressable accessibilityRole="button" onPress={history.onRetry} style={s.done}><Text style={s.doneText}>{tr ? 'Yeniden Dene' : 'Retry'}</Text></Pressable></>}
        {history && !history.loading && !history.error && !history.wins.length && <View style={s.empty}><Trophy size={38} color={muted} /><Text style={s.prizeText}>{tr ? 'Yeni bir haftada yeni bir şans' : 'A new week, a new chance'}</Text><Text style={s.note}>{tr ? 'Kazandığın ödüller burada görünecek. İlk üçe girerek ödül kazanabilirsin.' : 'Your prizes will appear here. Finish in the top three to win.'}</Text></View>}
        {history && canClaim && <View style={[s.prize, s.firstPrize]}>
          <View style={s.rank}><Trophy size={23} color={color} /><Text style={s.rankNumber}>#{history.wins.find(win => win.roundId === roundId)?.rank}</Text></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={s.label}>{tr ? 'KAZANDIĞIN ÖDÜL' : 'YOUR PRIZE'}</Text><Text style={s.prizeText}>{prizes ? prizeText(prizes[({ 1: 'first', 2: 'second', 3: 'third' } as const)[(history.wins.find(win => win.roundId === roundId)?.rank ?? 1) as 1 | 2 | 3]], tr) : (tr ? 'Bu haftanın ödülü' : 'This week’s prize')}</Text><Text style={[s.status, claimed && s.claimedStatus]}>{claimed ? (tr ? '✓ Talep alındı' : '✓ Claim received') : (tr ? 'İletişim bilgilerini paylaşarak talep et' : 'Provide contact details to claim')}</Text></View>
        </View>}
        {!history && <>
        {!form && <>
        {prizes ? ([
          { rank: 1, text: prizes.first, label: tr ? 'Birincilik' : 'First Place' },
          { rank: 2, text: prizes.second, label: tr ? 'İkincilik' : 'Second Place' },
          { rank: 3, text: prizes.third, label: tr ? 'Üçüncülük' : 'Third Place' },
        ]).map(item => <View key={item.rank} style={[s.prize, item.rank === 1 && s.firstPrize]}>
          <View style={[s.rank, item.rank === 1 && s.firstRank]}><Trophy size={19} color={item.rank === 1 ? color : muted} /><Text style={[s.rankNumber, item.rank === 1 && { color }]}>{item.rank}</Text></View>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}><Text style={s.label}>{item.label}</Text><Text style={s.prizeText}>{prizeText(item.text, tr)}</Text></View>
        </View>) : <View style={s.prize}><Text style={s.prizeText}>{tr ? 'Bu haftanın ödülleri yakında açıklanacak.' : 'This week’s prizes will be announced soon.'}</Text></View>}
        {!!note && <Text style={s.note}>{note}</Text>}
        </>}
        </>}
        {canClaim && <View style={[s.claim, form && { borderTopWidth: 0, paddingTop: 0 }]}>
          {(!history || claimed) && <Text style={s.prizeText}>{claimed ? (tr ? 'Ödül talebin alındı' : 'Your prize claim was received') : (tr ? 'Tebrikler, haftanın kazananlarındansın!' : 'Congratulations, you are one of this week’s winners!')}</Text>}
          <Text style={s.note}>{tr ? 'Uygulama içi ödüller hesabına tanımlanır. Diğer ödüller için paylaştığın bilgilerle sana ulaşırız.' : 'In-app rewards are credited to your account. For other prizes, we will contact you using the details you provide.'}</Text>
          {claimed ? <Text style={s.note}>{tr ? 'İletişim bilgilerin ekibimize iletildi.' : 'Your contact details have been sent to our team.'}</Text> : !form ? <Pressable accessibilityRole="button" onPress={() => setForm(true)} style={s.done}><Text style={s.doneText}>{tr ? 'Ödülünü Talep Et' : 'Claim Your Prize'}</Text></Pressable> : <>
            <Text style={s.note}>{tr ? 'E-posta veya telefon: birini doldurman yeterli. Bilgilerin yalnızca ödül işlemleri için kullanılır.' : 'Email or phone: one is enough. Your details are used only for prize arrangements.'}</Text>
            <Text style={s.label}>{tr ? 'İletişim E-postası' : 'Contact Email'}</Text>
            <TextInput value={email} onChangeText={setEmail} editable={!sending} accessibilityLabel={tr ? 'İletişim e-postası' : 'Contact email'} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} placeholder={tr ? 'E-posta adresin' : 'Your email address'} placeholderTextColor={muted} style={s.input} />
            <Text style={s.label}>{tr ? 'Telefon Numarası' : 'Phone Number'}</Text>
            <TextInput value={phone} onChangeText={setPhone} editable={!sending} accessibilityLabel={tr ? 'Telefon numarası' : 'Phone number'} keyboardType="phone-pad" autoComplete="tel" maxLength={30} placeholder={tr ? 'Ülke koduyla telefon numaran' : 'Phone number with country code'} placeholderTextColor={muted} style={s.input} />
            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Pressable accessibilityRole="button" disabled={sending || !validContact} onPress={() => void submit()} style={[s.done, (sending || !validContact) && { opacity: .45 }]}>{sending ? <ActivityIndicator color={color} /> : <Text style={s.doneText}>{tr ? 'Talebi Gönder' : 'Submit Claim'}</Text>}</Pressable>
          </>}
        </View>}
      </ScrollView>
      <View style={s.footer}><Pressable accessibilityRole="button" style={s.done} onPress={onClose}><Text style={s.doneText}>{form && !claimed ? (tr ? 'Daha Sonra' : 'Later') : (tr ? 'Tamam' : 'OK')}</Text></Pressable></View>
    </View></KeyboardAvoidingView>
  </Modal>;
}
const getStyles = createThemedStyles((c: ThemeColors) => ({ color: c.FEATURE_COLORS.scorePrediction, muted: c.MUTED, styles: StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', padding: 18, justifyContent: 'center' },
  modal: { flexShrink: 1, width: '100%', maxWidth: 560, alignSelf: 'center', borderRadius: 24, borderWidth: 1, borderColor: c.LINE, backgroundColor: c.PANEL, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: c.LINE },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.CARD, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.TEXT, fontSize: 19, fontWeight: '800', lineHeight: 26 },
  caption: { color: c.MUTED, fontSize: 12, lineHeight: 18 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 16 },
  selectorWrap: { paddingTop: 16, paddingHorizontal: 18, gap: 10, borderBottomWidth: 1, borderBottomColor: c.LINE, paddingBottom: 16 },
  weeks: { gap: 10 },
  week: { borderRadius: 14, borderWidth: 1, borderColor: c.LINE, padding: 12, gap: 8, backgroundColor: c.CARD },
  selectedWeek: { borderColor: c.FEATURE_COLORS.scorePrediction, backgroundColor: c.PANEL },
  weekTitle: { color: c.TEXT, fontSize: 13, fontWeight: '700' },
  weekStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.FEATURE_COLORS.scorePrediction },
  claimedDot: { backgroundColor: c.ACCENT },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  prize: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: c.LINE, backgroundColor: c.CARD, borderRadius: 17, padding: 16 },
  firstPrize: { borderColor: c.FEATURE_COLORS.scorePrediction },
  rank: { width: 42, gap: 4, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: c.PANEL },
  firstRank: { backgroundColor: c.PANEL },
  rankNumber: { color: c.MUTED, fontSize: 12, fontWeight: '800' },
  label: { color: c.MUTED, fontSize: 12, fontWeight: '600' },
  prizeText: { color: c.TEXT, fontSize: 16, fontWeight: '700', lineHeight: 24 },
  note: { color: c.MUTED, fontSize: 13, lineHeight: 21, paddingHorizontal: 4, paddingTop: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 },
  status: { color: c.FEATURE_COLORS.scorePrediction, fontSize: 12, fontWeight: '700', lineHeight: 19 },
  claimedStatus: { color: c.ACCENT },
  claim: { borderTopWidth: 1, borderTopColor: c.LINE, paddingTop: 16, gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.LINE, borderRadius: 12, backgroundColor: c.CARD, color: c.TEXT, padding: 12, fontSize: 15 },
  error: { color: c.DANGER, fontSize: 13, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.LINE },
  done: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: c.CARD, borderWidth: 1, borderColor: c.FEATURE_COLORS.scorePrediction },
  doneText: { color: c.FEATURE_COLORS.scorePrediction, fontSize: 14, fontWeight: '700' },
}) }));
