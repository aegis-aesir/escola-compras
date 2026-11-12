import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile('app/login-screen.tsx','utf8');
const image=await readFile('public/estrela-2026.png');
assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10],'official logo must be a PNG');
assert.ok(image.readUInt32BE(16)>500&&image.readUInt32BE(20)>500,'official logo must retain enough resolution for the interface');
assert.match(source,/src="\/estrela-2026\.png"/,'login must use the official 2026 logo asset');
assert.match(source,/alt="Colégio Estrelas"/,'official logo needs an accessible name');
console.log('PASS: login uses the official Colégio Estrelas 2026 logo asset.');
