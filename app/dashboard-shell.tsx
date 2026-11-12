'use client';
/* Vinext currently requires native links/images in client shells to avoid loading a second React runtime. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element, @next/next/no-location-assign-relative-destination */
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Archive,ChevronLeft,ChevronRight,CircleCheck,ClipboardCheck,ClipboardList,FileText,KeyRound,LayoutDashboard,LogOut,Menu,MessageCircle,PackageCheck,Scale,Search,Settings2,Store,X,type LucideIcon} from 'lucide-react';
import AppearanceControl from './appearance-control';
import {formatManausDate,readSidebarPreference,sidebarPreferenceKey,type SidebarPreference} from './dashboard-shell-state';
import {primaryNavigationForRole,primaryParentView,processViewLabel,type ProcessView} from './process-navigation';
import type {Member} from './model';

export type DashboardView=ProcessView;
const navigationIcons:Record<DashboardView,LucideIcon>={overview:LayoutDashboard,requests:ClipboardList,analysis:ClipboardCheck,estimates:Search,general_approval:CircleCheck,quotes:Scale,execution:PackageCheck,budget:FileText,suppliers:Store,whatsapp:MessageCircle,archives:Archive,settings:Settings2};

type Props={
  view:DashboardView;
  allowedViews:DashboardView[];
  role:Member['role'];
  userName:string;
  roleLabel:string;
  pendingApprovals:number;
  onNavigate:(view:DashboardView)=>void;
  children:ReactNode;
};

export default function DashboardShell({view,allowedViews,role,userName,roleLabel,pendingApprovals,onNavigate,children}:Props){
  const [sidebar,setSidebar]=useState<SidebarPreference>('compact');
  const [mobileOpen,setMobileOpen]=useState(false);
  const allowed=useMemo(()=>new Set(allowedViews),[allowedViews]);
  const visibleNavigation=primaryNavigationForRole(role).filter(item=>allowed.has(item.id));
  const activeLabel=processViewLabel(view,role);
  const activePrimary=primaryParentView(view);
  const firstName=userName.trim().split(/\s+/)[0]||'usuário';

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)setSidebar(readSidebarPreference(window.localStorage))});return()=>{active=false}},[]);
  useEffect(()=>{
    if(!mobileOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileOpen(false)};
    window.addEventListener('keydown',close);
    return()=>window.removeEventListener('keydown',close);
  },[mobileOpen]);

  function changeSidebar(next:SidebarPreference){
    setSidebar(next);
    try{window.localStorage.setItem(sidebarPreferenceKey,next)}catch{/* The visual state still works for this session. */}
  }
  async function logout(){
    await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    window.location.assign('/login');
  }

  return <div className="app-shell" data-sidebar={sidebar} data-mobile-nav={mobileOpen?'open':'closed'}>
    <button type="button" className="nav-backdrop" aria-label="Fechar navegação" onClick={()=>setMobileOpen(false)}/>
    <aside className="sidebar" id="dashboard-navigation">
      <div className="sidebar-brand-row">
        <a className="brand" href="/" aria-label="Central de Compras do Colégio Estrelas">
          <span className="brand-logo-frame"><img src="/estrela-2026.png" alt=""/></span>
          <span className="brand-copy"><strong>Colégio Estrelas</strong><small>Central de Compras</small></span>
        </a>
        <button type="button" className="sidebar-close" aria-label="Fechar navegação" onClick={()=>setMobileOpen(false)}><X size={19}/></button>
      </div>
      <button type="button" className="sidebar-toggle" aria-label={sidebar==='expanded'?'Recolher menu':'Expandir menu'} aria-expanded={sidebar==='expanded'} aria-controls="dashboard-navigation" onClick={()=>changeSidebar(sidebar==='expanded'?'compact':'expanded')}>
        {sidebar==='expanded'?<ChevronLeft size={18}/>:<ChevronRight size={18}/>}<span>{sidebar==='expanded'?'Recolher menu':'Expandir menu'}</span>
      </button>
      <nav role="navigation" aria-label="Navegação principal">
        {visibleNavigation.map(({id,label})=>{const Icon=navigationIcons[id];const active=activePrimary===id;return <button type="button" key={id} className={'nav-item '+(active?'active':'')} aria-current={active?'page':undefined} aria-label={label} title={sidebar==='compact'?label:undefined} onClick={()=>{onNavigate(id);setMobileOpen(false)}}>
          <Icon size={20}/><span className="nav-copy">{label}</span>{id==='general_approval'&&pendingApprovals>0?<b aria-label={`${pendingApprovals} pendentes`}>{pendingApprovals}</b>:null}
        </button>})}
      </nav>
      <div className="sidebar-bottom">
        <details className="user-menu">
          <summary className="user-row" aria-label="Abrir opções do usuário"><span className="user-avatar">{userName.slice(0,2).toUpperCase()||'CE'}</span><div><strong>{userName||'Carregando…'}</strong><small>{roleLabel}</small></div></summary>
          <div className="user-menu-options">{allowed.has('settings')?<button type="button" aria-label="Abrir configurações" onClick={()=>onNavigate('settings')}><Settings2 size={16}/>Configurações</button>:null}<a href="/alterar-senha" aria-label="Alterar senha"><KeyRound size={16}/>Alterar senha</a><button type="button" aria-label="Sair" onClick={logout}><LogOut size={16}/>Sair</button></div>
        </details>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-context">
          <button type="button" className="mobile-menu-button icon-button" aria-label="Abrir navegação" aria-expanded={mobileOpen} aria-controls="dashboard-navigation" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button>
          <span className="topbar-logo"><img src="/estrela-2026.png" alt=""/></span>
          <div><strong>Olá, {firstName}</strong><small>{formatManausDate()} · {activeLabel}</small></div>
        </div>
        <div className="topbar-actions">
          <span className="workspace-label"><span/> Colégio Estrelas</span>
          <AppearanceControl/>
          <a className="icon-button" href="/alterar-senha" aria-label="Alterar senha" title="Alterar senha"><KeyRound size={18}/></a>
          <button type="button" className="icon-button" aria-label="Sair do sistema" title="Sair" onClick={logout}><LogOut size={18}/></button>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
