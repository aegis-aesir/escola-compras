import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [layout,appearance,accents,redesign]=await Promise.all([
  readFile('app/layout.tsx','utf8'),
  readFile('app/appearance.css','utf8'),
  readFile('app/appearance.ts','utf8'),
  readFile('app/redesign.css','utf8'),
]);

assert.ok(layout.indexOf('import "./redesign.css"')>layout.indexOf('import "./budget.css"'),'redesign styles must load after existing styles');
assert.equal([...accents.matchAll(/id:'([^']+)'/g)].length,11,'all eleven accent choices must remain available');
for(const token of ['--ui-radius','--ui-shadow','--ui-control-height','--ui-sidebar-compact','--ui-sidebar-expanded'])assert.ok(redesign.includes(token),`missing design token ${token}`);
for(const selector of [':focus-visible','.button','.panel','input,textarea,select','.table-scroll','.badge','dialog','.alert'])assert.ok(redesign.includes(selector),`missing shared component rule ${selector}`);
assert.match(redesign,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'motion must respect the device accessibility preference');
assert.match(redesign,/@media\s*\(max-width:\s*900px\)/,'tablet navigation breakpoint must exist');
assert.match(redesign,/@media\s*\(max-width:\s*600px\)/,'mobile form breakpoint must exist');
assert.match(redesign,/min-height:\s*var\(--ui-control-height\)/,'interactive controls must share the accessible minimum height');
assert.match(appearance,/:root\[data-theme="dark"\]/,'dark theme must remain supported');
console.log('PASS: global redesign tokens and shared component contracts are present.');
