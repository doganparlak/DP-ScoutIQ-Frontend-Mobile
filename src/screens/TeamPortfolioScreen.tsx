import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import { Action,SelectField,Selector,Status } from '@/components/LeaguePerformanceControls';
import SavedTeamReportModal from '@/components/SavedTeamReportModal';
import TeamProfileCard from '@/components/TeamProfileCard';
import { TutorialPageGuide } from '@/components/Tutorial';
import type { TeamFilters } from '@/services/teamPool';
import { deleteFavoriteTeam,EMPTY_TEAM_PORTFOLIO_FILTERS,favoriteTeamOptions,filterFavoriteTeams,getFavoriteTeams,type FavoriteTeam } from '@/services/teamPortfolio';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { comparisonSourceShortLabel } from '@/utils/comparisonSourceLabel';
import { portfolioViewportHeight } from '@/utils/portfolioLayout';
import { shortCountry,shortPlayer } from '@/utils/seasonTableLabels';
import { useFocusEffect,useIsFocused,useNavigation } from '@react-navigation/native';
import { ListFilter,RotateCcw,ShieldCheck,Trash2,X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator,Alert,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,useWindowDimensions,View } from 'react-native';


function Frame({title, Icon, action, children}: {title: string; Icon: typeof ShieldCheck; action?: React.ReactNode; children: React.ReactNode}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, FRAME_STRIPE, FRAME_HEADING, ACCENT, FRAME_TITLE} = themed;

  return <View style={styles.frame}><View style={FRAME_STRIPE}/><View style={[FRAME_HEADING,{marginBottom:16}]}><Icon size={20} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1}]}>{title}</Text>{action}</View>{children}</View>;
}
export default function TeamPortfolioScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {BG, styles, DANGER, MUTED, ACCENT, table, LINE, FRAME_HEADING, FRAME_TITLE} = themed;

  const {i18n}=useTranslation(), tr=i18n.language.startsWith('tr');
  const nav=useNavigation<any>(), focused=useIsFocused(), ads=useWorkspaceActionAd();
  const {width,height,fontScale}=useWindowDimensions();
  const pageScroll=React.useRef<ScrollView>(null);
  const mounted=React.useRef(true), operation=React.useRef(false), version=React.useRef(0);
  const [rows,setRows]=React.useState<FavoriteTeam[]>([]);
  const [filters,setFilters]=React.useState<TeamFilters>(EMPTY_TEAM_PORTFOLIO_FILTERS);
  const [loading,setLoading]=React.useState(true), [error,setError]=React.useState(''), [retry,setRetry]=React.useState(0);
  const [selector,setSelector]=React.useState<'country'|'league'|null>(null);
  const [selected,setSelected]=React.useState<FavoriteTeam|null>(null), [cardOpen,setCardOpen]=React.useState(false);
  const [deleting,setDeleting]=React.useState(''), [reportId,setReportId]=React.useState('');
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;version.current++;};},[]);
  useFocusEffect(React.useCallback(()=>{
    let alive=true;const request=++version.current;
    setLoading(true);setError('');
    getFavoriteTeams().then(value=>{if(alive&&request===version.current)setRows(value);}).catch(reason=>{if(alive&&request===version.current)setError(reason instanceof Error?reason.message:String(reason));}).finally(()=>{if(alive&&request===version.current)setLoading(false);});
    return()=>{alive=false;setCardOpen(false);setReportId('');};
  },[retry]));
  const options=favoriteTeamOptions(rows,filters), visible=filterFavoriteTeams(rows,filters);
  const labels=tr?['Takım Adı','Ülke','Lig','Teknik D.']:['Team Name','Country','League','Coach'];
  const flexes=[2,.9,.8,1.3], deleteWidth=42*Math.max(1,fontScale);
  const tableWidth=Math.max(width-66,310*Math.max(1,fontScale));
  function update(key:'country'|'league',value:string){
    setFilters(current=>({...current,[key]:value,team:''}));setSelector(null);
  }
  function confirmDelete(row:FavoriteTeam){
    Alert.alert(tr?'Takımı sil':'Remove Team',tr?`${row.team.name} portföyden silinsin mi? Kayıtlı raporların korunur.`:`Remove ${row.team.name} from your portfolio? Saved reports are kept.`,[
      {text:tr?'İptal':'Cancel',style:'cancel'},
      {text:tr?'Sil':'Delete',style:'destructive',onPress:()=>{void remove(row);}},
    ]);
  }
  async function remove(row:FavoriteTeam){
    if(operation.current)return;operation.current=true;setDeleting(row.favoriteId);
    try{await deleteFavoriteTeam(row.favoriteId);if(mounted.current){setRows(current=>current.filter(item=>item.favoriteId!==row.favoriteId));setFilters(EMPTY_TEAM_PORTFOLIO_FILTERS);if(selected?.favoriteId===row.favoriteId){setSelected(null);setCardOpen(false);}}}
    catch(reason){if(mounted.current)Alert.alert(tr?'Takım silinemedi':'Could not remove team',reason instanceof Error?reason.message:String(reason));}
    finally{operation.current=false;if(mounted.current)setDeleting('');}
  }
  async function openReport(){
    if(!selected?.latestReportId||operation.current)return;
    const id=selected.latestReportId;operation.current=true;setCardOpen(false);
    await new Promise<void>(resolve=>setTimeout(resolve,350));
    try{await ads.run('teamAnalysisReport',()=>{if(mounted.current)setReportId(id);});}
    catch(reason){if(mounted.current){setCardOpen(true);Alert.alert(tr?'Rapor açılamadı':'Could not open report',reason instanceof Error?reason.message:String(reason));}}
    finally{operation.current=false;}
  }
  function closeReport(){setReportId('');setTimeout(()=>{if(mounted.current)setCardOpen(true);},350);}
  return <ScrollView ref={pageScroll} style={{flex:1,backgroundColor:BG}} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Frame title={tr?'Takım Portföyü Filtreleri':'Team Portfolio Filters'} Icon={ListFilter} action={<Pressable accessibilityRole="button" accessibilityLabel={tr?'Filtreleri temizle':'Clear Filters'} onPress={()=>setFilters(EMPTY_TEAM_PORTFOLIO_FILTERS)} hitSlop={10}><RotateCcw size={20} color={DANGER}/></Pressable>}>
      <View style={{gap:14}}><View style={{gap:7}}><Text style={styles.hint}>{tr?'Takım Adı':'Team Name'}</Text><TextInput accessibilityLabel={tr?'Takım adıyla ara':'Search team name'} placeholder={tr?'Takım ara':'Search team'} placeholderTextColor={MUTED} value={filters.team} onChangeText={team=>setFilters(current=>({...current,team}))} style={styles.input}/></View>
      <SelectField label={tr?'Ülke':'Country'} value={filters.country||(tr?'Tümü':'All')} onPress={()=>setSelector('country')}/>
      <SelectField label={tr?'Lig':'League'} value={filters.league||(tr?'Tümü':'All')} onPress={()=>setSelector('league')}/></View>
    </Frame>
    <TutorialPageGuide page="teamPortfolio" frame={0} onShow={y=>pageScroll.current?.scrollTo({y:Math.max(0,y-12),animated:true})}/>
    <Frame title={tr?'Takım Portföyü':'Team Portfolio'} Icon={ShieldCheck} action={<View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{color:ACCENT,fontWeight:'800'}}>{visible.length}</Text><Pressable accessibilityRole="button" accessibilityLabel={tr?'Yenile':'Refresh'} disabled={loading||!!deleting} onPress={()=>setRetry(value=>value+1)} hitSlop={10}><RotateCcw size={18} color={ACCENT}/></Pressable></View>}>
      {error?<View style={{gap:10}}><Text style={{color:DANGER}}>{error}</Text><Action label={tr?'Tekrar dene':'Retry'} onPress={()=>setRetry(value=>value+1)}/></View>:loading?<ActivityIndicator color={ACCENT} style={{padding:24}}/>:visible.length?<ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={tableWidth>width-66}>
        <View style={[table.table,{width:tableWidth}]}><View style={[table.row,table.header,{marginRight:5}]}>{labels.map((label,i)=><Text key={label} style={[table.cell,table.headerText,{flex:flexes[i],fontSize:11}]}>{label}</Text>)}<View accessibilityLabel={tr?'Sil':'Delete'} style={{width:deleteWidth,alignItems:'center',justifyContent:'center'}}><Trash2 size={16} color={MUTED}/></View></View>
        <ScrollView nestedScrollEnabled bounces={false} style={{maxHeight:portfolioViewportHeight(height),marginTop:8}} contentContainerStyle={{paddingRight:5,paddingVertical:4,gap:8}}>
        {visible.map(row=><View key={row.favoriteId} style={[table.row,{alignItems:'stretch'},selected?.favoriteId===row.favoriteId&&table.selected]}>
          <Pressable accessibilityRole="button" accessibilityState={{selected:selected?.favoriteId===row.favoriteId}} accessibilityLabel={`${row.team.name}, ${row.team.country}, ${row.team.league}, ${row.team.coachName}${row.latestReportId?(tr?', Rapor mevcut':', Report available'):''}`} onPress={()=>{setSelected(row);setCardOpen(true);}} style={({pressed})=>[{flex:1,flexDirection:'row',alignItems:'center'},pressed&&table.pressed]}>
            <View style={{flex:flexes[0],paddingHorizontal:3,paddingVertical:10,alignItems:'center',gap:4,borderRightWidth:1,borderColor:LINE}}><Text style={styles.teamName}>{row.team.name}</Text></View>
            {[shortCountry(row.team.country),comparisonSourceShortLabel({competition:row.team.league,team:''}),shortPlayer(row.team.coachName)||'—'].map((value,i)=><Text key={i} numberOfLines={2} style={[table.cell,{flex:flexes[i+1],borderRightWidth:i<2?1:0,borderColor:LINE}]}>{value}</Text>)}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${row.team.name}, ${tr?'Sil':'Delete'}`} disabled={!!deleting} onPress={()=>confirmDelete(row)} style={{width:deleteWidth,minHeight:48,alignItems:'center',justifyContent:'center',borderLeftWidth:1,borderColor:LINE}}>{deleting===row.favoriteId?<ActivityIndicator color={DANGER}/>:<Trash2 size={18} color={DANGER}/>}</Pressable>
        </View>)}</ScrollView></View>
      </ScrollView>:<Status text={rows.length?(tr?'Filtrelere uyan takım yok.':'No teams match these filters.'):(tr?'Takım Havuzu’ndaki Kaydet butonuyla portföyüne takım ekle.':'Save a team from Team Pool to add it to your portfolio.')}/>}
    </Frame>
    {selector&&<Selector title={selector==='country'?(tr?'Ülke Seç':'Select Country'):(tr?'Lig Seç':'Select League')} tr={tr} options={[{key:'',label:tr?'Tümü':'All'},...(selector==='country'?options.countries:options.leagues).map(value=>({key:value,label:value}))]} selected={filters[selector]} onSelect={value=>update(selector,value)} onClose={()=>setSelector(null)}/>}
    <Modal visible={focused&&cardOpen&&!!selected&&!reportId} transparent animationType="fade" onRequestClose={()=>setCardOpen(false)}><View style={styles.backdrop}><View style={styles.modal} accessibilityViewIsModal><View style={[FRAME_HEADING,{marginBottom:14}]}><ShieldCheck size={20} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1}]}>{tr?'Takım Kartı':'Team Card'}</Text><Pressable accessibilityRole="button" accessibilityLabel={tr?'Kapat':'Close'} onPress={()=>setCardOpen(false)} hitSlop={10}><X size={22} color={DANGER}/></Pressable></View><ScrollView>{selected&&<TeamProfileCard team={selected.team} tr={tr} onOpenReport={selected.latestReportId?()=>void openReport():undefined} reportBusy={ads.busy} onAnalyze={()=>{setCardOpen(false);setTimeout(()=>nav.navigate('TeamAnalysis',{team:selected.team}),350);}}/>}</ScrollView></View></View></Modal>
    {ads.fallback}
    {focused&&reportId&&<SavedTeamReportModal reportId={reportId} tr={tr} onClose={closeReport} onOpenPlans={()=>{setReportId('');setCardOpen(false);setTimeout(()=>nav.navigate('Profile',{screen:'ManagePlan'}),350);}}/>}
  </ScrollView>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, DANGER, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const styles=StyleSheet.create({page:{padding:16,gap:16,paddingBottom:40},frame:{padding:16,borderWidth:1,borderColor:ACCENT,borderRadius:20,backgroundColor:PANEL},hint:{color:MUTED,fontSize:12,fontWeight:'700'},input:{borderWidth:1,borderColor:LINE,borderRadius:12,padding:12,minHeight:46,color:TEXT,backgroundColor:themeColor('#1F2220', 'surface')},teamName:{color:TEXT,fontSize:11.5,textAlign:'center'},backdrop:{flex:1,backgroundColor:themeColor('rgba(0,0,0,.8)', 'surface'),padding:20,justifyContent:'center'},modal:{width:'100%',maxWidth:560,maxHeight:'90%',alignSelf:'center',padding:16,borderRadius:20,borderWidth:1,borderColor:ACCENT,backgroundColor:PANEL}});

  const table=StyleSheet.create({
  table:{marginTop:10,borderTopWidth:1,borderBottomWidth:1,borderColor:LINE},
  row:{flexDirection:'row',alignItems:'center',minHeight:52,borderWidth:1,borderColor:themeColor('rgba(36,245,166,.16)', 'border'),backgroundColor:themeColor('rgba(22,163,74,.055)', 'surface'),borderRadius:14,paddingHorizontal:4,overflow:'hidden'},
  header:{borderColor:themeColor('rgba(36,245,166,.22)', 'border'),backgroundColor:themeColor('rgba(22,163,74,.09)', 'surface')},
  selected:{borderColor:ACCENT,backgroundColor:themeColor('rgba(22,163,74,.14)', 'surface')},
  pressed:{transform:[{scale:.992}],backgroundColor:themeColor('rgba(22,163,74,.12)', 'surface')},
  cell:{minWidth:0,paddingVertical:10,paddingHorizontal:2,textAlign:'center',color:TEXT,fontSize:11.5},
  headerText:{color:TEXT,fontSize:11,lineHeight:14,fontWeight:'800'},
});
  return {ACCENT, BG, DANGER, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT, styles, table, themeColor};
});
