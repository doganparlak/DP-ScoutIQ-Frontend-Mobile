import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='ads.interstitial.lastShownAt.v1';
const COOLDOWN_MS=60_000;
let lastShownAt=0;
let restored:Promise<void>|undefined;
let writes:Promise<void>=Promise.resolve();
export async function isInterstitialCoolingDown(now=Date.now()):Promise<boolean>{
  if(!restored)restored=AsyncStorage.getItem(KEY).then(raw=>{
    const saved=Number(raw);
    if(Number.isFinite(saved) && saved>0 && saved<=now)lastShownAt=Math.max(lastShownAt,saved);
  }).catch(()=>{});
  await restored;
  return lastShownAt>0 && now-lastShownAt<COOLDOWN_MS;
}
export function markInterstitialShown(){
  lastShownAt=Date.now();
  const value=String(lastShownAt);
  writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(KEY,value)).catch(()=>{});
}
