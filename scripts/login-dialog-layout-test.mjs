import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [loginStyles,redesign]=await Promise.all([
  readFile('app/local-auth.css','utf8'),
  readFile('app/redesign.css','utf8'),
]);

function rule(css,selector){
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match,`missing CSS rule ${selector}`);
  return match[1].replace(/\s+/g,'');
}

for(const selector of ['.login-control>svg:first-child','.login-control-end','.login-password-toggle']){
  const declarations=rule(loginStyles,selector);
  assert.match(declarations,/top:50%/i,`${selector} must anchor itself to the control's vertical center`);
  assert.match(declarations,/transform:translateY\(-50%\)/i,`${selector} must center its own height around the anchor`);
}

const openDialog=rule(redesign,'dialog[open]');
assert.match(openDialog,/overflow:hidden/i,'the dialog must not compete with its body for wheel scrolling');
const modalBody=rule(redesign,'.modal-body');
assert.match(modalBody,/flex:11auto/i,'the modal body must fill the remaining dialog height');
assert.match(modalBody,/overflow-y:auto/i,'the modal body must receive vertical wheel scrolling');

console.log('PASS: login icons are vertically centered and modal content owns wheel scrolling.');
