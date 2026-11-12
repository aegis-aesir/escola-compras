import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [layout,appearance,accents,redesign,history]=await Promise.all([
  readFile('app/layout.tsx','utf8'),
  readFile('app/appearance.css','utf8'),
  readFile('app/appearance.ts','utf8'),
  readFile('app/redesign.css','utf8'),
  readFile('app/request-history.tsx','utf8'),
]);

assert.ok(layout.indexOf('import "./redesign.css"')>layout.indexOf('import "./budget.css"'),'redesign styles must load after existing styles');
assert.equal([...accents.matchAll(/id:'([^']+)'/g)].length,11,'all eleven accent choices must remain available');
for(const token of ['--ui-radius','--ui-shadow','--ui-control-height','--ui-sidebar-compact','--ui-sidebar-expanded'])assert.ok(redesign.includes(token),`missing design token ${token}`);
for(const selector of [':focus-visible','.button','.panel','input,textarea,select','.table-scroll','.badge','dialog','.alert'])assert.ok(redesign.includes(selector),`missing shared component rule ${selector}`);
for(const selector of ['.page-heading','.metrics','.overview-grid','.filters','.supplier-grid','.integration-banner','.empty','.page-actions'])assert.ok(redesign.includes(selector),`missing primary screen rule ${selector}`);
for(const selector of ['.budget-section','.budget-fields','.budget-item','.budget-details','.budget-file-list','.workflow-panel','.integration-status','.users-panel','.decision-box','.conference-actions','.form-end'])assert.ok(redesign.includes(selector),`missing domain form rule ${selector}`);
for(const selector of ['.modal-head','.modal-body','.detail-title','.detail-meta','.items-list','.request-history','.request-archive-dialog','.archive-confirm-actions'])assert.ok(redesign.includes(selector),`missing dialog and detail rule ${selector}`);
assert.match(redesign,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'motion must respect the device accessibility preference');
assert.match(redesign,/@media\s*\(max-width:\s*900px\)/,'tablet navigation breakpoint must exist');
assert.match(redesign,/@media\s*\(max-width:\s*600px\)/,'mobile form breakpoint must exist');
assert.match(redesign,/min-height:\s*var\(--ui-control-height\)/,'interactive controls must share the accessible minimum height');
assert.match(redesign,/overflow-wrap:\s*anywhere/,'long business content must wrap safely');
assert.match(redesign,/content-visibility:\s*auto/,'long card and table collections should defer off-screen rendering');
assert.match(redesign,/\.budget-fields[^}]*grid-template-columns:\s*repeat\(2/,'budget fields need an identifiable desktop grid');
assert.match(redesign,/@media\s*\(max-width:\s*600px\)[\s\S]*\.budget-fields[^}]*grid-template-columns:\s*1fr/,'budget fields must become one column on mobile');
assert.match(redesign,/\.modal-head[^}]*position:\s*sticky/,'dialog headers must remain visible while scrolling');
assert.match(redesign,/\.modal-body[^}]*overflow-y:\s*auto/,'long dialog bodies need internal scrolling');
assert.match(redesign,/max-height:\s*calc\(100dvh\s*-\s*16px\)/,'mobile dialogs must fit the dynamic viewport');
assert.match(redesign,/@media\s*\(max-width:\s*900px\)[\s\S]*\.sidebar\s*\{[^}]*visibility:\s*hidden/,'closed mobile navigation must be hidden from assistive technology');
assert.match(redesign,/\[data-mobile-nav="open"\]\s+\.sidebar\s*\{[^}]*visibility:\s*visible/,'open mobile navigation must become visible to assistive technology');
assert.match(history,/className="request-history"/,'request history needs its own visual region');
assert.match(appearance,/:root\[data-theme="dark"\]/,'dark theme must remain supported');
console.log('PASS: global redesign tokens and shared component contracts are present.');
