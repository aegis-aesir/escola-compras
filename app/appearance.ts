export const appearanceKey = 'estrelas-appearance-v1';
export const modes = ['system', 'light', 'dark'] as const;
export const accents = [
  {id:'black',label:'Preto',color:'#5b5d67'},
  {id:'purple',label:'Roxo',color:'#8270f1'},
  {id:'blue',label:'Azul',color:'#1195df'},
  {id:'rose',label:'Rosa',color:'#ed539b'},
  {id:'violet',label:'Violeta',color:'#b45bdd'},
  {id:'indigo',label:'Anil',color:'#6579fa'},
  {id:'orange',label:'Laranja',color:'#ed6b0f'},
  {id:'teal',label:'Azul-petróleo',color:'#0ca4a6'},
  {id:'bronze',label:'Bronze',color:'#a98a7c'},
  {id:'mint',label:'Menta',color:'#35b78b'},
  {id:'green',label:'Verde',color:'#147d59'},
] as const;
export type Appearance = {mode:typeof modes[number];accent:typeof accents[number]['id']};
export const defaultAppearance:Appearance = {mode:'system',accent:'violet'};

export function parseAppearance(raw:string|null):Appearance {
  try {
    const value=JSON.parse(raw||'null');
    return {
      mode:modes.includes(value?.mode)?value.mode:defaultAppearance.mode,
      accent:accents.some(a=>a.id===value?.accent)?value.accent:defaultAppearance.accent,
    };
  }catch{return {...defaultAppearance}}
}
export function applyAppearance(value:Appearance) {
  const root=document.documentElement;
  const dark=value.mode==='dark'||(value.mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme=dark?'dark':'light';
  root.dataset.appearance=value.mode;
  root.dataset.accent=value.accent;
  root.classList.toggle('dark',dark);
}

// Apply saved preferences before the page is painted; only fixed, validated
// appearance values reach the DOM. Storage can be unavailable in private mode.
export const appearanceBootstrap = `(()=>{let p;try{p=JSON.parse(localStorage.getItem(${JSON.stringify(appearanceKey)}))}catch{}const m=${JSON.stringify(modes)}.includes(p?.mode)?p.mode:'system';const a=${JSON.stringify(accents.map(a=>a.id))}.includes(p?.accent)?p.accent:'violet';const d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);const r=document.documentElement;r.dataset.appearance=m;r.dataset.theme=d?'dark':'light';r.dataset.accent=a;r.classList.toggle('dark',d)})()`;
