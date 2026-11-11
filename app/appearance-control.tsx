'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun, X } from 'lucide-react';
import { accents, appearanceKey, applyAppearance, defaultAppearance, parseAppearance, type Appearance } from './appearance';

const modeOptions=[{id:'light',label:'Claro',Icon:Sun},{id:'dark',label:'Escuro',Icon:Moon},{id:'system',label:'Automático',Icon:Monitor}] as const;

export default function AppearanceControl() {
  const [preferences,setPreferences]=useState<Appearance>(defaultAppearance);
  const [open,setOpen]=useState(false);
  const [ready,setReady]=useState(false);
  const [saved,setSaved]=useState(true);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    let current=defaultAppearance;
    try{current=parseAppearance(localStorage.getItem(appearanceKey))}catch{/* In-memory preferences still work. */}
    applyAppearance(current);
    setPreferences(current);
    setReady(true);
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem=()=>{
      if(document.documentElement.dataset.appearance==='system')applyAppearance({mode:'system',accent:document.documentElement.dataset.accent as Appearance['accent']});
    };
    const syncTabs=(event:StorageEvent)=>{
      if(event.key!==appearanceKey&&event.key!==null)return;
      const next=parseAppearance(event.newValue);
      applyAppearance(next);setPreferences(next);setSaved(true);
    };
    media.addEventListener('change',followSystem);
    window.addEventListener('storage',syncTabs);
    return ()=>{media.removeEventListener('change',followSystem);window.removeEventListener('storage',syncTabs)};
  },[]);

  function change(next:Appearance) {
    applyAppearance(next);setPreferences(next);
    try{localStorage.setItem(appearanceKey,JSON.stringify(next));setSaved(true)}catch{setSaved(false)}
  }
  function show(){dialog.current?.showModal();setOpen(true)}
  function close(){dialog.current?.close();setOpen(false);trigger.current?.focus()}

  return <>
    <button ref={trigger} type="button" className="appearance-trigger" aria-label="Personalizar aparência" aria-haspopup="dialog" aria-expanded={open} disabled={!ready} onClick={show}><Palette size={17}/><span>Aparência</span></button>
    <dialog ref={dialog} className="appearance-dialog" aria-labelledby="appearance-title" onCancel={event=>{event.preventDefault();close()}} onClose={()=>{if(!dialog.current?.open)setOpen(false)}}>
      <div className="modal-head"><h2 id="appearance-title">Sua aparência</h2><button type="button" className="icon-button" aria-label="Fechar aparência" onClick={close}><X size={20}/></button></div>
      <div className="modal-body">
        <p className="muted">Escolha como a Central de Compras aparece para você.</p>
        <fieldset className="appearance-fieldset"><legend>Tema</legend><div className="theme-options">{modeOptions.map(({id,label,Icon})=><label className="theme-option" key={id}><input type="radio" name="appearance-mode" value={id} checked={preferences.mode===id} onChange={()=>change({...preferences,mode:id})}/><span><Icon size={23}/>{label}</span></label>)}</div><p className="muted appearance-hint">Automático acompanha o tema do seu dispositivo.</p></fieldset>
        <fieldset className="appearance-fieldset"><legend>Cor de destaque</legend><div className="accent-options">{accents.map(accent=><label key={accent.id} className="accent-option" title={accent.label}><input type="radio" name="appearance-accent" value={accent.id} checked={preferences.accent===accent.id} onChange={()=>change({...preferences,accent:accent.id})}/><span className="accent-content"><span className="accent-swatch" style={{backgroundColor:accent.color}}><Check size={12} aria-hidden="true"/></span><span className="accent-label">{accent.label}</span></span></label>)}</div></fieldset>
        <div className="appearance-preview"><span className="school-avatar">CE</span><div><strong>Colégio Estrelas</strong><small>Um visual do seu jeito.</small></div><span className="appearance-preview-dot"/></div>
        <p className="appearance-storage" role="status">{saved?'Preferência salva automaticamente neste navegador.':'A aparência foi aplicada. O navegador não permitiu salvar a preferência.'}</p>
        <div className="form-end"><button type="button" className="button primary" onClick={close}>Concluir <Check size={15}/></button></div>
      </div>
    </dialog>
  </>;
}
