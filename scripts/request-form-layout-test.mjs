import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [panel,workflow,styles]=await Promise.all([
  readFile('app/budget-record-panel.tsx','utf8'),
  readFile('app/workflow-panel.tsx','utf8'),
  readFile('app/redesign.css','utf8'),
]);

const recordStart=panel.indexOf('className="budget-section budget-submitted-record"');
const formTitle=panel.indexOf('Formulário da solicitação',recordStart);
const submittedForm=panel.indexOf('className="budget-details budget-submitted-form"',formTitle);
const attachments=panel.indexOf('<Attachments request={r}',submittedForm);
const submittedFormEnd=panel.indexOf('</details>',submittedForm);
const recordEnd=panel.indexOf('</section>',attachments);

assert.ok(recordStart>=0,'the submitted request must have a form-owned container');
assert.ok(formTitle>recordStart,'the main container must be identified as the request form');
assert.ok(submittedForm>formTitle,'the submitted form content must be inside the form container');
assert.ok(attachments>submittedForm&&attachments<recordEnd,'attachments must be nested inside the request form container');
assert.ok(submittedFormEnd>attachments,'attachments must remain inside the submitted-form collapsible');
assert.doesNotMatch(panel,/before=\{<details className="budget-details budget-submitted-form"/,'attachments must not own the submitted form');

const conference=panel.indexOf('<summary>Conferência administrativa</summary>');
const estimatesSlot=panel.indexOf('{estimates}',conference);
const execution=panel.indexOf('<summary>Execução</summary>',conference);
assert.ok(conference>=0&&estimatesSlot>conference&&execution>estimatesSlot,'the collapsible estimates section must appear between administrative review and execution');
assert.match(workflow,/<details className="budget-details workflow-details"[^>]*><summary>Estimativas<\/summary>/,'estimates must be presented as a collapsible section');

assert.match(styles,/dialog\[open\]\s*>\s*fieldset\s*\{[^}]*position:\s*relative[^}]*flex:\s*1\s+1\s+auto[^}]*min-height:\s*0[^}]*overflow:\s*hidden/is,'the request fieldset must define the available dialog area');
assert.match(styles,/dialog\[open\]\s*>\s*fieldset\s*>\s*\.modal-body\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*height:\s*auto/is,'the long request form must be anchored to the available fieldset area');
assert.match(styles,/dialog\[open\]:has\(>fieldset\)\s*\{[^}]*height:\s*min\(92vh,960px\)/is,'only request dialogs with a protected form must reserve the available viewport height');

console.log('PASS: attachments belong to the submitted form and the request dialog owns its scroll area.');
