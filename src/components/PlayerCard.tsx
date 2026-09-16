import ActionSpinner from './ActionSpinner';
import { useOptionalMatchup } from '@/context/MatchupContext';
import { FRAME_TITLE, FRAME_HEADING } from '@/theme';
// src/components/PlayerCard.tsx
import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { UserRound, ArrowLeftRight, CalendarDays, Check, FileClock, FileText, MapPin, Plus, Shield, ShieldCheck, Trophy } from 'lucide-react-native';
import { formatPlayerContractDate } from '@/utils/playerContract';
import { CARD, TEXT, MUTED, ACCENT, LINE, DANGER } from '@/theme';
import type { PlayerData } from '@/types';
import { rolePickerCode } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { sportmonksTeamImage } from '@/utils/sportmonksImages';

type Props = {
  player: PlayerData;
  heading?: string;
  actionsInside?: boolean;
  onMatchup?: () => void | Promise<void>;
  matchupDisabled?: boolean;
  onAddFavorite?: (p: PlayerData) => void | Promise<boolean>;
  addFavoriteDisabled?: boolean;
  onGenerateReport?: (p: PlayerData) => void | Promise<void>;
  reportState?: 'idle' | 'loading' | 'ready';
  reportDisabled?: boolean;
  titleAlign?: 'left' | 'center';
  hideNationalityLeague?: boolean;
  visualTheme?: {
    cardBackground: string;
    accent: string;
  };
};

function isValidPotential(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
}

function getScoreColor(score: number): string {
  if (score < 50) return DANGER;
  if (score < 70) return '#F59E0B';
  return ACCENT;
}

function roleShortLabel(value?: string) {
  return rolePickerCode(value);
}

function buildRoleDistribution(meta: PlayerData['meta']) {
  const rawCounts: Record<string, number> = meta?.positionCounts ?? {};
  const counts = Object.entries(rawCounts).reduce<Record<string, number>>((acc, [role, count]) => {
    const short = roleShortLabel(role);
    if (short && count > 0) acc[short] = (acc[short] || 0) + count;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);
  const fromCounts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([role, count]) => ({
      role,
      pct: total > 0 ? Math.round((count / total) * 100) : null,
    }))
    .filter((item) => item.role);

  if (fromCounts.length) return fromCounts;

  return Array.from(new Set((meta?.positionNamesSeen?.length ? meta.positionNamesSeen : meta?.roles ?? [])
    .map(roleShortLabel)
    .filter(Boolean)))
    .map((role) => ({ role, pct: null }));
}

function ScoreBar({
  label,
  value,
  accessibilityLabel,
  colorOverride,
}: {
  label: string;
  value: number;
  accessibilityLabel: string;
  colorOverride?: string;
}) {
  const score = Math.max(0, Math.min(100, Math.round(value)));
  const scoreColor = colorOverride ?? getScoreColor(score);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: MUTED }}>
        {label}:{' '}
        <Text style={{ color: scoreColor, fontWeight: '800' }}>{score}</Text>/100
      </Text>

      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: '#272a2a',
          overflow: 'hidden',
        }}
        accessibilityLabel={accessibilityLabel}
      >
        <View
          style={{
            width: `${score}%`,
            height: '100%',
            backgroundColor: scoreColor,
          }}
        />
      </View>
    </View>
  );
}

export default function PlayerCard({
  player,
  heading,
  actionsInside = false,
  onMatchup,
  matchupDisabled = false,
  onAddFavorite,
  addFavoriteDisabled = false,
  onGenerateReport,
  reportState = 'idle',
  reportDisabled = false,
  titleAlign = 'left',
  hideNationalityLeague = false,
  visualTheme,
}: Props) {
  const { t, i18n } = useTranslation();
  const matchup = useOptionalMatchup();
  const matchupFull = !!matchup && matchup.rows.slice(0, matchup.mode).every(Boolean);
  const [matchBusy, setMatchBusy] = React.useState(false);
  const [reportBusy, setReportBusy] = React.useState(false);
  const [portraitFailed, setPortraitFailed] = React.useState(false);
  const [teamLogoFailed, setTeamLogoFailed] = React.useState(false);
  const [contractLogoFailed, setContractLogoFailed] = React.useState(false);
  const actionLock = React.useRef(false);
  const runAction = async (kind: 'report' | 'match') => {
    if (actionLock.current) return;
    actionLock.current = true;
    const setBusy = kind === 'report' ? setReportBusy : setMatchBusy;
    setBusy(true);
    try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); if (kind === 'report') await onGenerateReport?.(player); else await onMatchup?.(); }
    finally { setBusy(false); actionLock.current = false; }
  };
  const { name, meta } = player;
  const portraitUrl = meta?.imageUrl?.trim();
  const teamLogoUrl = meta?.teamLogoUrl || sportmonksTeamImage(meta?.teamId);
  const contractTeamLogoUrl = meta?.contractTeamLogoUrl || sportmonksTeamImage(meta?.contractTeamId);
  const roleDistribution = buildRoleDistribution(meta);
  const potential = meta?.potential;
  const form = meta?.form;

  const [isAdding, setIsAdding] = React.useState(false);
  const [isAdded, setIsAdded] = React.useState(false);
  const [showAddedMessage, setShowAddedMessage] = React.useState(false);

  React.useEffect(() => {
    setIsAdding(false);
    setIsAdded(false);
    setShowAddedMessage(false);
  }, [player.name, meta?.team, meta?.nationality]);

  React.useEffect(() => {
    setPortraitFailed(false);
  }, [portraitUrl]);
  React.useEffect(() => setTeamLogoFailed(false), [teamLogoUrl]);
  React.useEffect(() => setContractLogoFailed(false), [contractTeamLogoUrl]);

  const handleAdd = async () => {
    if (!onAddFavorite || isAdding || isAdded) return;
    try {
      setIsAdding(true);
      const maybePromise = onAddFavorite(player);
      let ok = true;
      if (maybePromise && typeof (maybePromise as Promise<boolean>)?.then === 'function') {
        ok = await (maybePromise as Promise<boolean>);
      }
      if (ok !== false) {
        setIsAdded(true);
        setShowAddedMessage(true);
      }
      else setIsAdding(false); // handled failure => re-enable
    } catch {
      setIsAdding(false);
    }
  };

  const disabled = !onAddFavorite || addFavoriteDisabled || isAdding || isAdded;
  const reportLoading = reportState === 'loading' || reportBusy;
  const matchDisabled = matchupDisabled || matchupFull || matchBusy;
  const reportButtonDisabled = !onGenerateReport || reportDisabled || reportLoading;
  const potentialInt = Math.round(isValidPotential(potential) ? potential : 0);
  const formInt = Math.round(isValidPotential(form) ? form : 0);

  const cardAccent = visualTheme?.accent ?? ACCENT;

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-GB';
  const loanEnd = meta?.isOnLoan === true ? formatPlayerContractDate(meta.loanEndDate, locale) : undefined;
  const contractEnd = formatPlayerContractDate(meta?.contractEndDate, locale);
  const hasStatus = typeof meta?.isOnLoan === 'boolean';
  const hasContract = hasStatus || meta?.contractTeamName || loanEnd || contractEnd;
  const contractColor = meta?.isOnLoan ? '#FBBF24' : cardAccent;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase(locale);
  const physicalDetails = [
    typeof meta?.age === 'number' && Number.isFinite(meta.age) ? { label: t('age', 'Age'), value: String(meta.age) } : null,
    typeof meta?.height === 'number' && meta.height > 0 ? { label: t('height', 'Height'), value: `${meta.height} cm` } : null,
    typeof meta?.weight === 'number' && meta.weight > 0 ? { label: t('weight', 'Weight'), value: `${meta.weight} kg` } : null,
  ].filter((value): value is { label: string; value: string } => !!value);

  const headerActions = ((heading || onAddFavorite || onGenerateReport || onMatchup) && <View style={styles.headerActions}>{heading && <View style={[FRAME_HEADING, { flexShrink: 1 }]}><UserRound size={20} color={cardAccent} /><Text style={[styles.heading, FRAME_TITLE]}>{heading}</Text></View>}
      {(onAddFavorite || onGenerateReport || onMatchup) && <View style={[styles.actions, heading ? { flex: 1 } : undefined]}>
        {onAddFavorite && <TouchableOpacity accessibilityRole="button" accessibilityLabel={isAdded ? t('addedToFavorites', 'Added to favorites') : t('addToFavorites', 'Add to favorites')} accessibilityState={{ disabled, busy: isAdding && !isAdded }} disabled={disabled} onPress={handleAdd} style={[styles.action, { borderColor: cardAccent }, addFavoriteDisabled && styles.disabled]}>
          {isAdded ? <Check size={17} color={cardAccent} /> : isAdding ? <ActionSpinner size={17} color={cardAccent} /> : <Plus size={17} color={cardAccent} />}
          <Text style={[styles.actionText, { color: cardAccent }]}>{isAdded ? t('playerCardSaved', 'Saved') : t('playerCardPortfolio', 'Portfolio')}</Text>
        </TouchableOpacity>}
        {onGenerateReport && <TouchableOpacity accessibilityRole="button" accessibilityLabel={reportLoading ? t('generatingReport', 'Generating report') : reportState === 'ready' ? t('openReport', 'Open report') : t('generateReport', 'Generate report')} accessibilityState={{ disabled: reportButtonDisabled, busy: reportLoading }} disabled={reportButtonDisabled} onPress={() => { void runAction('report'); }} style={[styles.action, styles.reportAction, reportButtonDisabled && styles.disabled]}>
          {reportLoading ? <ActionSpinner size={17} color={cardAccent} /> : <FileText size={17} color={cardAccent} />}
          <Text style={styles.actionText}>{t('playerCardReport', 'Report')}</Text>
        </TouchableOpacity>}
        {onMatchup && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: matchDisabled, busy: matchBusy }} disabled={matchDisabled} onPress={() => { void runAction('match'); }} style={[styles.action, matchDisabled && styles.disabled]}>{matchBusy ? <ActionSpinner size={17} color={cardAccent}/> : <ArrowLeftRight size={17} color={matchupFull ? MUTED : cardAccent} />}<Text style={[styles.actionText, matchupFull && {color:MUTED}]}>{matchupFull ? (i18n.language.startsWith('tr') ? 'Eşleşme Dolu' : 'Matchup Full') : t("playerCardMatchup", "Matchup")}</Text></TouchableOpacity>}
      </View>}
    </View>);

  return (
    <>
    {!actionsInside && headerActions}
    <View testID="player-card" style={[styles.card, { backgroundColor: visualTheme?.cardBackground ?? CARD }]}>
      <View style={[styles.topAccent, { backgroundColor: cardAccent }]} />
      {actionsInside && headerActions}
      <View style={styles.identityTop}>
        <View style={[styles.avatar, { borderColor: cardAccent }]}>
          {portraitUrl && !portraitFailed ? (
            <Image
              source={{ uri: portraitUrl }}
              style={styles.portrait}
              resizeMode="contain"
              onError={() => setPortraitFailed(true)}
              accessibilityLabel={name}
            />
          ) : (
            <Text style={[styles.initials, { color: cardAccent }]} maxFontSizeMultiplier={1.3}>{initials}</Text>
          )}
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.eyebrow}>{t('playerCardProfile', 'PLAYER PROFILE')}</Text>
          <Text style={styles.name}>{name}</Text>
      {meta?.team && <View style={styles.teamRow}>
        {teamLogoUrl && !teamLogoFailed
          ? <Image source={{uri:teamLogoUrl}} resizeMode="contain" onError={()=>setTeamLogoFailed(true)} style={styles.teamLogo}/>
          : <Shield size={16} color={cardAccent} />}
        <Text style={styles.teamName}>{meta.team}</Text>
      </View>}
        </View>
      </View>

      <View style={styles.bioRows}>
        {!hideNationalityLeague && meta?.nationality && <View style={styles.bioItem}><MapPin size={14} color="#91A99B" /><Text style={styles.bioText}>{meta.nationality}</Text></View>}
        {!hideNationalityLeague && meta?.league && <View style={styles.bioItem}><Trophy size={14} color="#91A99B" /><Text style={styles.bioText}>{meta.league}</Text></View>}
      </View>
      {physicalDetails.length > 0 && <View style={styles.physicalRow}>
        {physicalDetails.map(detail => <View key={detail.label} style={styles.physicalTile}>
          <Text style={styles.detailLabel}>{detail.label}</Text><Text style={styles.physicalValue}>{detail.value}</Text>
        </View>)}
      </View>}

      {hasContract ? <View testID="player-contract-panel" style={[styles.contractPanel, { borderColor: meta?.isOnLoan ? 'rgba(251,191,36,0.3)' : 'rgba(145,169,155,0.24)' }]}>
        <View style={styles.contractHeading}>
          <View style={styles.contractHeadingTitle}><FileText size={15} color="#A9BCAF" /><Text style={styles.sectionLabel}>{t('playerCardContract', 'CONTRACT')}</Text></View>
          {hasStatus && <View testID="player-contract-status" style={[styles.statusBadge, { borderColor: contractColor, backgroundColor: meta?.isOnLoan ? 'rgba(251,191,36,0.08)' : 'rgba(22,163,74,0.08)' }]}>
            {meta?.isOnLoan ? <ArrowLeftRight size={13} color={contractColor} /> : <ShieldCheck size={13} color={contractColor} />}
            <Text style={[styles.statusText, { color: contractColor }]}>{meta?.isOnLoan ? t('contractLoan', 'On loan') : t('contractPermanent', 'Permanent')}</Text>
          </View>}
        </View>
        {meta?.contractTeamName && <View style={styles.contractClub}>
          <View style={styles.clubIcon}>{contractTeamLogoUrl && !contractLogoFailed
            ? <Image source={{uri:contractTeamLogoUrl}} resizeMode="contain" onError={()=>setContractLogoFailed(true)} style={styles.contractTeamLogo}/>
            : <Shield size={20} color={contractColor} />}</View>
          <View style={styles.clubCopy}><Text style={styles.detailLabel}>{t('playerCardContractClub', 'Contract club')}</Text><Text style={styles.clubName}>{meta.contractTeamName}</Text></View>
        </View>}
        {(loanEnd || contractEnd) && <View style={styles.datesRow}>
          {loanEnd && <View testID="player-loan-end" style={styles.dateTile}><View style={styles.dateLabelRow}><CalendarDays size={13} color="#FBBF24" /><Text style={styles.dateLabel}>{t('contractLoanEnd', 'Loan end date')}</Text></View><Text style={styles.dateValue}>{loanEnd}</Text></View>}
          {contractEnd && <View testID="player-contract-end" style={styles.dateTile}><View style={styles.dateLabelRow}><CalendarDays size={13} color={cardAccent} /><Text style={styles.dateLabel}>{t('contractPermanentEnd', 'Contract end date')}</Text></View><Text style={styles.dateValue}>{contractEnd}</Text></View>}
        </View>}
      </View> : null}

      {roleDistribution.length > 0 && <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('roleDistribution', 'Role Distribution')}</Text>
        <View style={styles.rolesRow}>
          {roleDistribution.map(item => <View key={item.role} style={[styles.roleChip, { borderColor: cardAccent }]}>
            <Text style={[styles.roleCode, { color: cardAccent }]}>{item.role}</Text>
            {item.pct !== null && <Text style={styles.rolePercentage}>{item.pct}%</Text>}
          </View>)}
        </View>
      </View>}
      {(isValidPotential(potential) || isValidPotential(form)) && <View style={styles.scores}>
        {isValidPotential(potential) && <ScoreBar label={t('potential', 'Potential')} value={potentialInt} colorOverride={visualTheme?.accent} accessibilityLabel={t('potentialA11y', 'Potential {{val}} out of 100', { val: potentialInt })} />}
        {isValidPotential(form) && <ScoreBar label={t('form', 'Form')} value={formInt} colorOverride={visualTheme?.accent} accessibilityLabel={t('formA11y', 'Form {{val}} out of 100', { val: formInt })} />}
      </View>}

      {showAddedMessage && <View accessibilityLiveRegion="polite" style={styles.savedNotice}><Check size={14} color={cardAccent} /><Text style={styles.savedText}>{t('playerAddedToPortfolio', 'Player is added to your portfolio')}</Text></View>}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(145,169,155,0.18)', padding: 18, gap: 15, overflow: 'hidden' },
  topAccent: { position: 'absolute', left: 18, right: 18, top: 0, height: 3, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 3 },
  avatar: { width: 68, height: 76, borderRadius: 17, borderWidth: 1, backgroundColor: '#122019', padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  portrait: { width: '100%', height: '100%', borderRadius: 13 },
  initials: { fontWeight: '900', fontSize: 21, letterSpacing: -0.5 },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'stretch', gap: 5 }, eyebrow: { color: '#91A99B', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  name: { textAlign: 'left', color: TEXT, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, teamName: { color: '#E0E9E3', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  teamLogo: { width: 22, height: 22, flexShrink: 0 },
  bioRows: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, bioItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }, bioText: { color: '#A9BCAF', fontSize: 12, flexShrink: 1 },
  physicalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, physicalTile: { flex: 1, minWidth: 66, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 11, gap: 5, backgroundColor: 'rgba(255,255,255,0.035)' },
  detailLabel: { color: '#91A99B', fontSize: 11, fontWeight: '600' }, physicalValue: { color: TEXT, fontSize: 16, fontWeight: '800' },
  contractPanel: { borderRadius: 17, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.12)', padding: 12, gap: 13 },
  contractHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 }, contractHeadingTitle: { flexDirection: 'row', gap: 6, alignItems: 'center', flexGrow: 1 },
  sectionLabel: { color: '#A9BCAF', fontWeight: '800', fontSize: 10, letterSpacing: 0.7 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, flexShrink: 1 }, statusText: { fontSize: 10, fontWeight: '800', flexShrink: 1 },
  contractClub: { flexDirection: 'row', alignItems: 'center', gap: 10 }, clubIcon: { width: 36, height: 38, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, clubCopy: { flex: 1, gap: 4 }, clubName: { color: TEXT, fontSize: 14, fontWeight: '800' },
  contractTeamLogo: { width: 25, height: 25 },
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dateTile: { flexGrow: 1, flexBasis: 110, gap: 7, borderRadius: 11, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)' }, dateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dateLabel: { color: '#A9BCAF', fontSize: 10, flexShrink: 1 }, dateValue: { color: '#F0F5F2', fontSize: 13, fontWeight: '800' },
  section: { gap: 9 }, rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, roleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.02)' }, roleCode: { fontSize: 12, fontWeight: '900' }, rolePercentage: { fontSize: 11, color: '#B6C5BC', fontWeight: '700' },
  scores: { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(145,169,155,0.16)', gap: 12 },
  heading: { color: ACCENT, fontSize: 17, fontWeight: '800', flexShrink: 1, maxWidth: '100%' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'nowrap', gap: 6, minWidth: 240, flexGrow: 1 }, action: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,0.06)' }, reportAction: { borderColor: 'rgba(145,169,155,0.28)', backgroundColor: 'rgba(255,255,255,0.025)' }, actionText: { color: '#DCE8E0', fontWeight: '800', fontSize: 11, flexShrink: 1 }, disabled: { opacity: 0.45 }, savedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6 }, savedText: { color: '#B6C5BC', fontSize: 11, flexShrink: 1 },
});
