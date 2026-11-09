export const MERCADO_PROFILE='compras';
const hosts=new Set(['www.mercadolivre.com.br','produto.mercadolivre.com.br','lista.mercadolivre.com.br']);
export function isMercadoProductUrl(value) {
  try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.has(u.hostname)&&u.hostname!=='lista.mercadolivre.com.br'&&(/^\/MLB-\d+(?:-[^/]*)?\/?$/i.test(u.pathname)||/^\/(?:[^/]+\/)?p\/MLB\d+\/?$/i.test(u.pathname));}catch{return false;}
}
// Executed in the rendered page. Only visible product data and boolean session
// signals leave the browser. Never read cookies, storage, forms or account pages.
export function readMercadoPage() {
  const allowed=['www.mercadolivre.com.br','produto.mercadolivre.com.br','lista.mercadolivre.com.br'];
  if(location.protocol!=='https:'||!allowed.includes(location.hostname))return {state:'login_required'};
  const visible=e=>!!e&&e.getClientRects().length>0;
  const header=document.querySelector('header,[role="banner"]');
  const controls=[...(header?.querySelectorAll('a,button')||[])];
  const login=controls.some(e=>visible(e)&&/^(entre|entrar|crie sua conta)$/i.test(e.textContent.trim()));
  const authenticated=controls.some(e=>visible(e)&&(/^(minha conta|sair)$/i.test(e.textContent.trim())||/\/gz\/home\/navigation(?:[?#]|$)|\/logout(?:[/?#]|$)/.test(e.getAttribute('href')||'')||(String(e.className||'').split(/\s+/).includes('nav-header-user-myml')&&e.getAttribute('href')==='https://myaccount.mercadolivre.com.br/summary')));
  if(login)return {state:'login_required'};
  if(!authenticated)return {state:'unverified'};
  const h1=document.querySelector('main h1,.ui-pdp-title');
  const links=[...document.querySelectorAll('main a[href]')].filter(visible).map(a=>a.href);
  const clean=text=>String(text||'').replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi,'[e-mail omitido]').replace(/\b\d{5}-?\d{3}\b/g,'[CEP omitido]').split('\n').filter(l=>!/(enviar para|entregar em|entrega em seu|endereco|endereço|destinatario|destinatário|\bCPF\b)/i.test(l)).join('\n');
  const parts=[h1?.innerText||''];
  for(const selector of ['.ui-pdp-price','.ui-pdp-description__content','.ui-pdp-specs__table','.ui-pdp-buybox__quantity']) {
    const el=document.querySelector(selector);if(visible(el))parts.push(clean(el.innerText));
  }
  // Render split currency spans as one monetary value, retaining original text.
  const amount=document.querySelector('.ui-pdp-price__second-line .andes-money-amount');
  if(visible(amount)) {
    const currency=amount.querySelector('.andes-money-amount__currency-symbol')?.textContent?.trim();
    const fraction=amount.querySelector('.andes-money-amount__fraction')?.textContent?.trim();
    const cents=amount.querySelector('.andes-money-amount__cents')?.textContent?.trim()||'00';
    if(currency==='R$'&&/^[\d.]+$/.test(fraction||'')&&/^\d{2}$/.test(cents))parts.push('Preço exibido: R$ '+fraction+','+cents);
  }
  // Do not export destination, name or address. Shipping stays informational:
  // the displayed quantity/destination may differ from the school's request.
  const shipping=[...document.querySelectorAll('.ui-pdp-shipping')].filter(visible).map(e=>e.innerText).join(' ');
  if(/frete gr[aá]tis/i.test(shipping))parts.push('Frete grátis exibido; quantidade e destino precisam de conferência.');
  else if(/R\$[ \t]*\d[\d.]*,\d{2}(?!\d)/.test(shipping))parts.push('Frete exibido: '+shipping.match(/R\$[ \t]*\d[\d.]*,\d{2}(?!\d)/)[0]+'; quantidade e destino precisam de conferência.');
  return {state:'ready',url:location.origin+location.pathname,title:clean(h1?.innerText||document.title).slice(0,300),text:parts.join('\n').slice(0,5000),links};
}
const explanations={ready:'Mercado Livre consultado no perfil compras com sessão reconhecida.',login_required:'Entre no Mercado Livre no navegador OpenClaw, perfil compras, e refaça a pesquisa.',unverified:'Não foi possível confirmar a sessão ou ler a página. Confira o navegador compras e eventuais verificações do Mercado Livre.',unavailable:'Navegador de compras indisponível. Confira o OpenClaw no computador.'};
export async function researchMercadoLivre(item,call) {
  let tab;
  const pages=[],sources=[];
  const browser=args=>call({profile:MERCADO_PROFILE,target:'host',...args});
  const result=state=>({state,detail:explanations[state],pages,sources});
  try {
    const spec=(item.spec||'').trim();
    const query=(item.name+(spec&&!item.name.toLowerCase().includes(spec.toLowerCase())?' '+spec:'')).trim().replace(/\s+/g,'-').slice(0,300);
    const opened=await browser({action:'open',url:'https://lista.mercadolivre.com.br/'+encodeURIComponent(query),timeoutMs:15000});
    tab=opened.suggestedTargetId||opened.tabId||opened.targetId;
    if(!tab)return result('unavailable');
    const read=async(listing=false)=>{
      let data;
      for(let attempt=0;attempt<9;attempt++){
        const r=await browser({action:'act',request:{kind:'evaluate',targetId:tab,fn:readMercadoPage.toString()}});data=r.result;
        if(data?.state==='login_required')return data;
        if(data?.state==='ready'&&(listing?(data.links||[]).some(isMercadoProductUrl):data.text?.includes('R$')))return data;
        if(attempt<8)await new Promise(resolve=>setTimeout(resolve,750));
      }
      return data;
    };
    const list=await read(true);
    if(!list||list.state!=='ready')return result(list?.state==='login_required'?'login_required':'unverified');
    const urls=[...new Set((list.links||[]).filter(isMercadoProductUrl).map(value=>{const u=new URL(value);u.hash='';u.search='';return u.href;}))].slice(0,2);
    for(const url of urls) {
      await browser({action:'navigate',targetId:tab,url,timeoutMs:15000});
      const page=await read();
      if(page?.state!=='ready')return result(page?.state==='login_required'?'login_required':'unverified');
      if(!isMercadoProductUrl(page.url)||!page.title||!page.text)continue;
      pages.push({url:page.url,title:page.title,text:page.text,truncated:page.text.length>=5000,origin:'authenticated_browser'});
      sources.push({url:page.url,title:page.title,description:'Anúncio consultado no navegador OpenClaw com sessão reconhecida. Frete e prazo dependem do destino e da quantidade.'});
    }
    return result(pages.length?'ready':'unverified');
  }catch{return result('unavailable');}
  finally {if(tab)try{await browser({action:'close',targetId:tab});}catch{/* Never close other tabs or the user's login tab. */}}
}
