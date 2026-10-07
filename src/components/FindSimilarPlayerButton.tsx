import React from 'react';
import {Alert, Text, TouchableOpacity, type StyleProp, type ViewStyle} from 'react-native';
import {UsersRound} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import ActionSpinner from './ActionSpinner';
import {resolveSimilarReference} from '@/services/similarPlayers';
import type {PlayerData} from '@/types';
import {ACCENT} from '@/theme';
export default function FindSimilarPlayerButton({player,rowId,disabled=false,onFindSimilar,beforeNavigate,style,accent=ACCENT}:{player:PlayerData;rowId?:string;disabled?:boolean;onFindSimilar?:()=>void|Promise<void>;beforeNavigate?:()=>void|Promise<void>;style?:StyleProp<ViewStyle>;accent?:string}){
  const navigation=useNavigation<any>(),{t,i18n}=useTranslation(),tr=i18n.language.startsWith('tr');
  const [busy,setBusy]=React.useState(false),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function open(){
    if(lock.current||disabled)return;lock.current=true;setBusy(true);
    try{if(onFindSimilar){await onFindSimilar();return;}const reference=await resolveSimilarReference(player,rowId);if(!mounted.current)return;await beforeNavigate?.();navigation.navigate('SimilarPlayers',{reference,visitKey:Date.now()});}
    catch{if(mounted.current)Alert.alert(tr?'Oyuncu bulunamadı':'Player unavailable',tr?'Bu oyuncu mevcut oyuncu havuzuyla eşleştirilemedi. Oyuncu Havuzu’ndan başka bir oyuncu seç.':'This player could not be matched to the current player pool. Choose another player from Player Pool.');}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('findSimilarPlayer','Similar')} accessibilityState={{disabled:disabled||busy,busy}} disabled={disabled||busy} onPress={()=>void open()} style={[style,(disabled||busy)&&{opacity:.45}]}>{busy?<ActionSpinner size={17} color={accent}/>:<UsersRound size={17} color={accent}/>}<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={{color:accent,fontWeight:'800',fontSize:11,flexShrink:1}}>{t('findSimilarPlayer','Similar')}</Text></TouchableOpacity>;
}
