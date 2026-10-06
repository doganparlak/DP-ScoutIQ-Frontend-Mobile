/** Equal action cells; all actions stay side by side at every screen size. */
export function playerActionLayout(width:number,fontScale:number,count=4){
  const available=Math.max(1,width);
  const columns=Math.max(1,count);
  return {columns,basis:Math.max(0,(available-6*(columns-1))/columns-.5)};
}
export const PLAYER_ACTION_TONES={portfolio:'#22C55E',similar:'#2DD4BF',report:'#8EB7CF',matchup:'#B4A3D3'};
