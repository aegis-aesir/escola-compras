import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [panel,workflow,styles]=await Promise.all([
  readFile('app/budget-record-panel.tsx','utf8'),
  readFile('app/workflow-panel.tsx','utf8'),
  readFile('app/redesign.css','utf8'),
]);

const submittedForm=panel.indexOf('className="budget-details budget-submitted-form budget-submitted-record"');
const formTitle=panel.indexOf('<summary><ClipboardList size={16}/> Formulário Orçamentário</summary>',submittedForm);
const attachments=panel.indexOf('<Attachments request={r}',formTitle);
const submittedFormEnd=panel.indexOf('</details>',submittedForm);

assert.ok(submittedForm>=0,'the submitted request must use the collapsible as its only container');
assert.ok(formTitle>submittedForm,'the collapsible must be titled Formulário Orçamentário');
assert.ok(attachments>formTitle,'attachments must follow the submitted form content');
assert.ok(submittedFormEnd>attachments,'attachments must remain inside the submitted-form collapsible');
assert.doesNotMatch(panel,/className="budget-section budget-submitted-record"/,'the submitted form must not have a redundant outer card');
assert.doesNotMatch(panel,/before=\{<details className="budget-details budget-submitted-form"/,'attachments must not own the submitted form');

const conference=panel.indexOf('Conferência administrativa</summary>');
const estimatesSlot=panel.indexOf('{estimates}',conference);
const execution=panel.indexOf('Execução</summary>',conference);
assert.ok(conference>=0&&estimatesSlot>conference&&execution>estimatesSlot,'the collapsible estimates section must appear between administrative review and execution');
assert.match(workflow,/<details className="budget-details workflow-details"[^>]*><summary><Calculator size=\{16\}\/> Estimativas<\/summary>/,'estimates must be presented as a collapsible section');

assert.match(styles,/dialog\[open\]\s*>\s*fieldset\s*\{[^}]*position:\s*relative[^}]*flex:\s*1\s+1\s+auto[^}]*min-height:\s*0[^}]*overflow:\s*hidden/is,'the request fieldset must define the available dialog area');
assert.match(styles,/dialog\[open\]\s*>\s*fieldset\s*>\s*\.modal-body\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*height:\s*auto/is,'the long request form must be anchored to the available fieldset area');
assert.match(styles,/dialog\[open\]:has\(>fieldset\)\s*\{[^}]*height:\s*min\(92vh,960px\)/is,'only request dialogs with a protected form must reserve the available viewport height');

console.log('PASS: the budget form is a single collapsible containing its attachments.');
