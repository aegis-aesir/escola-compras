/** Normalize a number, never an address/JID or an extension. No ninth digit is inferred. */
export function normalizeContactPhone(value,countryCode='55') {
 if(typeof value!=='string'||typeof countryCode!=='string')return undefined;
 const country=countryCode.trim();
 if(country&&!/^[1-9]\d{0,2}$/.test(country))return undefined;
 const input=value.trim();
 if(!input||!/^[+\d\s().-]+$/.test(input))return undefined;
 const compact=input.replace(/[\s().-]/g,'');
 let digits;
 if(compact.startsWith('+'))digits=compact.slice(1);
 else if(compact.startsWith('00'))digits=compact.slice(2);
 else {
  if(!country||!/^\d+$/.test(compact))return undefined;
  if(country==='55'){
   if(/^55\d{10,11}$/.test(compact))digits=compact;
   else if(/^\d{10,11}$/.test(compact))digits='55'+compact;
   else return undefined;
  } else digits=country+compact;
 }
 if(!/^[1-9]\d{6,14}$/.test(digits)||/^(\d)\1+$/.test(digits))return undefined;
 if(digits.startsWith('55')&&!/^55[1-9]\d[2-9]\d{7,8}$/.test(digits))return undefined;
 return '+'+digits;
}
