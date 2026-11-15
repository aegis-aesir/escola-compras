import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';

export const normalizedPhone=(value:unknown)=>normalizeContactPhone(value)||String(value||'');

// Compare legacy phone formats without rewriting their historical stored values.
// Include tombstones: removing a contact never frees its phone for a new identity.
export function storedPhoneSql(alias=''){
 const value=`TRIM(json_extract(${alias?alias+'.':''}data,'$.phone'))`;
 const compact=`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${value},' ',''),'-',''),'(',''),')',''),'.',''),char(9),''),char(10),''),char(13),'')`;
 return `(CASE WHEN SUBSTR(${compact},1,1)='+' THEN SUBSTR(${compact},2) WHEN SUBSTR(${compact},1,2)='00' THEN SUBSTR(${compact},3) WHEN LENGTH(${compact}) IN (10,11) THEN '55'||${compact} ELSE ${compact} END)`;
}
