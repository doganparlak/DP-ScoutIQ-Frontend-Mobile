import React from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {BookmarkPlus, Check, FileText} from 'lucide-react-native';
import PlayerCard from './PlayerCard';
import {ProButton} from './ProWorkspaceControls';
import {PLAYER_ACTION_TONES} from '@/utils/playerCardActions';
export default function ProSaveReportActions({card}:{card:React.ComponentProps<typeof PlayerCard>}){
 const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr');
 const [saving,setSaving]=React.useState(false),[saved,setSaved]=React.useState(false);
 const lock=React.useRef(false);
 async function save(){if(lock.current||saved||!card.onAddFavorite)return;lock.current=true;setSaving(true);try{const success=await card.onAddFavorite(card.player);if(success!==false)setSaved(true);}finally{lock.current=false;setSaving(false);}}
 return <View style={{flex:2,minWidth:0,flexDirection:'row',gap:6}}><View style={{flex:1,minWidth:0}}><ProButton toolbar label={saving?(tr?'Kaydediliyor…':'Saving…'):saved?(tr?'Kaydedildi':'Saved'):(tr?'Kaydet':'Save')} Icon={saved?Check:BookmarkPlus} color={PLAYER_ACTION_TONES.portfolio} disabled={saving||saved||card.addFavoriteDisabled} onPress={()=>void save()}/></View><View style={{flex:1,minWidth:0}}><ProButton toolbar label={card.reportState==='loading'?(tr?'Hazırlanıyor…':'Loading…'):(tr?'Rapor':'Report')} Icon={FileText} color={PLAYER_ACTION_TONES.similar} disabled={saving||card.reportDisabled||card.reportState==='loading'} onPress={()=>void card.onGenerateReport?.(card.player)}/></View></View>;
}
