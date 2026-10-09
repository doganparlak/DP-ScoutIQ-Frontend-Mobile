import { createThemedStyles,type ThemeColors } from '@/theme';
/** Equal action cells; all actions stay side by side at every screen size. */
export function playerActionLayout(width:number,fontScale:number,count=4){
  const available=Math.max(1,width);
  const columns=Math.max(1,count);
  return {columns,basis:Math.max(0,(available-6*(columns-1))/columns-.5)};
}


/** Space between player actions and the profile, shared by regular and Pro cards. */
export const PLAYER_CARD_PROFILE_GAP = 10;


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {themeColor} = colors;

  const PLAYER_ACTION_TONES={portfolio:themeColor('#22C55E'),similar:themeColor('#2DD4BF'),report:themeColor('#8EB7CF'),matchup:themeColor('#B4A3D3')};
  return {PLAYER_ACTION_TONES, themeColor};
});
export const getThemed_PLAYER_ACTION_TONES = (colors: ThemeColors) => getModuleTheme(colors).PLAYER_ACTION_TONES;
