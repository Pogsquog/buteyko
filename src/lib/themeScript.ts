import { DEFAULT_THEME, THEME_COLORS, THEME_MODES, THEME_STORAGE_KEY } from '@/lib/theme';

/**
 * The theme has to be on the `<html>` element before the first paint, or every
 * load flashes the light palette on its way to the dark one. React only gets to
 * run after that paint, so this runs first instead, as a blocking inline script
 * in the document head.
 *
 * It is therefore a hand-written copy of `resolveTheme` — the one place in the
 * app where that logic is duplicated. Its constants come from the module above
 * so they cannot drift, and `themeScript.test.ts` runs the real script against
 * `resolveTheme` across every mode and hour to catch the rest.
 */
export const THEME_SCRIPT = `(function(){try{
var d=${JSON.stringify(DEFAULT_THEME)},c=${JSON.stringify(THEME_COLORS)},m=${JSON.stringify(THEME_MODES)};
var raw=null,p=null;
try{raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}
try{if(raw)p=JSON.parse(raw);}catch(e){}
if(!p||typeof p!=='object')p={};
var mode=m.indexOf(p.mode)>=0?p.mode:d.mode;
var from=typeof p.fromHour==='number'?Math.min(23,Math.max(0,Math.round(p.fromHour))):d.fromHour;
var to=typeof p.toHour==='number'?Math.min(23,Math.max(0,Math.round(p.toHour))):d.toHour;
var dark;
if(mode==='dark'){dark=true;}
else if(mode==='light'){dark=false;}
else if(mode==='schedule'){
var h=new Date().getHours();
dark=from===to?false:from<to?(h>=from&&h<to):(h>=from||h<to);
}
else{dark=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}
var root=document.documentElement;
root.classList.toggle('dark',dark);
root.style.colorScheme=dark?'dark':'light';
var meta=document.querySelector('meta[name="theme-color"]');
if(!meta){meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);}
meta.setAttribute('content',dark?c.dark:c.light);
}catch(e){}})();`;
