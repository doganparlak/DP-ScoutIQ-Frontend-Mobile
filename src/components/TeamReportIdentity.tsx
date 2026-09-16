import React,{useEffect,useState} from 'react';
import {Image,Text,View} from 'react-native';
import {ShieldCheck} from 'lucide-react-native';
import {ACCENT} from '@/theme';
import type {Team} from '@/services/teamPool';
export default function TeamReportIdentity({team,accent=ACCENT}:{team:Team;accent?:string}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[team.logoUrl]);
 return <View style={{flexDirection:'row',alignItems:'center',gap:12}}>{team.logoUrl&&!failed?<Image source={{uri:team.logoUrl}} resizeMode="contain" style={{width:52,height:62}} onError={()=>setFailed(true)} accessibilityLabel={team.name}/>:<ShieldCheck size={44} color={accent}/>}<Text style={{flex:1,color:accent,fontSize:21,fontWeight:'900'}}>{team.name}</Text></View>;
}
