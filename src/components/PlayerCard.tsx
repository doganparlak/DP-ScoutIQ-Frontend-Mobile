import { useOptionalMatchup } from '@/context/MatchupContext';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { getThemed_PLAYER_ACTION_TONES as __getThemed_PLAYER_ACTION_TONES,PLAYER_CARD_PROFILE_GAP,playerActionLayout } from '@/utils/playerCardActions';
import ActionSpinner from './ActionSpinner';
import FindSimilarPlayerButton from './FindSimilarPlayerButton';

// src/components/PlayerCard.tsx
import { formatPlayerContractDate } from '@/utils/playerContract';
import { ArrowLeftRight,CalendarDays,Check,FileText,MapPin,Plus,Shield,ShieldCheck,Target,Trophy,UserRound } from 'lucide-react-native';
import * as React from 'react';
import { Image,StyleSheet,Text,TouchableOpacity,useWindowDimensions,View } from 'react-native';

import { rolePickerCode } from '@/services/api';
import type { PlayerData } from '@/types';
import { sportmonksTeamImage } from '@/utils/sportmonksImages';
import { useTranslation } from 'react-i18next';

type Props = {
  player: PlayerData;
  heading?: string;
  actionsInside?: boolean;
  hideActions?: boolean;
  hideScores?: boolean;
  proActions?: boolean;
  onCheckFit?: () => void;
  onFindSimilar?: () => void | Promise<void>;
  similarPlayerId?: string;
  beforeFindSimilar?: () => void | Promise<void>;
  similarDisabled?: boolean;
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
  const themed = useThemedStyles(getModuleTheme);
  const {getScoreColor, MUTED, themeColor} = themed;

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
          backgroundColor: themeColor('#272a2a', 'surface'),
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
  hideActions = false,
  hideScores = false,
  proActions = false,
  onCheckFit,
  onFindSimilar,
  similarPlayerId,
  beforeFindSimilar,
  similarDisabled = false,
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
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, styles, FRAME_HEADING, FRAME_TITLE, PLAYER_ACTION_TONES, MUTED, CARD, themeColor} = themed;

  const { t, i18n } = useTranslation();
  const {width,fontScale}=useWindowDimensions();
  const [actionWidth,setActionWidth]=React.useState(Math.max(160,width-64));
  const count=1+Number(!!onAddFavorite)+Number(!!onGenerateReport)+Number(proActions ? !!onCheckFit : !!onMatchup);
  const actionLayout=playerActionLayout(actionWidth,fontScale,count);
  const actionCell={flexBasis:actionLayout.basis,flexGrow:1,flexShrink:0};
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
    } finally {
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
  const contractColor = meta?.isOnLoan ? themeColor('#FBBF24') : cardAccent;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase(locale);
  const physicalDetails = [
    typeof meta?.age === 'number' && Number.isFinite(meta.age) ? { label: t('age', 'Age'), value: String(meta.age) } : null,
    typeof meta?.height === 'number' && meta.height > 0 ? { label: t('height', 'Height'), value: `${meta.height} cm` } : null,
    typeof meta?.weight === 'number' && meta.weight > 0 ? { label: t('weight', 'Weight'), value: `${meta.weight} kg` } : null,
  ].filter((value): value is { label: string; value: string } => !!value);

  const headerActions = ((heading || (player && !hideActions)) && <View style={styles.headerActions}>{heading && <View style={[FRAME_HEADING, { flexShrink: 1 }]}><UserRound size={20} color={cardAccent} /><Text style={[styles.heading, FRAME_TITLE]}>{heading}</Text></View>}
      {player && !hideActions && <View onLayout={event=>{const measured=event.nativeEvent.layout.width;if(measured>0&&Math.abs(measured-actionWidth)>1)setActionWidth(measured);}} style={styles.actions}>
        {onAddFavorite && <TouchableOpacity accessibilityRole="button" accessibilityLabel={isAdded ? t('addedToFavorites', 'Added to favorites') : t('addToFavorites', 'Add to favorites')} accessibilityState={{ disabled, busy: isAdding && !isAdded }} disabled={disabled} onPress={handleAdd} style={[styles.action, actionCell, { borderColor: cardAccent,backgroundColor:themeColor('rgba(22,163,74,.10)', 'surface') }, addFavoriteDisabled && styles.disabled]}>
          {isAdded ? <Check size={17} color={cardAccent} /> : isAdding ? <ActionSpinner size={17} color={cardAccent} /> : <Plus size={17} color={cardAccent} />}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={[styles.actionText, { color: cardAccent }]}>{isAdded ? t('playerCardSaved', 'Saved') : t('playerCardPortfolio', 'Portfolio')}</Text>
        </TouchableOpacity>}
        {onGenerateReport && <TouchableOpacity accessibilityRole="button" accessibilityLabel={reportLoading ? t('generatingReport', 'Generating report') : reportState === 'ready' ? t('openReport', 'Open report') : t('generateReport', 'Generate report')} accessibilityState={{ disabled: reportButtonDisabled, busy: reportLoading }} disabled={reportButtonDisabled} onPress={() => { void runAction('report'); }} style={[styles.action, actionCell, styles.reportAction, proActions && {borderColor: PLAYER_ACTION_TONES.similar, backgroundColor:themeColor('rgba(45,212,191,.08)', 'surface')}, reportButtonDisabled && styles.disabled]}>
          {reportLoading ? <ActionSpinner size={17} color={PLAYER_ACTION_TONES.report} /> : <FileText size={17} color={proActions ? PLAYER_ACTION_TONES.similar : PLAYER_ACTION_TONES.report} />}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={[styles.actionText,{color:proActions ? PLAYER_ACTION_TONES.similar : PLAYER_ACTION_TONES.report}]}>{t('playerCardReport', 'Report')}</Text>
        </TouchableOpacity>}
        {!proActions && <FindSimilarPlayerButton onFindSimilar={onFindSimilar} player={player} rowId={similarPlayerId} beforeNavigate={beforeFindSimilar} disabled={similarDisabled || reportBusy || matchBusy || isAdding || reportState === 'loading'} style={[styles.action,actionCell,{borderColor:PLAYER_ACTION_TONES.similar,backgroundColor:themeColor('rgba(45,212,191,.08)', 'surface')}]} accent={PLAYER_ACTION_TONES.similar}/>}
        {proActions && onCheckFit && <TouchableOpacity accessibilityRole="button" accessibilityLabel={i18n.language.startsWith('tr') ? 'Uyum' : 'Fit'} disabled={similarDisabled || reportBusy || isAdding} onPress={onCheckFit} style={[styles.action, actionCell, styles.reportAction, {borderColor: PLAYER_ACTION_TONES.report}, (similarDisabled || reportBusy || isAdding) && styles.disabled]}><Target size={17} color={PLAYER_ACTION_TONES.report}/><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={[styles.actionText,{color: PLAYER_ACTION_TONES.report}]}>{i18n.language.startsWith('tr') ? 'Uyum' : 'Fit'}</Text></TouchableOpacity>}
        {proActions && <FindSimilarPlayerButton onFindSimilar={onFindSimilar} player={player} rowId={similarPlayerId} beforeNavigate={beforeFindSimilar} disabled={similarDisabled || reportBusy || matchBusy || isAdding || reportState === 'loading'} style={[styles.action,actionCell,{borderColor:PLAYER_ACTION_TONES.matchup,backgroundColor:themeColor('rgba(180,163,211,.08)', 'surface')}]} accent={PLAYER_ACTION_TONES.matchup}/>}
        {!proActions && onMatchup && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: matchDisabled, busy: matchBusy }} disabled={matchDisabled} onPress={() => { void runAction('match'); }} style={[styles.action, actionCell, styles.matchupAction, matchDisabled && styles.disabled]}>{matchBusy ? <ActionSpinner size={17} color={PLAYER_ACTION_TONES.matchup}/> : <ArrowLeftRight size={17} color={matchupFull ? MUTED : PLAYER_ACTION_TONES.matchup} />}<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={[styles.actionText,{color:PLAYER_ACTION_TONES.matchup}, matchupFull && {color:MUTED}]}>{matchupFull ? (i18n.language.startsWith('tr') ? 'Eşleşme Dolu' : 'Matchup Full') : t("playerCardMatchup", "Matchup")}</Text></TouchableOpacity>}
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
        {!hideNationalityLeague && meta?.nationality && <View style={styles.bioItem}><MapPin size={14} color={themeColor("#91A99B", 'text')} /><Text style={styles.bioText}>{meta.nationality}</Text></View>}
        {!hideNationalityLeague && meta?.league && <View style={styles.bioItem}><Trophy size={14} color={themeColor("#91A99B", 'text')} /><Text style={styles.bioText}>{meta.league}</Text></View>}
      </View>
      {physicalDetails.length > 0 && <View style={styles.physicalRow}>
        {physicalDetails.map(detail => <View key={detail.label} style={styles.physicalTile}>
          <Text style={styles.detailLabel}>{detail.label}</Text><Text style={styles.physicalValue}>{detail.value}</Text>
        </View>)}
      </View>}

      {hasContract ? <View testID="player-contract-panel" style={[styles.contractPanel, { borderColor: meta?.isOnLoan ? themeColor('rgba(251,191,36,0.3)', 'border') : themeColor('rgba(145,169,155,0.24)', 'border') }]}>
        <View style={styles.contractHeading}>
          <View style={styles.contractHeadingTitle}><FileText size={15} color={themeColor("#A9BCAF", 'text')} /><Text style={styles.sectionLabel}>{t('playerCardContract', 'CONTRACT')}</Text></View>
          {hasStatus && <View testID="player-contract-status" style={[styles.statusBadge, { borderColor: contractColor, backgroundColor: meta?.isOnLoan ? themeColor('rgba(251,191,36,0.08)', 'surface') : themeColor('rgba(22,163,74,0.08)', 'surface') }]}>
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
          {loanEnd && <View testID="player-loan-end" style={styles.dateTile}><View style={styles.dateLabelRow}><CalendarDays size={13} color={themeColor("#FBBF24", 'text')} /><Text style={styles.dateLabel}>{t('contractLoanEnd', 'Loan end date')}</Text></View><Text style={styles.dateValue}>{loanEnd}</Text></View>}
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
      {!hideScores && (isValidPotential(potential) || isValidPotential(form)) && <View style={styles.scores}>
        {isValidPotential(potential) && <ScoreBar label={t('potential', 'Potential')} value={potentialInt} colorOverride={visualTheme?.accent} accessibilityLabel={t('potentialA11y', 'Potential {{val}} out of 100', { val: potentialInt })} />}
        {isValidPotential(form) && <ScoreBar label={t('form', 'Form')} value={formInt} colorOverride={visualTheme?.accent} accessibilityLabel={t('formA11y', 'Form {{val}} out of 100', { val: formInt })} />}
      </View>}

      {showAddedMessage && <View accessibilityLiveRegion="polite" style={styles.savedNotice}><Check size={14} color={cardAccent} /><Text style={styles.savedText}>{t('playerAddedToPortfolio', 'Player is added to your portfolio')}</Text></View>}
    </View>
    </>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {FRAME_TITLE, FRAME_HEADING, CARD, TEXT, MUTED, ACCENT, LINE, DANGER, themeColor} = colors;
  const PLAYER_ACTION_TONES = __getThemed_PLAYER_ACTION_TONES(colors);
  function getScoreColor(score: number): string {
  if (score < 50) return DANGER;
  if (score < 70) return themeColor('#F59E0B');
  return ACCENT;
}

  const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, borderColor: themeColor('rgba(145,169,155,0.18)', 'border'), padding: 18, gap: 15, overflow: 'hidden' },
  topAccent: { position: 'absolute', left: 18, right: 18, top: 0, height: 3, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 3 },
  avatar: { width: 68, height: 76, borderRadius: 17, borderWidth: 1, backgroundColor: themeColor('#122019', 'surface'), padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  portrait: { width: '100%', height: '100%', borderRadius: 13 },
  initials: { fontWeight: '900', fontSize: 21, letterSpacing: -0.5 },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'stretch', gap: 5 }, eyebrow: { color: themeColor('#91A99B', 'text'), fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  name: { textAlign: 'left', color: TEXT, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, teamName: { color: themeColor('#E0E9E3', 'text'), fontSize: 14, fontWeight: '700', flexShrink: 1 },
  teamLogo: { width: 22, height: 22, flexShrink: 0 },
  bioRows: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, bioItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }, bioText: { color: themeColor('#A9BCAF', 'text'), fontSize: 12, flexShrink: 1 },
  physicalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, physicalTile: { flex: 1, minWidth: 66, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 11, gap: 5, backgroundColor: themeColor('rgba(255,255,255,0.035)', 'surface') },
  detailLabel: { color: themeColor('#91A99B', 'text'), fontSize: 11, fontWeight: '600' }, physicalValue: { color: TEXT, fontSize: 16, fontWeight: '800' },
  contractPanel: { borderRadius: 17, borderWidth: 1, backgroundColor: themeColor('rgba(0,0,0,0.12)', 'surface'), padding: 12, gap: 13 },
  contractHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 }, contractHeadingTitle: { flexDirection: 'row', gap: 6, alignItems: 'center', flexGrow: 1 },
  sectionLabel: { color: themeColor('#A9BCAF', 'text'), fontWeight: '800', fontSize: 10, letterSpacing: 0.7 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, flexShrink: 1 }, statusText: { fontSize: 10, fontWeight: '800', flexShrink: 1 },
  contractClub: { flexDirection: 'row', alignItems: 'center', gap: 10 }, clubIcon: { width: 36, height: 38, backgroundColor: themeColor('rgba(255,255,255,0.025)', 'surface'), borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, clubCopy: { flex: 1, gap: 4 }, clubName: { color: TEXT, fontSize: 14, fontWeight: '800' },
  contractTeamLogo: { width: 25, height: 25 },
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dateTile: { flexGrow: 1, flexBasis: 110, gap: 7, borderRadius: 11, padding: 10, backgroundColor: themeColor('rgba(255,255,255,0.03)', 'surface') }, dateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dateLabel: { color: themeColor('#A9BCAF', 'text'), fontSize: 10, flexShrink: 1 }, dateValue: { color: themeColor('#F0F5F2', 'text'), fontSize: 13, fontWeight: '800' },
  section: { gap: 9 }, rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, roleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 10, backgroundColor: themeColor('rgba(255,255,255,0.02)', 'surface') }, roleCode: { fontSize: 12, fontWeight: '900' }, rolePercentage: { fontSize: 11, color: themeColor('#B6C5BC', 'text'), fontWeight: '700' },
  scores: { paddingTop: 12, borderTopWidth: 1, borderTopColor: themeColor('rgba(145,169,155,0.16)', 'border'), gap: 12 },
  heading: { color: ACCENT, fontSize: 17, fontWeight: '800', flexShrink: 1, maxWidth: '100%' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: PLAYER_CARD_PROFILE_GAP },
  actions: { width:'100%',flexBasis:'100%',flexDirection: 'row', flexWrap: 'nowrap', gap: 6 }, action: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 3, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, backgroundColor: themeColor('rgba(22,163,74,0.06)', 'surface') }, reportAction: { borderColor: PLAYER_ACTION_TONES.report, backgroundColor: themeColor('rgba(142,183,207,.08)', 'surface') }, matchupAction:{borderColor:PLAYER_ACTION_TONES.matchup,backgroundColor:themeColor('rgba(180,163,211,.08)', 'surface')}, actionText: { color: themeColor('#DCE8E0', 'text'), fontWeight: '800', fontSize: 11, flexShrink: 1 }, disabled: { opacity: 0.45 }, savedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6 }, savedText: { color: themeColor('#B6C5BC', 'text'), fontSize: 11, flexShrink: 1 },
});
  return {FRAME_TITLE, FRAME_HEADING, CARD, TEXT, MUTED, ACCENT, LINE, DANGER, PLAYER_ACTION_TONES, getScoreColor, styles, themeColor};
});
