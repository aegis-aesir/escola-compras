// Only label actual Google Maps URLs as Maps. A generated search link is just
// navigation, not evidence that a business was found or verified.
export function isGoogleMapsUrl(value) {
  try {
    const u=new URL(value);
    if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return false;
    const google=['google.com','www.google.com','google.com.br','www.google.com.br'].includes(u.hostname);
    const maps=['maps.google.com','maps.google.com.br'].includes(u.hostname);
    const placePath=/^\/maps\/place\/[^/]+/.test(u.pathname);
    const placeId=!!(u.searchParams.get('cid')||u.searchParams.get('ftid'))||/^place_id:/.test(u.searchParams.get('q')||'');
    return ((google||maps)&&placePath)||((google&&u.pathname==='/maps'||maps&&['/','/maps'].includes(u.pathname))&&placeId)||(u.hostname==='maps.app.goo.gl'&&/^\/[A-Za-z0-9]+$/.test(u.pathname))||(u.hostname==='goo.gl'&&/^\/maps\/[A-Za-z0-9]+$/.test(u.pathname));
  }catch{return false}
}

// Lojas nacionais conhecidas, analisadas antes de sites desconhecidos na estimativa.
// A ordem define a prioridade. ESTRELAS_KNOWN_STORES (domínios separados por vírgula)
// substitui a lista sem mudar código; "none" desliga a priorização.
export const DEFAULT_KNOWN_STORES=['mercadolivre.com.br','magazineluiza.com.br','amazon.com.br','kabum.com.br','leroymerlin.com.br'];
export function knownStores(value) {
  if(value===undefined||value.trim()==='')return DEFAULT_KNOWN_STORES;
  if(value.trim().toLowerCase()==='none')return [];
  return value.split(',').map(s=>s.trim().toLowerCase().replace(/^www\./,'')).filter(s=>/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s));
}
function storeRank(url,stores) {
  let host;
  try{host=new URL(url).hostname.toLowerCase();}catch{return stores.length;}
  const index=stores.findIndex(d=>host===d||host.endsWith('.'+d));
  return index<0?stores.length:index;
}
// Ordenação estável: lojas conhecidas primeiro (na ordem da lista), demais na ordem da busca.
export function prioritizeKnownStores(sources,stores) {
  if(!stores?.length)return sources;
  return sources.map((s,i)=>({s,i,r:storeRank(s.url,stores)})).sort((a,b)=>a.r-b.r||a.i-b.i).map(x=>x.s);
}
