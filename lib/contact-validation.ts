import {z} from 'zod';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';

const optionalText=(max:number)=>z.string().trim().max(max).optional();
export const contactDraftSchema=z.object({
 name:z.string().trim().min(2,'Informe o nome do contato.').max(150),
 phone:z.string().max(80).transform((value,ctx)=>{const phone=normalizeContactPhone(value);if(!phone){ctx.addIssue({code:'custom',message:'Confira o telefone com DDI e DDD.'});return z.NEVER;}return phone;}),
 company:optionalText(150),email:z.string().trim().max(150).refine(v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),'E-mail inválido.').optional(),
 category:optionalText(100),city:optionalText(100),state:optionalText(100),
});
export const importSourceSchema=z.object({kind:z.enum(['csv','vcf']),label:z.string().trim().min(1).max(150)});
export const contactBatchSchema=z.array(contactDraftSchema).min(1).max(50);
