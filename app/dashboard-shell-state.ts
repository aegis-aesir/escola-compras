export const sidebarPreferenceKey='estrelas-sidebar-v1';
export type SidebarPreference='compact'|'expanded';

export function parseSidebarPreference(value:unknown):SidebarPreference {
  return value==='expanded'?'expanded':'compact';
}

export function readSidebarPreference(storage:Pick<Storage,'getItem'>):SidebarPreference {
  try{return parseSidebarPreference(storage.getItem(sidebarPreferenceKey))}catch{return 'compact'}
}

export function formatManausDate(value:Date=new Date()):string {
  return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'America/Manaus'}).format(value);
}
