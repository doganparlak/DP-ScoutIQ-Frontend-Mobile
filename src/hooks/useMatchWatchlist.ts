import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {Alert} from 'react-native';
import {getMe} from '@/services/api';
import {getMatchWatchlist,setMatchWatchlist} from '@/services/matchPool';

// Only account-scoped preferences are cached; both row copies use the daily feed.
export function useMatchWatchlist(active:boolean,refresh:number,tr:boolean){
 const [ids,setIds]=React.useState<Set<number>>(new Set());
 const [ready,setReady]=React.useState(false);
 const [error,setError]=React.useState(false);
 const [pending,setPending]=React.useState<Set<number>>(new Set());
 const owner=React.useRef<string|null>(null);
 const readyRef=React.useRef(false);
 const loading=React.useRef<Promise<void>>(Promise.resolve());
 const values=React.useRef(new Set<number>());
 const busy=React.useRef(new Map<number,boolean|null>());
 const writes=React.useRef(Promise.resolve());
 const revision=React.useRef(0);
 const mounted=React.useRef(true);
 React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const persist=React.useCallback((key:string,next:Set<number>)=>{
  const json=JSON.stringify([...next]);
  writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,json)).catch(()=>{});
 },[]);
 React.useEffect(()=>{
  if(!active)return;
  let live=true;setError(false);
  loading.current=(async()=>{
   const me=await getMe();
   if(!live)return;
   const key=`mobile.matchWatchlist.v1:${me.id}`;
   if(owner.current!==key){
    owner.current=key;values.current=new Set();setIds(new Set());setReady(false);readyRef.current=false;revision.current++;
    try{
     const raw=await AsyncStorage.getItem(key);
     if(!live)return;
     const parsed=raw?JSON.parse(raw):null;
     if(Array.isArray(parsed)){
      values.current=new Set(parsed.filter((id:unknown):id is number=>typeof id==='number'&&Number.isSafeInteger(id)&&id>0));
      setIds(new Set(values.current));setReady(true);readyRef.current=true;
     }
    }catch{/* Replace a malformed cache with the server response. */}
   }
   const version=revision.current;
   const result=await getMatchWatchlist();
   if(!live||owner.current!==key||version!==revision.current)return;
   const next=new Set(result.fixtureIds);
   if(readyRef.current)busy.current.forEach((starred,id)=>{if(starred===true)next.add(id);else if(starred===false)next.delete(id);});
   values.current=next;setIds(new Set(next));setReady(true);readyRef.current=true;persist(key,next);
  })().catch(()=>{if(live)setError(true);});
  return()=>{live=false;};
 },[active,refresh,persist]);
 const toggle=React.useCallback(async(id:number)=>{
  if(busy.current.has(id))return;
  // A first-use tap waits for account-scoped data instead of being ignored.
  busy.current.set(id,null);setPending(new Set(busy.current.keys()));
  let key:string|null=null;
  let starred:boolean|undefined;
  let applied=false;
  const apply=(value:boolean)=>{
   revision.current++;
   const next=new Set(values.current);if(value)next.add(id);else next.delete(id);
   values.current=next;if(mounted.current)setIds(next);if(key)persist(key,next);
  };
  try{
   if(!readyRef.current)await loading.current;
   key=owner.current;
   if(!mounted.current)return;
   if(!readyRef.current||!key)throw new Error('Watchlist not ready');
   starred=!values.current.has(id);
   busy.current.set(id,starred);
   apply(starred);applied=true;
   await setMatchWatchlist(id,starred);
  }catch{
   if(!key||owner.current===key){
    if(applied&&starred!==undefined)apply(!starred);
    if(mounted.current)Alert.alert(tr?'Kaydedilemedi':'Could not save',tr?'Takip listen güncellenemedi. Tekrar dene.':'Your watchlist could not be updated. Please try again.');
   }
  }finally{
   if(!key||owner.current===key){busy.current.delete(id);if(mounted.current)setPending(new Set(busy.current.keys()));}
  }
 },[persist,tr]);
 return {ids,ready,pending,toggle,error};
}
