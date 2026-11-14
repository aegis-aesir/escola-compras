import assert from 'node:assert/strict';
import {build} from 'esbuild';

await build({stdin:{contents:"export * from './app/contact-import'; export * from './integrations/openclaw/contact-phone.mjs';",resolveDir:process.cwd()},outfile:'outputs/contact-import-test.mjs',bundle:true,platform:'node',format:'esm'});
const {parseContactFile:parse,normalizeContactPhone:phone,MAX_CONTACT_FILE_BYTES,MAX_CONTACTS}=await import('../outputs/contact-import-test.mjs');

// These fixtures catch digit insertion, guessing a country, accepting identities as numbers,
// broken quoted CSV records, lost vCard properties and silently truncated imports.
for(const [input,country,want] of [
 ['(92) 3201-1234','55','+559232011234'],['92 93201-1234','55','+5592932011234'],
 ['559232011234','55','+559232011234'],['+55 (92) 3201-1234','','+559232011234'],
 ['0055 92 93201-1234','','+5592932011234'],['+1 (202) 555-0123','55','+12025550123'],
 ['2025550123','1','+12025550123'],['9232011234','',undefined],['559232011234','',undefined],
 ['9232011234@lid','55',undefined],['123456789012@g.us','55',undefined],
 ['559232011234@s.whatsapp.net','55',undefined],['92 3201-1234 ramal 22','55',undefined],
 ['92 3201-1234 x22','55',undefined],['tel:+559232011234;ext=22','55',undefined],
 ['abcdefgh9232011234','55',undefined],['++559232011234','55',undefined],
 ['0000000000','55',undefined],['+550032011234','55',undefined],['+559200011234','55',undefined],
 ['+0123456789','55',undefined],['+123','55',undefined],['(92)32011234','invalid',undefined],
]) assert.equal(phone(input,country),want,`phone ${input} / ${country}`);

let result=parse('\ufeffNome;Telefone;Empresa;E-mail;Categoria;Cidade;Estado\r\n"Ana; Silva";"(92) 3201-1234";"Acme\r\nLoja";ana@example.test;Tintas;Manaus;AM\r\nAna duplicada;+55 92 3201-1234;;;;;\r\nSem número;errado;;;;;','csv');
assert.deepEqual(result.contacts,[{name:'Ana; Silva',phone:'+559232011234',company:'Acme\nLoja',email:'ana@example.test',category:'Tintas',city:'Manaus',state:'AM'}]);
assert.equal(result.duplicates,1);assert.equal(result.total,3);assert.equal(result.issues[0].line,5);
result=parse('Name,Given Name,Family Name,Phone 1 - Type,Phone 1 - Value,Phone 2 - Value,Organization 1 - Name,E-mail 1 - Value,Group Membership,Address 1 - City,Address 1 - Region\n,"Ana, Maria",Souza,Mobile,9232011234,+5592932011234,Empresa,ana@example.test,* myContacts ::: Papelaria,Manaus,AM','csv');
assert.equal(result.contacts.length,2);assert.equal(result.contacts[0].name,'Ana, Maria Souza');assert.equal(result.contacts[0].company,'Empresa');assert.equal(result.contacts[0].category,'Papelaria');assert.equal(result.contacts[0].city,'Manaus');
assert.equal(parse('Nome\tCelular\tTelefone\nJoão\t9232011234\t92932011234','csv').contacts.length,2);
assert.equal(parse('Nome,Telefone\n"Ana ""Loja""",9232011234','csv').contacts[0].name,'Ana "Loja"');
for(const text of ['Nome,Telefone\n"Ana,9232011234','Nome,Telefone\nAna,9232011234,extra','Nome,Empresa\nAna,Loja','Nome,Telefone\nAna,"9232011234"lixo']){
 result=parse(text,'csv');assert.ok(result.issues.length>0,'malformed CSV reported');assert.equal(result.contacts.length,0);
}
result=parse('Nome,Telefone\nAna,9232011234\nBia,+5592932011234','csv','');assert.equal(result.contacts.length,1);assert.equal(result.issues[0].line,2);

// A preview must reject the same malformed suggestions that make the real import fail.
const optionalFixture={name:'Ana Silva',company:'Loja',email:'ana@example.test',category:'Tintas',city:'Manaus',state:'AM'};
const csvSuggestion=(fields)=>'Nome,Telefone,Empresa,E-mail,Categoria,Cidade,Estado\n'+[fields.name,'9232011234',fields.company,fields.email,fields.category,fields.city,fields.state].join(',');
const vcfSuggestion=(fields)=>['BEGIN:VCARD','VERSION:4.0',`FN:${fields.name}`,`ORG:${fields.company}`,`EMAIL:${fields.email}`,`CATEGORIES:${fields.category}`,`ADR:;;;${fields.city};${fields.state};;`,'TEL:9232011234','END:VCARD'].join('\n');
for(const [field,value] of [
 ['name','A'],['name','N'.repeat(151)],['company','E'.repeat(151)],
 ['email','invalido'],['email','a'.repeat(138)+'@example.test'],
 ['category','C'.repeat(101)],['city','M'.repeat(101)],['state','A'.repeat(101)],
]) for(const [format,fixture] of [['csv',csvSuggestion],['vcf',vcfSuggestion]]){
 result=parse(fixture({...optionalFixture,[field]:value}),format);
 assert.equal(result.contacts.length,0,`${format} rejects ${field} suggestion`);
 assert.ok(result.issues.length>0,`${format} shows ${field} issue`);
 assert.ok(result.issues.every(issue=>issue.line>=2),'suggestion error identifies a contact line');
}
const boundarySuggestion={name:'N'.repeat(150),company:'E'.repeat(150),email:'a'.repeat(137)+'@example.test',category:'C'.repeat(100),city:'M'.repeat(100),state:'A'.repeat(100)};
for(const [format,fixture] of [['csv',csvSuggestion],['vcf',vcfSuggestion]]){
 result=parse(fixture(boundarySuggestion),format);assert.equal(result.contacts.length,1);assert.equal(result.issues.length,0);assert.equal(result.contacts[0].name,boundarySuggestion.name);
 result=parse(fixture({...optionalFixture,name:'',company:''}),format);assert.equal(result.contacts[0].name,'+559232011234','missing name has a usable phone fallback');
}
result=parse('Nome,Telefone\nA,9232011234\nAna Silva,9232011234','csv');assert.equal(result.contacts.length,1);assert.equal(result.contacts[0].name,'Ana Silva');assert.equal(result.issues[0].line,2);assert.equal(result.duplicates,0,'invalid first occurrence never hides a corrected contact');

const vcf=['BEGIN:VCARD','VERSION:3.0','N:Silva;Ana;Maria;;','ORG:Acme\\; Loja;Compras','TEL;TYPE=WORK:(92) 3201-1234','TEL;TYPE=CELL:+55 92 93201-1234','EMAIL;TYPE=INTERNET:ana@example.test','CATEGORIES:Tintas\\, verniz,Papelaria','ADR;TYPE=WORK:;;Rua 1;Manaus;AM;69000000;Brasil','END:VCARD','BEGIN:VCARD','VERSION:4.0','FN:Contato muito',' longo\\nTeste','TEL;VALUE=uri:tel:+1-202-555-0123','END:VCARD'].join('\r\n');
result=parse(vcf,'vcf');assert.equal(result.contacts.length,3);assert.equal(result.contacts[0].name,'Ana Maria Silva');assert.equal(result.contacts[0].company,'Acme; Loja');assert.equal(result.contacts[0].city,'Manaus');assert.equal(result.contacts[0].state,'AM');assert.equal(result.contacts[0].category,'Tintas, verniz, Papelaria');assert.equal(result.contacts[2].name,'Contato muitolongo\nTeste');
result=parse('BEGIN:VCARD\nVERSION:4.0\nFN:Nome preferido\nN:Silva;Outro;;;\nitem1.TEL;TYPE="cell,voice":tel:+559232011234\nTEL:+559232011234\nEND:VCARD','vcf');assert.equal(result.contacts[0].name,'Nome preferido');assert.equal(result.duplicates,1);
for(const lines of [
 ['VERSION:2.1','FN:Ana','TEL:9232011234'],
 ['VERSION:3.0','FN;ENCODING=QUOTED-PRINTABLE:Ana=20Silva','TEL:9232011234'],
 ['VERSION:3.0','FN;CHARSET=ISO-8859-1:Ana','TEL:9232011234'],
 ['FN:Ana','TEL:9232011234'],['VERSION:4.0','FN:Ana'],
 ['VERSION:4.0','FN:Ana','TEL;VALUE=uri:tel:+559232011234;ext=12'],
 ]) {result=parse(['BEGIN:VCARD',...lines,'END:VCARD'].join('\n'),'vcf');assert.equal(result.contacts.length,0);assert.ok(result.issues.length>0);assert.ok(result.issues.every(issue=>issue.line>0));}
for(const text of ['BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nTEL:9232011234','FN:Ana\nTEL:9232011234','BEGIN:VCARD\nVERSION:4.0\nFN:Ana\nTEL:9232011234\nBEGIN:VCARD\nEND:VCARD']) {result=parse(text,'vcf');assert.ok(result.issues.length>0);assert.equal(result.contacts.length,0);}
result=parse('Nome,Telefone\nAna\uFFFD,9232011234','csv');assert.equal(result.contacts.length,0);assert.ok(result.issues.length>0);
result=parse('Nome,Telefone\n'+ 'é'.repeat(MAX_CONTACT_FILE_BYTES/2),'csv');assert.equal(result.contacts.length,0);assert.match(result.issues[0].message,/5 MB/);
const rows=Array.from({length:MAX_CONTACTS+1},(_,i)=>`Pessoa ${i},+55929${String(10000000+i).slice(-8)}`);
result=parse('Nome,Telefone\n'+rows.join('\n'),'csv');assert.equal(result.contacts.length,0);assert.match(result.issues.at(-1).message,/5.000/);assert.equal(result.total,MAX_CONTACTS+1);
result=parse('Nome,Telefone\n'+rows.slice(0,MAX_CONTACTS).join('\n'),'csv');assert.equal(result.contacts.length,MAX_CONTACTS);assert.equal(result.issues.length,0);
console.log('Contact import: real CSV/VCF, line errors, suggestions, strict phones, deduplication and atomic file limits passed.');
