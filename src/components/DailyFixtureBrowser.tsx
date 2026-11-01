import {useMatchWatchlist} from '@/hooks/useMatchWatchlist';
import {TutorialPageGuide} from '@/components/Tutorial';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useIsFocused} from '@react-navigation/native';
import {CalendarDays,ChartNoAxesCombined,ChevronLeft,ChevronRight,FileText,Shield,Star,Timer,Trophy,X} from 'lucide-react-native';
import React from 'react';
import {ActivityIndicator,AppState,FlatList,Image,Modal,Platform,Pressable,RefreshControl,SectionList,StyleSheet,Text,View} from 'react-native';
import {getDailyFixtures,getMatchCalendarBounds,isLiveMatch,matchSaveType,matchStateLabel,type DailyFixtures,type MatchCalendarBounds,type MatchFixture} from '@/services/matchPool';
import {createThemedStyles,useThemedStyles,type ThemeColors} from '@/theme';

export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const dayDate=(key:string)=>new Date(`${key}T12:00:00`);
const shiftDay=(key:string,days:number)=>{const value=dayDate(key);value.setDate(value.getDate()+days);return localDay(value);};
const kickoff=(fixture:MatchFixture)=>new Date(fixture.startingAt.replace(' ','T')+(/Z$|[+-]\d\d:\d\d$/.test(fixture.startingAt)?'':'Z'));
const live=isLiveMatch;
// Competition IDs keep the requested order consistent across both languages.
const LEAGUE_PRIORITY = new Map([
  600, 603, 8, 564, 384, 301, 82, 72, 462, 944,
  208, 501, 181, 591, 9, 304, 387, 567, 85,
].map((id,index)=>[id,index]));
const cache=new Map<string,DailyFixtures>();
const calendarCache=new Map<string,{value:MatchCalendarBounds;expires:number}>();
function Logo({url,league=false,size=23}:{url?:string|null;league?:boolean;size?:number}){
 const {ACCENT}=useThemedStyles(getTheme);const [failed,setFailed]=React.useState(false);
 React.useEffect(()=>setFailed(false),[url]);
 return url&&!failed?<Image source={{uri:url}} resizeMode="contain" style={{width:size,height:size}} onError={()=>setFailed(true)}/>:league?<Trophy size={size} color={ACCENT}/>:<Shield size={size-1} color={ACCENT}/>;
}
export default function DailyFixtureBrowser({tr,onSelect,onFixtures,onOpenReport,reportBusy=false}:{tr:boolean;onSelect:(fixture:MatchFixture)=>void;onFixtures:(fixtures:MatchFixture[])=>void;onOpenReport:(fixture:MatchFixture)=>void;reportBusy?:boolean}){
 const {s,ACCENT,TEXT,MUTED,DANGER}=useThemedStyles(getTheme);
 const focused=useIsFocused();const [foreground,setForeground]=React.useState(AppState.currentState==='active');
 const [day,setDay]=React.useState(localDay);const [anchor,setAnchor]=React.useState(localDay);const [calendar,setCalendar]=React.useState(false);
 const [draft,setDraft]=React.useState(dayDate(day));const [data,setData]=React.useState<DailyFixtures|null>(null);const [loading,setLoading]=React.useState(false);const [error,setError]=React.useState(false);
 const [refresh,setRefresh]=React.useState(0);const [refreshing,setRefreshing]=React.useState(false);const daysRef=React.useRef<FlatList<string>>(null);const request=React.useRef(0);const onFixturesRef=React.useRef(onFixtures);onFixturesRef.current=onFixtures;
 const timezone=React.useMemo(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Istanbul',[]);
 const [bounds,setBounds]=React.useState<MatchCalendarBounds|null>(()=>calendarCache.get(timezone)?.value??null);
 const [calendarError,setCalendarError]=React.useState(false);const [calendarRetry,setCalendarRetry]=React.useState(0);
 const watchlist=useMatchWatchlist(focused&&foreground,refresh,tr);
 const [liveOnly,setLiveOnly]=React.useState(false);
 const locale=tr?'tr-TR':'en-GB';
 const dates=React.useMemo(()=>Array.from({length:21},(_,i)=>shiftDay(anchor,i-10)),[anchor]);
 React.useEffect(()=>{const sub=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>sub.remove();},[]);
 React.useEffect(()=>{
  if(!focused||!foreground)return;
  let active=true;
  const accept=(value:MatchCalendarBounds)=>{
   if(!active)return;
   setBounds(value);setCalendarError(false);
   const clamped=day<value.minDate?value.minDate:day>value.maxDate?value.maxDate:day;
   if(clamped!==day){setDay(clamped);setAnchor(clamped);}
  };
  const cached=calendarCache.get(timezone);
  if(cached&&cached.expires>Date.now()){accept(cached.value);return;}
  getMatchCalendarBounds(timezone).then(value=>{
   if(!active)return;
   calendarCache.set(timezone,{value,expires:Date.now()+21600000});if(calendarCache.size>12)calendarCache.delete(calendarCache.keys().next().value!);
   accept(value);
  }).catch(()=>{if(active)setCalendarError(true);});
  return()=>{active=false;};
 },[timezone,focused,foreground,calendarRetry]);
 React.useEffect(()=>{
  if(!focused||!foreground){setRefreshing(false);setLoading(false);return;}
  let active=true;let timer:ReturnType<typeof setTimeout>|undefined;let busy=false;let midnight:ReturnType<typeof setTimeout>|undefined;
  const key=`${timezone}:${day}`;const existing=cache.get(key);setData(existing||null);setLoading(!existing);setError(false);
  if(existing)onFixturesRef.current(existing.fixtures);
  const version=++request.current;
  async function load(){
   if(busy||!active)return;busy=true;
   try{
    const result=await getDailyFixtures(day,timezone);
    if(!active||version!==request.current)return;
    cache.delete(key);cache.set(key,result);if(cache.size>24)cache.delete(cache.keys().next().value!);
    setData(result);setError(!!result.stale);onFixturesRef.current(result.fixtures);
    if(result.refreshAfter)timer=setTimeout(()=>void load(),result.refreshAfter*1000);
   }catch{if(active&&version===request.current){setError(true);if(day===localDay())timer=setTimeout(()=>void load(),60000);}}
   finally{busy=false;if(active&&version===request.current){setLoading(false);setRefreshing(false);}}
  }
  void load();
  // Follow the new day only if the user is looking at today.
  if(day===localDay()){
   const next=new Date();next.setHours(24,0,0,0);
   midnight=setTimeout(()=>{const today=localDay();setAnchor(today);setDay(today);},next.getTime()-Date.now()+1000);
  }
  return()=>{active=false;request.current++;clearTimeout(timer);clearTimeout(midnight);};
 },[day,timezone,focused,foreground,refresh]);
 const manualRefresh=()=>{setRefreshing(true);setRefresh(value=>value+1);};
 const choose=(value:string)=>{if(!bounds||value<bounds.minDate||value>bounds.maxDate)return;setRefreshing(false);const index=dates.indexOf(value);if(index<0)setAnchor(value);else daysRef.current?.scrollToIndex({index:Math.max(0,index-2),animated:true});setDay(value);};
 const sections=React.useMemo(()=>{
  const groups=new Map<string,{key:string;title:string;imageUrl?:string|null;priority:number;watchlist?:boolean;data:MatchFixture[]}>();
  const visible=(data?.fixtures||[]).filter(fixture=>!liveOnly||live(fixture));
  for(const fixture of visible){const key=String(fixture.league.id||`${fixture.country.name}:${fixture.league.name}`);if(!groups.has(key))groups.set(key,{key,title:`${fixture.country.name} | ${fixture.league.name}`,imageUrl:fixture.league.imageUrl,priority:LEAGUE_PRIORITY.get(fixture.league.id??0)??999,data:[]});groups.get(key)!.data.push(fixture);}
  const ordered=[...groups.values()].sort((a,b)=>a.priority-b.priority||a.title.localeCompare(b.title,locale));
  const tracked=visible.filter(fixture=>watchlist.ids.has(fixture.fixtureId));
  return tracked.length?[{key:'watchlist',title:tr?'Takip Ettiklerin':'Following',priority:-1,watchlist:true,data:tracked},...ordered]:ordered;
 },[data,locale,watchlist.ids,tr,liveOnly]);
 const dateTitle=dayDate(day).toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'});
 const minimum=dayDate(bounds?.minDate??localDay()),maximum=dayDate(bounds?.maxDate??localDay());
 return <View style={{flex:1}}>
  <View style={{marginHorizontal:16}}><TutorialPageGuide page="matchDaily" frame={0} summaryLines={0}/></View>
  <View style={s.datePanel}>
   <View style={s.dateHeading}>
    <Pressable accessibilityRole="button" accessibilityLabel={tr?'Önceki gün':'Previous day'} disabled={!bounds||day<=bounds.minDate} onPress={()=>choose(shiftDay(day,-1))} style={s.icon}><ChevronLeft color={ACCENT} size={21}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={tr?'Tarih seç':'Choose date'} disabled={!bounds} onPress={()=>{setDraft(dayDate(day));setCalendar(true);}} style={s.dateButton}><CalendarDays color={ACCENT} size={20}/><Text style={s.title}>{dateTitle}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={tr?'Yalnızca canlı maçlar':'Live matches only'} accessibilityState={{selected:liveOnly}} onPress={()=>setLiveOnly(value=>!value)} style={[s.liveFilter,liveOnly&&s.selected]}><Timer size={17} strokeWidth={1.7} color={liveOnly?ACCENT:MUTED}/><Text style={{fontSize:12,fontWeight:'700',color:liveOnly?ACCENT:MUTED}}>{tr?'Canlı':'Live'}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={tr?'Sonraki gün':'Next day'} disabled={!bounds||day>=bounds.maxDate} onPress={()=>choose(shiftDay(day,1))} style={s.icon}><ChevronRight color={ACCENT} size={21}/></Pressable>
   </View>
   <FlatList ref={daysRef} horizontal data={dates} key={anchor} keyExtractor={item=>item} initialScrollIndex={8} getItemLayout={(_,index)=>({length:66,offset:66*index,index})} showsHorizontalScrollIndicator={false} renderItem={({item})=><Pressable accessibilityRole="tab" accessibilityState={{selected:item===day}} accessibilityLabel={dayDate(item).toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long'})} disabled={!bounds||item<bounds.minDate||item>bounds.maxDate} onPress={()=>choose(item)} style={[s.day,item===day&&s.selected,(!bounds||item<bounds.minDate||item>bounds.maxDate)&&{opacity:.35}]}><Text style={[s.dayLabel,item===day&&{color:ACCENT}]}>{item===localDay()?(tr?'Bugün':'Today'):dayDate(item).toLocaleDateString(locale,{weekday:'short'})}</Text><Text style={[s.dayNumber,item===day&&{color:ACCENT}]}>{dayDate(item).getDate()}</Text></Pressable>}/>
   {calendarError&&<Pressable accessibilityRole="button" onPress={()=>setCalendarRetry(value=>value+1)} style={{padding:8}}><Text style={{color:DANGER,fontSize:12,textAlign:'center'}}>{tr?'Takvim yüklenemedi. Yeniden dene.':'Could not load calendar. Tap to retry.'}</Text></Pressable>}
   {day!==localDay()&&<Pressable onPress={()=>choose(localDay())} accessibilityRole="button" style={{alignSelf:'center',padding:8}}><Text style={{color:ACCENT,fontWeight:'700'}}>{tr?'Bugüne dön':'Back to today'}</Text></Pressable>}
  </View>
  <View style={{marginHorizontal:16}}><TutorialPageGuide page="matchDaily" frame={1} summaryLines={0}/></View>
  {watchlist.error&&<Pressable accessibilityRole="button" onPress={()=>setRefresh(value=>value+1)} style={{paddingHorizontal:18,paddingBottom:12}}><Text style={{color:DANGER,fontSize:12}}>{tr?'Takip listen yenilenemedi. Tekrar dene.':'Could not refresh your watchlist. Tap to retry.'}</Text></Pressable>}
  {!!error&&<Pressable accessibilityRole="button" onPress={manualRefresh} style={{paddingHorizontal:18,paddingBottom:12}}><Text style={{color:DANGER,fontSize:13}}>{tr?'Maçlar yenilenemedi. Yeniden dene.':'Could not refresh matches. Tap to retry.'}</Text></Pressable>}
  <SectionList key={day} sections={sections} keyExtractor={item=>String(item.fixtureId)} stickySectionHeadersEnabled contentContainerStyle={{padding:16,paddingTop:0,paddingBottom:32,flexGrow:1}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={manualRefresh} tintColor={ACCENT} colors={[ACCENT]}/>} renderSectionHeader={({section})=><View style={s.leagueHeading}><View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>{section.watchlist?<Star size={19} strokeWidth={1.6} color={ACCENT} fill={ACCENT}/>:<Logo url={section.imageUrl} league size={28}/>}</View><Text style={s.leagueText}>{section.title}</Text></View>} renderSectionFooter={()=> <View style={{height:18}}/>}
   ListEmptyComponent={loading&&!refreshing?<ActivityIndicator color={ACCENT} style={{padding:36}}/>:<View style={s.empty}>{liveOnly?<Timer size={32} color={ACCENT}/>:<CalendarDays size={32} color={ACCENT}/>}<Text style={s.title}>{error?(tr?'Maçlar yüklenemedi':'Could not load matches'):liveOnly?(tr?'Bu tarihte canlı maç yok.':'No live matches on this date.'):(tr?'Bu tarihte maç bulunmuyor':'No matches on this date')}</Text><Text style={{color:MUTED,textAlign:'center'}}>{liveOnly?(tr?'Tüm maçları görmek için kronometreye tekrar dokun.':'Tap the stopwatch again to show all matches.'):(tr?'Başka bir gün seçebilir veya Takım Fikstürü’nden arayabilirsin.':'Choose another date or use Team Fixtures.')}</Text></View>}
   renderItem={({item})=>{const playing=live(item);const phase=matchSaveType(item);const reportType=phase==='pre_match'&&item.forecastAvailable!==true?null:phase;const upcoming=['NS','TBA','POSTP','POST','DELAYED','CANC','CANCL','ABAN'].includes(item.state.code.toUpperCase());return <View style={s.fixture}><View style={{flexDirection:'row',alignItems:'center'}}><Pressable testID={`daily-match-${item.fixtureId}`} accessibilityRole="button" accessibilityLabel={`${item.homeTeam.name}, ${item.awayTeam.name}, ${matchStateLabel(item,tr)}`} onPress={()=>onSelect(item)} style={({pressed})=>[s.match,{flex:1},pressed&&{opacity:.7}]}>
    <View style={s.time}><Text style={[s.timeText,playing&&{color:ACCENT}]}>{playing?(item.minute?`${item.minute}′`:tr?'Canlı':'Live'):kickoff(item).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</Text><Text style={{color:playing?ACCENT:MUTED,fontSize:10,textAlign:'center'}}>{matchStateLabel(item,tr)}</Text></View>
    <View style={{flex:1,gap:10}}>{[item.homeTeam,item.awayTeam].map(team=><View key={team.id} style={s.team}><Logo url={team.imageUrl}/><Text numberOfLines={2} style={[s.teamName,{color:TEXT}]}>{team.name}</Text><Text style={[s.score,playing&&{color:ACCENT}]}>{upcoming?'–':team.score??'–'}</Text></View>)}</View>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={watchlist.ids.has(item.fixtureId)?(tr?'Takipten çıkar':'Unfollow match'):(tr?'Maçı takip et':'Follow match')} accessibilityState={{selected:watchlist.ids.has(item.fixtureId),disabled:watchlist.pending.has(item.fixtureId)}} disabled={watchlist.pending.has(item.fixtureId)} onPress={()=>watchlist.toggle(item.fixtureId)} style={{width:36,minHeight:44,alignItems:'center',justifyContent:'center',opacity:watchlist.pending.has(item.fixtureId)?0.5:1}}>{watchlist.pending.has(item.fixtureId)?<ActivityIndicator size="small" color={ACCENT}/>:<View style={[s.starBadge,watchlist.ids.has(item.fixtureId)&&s.starBadgeSelected]}><Star size={13} strokeWidth={1.5} strokeLinejoin="round" color={watchlist.ids.has(item.fixtureId)?ACCENT:MUTED} fill={watchlist.ids.has(item.fixtureId)?ACCENT:'transparent'}/></View>}</Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={`${tr?'Maçı aç':'Open match'}: ${item.name}`} onPress={()=>onSelect(item)} style={{width:28,minHeight:44,marginRight:7,alignItems:'center',justifyContent:'center'}}><ChevronRight size={14} strokeWidth={1.6} color={MUTED}/></Pressable>
   </View>
   {!!reportType&&<Pressable testID={`daily-report-${item.fixtureId}`} accessibilityRole="button" accessibilityLabel={reportType==='pre_match'?(tr?'ScoutWise’ın Tahminini Gör':'See ScoutWise’s Prediction'):(tr?'Maç Sonu Raporu':'Post-Match Report')} accessibilityState={{disabled:reportBusy}} disabled={reportBusy} onPress={()=>onOpenReport(item)} style={[s.reportButton,reportBusy&&{opacity:.5}]}>
    {reportType==='pre_match'?<ChartNoAxesCombined size={16} color={ACCENT}/>:<FileText size={16} color={ACCENT}/>}<Text style={s.reportLabel}>{reportType==='pre_match'?<>{!tr&&'See '}<Text style={{color:TEXT}}>Scout<Text style={{color:ACCENT}}>Wise</Text></Text>{tr?'’ın Tahminini Gör':'’s Prediction'}</>:(tr?'Maç Sonu Raporu':'Post-Match Report')}</Text>
   </Pressable>}
   </View>;}}/>
  {calendar&&(Platform.OS==='android'?<DateTimePicker value={draft} mode="date" minimumDate={minimum} maximumDate={maximum} onChange={(event,value)=>{setCalendar(false);if(event.type==='set'&&value)choose(localDay(value));}}/>:<Modal visible transparent animationType="fade" onRequestClose={()=>setCalendar(false)}><View style={s.backdrop}><View style={s.calendar}><View style={s.dateHeading}><Text style={[s.title,{flex:1}]}>{tr?'Tarih Seç':'Choose Date'}</Text><Pressable accessibilityRole="button" accessibilityLabel={tr?'Kapat':'Close'} onPress={()=>setCalendar(false)} style={s.icon}><X size={23} color={DANGER}/></Pressable></View><DateTimePicker key={locale} locale={locale} value={draft} mode="date" display="inline" minimumDate={minimum} maximumDate={maximum} onChange={(_,value)=>{if(value)setDraft(value);}}/><Pressable style={[s.dateButton,s.selected]} onPress={()=>{choose(localDay(draft));setCalendar(false);}}><Text style={{color:ACCENT,fontWeight:'800'}}>{tr?'Tamam':'Done'}</Text></Pressable></View></View></Modal>)}
 </View>;
}
const getTheme=createThemedStyles((colors:ThemeColors)=>{
 const {ACCENT,TEXT,MUTED,DANGER,PANEL,CARD,LINE,themeColor}=colors;
 const s=StyleSheet.create({
 liveFilter:{minHeight:36,paddingHorizontal:12,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:LINE,borderRadius:18,backgroundColor:PANEL},
 starBadge:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center'},starBadgeSelected:{borderColor:ACCENT,backgroundColor:themeColor('rgba(22,163,74,.12)','surface')},
 datePanel:{margin:16,marginBottom:8,padding:8,borderRadius:18,borderWidth:1,borderColor:ACCENT,backgroundColor:PANEL,gap:5},dateHeading:{flexDirection:'row',alignItems:'center',gap:4},dateButton:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:6,paddingHorizontal:8,borderRadius:12},icon:{padding:8,minWidth:40,minHeight:40,alignItems:'center',justifyContent:'center'},title:{color:TEXT,fontSize:15,fontWeight:'800',flexShrink:1},day:{width:60,marginRight:6,paddingVertical:7,gap:2,borderRadius:11,alignItems:'center',borderWidth:1,borderColor:LINE,backgroundColor:CARD},selected:{borderColor:ACCENT,backgroundColor:themeColor('rgba(22,163,74,.12)','surface')},dayLabel:{color:MUTED,fontSize:11,fontWeight:'700'},dayNumber:{color:TEXT,fontSize:16,fontWeight:'900'},leagueHeading:{backgroundColor:PANEL,borderWidth:1,borderColor:ACCENT,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:9},leagueText:{color:ACCENT,fontSize:13,fontWeight:'800',flex:1},fixture:{borderBottomWidth:1,borderBottomColor:LINE,backgroundColor:PANEL},match:{flexDirection:'row',alignItems:'center',gap:12,padding:13},reportButton:{marginHorizontal:13,marginBottom:12,minHeight:40,paddingVertical:8,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:LINE,backgroundColor:themeColor('rgba(22,163,74,.05)','surface'),flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},reportLabel:{color:ACCENT,fontSize:12,fontWeight:'800',flexShrink:1,textAlign:'center'},time:{width:61,gap:5,alignItems:'center'},timeText:{color:TEXT,fontSize:12,fontWeight:'800'},team:{flexDirection:'row',alignItems:'center',gap:9},teamName:{flex:1,fontSize:13,fontWeight:'700'},score:{color:TEXT,fontSize:16,fontWeight:'900',minWidth:24,textAlign:'center'},empty:{padding:30,gap:14,alignItems:'center'},backdrop:{flex:1,justifyContent:'center',padding:18,backgroundColor:themeColor('rgba(0,0,0,.7)','surface')},calendar:{padding:16,borderRadius:20,borderWidth:1,borderColor:ACCENT,backgroundColor:PANEL},
 });return{s,ACCENT,TEXT,MUTED,DANGER};
});
