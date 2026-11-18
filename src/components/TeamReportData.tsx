import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useEffect,useMemo,useState } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';

import { matchPoolRequest } from '@/services/api';
import type { PlayedMatch } from '@/services/teamAnalysis';
import type { PostMatchCardData } from '@/services/matchPool';
import type { Team } from '@/services/teamPool';
import { hasNonZeroReportValue,matchMetricLabel } from '@/utils/matchReportMetrics';
import { aggregatePlayerData } from '@/utils/teamReportPlayerData';
import { MatchReportSelector,Metrics } from './MatchReportPlayerAnalysis';
import ReportPlayerPortrait from './ReportPlayerPortrait';
import TeamReportHeader from './TeamReportHeader';
import TeamReportLockedDetail from './TeamReportLockedDetail';
import ActionSpinner from './ActionSpinner';

export { aggregatePlayerData } from '@/utils/teamReportPlayerData';
const groups = [
  ['contribution_impact', 'Katkı ve Etki', 'Contribution & Impact'],
  ['shooting', 'Şut', 'Shooting'],
  ['passing', 'Pas', 'Passing'],
  ['set_pieces', 'Duran Toplar', 'Set Pieces'],
  ['defending', 'Savunma', 'Defending'],
  ['errors_discipline', 'Hatalar ve Disiplin', 'Errors & Discipline'],
  ['expected', 'Gelişmiş Metrikler', 'Advanced Metrics'],
  ['opponent_threat', 'Rakipten Gelen Tehdit', 'Opponent Threat'],
  ['opponent_profile', 'Rakip Oyun Profili', 'Opponent Playing Profile'],
] as const;

type TeamMetric = {name:string;perMatch:number;matchesCovered:number;aggregation:string};
type TeamMetrics = Record<string, TeamMetric[]>;

export function TeamReportTeamData({team,matches,metrics,tr,active,free,rewarded,canWatchAd,reportId,onOpenPlans}:{
  team:Team;matches:PlayedMatch[];metrics:TeamMetrics;tr:boolean;active:boolean;free:boolean;
  rewarded:boolean;canWatchAd:boolean;reportId?:string;onOpenPlans:()=>void;
}) {
  const {s, ACCENT} = useThemedStyles(getModuleTheme);
  const [selected, setSelected] = useState<string>();
  const [opponentData, setOpponentData] = useState<{key:string;metrics:TeamMetrics}>();
  const [opponentError, setOpponentError] = useState(false);
  const [retry, setRetry] = useState(0);
  const fixtureKey = matches.map(match => match.fixtureId).join(',');
  const requestKey = JSON.stringify([team.id,team.leagueId,fixtureKey,reportId,tr]);
  const visibleMetrics = (key:string) => (metrics[key] ?? []).filter(metric =>
    hasNonZeroReportValue(metric.perMatch) && metric.matchesCovered > 0 &&
    (key !== 'contribution_impact' || !/^Shooting Performance(?: \(SP\))?$/i.test(metric.name)));
  const isOpponentGroup = (key:string) => key.startsWith('opponent_');
  const available = groups.filter(([key]) => isOpponentGroup(key) || visibleMetrics(key).length);
  const group = available.find(([key]) => key === selected) ?? available[0];
  const isOpponent = !!group && isOpponentGroup(group[0]);
  const locked = isOpponent && free && !rewarded;
  const needsOpponentData = active && isOpponent && !locked && opponentData?.key !== requestKey;

  useEffect(() => {
    if (!needsOpponentData) return;
    let current = true;
    setOpponentError(false);
    matchPoolRequest<TeamMetrics>(`/team-analysis/report-profile/opponents?rewarded=${rewarded}`, {
      teamId:Number(team.id), leagueId:team.leagueId, fixtureIds:fixtureKey.split(',').map(Number), reportId,
    }).then(result => {
      if (current) setOpponentData({key:requestKey,metrics:result});
    }).catch(() => {
      if (current) setOpponentError(true);
    });
    return () => { current = false; };
  }, [needsOpponentData, requestKey, fixtureKey, team.id, team.leagueId, reportId, rewarded, retry]);

  const rows = isOpponent
    ? opponentData?.key === requestKey ? opponentData.metrics[group[0]] ?? [] : []
    : group ? visibleMetrics(group[0]) : [];
  return <View style={{gap:12}}>
    <TeamReportHeader team={team} matches={matches.length} tr={tr}/>
    <View style={s.frame}>
      <Text style={s.caption}>{tr ? 'Tüm istatistikler maç başına gösterilir; oranlar yüzde olarak korunur.' : 'All statistics are per match; rates retain their percentages.'}</Text>
      <MatchReportSelector label={tr ? 'Analiz Bölümü' : 'Analysis Section'} value={group?.[tr ? 1 : 2] ?? '—'}
        options={available.map(([key,trName,enName],id) => ({
          id, name:tr ? trName : enName,
          plan:isOpponentGroup(key) && free && !rewarded ? 'plus' : undefined,
          rewardedUnlock:isOpponentGroup(key) && free && !rewarded && canWatchAd,
        }))} onSelect={index => setSelected(available[index]?.[0])} accent={ACCENT} tr={tr}/>
    </View>
    {locked ? <TeamReportLockedDetail tr={tr} kind="opponentData" onOpenPlans={onOpenPlans}/>
      : needsOpponentData ? <View style={s.frame}>{opponentError
        ? <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={{color:ACCENT}}>{tr ? 'Rakip verileri yüklenemedi. Tekrar dene.' : 'Could not load opponent data. Retry.'}</Text></Pressable>
        : <ActionSpinner color={ACCENT} size={24}/>}</View>
      : rows.length ? <View style={s.grid}>{rows.map(metric => <View key={metric.name} style={s.metric}>
        <Text style={s.caption}>{matchMetricLabel(metric.name,tr ? 'tr' : 'en')}</Text>
        <Text style={s.value}>{metric.perMatch.toLocaleString(tr ? 'tr-TR' : 'en-GB',{maximumFractionDigits:2})}{/%|percentage/i.test(metric.name) ? '%' : ''}</Text>
        <Text style={s.coverage}>{metric.matchesCovered} {tr ? 'maç' : 'matches'}</Text>
      </View>)}</View>
      : <Text style={s.caption}>{tr ? 'Bu bölüm için istatistik bulunamadı.' : 'No statistics available for this section.'}</Text>}
  </View>;
}
export function TeamReportPlayerData({team,matches,reports,tr}:{team:Team;matches:number;reports:PostMatchCardData[];tr:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT} = themed;

 const players=useMemo(()=>aggregatePlayerData(reports,team.id),[reports,team.id]);
 const [playerId,setPlayerId]=useState<number>(),[show,setShow]=useState(false);
 const current=players.find(p=>p.player.player_id===playerId)||players[0],player=current?.player;
 const position=player?.position_name||'';
 return <View style={{gap:12}}><TeamReportHeader team={team} matches={matches} tr={tr}/><View style={s.frame}><MatchReportSelector label={tr?'Oyuncu Seçimi':'Select Player'} value={player?.player_name||'—'} options={players.map(p=>({id:p.player.player_id,name:p.player.player_name||'—'}))} onSelect={id=>{setPlayerId(id);setShow(false);}} accent={ACCENT}/><Text style={s.caption}>{players.length} {tr?'süre alan oyuncu':'players used'}</Text></View>{current&&player&&<View style={s.frame}><View style={s.playerHeader}><ReportPlayerPortrait imageUrl={player.player_image_url} accent={ACCENT} size={54}/><View style={{flex:1,gap:6}}><Text style={s.title}>{player.player_name}</Text><Text style={s.caption}>{tr?({goalkeeper:'Kaleci',defender:'Savunma',midfielder:'Orta Saha',attacker:'Hücum',forward:'Hücum'}[position.toLowerCase()]||position):position}</Text></View></View><View style={s.grid}>{[[tr?'Maç':'Appearances',current.appearances],[tr?'İlk 11 / Yedekten':'Starts / Substitute',`${current.starts} / ${current.bench}`],[tr?'Oynanan Süre (Maç Başına)':'Minutes (Per Match)',`${(current.appearances?current.minutes/current.appearances:0).toLocaleString(tr?'tr-TR':'en-GB',{maximumFractionDigits:1})} ${tr?'dk.':'min'}`],[tr?'Puan':'Rating',current.minutes>=90?current.rating?.toFixed(2)||'—':'—']].map(([label,value])=><View key={label} style={s.metric}><Text style={s.caption}>{label}</Text><Text style={s.value}>{value}</Text></View>)}</View><Text style={s.caption}>{tr?'Metrikler 90 dakika başına gösterilir; oranlar kayıtlı toplamlar üzerinden hesaplanır, puan dakika ağırlıklıdır.':'Metrics are per 90 minutes; rates use pooled recorded inputs and ratings are minute-weighted.'}</Text><Pressable style={s.button} onPress={()=>setShow(true)}><Text style={{color:ACCENT,fontWeight:'800'}}>{tr?'Metrikleri Gör':'View Metrics'}</Text></Pressable></View>}{show&&player&&<Metrics player={player} tr={tr} accent={ACCENT} unit="per90" onClose={()=>setShow(false)}/>}</View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, TEXT, themeColor} = colors;

  const s=StyleSheet.create({frame:{padding:14,gap:14,borderWidth:1,borderColor:`${ACCENT}60`,borderRadius:18,backgroundColor:CARD},playerHeader:{flexDirection:'row',alignItems:'center',gap:12},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:10},metric:{width:'48%',padding:12,gap:10,borderWidth:1,borderColor:`${ACCENT}50`,borderRadius:14,backgroundColor:CARD},caption:{color:MUTED,fontSize:11,lineHeight:17},coverage:{color:ACCENT,fontSize:10},value:{color:ACCENT,fontSize:22,fontWeight:'900'},title:{color:TEXT,fontSize:22,fontWeight:'900'},button:{padding:14,borderWidth:1,borderColor:ACCENT,borderRadius:14,alignItems:'center'}});
  return {ACCENT, CARD, LINE, MUTED, TEXT, s, themeColor};
});
