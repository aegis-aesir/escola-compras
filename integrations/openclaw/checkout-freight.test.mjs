// Complemento do ticket 07 (E1, 27/11/2026): frete conferido no checkout do Mercado Livre,
// SEM concluir compra. Tudo com DOM e transporte fictícios: o código que roda na página é
// avaliado contra páginas simuladas e todo clique é registrado. Nenhum navegador, Mercado
// Livre, gateway ou mensagem real.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {researchMercadoLivre,checkoutMercadoStep,checkoutFreightLine,CHECKOUT_LIMITS} from './mercado-browser.mjs';
import {classifyFreight} from './price-evidence.mjs';
import {bridgeConfig} from './client.mjs';

const item={name:'Assento sanitário oval',spec:'Branco',unit:'un',quantity:5};
const destination={cep:'69086-665',quantity:5};
const product='https://produto.mercadolivre.com.br/MLB-12345-assento-_JM';
const ALLOWED_CLICKS=new Set(['Comprar agora','Continuar']);

const el=(text,{tag='BUTTON',href=null,cls='',shown=true,go}={})=>({tagName:tag,textContent:text,innerText:text,className:cls,href:href||undefined,getClientRects:()=>shown?[{}]:[],querySelectorAll:()=>[],getAttribute:n=>n==='href'?href:null});
// Monta um "site" fictício: cada página define local, controles (com destino do clique) e textos.
function site(pages,start='list') {
  const clicks=[];let current;
  const show=name=>{current=pages[name];if(!current)throw new Error('página inexistente '+name);
    globalThis.location={protocol:'https:',...current.loc,origin:'https://'+current.loc.hostname,href:'https://'+current.loc.hostname+current.loc.pathname};};
  const controls=()=>(current.controls||[]).map(c=>({...el(c.label,c),click(){clicks.push(c.label);if(c.go)show(c.go);}}));
  const account=el('Minha conta',{tag:'A',href:'https://www.mercadolivre.com.br/gz/home/navigation'});
  globalThis.document={
    title:'Mercado Livre',get cookie(){throw new Error('cookies não podem ser lidos')},
    get body(){return {innerText:current.body||''}},
    querySelector:s=>{if(s.startsWith('header'))return {querySelectorAll:()=>[account]};if(s.includes('h1'))return current.h1?el(current.h1):null;const v=(current.nodes||{})[s];return v?el(v):null;},
    querySelectorAll:s=>{
      if(s==='main a[href]')return (current.links||[]).map(h=>el('anúncio',{tag:'A',href:h}));
      if(s==='.ui-pdp-shipping')return current.shipping?[el(current.shipping)]:[];
      if(s.includes('nav-menu-cp')&&!s.includes('ui-pdp-shipping'))return current.cp?[el(current.cp)]:[];
      if(s.includes('ui-pdp-shipping')&&s.includes('nav-menu-cp'))return [current.shipping,current.cp].filter(Boolean).map(t=>el(t));
      if(s.startsWith('button'))return controls();
      return [];
    }};
  show(start);
  return {clicks,show,get page(){return current}};
}
const list={loc:{hostname:'lista.mercadolivre.com.br',pathname:'/assento'},links:[product]};
const productPage=(over={})=>({loc:{hostname:'produto.mercadolivre.com.br',pathname:'/MLB-12345-assento-_JM'},h1:'Assento sanitário oval',
  nodes:{'.ui-pdp-price':'R$ 129,90','.ui-pdp-buybox__quantity':'Quantidade: 5 unidades (20 disponíveis)'},
  shipping:'Chegará amanhã. Enviar para Nome Privado, CEP 69086-665',cp:'Enviar para Nome Privado 69086-665',
  controls:[{label:'Comprar agora',go:'step1'},{label:'Adicionar ao carrinho',go:'cart'}],...over});
const checkoutPage=(path,over)=>({loc:{hostname:'www.mercadolivre.com.br',pathname:path},...over});
const delivery=checkoutPage('/checkout/buy/delivery',{body:'Escolha a forma de entrega\nEnviar no meu endereço\nRua Particular 10 - Nome Privado - CEP 69086-665\nR$ 25,90\nProduto: 5 unidades\nTotal R$ 675,40',
  controls:[{label:'Continuar',go:'payment'},{label:'Alterar endereço',go:'address'}]});
const step1=checkoutPage('/checkout/buy/start',{body:'Revise seu pedido\nCEP 69086-665\nCarregando opções de entrega',controls:[{label:'Continuar',go:'delivery'}]});
const payment=checkoutPage('/checkout/buy/payment',{body:'Escolha como pagar\nPix\nCartão de crédito\nFrete R$ 25,90\nCEP 69086-665',controls:[{label:'Continuar',go:'confirm'},{label:'Confirmar compra',go:'done'}]});
const forbiddenPages={cart:checkoutPage('/gz/cart',{}),address:checkoutPage('/checkout/address',{}),confirm:checkoutPage('/checkout/confirm',{}),done:checkoutPage('/checkout/done',{})};

async function run(pages,{options={checkoutFreight:true,sleep:async()=>{}},dest=destination}={}) {
  const fake=site({list,...forbiddenPages,...pages});const calls=[];
  const call=async args=>{calls.push(args);
    if(args.action==='open'){fake.show('list');return {targetId:'own-tab'};}
    if(args.action==='navigate'){fake.show('product');return {};}
    if(args.action==='act'){assert.equal(args.request.kind,'evaluate','só evaluate');return {result:(0,eval)('('+args.request.fn+')')()};}
    return {};};
  try{
    const result=await researchMercadoLivre(item,call,dest,options);
    for(const c of fake.clicks)assert.ok(ALLOWED_CLICKS.has(c),'clique fora da lista branca: '+c);
    assert.ok(calls.every(c=>c.profile==='compras'&&c.target==='host'&&(!c.request||c.request.kind==='evaluate')));
    assert.deepEqual(calls.filter(c=>c.action==='close').map(c=>c.targetId),['own-tab'],'fecha só a própria aba');
    assert.ok(!calls.some(c=>c.action==='navigate'&&c.url!==product),'nenhuma navegação além do anúncio');
    return {result,clicks:fake.clicks,calls,text:result.pages[0]?.text||''};
  }finally{delete globalThis.document;delete globalThis.location}
}
const privateBits=['Nome Privado','Rua Particular','Pix','Cartão','675,40'];

test('caminho feliz: Comprar agora → Continuar → tela de entrega; frete conferido no checkout, sem concluir compra',async()=>{
  const {result,clicks,text}=await run({product:productPage(),step1,delivery,payment});
  assert.deepEqual(clicks,['Comprar agora','Continuar']);
  const line='Frete conferido no checkout, sem concluir compra, para o CEP 69086-665, quantidade 5: R$ 25,90';
  assert.ok(text.includes(line),text);
  for(const p of privateBits)assert.ok(!text.includes(p),p);
  assert.deepEqual(result.checkout,['clicked:Comprar agora','clicked:Continuar','freight']);
  const f=classifyFreight(item,{text,analysis:{freight:{status:'quoted',amount:25.9,quote:line,cep:'69086-665',quantity:5}}},destination);
  assert.deepEqual(f,{outcome:'verified',value:25.9,reason:'Frete conferido no checkout da loja até o CEP 69086-665 para 5 un, sem concluir compra.'});
});
test('frete grátis lido no checkout vale 0 comprovado; valores ambíguos ficam a conferir',async()=>{
  let {text}=await run({product:productPage(),step1,delivery:{...delivery,body:'Forma de entrega\nEnviar no meu endereço - CEP 69086-665\nGrátis'}});
  const free='Frete grátis conferido no checkout, sem concluir compra, para o CEP 69086-665, quantidade 5';
  assert.ok(text.includes(free),text);
  assert.equal(classifyFreight(item,{text,analysis:{freight:{status:'free',quote:free,cep:'69086-665',quantity:5}}},destination).value,0);
  ({text}=await run({product:productPage(),step1,delivery:{...delivery,body:'Forma de entrega - CEP 69086-665\nEnvio normal R$ 25,90\nEnvio rápido R$ 39,90'}}));
  const amb='Frete no checkout (valor ambíguo, a conferir, sem concluir compra) para o CEP 69086-665, quantidade 5: R$ 25,90; R$ 39,90';
  assert.ok(text.includes(amb),text);
  const r=classifyFreight(item,{text,analysis:{freight:{status:'quoted',amount:25.9,quote:amb,cep:'69086-665',quantity:5}}},destination);
  assert.equal(r.outcome,'to_check');assert.match(r.reason,/ambíguo ou a conferir/);
});
test('para diante de botão proibido ou fora da lista branca, sem clicar',async()=>{
  // Anúncio sem "Comprar agora": nunca usa "Adicionar ao carrinho".
  let r=await run({product:productPage({controls:[{label:'Adicionar ao carrinho',go:'cart'}]})});
  assert.deepEqual(r.clicks,[]);assert.deepEqual(r.result.checkout,['stopped:no_allowed_action']);
  // Checkout que só oferece "Alterar endereço": para, sem tocar no endereço.
  r=await run({product:productPage(),step1:{...step1,controls:[{label:'Alterar endereço',go:'address'}]}});
  assert.deepEqual(r.clicks,['Comprar agora']);assert.deepEqual(r.result.checkout,['clicked:Comprar agora','stopped:no_allowed_action']);
  // Botão "Confirmar compra" visível: tela tratada como pagamento.
  r=await run({product:productPage(),step1:{...step1,controls:[{label:'Continuar',go:'delivery'},{label:'Confirmar compra',go:'done'}]}});
  assert.deepEqual(r.clicks,['Comprar agora']);assert.deepEqual(r.result.checkout,['clicked:Comprar agora','stopped:payment']);
  // Dois "Comprar agora": ambíguo, não clica.
  r=await run({product:productPage({controls:[{label:'Comprar agora',go:'step1'},{label:' Comprar  agora ',go:'step1'}]})});
  assert.deepEqual(r.clicks,[]);assert.deepEqual(r.result.checkout,['stopped:ambiguous_action']);
});
test('para na tela de pagamento sem ler frete nem dados',async()=>{
  const {clicks,text,result}=await run({product:productPage(),step1:{...payment}});
  assert.deepEqual(clicks,['Comprar agora']);assert.deepEqual(result.checkout,['clicked:Comprar agora','stopped:payment']);
  assert.ok(!/checkout/.test(text)&&!text.includes('25,90'),text);
  for(const body of ['Código de segurança','Pague com boleto','CVV do cartão','Revise e confirme']){
    const r=await run({product:productPage(),step1:{...step1,body:'CEP 69086-665\n'+body+'\nFrete R$ 10,00'}});
    assert.deepEqual(r.result.checkout.at(-1),'stopped:payment',body);
  }
});
test('destino da conta diferente do CEP da escola: não avança para o checkout',async()=>{
  let r=await run({product:productPage({shipping:'Chegará amanhã. Enviar para Rua Particular 01001-000',cp:'Enviar para Nome Privado 01001-000'})});
  assert.deepEqual(r.clicks,[]);assert.equal(r.result.checkout,undefined,'nem tenta');
  assert.ok(!r.calls.some(c=>c.request?.fn?.includes('checkoutMercadoStep')));
  // Checkout que mostra outro CEP: para sem ler.
  r=await run({product:productPage(),step1:{...delivery,body:'Entrega\nCEP 01001-000\nR$ 25,90'}});
  assert.deepEqual(r.result.checkout,['clicked:Comprar agora','stopped:destination']);
  // Quantidade do anúncio diferente da pedida: não clica.
  r=await run({product:productPage({nodes:{'.ui-pdp-price':'R$ 129,90','.ui-pdp-buybox__quantity':'Quantidade: 1 unidade'}})});
  assert.deepEqual(r.clicks,[]);assert.deepEqual(r.result.checkout,['stopped:quantity']);
});
test('limites: no máximo 3 cliques e tempo; host fora da lista para',async()=>{
  const loop=checkoutPage('/checkout/buy/loop',{body:'Revise\nCEP 69086-665',controls:[{label:'Continuar',go:'loop'}]});
  let r=await run({product:productPage(),step1:loop,loop});
  assert.equal(r.clicks.length,CHECKOUT_LIMITS.clicks);assert.deepEqual(r.clicks,['Comprar agora','Continuar','Continuar']);
  assert.equal(r.result.checkout.at(-1),'stopped:limit');
  let t=0;
  r=await run({product:productPage(),step1:loop,loop},{options:{checkoutFreight:true,sleep:async()=>{},now:()=>(t+=20000)}});
  assert.ok(r.clicks.length<CHECKOUT_LIMITS.clicks,'tempo esgotado antes');assert.equal(r.result.checkout.at(-1),'stopped:limit');
  r=await run({product:productPage(),step1:{loc:{hostname:'www.mercadopago.com.br',pathname:'/checkout/v1'},body:'CEP 69086-665 Frete R$ 1,00',controls:[{label:'Continuar'}]}});
  assert.deepEqual(r.result.checkout,['clicked:Comprar agora','stopped:host']);
  r=await run({product:productPage(),step1:{loc:{hostname:'www.mercadolivre.com.br',pathname:'/jms/mlb/lgz/login'},body:'Entrar',controls:[{label:'Continuar'}]}});
  assert.deepEqual(r.result.checkout,['clicked:Comprar agora','stopped:host']);
});
test('desligado por padrão, com frete já comprovado no anúncio ou sem contexto: nenhum passo de checkout',async()=>{
  for(const opts of [{sleep:async()=>{}},{checkoutFreight:false,sleep:async()=>{}}]){
    const r=await run({product:productPage(),step1,delivery},{options:opts});
    assert.deepEqual(r.clicks,[]);assert.ok(!r.calls.some(c=>c.request?.fn?.includes('checkoutMercadoStep')));
  }
  let r=await run({product:productPage({shipping:'Frete R$ 30,00. Enviar para Nome Privado, CEP 69086-665'}),step1,delivery});
  assert.deepEqual(r.clicks,[]);assert.ok(r.text.includes('Frete para o CEP 69086-665, quantidade 5: R$ 30,00'));
  r=await run({product:productPage(),step1,delivery},{dest:null});
  assert.deepEqual(r.clicks,[]);
  const off={ESTRELAS_SITE_URL:'https://ceea.colegioestrelas.com',INTEGRATION_SECRET:'F'.repeat(32),ESTRELAS_SITES_SERVICE_TOKEN:'FAKE-TEST-ONLY'};
  assert.equal(bridgeConfig({...off,ESTRELAS_BROWSER_RESEARCH:'true'}).checkoutFreight,false);
  assert.equal(bridgeConfig({...off,ESTRELAS_BROWSER_CHECKOUT_FREIGHT:'true'}).checkoutFreight,false,'exige também ESTRELAS_BROWSER_RESEARCH');
  assert.equal(bridgeConfig({...off,ESTRELAS_BROWSER_RESEARCH:'true',ESTRELAS_BROWSER_CHECKOUT_FREIGHT:'true'}).checkoutFreight,true);
  assert.equal(bridgeConfig({ESTRELAS_LOCAL_TEST:'true',ESTRELAS_SITE_URL:'http://127.0.0.1:5185',INTEGRATION_SECRET:'F'.repeat(32),ESTRELAS_BROWSER_RESEARCH:'true',ESTRELAS_BROWSER_CHECKOUT_FREIGHT:'true'}).checkoutFreight,false,'local nunca');
});
test('linha de evidência: só CEP da escola, quantidade e valores; resultado inválido não vira frete',()=>{
  for(const bad of [undefined,{state:'stopped'},{state:'freight',amounts:[]},{state:'freight',amounts:['25,90','R$ 1,0','<b>R$ 1,00</b>']}])assert.equal(checkoutFreightLine(bad,destination),undefined,JSON.stringify(bad));
  assert.match(checkoutFreightLine({state:'freight',amounts:['R$ 25,90'],quantity:3},destination),/a conferir: quantidade exibida/);
  assert.equal(checkoutMercadoStep(undefined).reason,'context');
});
test('trava na própria página: destino diferente não clica mesmo que a ponte peça',()=>{
  const fake=site({product:productPage({shipping:'Enviar para Rua Particular 01001-000',cp:'Enviar para 01001-000'})},'product');
  try{
    assert.deepEqual(checkoutMercadoStep({...destination,allowClick:true}),{state:'stopped',reason:'destination'});
    assert.deepEqual(fake.clicks,[]);
  }finally{delete globalThis.document;delete globalThis.location}
});
