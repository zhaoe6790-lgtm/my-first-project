import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodePhoto} from './validation.mjs';
test('reject disguised files and invalid input',()=>{for(const x of [null,'hello','data:image/png;base64,'+Buffer.from('not an image at all').toString('base64')])assert.throws(()=>decodePhoto(x));});
test('reject oversized photo',()=>assert.throws(()=>decodePhoto('data:image/png;base64,'+Buffer.alloc(6*1024*1024).toString('base64'))));
test('accept jpeg header',()=>assert.equal(decodePhoto('data:image/jpeg;base64,'+Buffer.from([255,216,255,...Array(12).fill(0)]).toString('base64')).type,'image/jpeg'));
