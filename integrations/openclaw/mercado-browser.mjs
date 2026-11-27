export const MERCADO_PROFILE='compras';
const hosts=new Set(['www.mercadolivre.com.br','produto.mercadolivre.com.br','lista.mercadolivre.com.br']);
export function isMercadoProductUrl(value) {
  try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.has(u.hostname)&&u.hostname!=='lista.mercadolivre.com.br'&&(/^\/MLB-\d+(?:-[^/]*)?\/?$/i.test(u.pathname)||/^\/(?:[^/]+\/)?p\/MLB\d+\/?$/i.test(u.pathname));}catch{return false;}
}
// Executed in the rendered page. Only visible product data and boolean session
// signals leave the browser. Never read cookies, storage, forms or account pages.
// ctx (ticket 07): CEP comercial da escola e quantidade pedida. Esse CEP é o único dado
// de destino exportado, e só numa linha montada aqui; todo outro CEP, nome e endereço
// continua omitido. O destino da conta só sai como booleano (é o CEP da escola ou não).
export function readMercadoPage(ctx) {
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
  // Do not export destination, name or address. Without the school's CEP confirmed as
  // the destination, shipping stays informational: quantity/destination may differ.
  const shipping=[...document.querySelectorAll('.ui-pdp-shipping')].filter(visible).map(e=>e.innerText).join(' ');
  const school=ctx&&/^\d{5}-\d{3}$/.test(String(ctx.cep||''))?String(ctx.cep):'';
  const schoolCep=t=>!!school&&new RegExp('(?<!\\d)'+school.slice(0,5)+'-?'+school.slice(6)+'(?!\\d)').test(String(t||''));
  const destination=schoolCep(shipping)||[...document.querySelectorAll('.nav-menu-cp,[class*="nav-menu-cp"]')].some(e=>visible(e)&&schoolCep(e.innerText));
  const shown=document.querySelector('.ui-pdp-buybox__quantity');
  const quantity=visible(shown)?(String(shown.innerText||'').match(/quantidade:?\s*(\d{1,6})(?!\d)/i)||[])[1]:undefined;
  const free=/frete gr[aá]tis/i.test(shipping),money=shipping.match(/R\$[ \t]*\d[\d.]*,\d{2}(?!\d)/);
  if(destination&&(free||money)){
    const q=quantity?'quantidade '+Number(quantity):'quantidade não confirmada';
    parts.push(free?'Frete grátis para o CEP '+school+', '+q:'Frete para o CEP '+school+', '+q+': '+money[0]);
  }
  else if(free)parts.push('Frete grátis exibido; quantidade e destino precisam de conferência.');
  else if(money)parts.push('Frete exibido: '+money[0]+'; quantidade e destino precisam de conferência.');
  return {state:'ready',url:location.origin+location.pathname,title:clean(h1?.innerText||document.title).slice(0,300),text:parts.join('\n').slice(0,5000),links};
}
// Executed in the rendered product page (ticket 07): best-effort simulation of the
// delivery to the school's commercial CEP with the requested quantity, only through the
// product page's own quantity selector and shipping calculator (buttons, never links that
// navigate away). Returns booleans only; readMercadoPage confirms what the page shows.
export function simulateMercadoShipping(ctx) {
  const allowed=['www.mercadolivre.com.br','produto.mercadolivre.com.br'];
  if(location.protocol!=='https:'||!allowed.includes(location.hostname)||!/^\d{5}-\d{3}$/.test(String(ctx?.cep||'')))return {quantity:false,cep:false};
  const visible=e=>!!e&&e.getClientRects().length>0;
  const want=String(ctx.quantity);
  const fill=(input,value)=>{const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),'value')?.set;if(setter)setter.call(input,value);else input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
  const box=document.querySelector('.ui-pdp-buybox__quantity');
  let quantity=visible(box)&&(String(box.innerText||'').match(/quantidade:?\s*(\d{1,6})(?!\d)/i)||[])[1]===want;
  if(!quantity&&box){
    const input=[...box.querySelectorAll('input')].find(visible);
    const option=[...document.querySelectorAll('[role="option"],.andes-list__item')].filter(visible);
    const exact=option.find(o=>new RegExp('^\\s*'+want+'\\s+unidade','i').test(o.textContent||''));
    const more=option.find(o=>/mais de/i.test(o.textContent||''));
    if(input){fill(input,want);const apply=[...box.querySelectorAll('button')].find(b=>visible(b)&&/aplicar|ok|confirmar/i.test(b.textContent||''));apply?.click();quantity=true;}
    else if(exact){exact.click();quantity=true;}
    else if(more)more.click();
    else [...box.querySelectorAll('button')].find(visible)?.click();
  }
  const digits=ctx.cep.replace('-','');
  const scopes=[...document.querySelectorAll('.ui-pdp-shipping,.ui-vpp-shipping,[class*="shipping-calculator"],[role="dialog"]')].filter(visible);
  let cep=scopes.some(e=>new RegExp(digits.slice(0,5)+'-?'+digits.slice(5)).test(e.innerText||''));
  if(!cep){
    const zip=scopes.flatMap(e=>[...e.querySelectorAll('input')]).find(i=>visible(i)&&/cep|zip|postal/i.test([i.name,i.id,i.getAttribute('autocomplete'),i.getAttribute('placeholder')].join(' ')));
    if(zip){fill(zip,ctx.cep);const submit=[...(zip.closest('form')||zip.parentElement)?.querySelectorAll('button')||[]].find(b=>visible(b)&&/usar|calcular|aplicar|ok|buscar/i.test(b.textContent||''));submit?.click();cep=true;}
    else scopes.flatMap(e=>[...e.querySelectorAll('button')]).find(b=>visible(b)&&/calcular|informe|alterar|cep/i.test(b.textContent||''))?.click();
  }
  return {quantity,cep};
}
// Function source with its argument embedded, for the browser evaluate action.
const withArgs=(fn,ctx)=>`function ${fn.name}ForSchool(){return (${fn.toString()})(${JSON.stringify(ctx)})}`;
const explanations={ready:'Mercado Livre consultado no perfil compras com sessão reconhecida.',login_required:'Entre no Mercado Livre no navegador OpenClaw, perfil compras, e refaça a pesquisa.',unverified:'Não foi possível confirmar a sessão ou ler a página. Confira o navegador compras e eventuais verificações do Mercado Livre.',unavailable:'Navegador de compras indisponível. Confira o OpenClaw no computador.'};
// destination (ticket 07): {cep,quantity} recebidos do Site; sem ele, nada é simulado.
export async function researchMercadoLivre(item,call,destination) {
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
    const ctx=destination&&/^\d{5}-\d{3}$/.test(String(destination.cep||''))&&Number.isInteger(destination.quantity)&&destination.quantity>0?{cep:destination.cep,quantity:destination.quantity}:undefined;
    const read=async(listing=false)=>{
      let data;
      for(let attempt=0;attempt<9;attempt++){
        const r=await browser({action:'act',request:{kind:'evaluate',targetId:tab,fn:!listing&&ctx?withArgs(readMercadoPage,ctx):readMercadoPage.toString()}});data=r.result;
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
      if(ctx)for(let pass=0;pass<3;pass++){
        const r=await browser({action:'act',request:{kind:'evaluate',targetId:tab,fn:withArgs(simulateMercadoShipping,ctx)}});
        if(r?.result?.quantity&&r?.result?.cep)break;
        await new Promise(resolve=>setTimeout(resolve,750));
      }
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
