import { PLAYER_ROLE_GRID_ORDER } from '@/services/api';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Activity,CalendarX2,ClipboardPenLine,Compass,Crosshair,Goal,Hand,ListFilter,RotateCcw,Shield,SlidersHorizontal,UserRoundSearch,UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard,Pressable,Switch,Text,TextInput,View,useWindowDimensions } from 'react-native';
import { TutorialPageGuide } from './Tutorial';

import { getPlayerPoolOptions,normalizeProPlayer,proWorkspaceRequest,type PlayerPoolFilterOptions } from '@/services/api';
import { PLAYER_CARD_PROFILE_GAP,getThemed_PLAYER_ACTION_TONES as __getThemed_PLAYER_ACTION_TONES } from '@/utils/playerCardActions';
import { ContractDateFilter,ContractStatusFilter } from './ContractFilters';
import { SelectField,Selector,Status } from './LeaguePerformanceControls';
import LeaguePlayerCardModal from './LeaguePlayerCardModal';
import PlayerCard from './PlayerCard';
import ProSaveReportActions from './ProSaveReportActions';
import { ProButton,ProTrialHint,getThemed_proStyles as __getThemed_proStyles,workspaceRequestId,type ProPlayerEntry } from './ProWorkspaceControls';
type Category={key:string;tr:string;en:string;groups:{key:string;metrics:string[]}[]};
type Filters={nationality:string[];league:string[];minAge:string;maxAge:string;contractStatus:''|'loan'|'permanent';loanEndDate:string;contractEndDate:string};
const emptyFilters=():Filters=>({nationality:[],league:[],minAge:'',maxAge:'',contractStatus:'',loanEndDate:'',contractEndDate:''});
const ICONS:Record<string,typeof Activity>={impact:Activity,shooting:Goal,passing:Crosshair,defending:Shield,security:Shield,goalkeeping:Hand};

const ROLES = PLAYER_ROLE_GRID_ORDER;
export function discoveryPriorityShares(keys:string[],levels:Record<string,number>){
 const strengths=[0,1,3,5],total=keys.reduce((sum,key)=>sum+strengths[levels[key]??1],0);
 if(!total)return Object.fromEntries(keys.map(key=>[key,0]));
 const entries=keys.map(key=>({key,value:strengths[levels[key]??1]*100/total}));
 const shares=Object.fromEntries(entries.map(({key,value})=>[key,Math.floor(value)]));
 entries.sort((a,b)=>(b.value-Math.floor(b.value))-(a.value-Math.floor(a.value))).slice(0,100-Object.values(shares).reduce((sum,value)=>sum+value,0)).forEach(({key})=>shares[key]++);
 return shares;
}
export default function ProPlayerDiscovery({trial=false,sessionId,strategy,onEditStrategy,onInspect,onSimilar,onAccessRequired,onCreditsChanged,onBusyChange,onResultsShown}:{trial?:boolean;sessionId:string;strategy:string;onEditStrategy:()=>void;onInspect:(entry:ProPlayerEntry)=>void;onSimilar:(entry:ProPlayerEntry)=>void;onAccessRequired:()=>void;onCreditsChanged:()=>void;onBusyChange:(value:boolean)=>void;onResultsShown:(offset:number)=>void}){
  const themed = useThemedStyles(getModuleTheme);
  const {proStyles, ACCENT, FRAME_TITLE, LINE, TEXT, DANGER, MUTED, COLORS, CARD, PLAYER_ACTION_TONES} = themed;

 const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr'),{width,fontScale}=useWindowDimensions(),paired=width/Math.max(fontScale,1)>=360;
 const [filters,setFilters]=React.useState(emptyFilters),[roles,setRoles]=React.useState<string[]>([]),[levels,setLevels]=React.useState<Record<string,number>>({});
 const [useWeights,setUseWeights]=React.useState(false),[useStrategy,setUseStrategy]=React.useState(false),[categories,setCategories]=React.useState<Category[]>([]),[options,setOptions]=React.useState<PlayerPoolFilterOptions|null>(null),[setupError,setSetupError]=React.useState(false),[setupRetry,setSetupRetry]=React.useState(0);
 const [selector,setSelector]=React.useState<'nationality'|'league'|'roles'|null>(null),[rows,setRows]=React.useState<ProPlayerEntry[]>([]),[searched,setSearched]=React.useState(false),[lastKey,setLastKey]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const mounted=React.useRef(true),epoch=React.useRef(0),lock=React.useRef(false),pending=React.useRef<{key:string;id:string}|null>(null),resultY=React.useRef(0),reveal=React.useRef(false);
 const callbacks=React.useRef({onBusyChange,onAccessRequired,onCreditsChanged,onResultsShown});callbacks.current={onBusyChange,onAccessRequired,onCreditsChanged,onResultsShown};
 React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;epoch.current++;callbacks.current.onBusyChange(false);};},[]);
 React.useEffect(()=>{callbacks.current.onBusyChange(busy);},[busy]);
 React.useEffect(()=>{let active=true;setSetupError(false);Promise.all([getPlayerPoolOptions(false),proWorkspaceRequest<{categories:Category[]}>('discovery-config',{})]).then(([pool,config])=>{if(active){setOptions(pool);setCategories(config.categories);}}).catch(()=>{if(active)setSetupError(true);});return()=>{active=false;};},[setupRetry]);
 const visible=categories.filter(c=>roles.length===1&&roles[0]==='GK'?['goalkeeping','passing','security'].includes(c.key):c.key!=='goalkeeping'||roles.includes('GK')).sort((a,b)=>roles.includes('GK')?Number(b.key==='goalkeeping')-Number(a.key==='goalkeeping'):0);
 const shares=discoveryPriorityShares(visible.map(c=>c.key),levels),decisive=visible.filter(c=>levels[c.key]===3).length;
 const normalizedFilters={...filters,nationality:[...filters.nationality].sort(),league:[...filters.league].sort(),minAge:filters.minAge?Number(filters.minAge):null,maxAge:filters.maxAge?Number(filters.maxAge):null,contractEndDate:filters.contractEndDate||null,loanEndDate:filters.loanEndDate||null};
 const criteriaKey=JSON.stringify([normalizedFilters,[...roles].sort(),useWeights?shares:{},useWeights,useStrategy,useStrategy?strategy:'',i18n.language]);
 function change(key:keyof Filters,value:string|string[]){if(busy)return;setError('');setFilters(current=>({...current,[key]:value,...(key==='contractStatus'&&value==='permanent'?{loanEndDate:''}:{})}));}
 function reset(){setFilters(emptyFilters());setRoles([]);setError('');}
 function toggle(value:string){if(!selector||busy)return;if(selector==='roles'){setRoles(current=>!value?[]:current.includes(value)?current.filter(v=>v!==value):current.length<4?[...current,value]:current);return;}
  const key=selector;setFilters(current=>({...current,[key]:!value?[]:current[key].includes(value)?current[key].filter(v=>v!==value):current[key].length<50?[...current[key],value]:current[key]}));}
 async function search(){
  if(lock.current||!categories.length||(searched&&lastKey===criteriaKey&&!error))return;
  const ages=[filters.minAge,filters.maxAge].filter(Boolean);
  if(ages.some(age=>!/^\d+$/.test(age)||Number(age)<14||Number(age)>60)||(filters.minAge&&filters.maxAge&&Number(filters.minAge)>Number(filters.maxAge))){setError(tr?'Yaş aralığı 14–60 olmalı; minimum yaş maksimumdan büyük olamaz.':'Ages must be 14–60, with minimum no greater than maximum.');return;}
  const hasCriteria=roles.length>0||Object.values(filters).some(value=>Array.isArray(value)?value.length>0:!!value.trim());
  if(!hasCriteria&&!useWeights&&!(useStrategy&&strategy.trim())){setError(tr?'En az bir kriter belirle, arama önceliklerini aç veya takım stratejini kullan.':'Set at least one criterion, enable priorities or use your team strategy.');return;}
  if(useWeights&&!Object.values(shares).some(value=>value>0)){setError(tr?'En az bir ana kategori için öncelik belirle.':'Enable at least one main category.');return;}
  if(useStrategy&&!strategy.trim()){onEditStrategy();return;}
  Keyboard.dismiss();lock.current=true;setBusy(true);setError('');const version=++epoch.current;
  const excludedPlayerKeys:string[]=[],key=criteriaKey;
  if(pending.current?.key!==key)pending.current={key,id:workspaceRequestId()};
  try{
   const response=await proWorkspaceRequest<{players:{id:number;content:Record<string,unknown>}[];hasMore:boolean}>('discovery',{filters:normalizedFilters,roles,weights:useWeights?shares:{},useWeights,useStrategy,strategy:useStrategy?strategy:'',excludedPlayerKeys,sessionId,requestId:pending.current.id});
   if(!mounted.current||version!==epoch.current)return;
   const context={strategy:useStrategy?strategy:'',expectations:'',priorities:useWeights?visible.filter(c=>(levels[c.key]??1)>=2&&shares[c.key]>0).map(c=>({category:c.en,importance:levels[c.key]===3?'decisive' as const:'important' as const,metrics:c.groups.flatMap(g=>g.metrics)})):[]};
   const previous=new Set(excludedPlayerKeys),incoming=response.players.map(raw=>{const id=Number(raw.content.player_id);return {...normalizeProPlayer(raw),discoveryIdentity:Number.isInteger(id)&&id>0?`player:${id}`:`row:${raw.id}`};}).filter(row=>{const identity=row.discoveryIdentity;if(previous.has(identity))return false;previous.add(identity);return true;}).map(row=>({...row,discoveryContext:context}));
   reveal.current=true;setRows(incoming.slice(0,10));setSearched(true);setLastKey(criteriaKey);pending.current=null;callbacks.current.onCreditsChanged();
  }catch(reason){if(mounted.current&&version===epoch.current){if(String(reason).includes('CHAT_TRIAL_EXHAUSTED'))callbacks.current.onAccessRequired();else setError(tr?'Keşif tamamlanamadı. Lütfen yeniden dene.':'Discovery could not be completed. Please retry.');}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 const field=(key:'nationality'|'league'|'roles',label:string)=><SelectField compact label={label} value={(key==='roles'?roles:filters[key])[0]||(tr?'Çoklu seçim':'Multiple selections')} additionalCount={Math.max(0,(key==='roles'?roles:filters[key]).length-1)} onPress={()=>{if(!busy)setSelector(key);}}/>;
 const pair=(left:React.ReactNode,right:React.ReactNode)=><View style={{flexDirection:paired?'row':'column',gap:12}}><View style={{flex:paired?1:undefined,minWidth:0}}>{left}</View><View style={{flex:paired?1:undefined,minWidth:0}}>{right}</View></View>;
 const toggleRow=(label:string,value:boolean,onChange:()=>void,Icon:typeof Compass)=><View style={proStyles.heading}><Icon size={21} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1,fontSize:16}]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} disabled={busy} trackColor={{false:LINE,true:ACCENT}} thumbColor={TEXT}/></View>;
 return <View style={{gap:16}}>
  <View style={proStyles.frame}><View style={proStyles.heading}><Compass color={ACCENT} size={24}/><Text style={FRAME_TITLE}>{tr?'Oyuncu Keşfi':'Player Discovery'}</Text></View><Text style={proStyles.hint}>{tr?'Kriterlerini belirle, arama önceliklerini seç ve takım stratejine uygun oyuncuları keşfet.':'Set criteria and search priorities to discover players suited to your team strategy.'}</Text></View>
  <TutorialPageGuide page='proDiscovery' frame={0} summaryLines={0}/>
  <View style={proStyles.frame}><View style={proStyles.heading}><ListFilter size={21} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1}]}>{tr?'Benzer Oyuncu Kriterleri':'Similar Player Criteria'}</Text><Pressable accessibilityRole='button' accessibilityLabel={tr?'Tarihleri temizle':'Clear dates'} disabled={busy} onPress={()=>setFilters(current=>({...current,contractEndDate:'',loanEndDate:''}))} hitSlop={8}><CalendarX2 size={20} color={ACCENT}/></Pressable><Pressable accessibilityRole='button' accessibilityLabel={tr?'Filtreleri temizle':'Clear filters'} onPress={reset} disabled={busy} hitSlop={8}><RotateCcw size={21} color={DANGER}/></Pressable></View><Text style={proStyles.hint}>{tr?'Rol dahil tüm filtreler isteğe bağlıdır.':'All filters, including role, are optional.'}</Text>
   {pair(field('nationality',tr?'Ülke / Uyruk':'Country / Nationality'),<View style={{gap:7}}><Text style={proStyles.hint}>{tr?'Yaş (Min / Maks)':'Age (Min / Max)'}</Text><View style={{flexDirection:'row',gap:10}}>{(['minAge','maxAge'] as const).map((key,i)=><TextInput key={key} accessibilityLabel={i?(tr?'Maksimum yaş':'Maximum age'):(tr?'Minimum yaş':'Minimum age')} editable={!busy} keyboardType='number-pad' maxLength={2} value={filters[key]} onChangeText={value=>change(key,value)} placeholder={i?(tr?'Maks':'Max'):'Min'} placeholderTextColor={MUTED} style={[proStyles.input,{flex:1,height:46,paddingHorizontal:10}]}/>)}</View></View>)}
   {pair(field('league',tr?'Lig':'League'),field('roles',tr?'Roller':'Roles'))}
   <ContractStatusFilter aligned value={filters.contractStatus} disabled={busy} onChange={value=>change('contractStatus',value)}/>
   {pair(<ContractDateFilter testID="discovery-contract-end" aligned label={tr?'Bonservis bitişi':'Contract end date'} value={filters.contractEndDate} disabled={busy} onChange={value=>change('contractEndDate',value)}/>,<ContractDateFilter testID="discovery-loan-end" aligned label={tr?'Kiralık bitişi':'Loan end date'} value={filters.loanEndDate} disabled={busy||filters.contractStatus==='permanent'} onChange={value=>change('loanEndDate',value)}/>)}
  </View>
  <View style={proStyles.frame}>{toggleRow(tr?'Arama Önceliklerini Belirle':'Set Search Priorities',useWeights,()=>setUseWeights(value=>!value),SlidersHorizontal)}<Text style={proStyles.hint}>{tr?'Aramada hangi özelliklere önem verdiğini belirle. En fazla 2 ana kategori belirleyici olabilir.':'Set what matters in your search. Up to 2 main categories can be decisive.'}</Text>
   {useWeights&&visible.map(c=>{const Icon=ICONS[c.key]||Activity,color=COLORS[c.key],value=levels[c.key]??1;return <View key={c.key} style={{gap:10,paddingVertical:10,borderTopWidth:1,borderTopColor:LINE}}><View style={proStyles.heading}><Icon color={color} size={20}/><Text style={{color:TEXT,fontSize:14,fontWeight:'700',flex:1}}>{tr?c.tr:c.en}</Text></View><View accessibilityRole='radiogroup' style={{flexDirection:'row',gap:4}}>{(tr?['Dikkate alma','Destekleyici','Önemli','Belirleyici']:['Ignore','Supporting','Important','Decisive']).map((label,index)=><Pressable key={label} accessibilityRole='radio' accessibilityLabel={`${tr?c.tr:c.en}: ${label}`} accessibilityState={{selected:value===index,disabled:busy||(index===3&&decisive>=2&&value!==3)}} disabled={busy||(index===3&&decisive>=2&&value!==3)} onPress={()=>setLevels(current=>({...current,[c.key]:index}))} style={{flex:1,minWidth:0,minHeight:42,paddingHorizontal:3,paddingVertical:8,borderWidth:1,borderRadius:9,borderColor:value===index?color:LINE,backgroundColor:value===index?color+'18':CARD,justifyContent:'center',opacity:index===3&&decisive>=2&&value!==3?.35:1}}><Text style={{color:value===index?color:MUTED,fontSize:10,fontWeight:'700',textAlign:'center'}}>{label}</Text></Pressable>)}</View></View>;})}
  </View>
  <View style={proStyles.frame}>{toggleRow(tr?'Takım Stratejimi Kullan':'Use My Team Strategy',useStrategy,()=>setUseStrategy(value=>!value),ClipboardPenLine)}<Text style={proStyles.hint}>{tr?'Stratejin yalnızca son seçimde kullanılır; arama önceliklerini değiştirmez.':'Your strategy is used only in the final selection; it does not change your search priorities.'}</Text>{useStrategy&&<><Text style={{color:TEXT,fontSize:13,lineHeight:21}}>{strategy.trim()||(tr?'Önce takım stratejini belirle.':'Set your team strategy first.')}</Text><ProButton Icon={ClipboardPenLine} label={tr?'Takım Stratejisini Düzenle':'Edit Team Strategy'} onPress={onEditStrategy} disabled={busy}/></>}</View>
  <TutorialPageGuide page='proDiscovery' frame={1} summaryLines={0}/>
  {setupError&&<ProButton label={tr?'Arama seçeneklerini yeniden yükle':'Reload search options'} onPress={()=>setSetupRetry(value=>value+1)} disabled={busy}/>}
  {!!error&&<Status error text={error}/>}
  <ProTrialHint trial={trial}/>
  <ProButton primary Icon={Compass} label={busy?(tr?'Oyuncular değerlendiriliyor…':'Assessing players…'):(tr?'Oyuncuları Keşfet':'Discover Players')} onPress={()=>void search()} disabled={busy||!categories.length||(searched&&lastKey===criteriaKey&&!error)}/>
  {busy&&<Status busy text={tr?'Oyuncular değerlendiriliyor…':'Assessing players…'}/>}
  {searched&&<View style={[proStyles.frame,{gap:16}]} onLayout={event=>{resultY.current=event.nativeEvent.layout.y;if(reveal.current){reveal.current=false;callbacks.current.onResultsShown(resultY.current);}}}><View style={proStyles.heading}><UsersRound size={22} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1}]}>{tr?'Önerilen Oyuncular':'Recommended Players'}</Text><Text style={{color:ACCENT,fontWeight:'800'}}>{rows.length}/10</Text><Pressable accessibilityRole='button' accessibilityLabel={tr?'Listeyi temizle':'Clear list'} disabled={busy} onPress={()=>{setRows([]);setSearched(false);setLastKey('');pending.current=null;}} hitSlop={8}><RotateCcw size={21} color={DANGER}/></Pressable></View>
   {!rows.length&&<Status text={tr?'Bu kriterlerle yeterli verisi olan oyuncu bulunamadı.':'No players with sufficient data match these criteria.'}/>}
   {!!rows.length&&<ProTrialHint trial={trial} action={tr?'İncele':'Inspect'}/>}
   {rows.map(entry=><View key={entry.id} style={[proStyles.frame,{gap:PLAYER_CARD_PROFILE_GAP}]}><LeaguePlayerCardModal inline proMode initialEntry={entry} actionsDisabled={busy} onClose={()=>{}} renderPlayerCard={card=><View style={{width:'100%',minWidth:0,gap:PLAYER_CARD_PROFILE_GAP}}><View style={{flexDirection:'row',alignItems:'stretch',gap:6}}><View style={{flex:1,minWidth:0}}><ProButton toolbar label={tr?'İncele':'Inspect'} Icon={UserRoundSearch} color={PLAYER_ACTION_TONES.report} onPress={()=>onInspect(entry)} disabled={busy}/></View><ProSaveReportActions card={card}/><View style={{flex:1,minWidth:0}}><ProButton toolbar label={tr?'Benzeri':'Similar'} Icon={UsersRound} color={PLAYER_ACTION_TONES.matchup} onPress={()=>onSimilar(entry)} disabled={busy}/></View></View><PlayerCard player={entry.player} hideActions hideScores/></View>}/></View>)}
   {!!rows.length&&<Text style={proStyles.hint}>{tr?'Tek aramada en fazla 10 oyuncu önerilir. Yeni bir arama mevcut sonuçların yerini alır.':'Each search recommends up to 10 players. A new search replaces the current results.'}</Text>}
   {lastKey!==criteriaKey&&<Text style={proStyles.hint}>{tr?'Kriterler değişti. Yeni oyuncuları keşfetmek için Oyuncuları Keşfet’e bas.':'Criteria changed. Press Discover Players to find new players.'}</Text>}
  </View>}
  {selector&&<Selector columns={selector==='roles'?3:1} maxSelections={selector==='roles'?4:undefined} tr={tr} title={selector==='roles'?(tr?'Rol Seç · En Fazla 4':'Choose Roles · Up to 4'):(tr?'Seçenekleri Seç':'Select Options')} selected='' selectedKeys={selector==='roles'?roles:filters[selector]} options={[{key:'',label:tr?'Tümü / Seçimi temizle':'All / Clear selection'},...(selector==='roles'?ROLES:selector==='nationality'?options?.nationalities||[]:options?.leagues||[]).map(key=>({key,label:key}))]} onSelect={toggle} onClose={()=>setSelector(null)}/>}
 </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, DANGER, FRAME_TITLE, LINE, MUTED, TEXT, themeColor} = colors;
  const proStyles = __getThemed_proStyles(colors);
  const PLAYER_ACTION_TONES = __getThemed_PLAYER_ACTION_TONES(colors);
  const COLORS:Record<string,string>={impact:themeColor('#34d399'),shooting:themeColor('#60a5fa'),passing:themeColor('#c084fc'),defending:themeColor('#fbbf24'),security:themeColor('#fb7185'),goalkeeping:themeColor('#2dd4bf')};
  return {ACCENT, CARD, DANGER, FRAME_TITLE, LINE, MUTED, TEXT, proStyles, PLAYER_ACTION_TONES, COLORS, themeColor};
});
