// Personalização determinística no despacho. O conteúdo comercial permanece intacto.
export function personalizeQuotationTemplate(template,contact) {
 if(typeof template!=='string'||!template.includes('{{contato}}')||typeof contact!=='string'||!contact.trim())throw new Error('Modelo de cotação ou contato inválido.');
 return template.replace('{{contato}}',()=>contact.trim());
}

export function quotationJobMessage(job) {
 if(!job.quotationTemplate)return job.message;
 if(job.quotationTemplate.version!=='contact-v1')throw new Error('Versão do modelo de cotação não suportada.');
 return personalizeQuotationTemplate(job.quotationTemplate.text,job.quotationTemplate.contact);
}
