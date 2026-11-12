import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const panel=await readFile('app/budget-record-panel.tsx','utf8');
const drafts=await readFile('app/draft-request-form.tsx','utf8');
const requestForm=await readFile('app/budget-request-form.tsx','utf8');

assert.match(panel,/Devolver para apuração administrativa/,'Diretoria Geral precisa da ação de devolução');
assert.match(panel,/send\('return_to_admin'/,'a ação visual deve chamar a transição protegida');
assert.match(panel,/Resposta à pendência da Diretoria Geral/,'Diretoria Administrativa precisa responder à pendência');
assert.match(panel,/generalReturnHistory/,'o histórico das devoluções precisa permanecer consultável');
assert.match(panel,/r\.status==='deferred'&&!r\.deferred\?\.draftId/,'retomada legada só pode aparecer sem a nova cópia');
assert.match(panel,/Cópia editável enviada ao setor/,'o original adiado deve indicar a criação da cópia');

for(const text of ['Adiado','sourceCode','availableMonth','deferReason']){
  assert.ok(drafts.includes(text),`lista de rascunhos deve identificar ${text}`);
}
assert.match(requestForm,/submitBlockedReason/,'formulário precisa aceitar o bloqueio mensal de envio');
assert.match(requestForm,/disabled=\{busy\|\|!!submitBlockedReason\}/,'somente o envio deve ficar bloqueado');

console.log('PASS: devolução da Diretoria Geral e cópia adiada têm controles e identificação na interface.');
