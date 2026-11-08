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
