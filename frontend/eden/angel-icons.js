'use strict';
// Shared 4-by-4 atlases: row-major slots, matched to semantic feature keys.
const angelIconSheets = [
 ['body','trip','explore','phone','vps','ntfy','usage','music','read','shufang','watch','theme','branding','prompts','tavern','rewrite'],
 ['hisphone','game','cooking','menu','cmdgame','htmlgame','workshop','mcphall','baby','roleplay','calendar','pr','flightchess','bisca_cards','bisca_daifugo','bisca_monopoly'],
 ['captivity','divination','truthdare','eatapple','sparkvault','cabinets','dream','diary','mdiary','notes','mailbox','memory','savedchat','album','coupon','wallet'],
 ['sayday','love','wardrobe','duty','sigillo','quest','chat','home','garden','moments','profile']
];
const angelIconSlots=Object.fromEntries(angelIconSheets.flatMap((keys,sheet)=>keys.map((key,index)=>[key,{sheet:sheet+1,x:(index%4)*100/3,y:Math.floor(index/4)*100/3}])));
for(const atlas of angelIconBounds){
 for(const [index,key] of angelIconSheets[atlas.sheet-1].entries()){
  const [x,y,w,h]=atlas.rects[index];const edge=Math.max(w,h);
  Object.assign(angelIconSlots[key],{crop:{x:100*x/(atlas.width-w),y:100*y/(atlas.height-h),bw:100*atlas.width/w,bh:100*atlas.height/h,w:100*w/edge,h:100*h/edge}});
 }
}
