import test from 'node:test';import assert from 'node:assert/strict';
import {mentionAt,mentionCandidates,insertComposerText,messageParts} from '../src/lib/chatComposer.js';
test('Vietnamese mention search ignores accents and removed members; email and HTML stay plain text',()=>{
 const members=[{id:1,name:'Ngọc Nguyễn'},{id:2,name:'Ngọc',membershipStatus:'removed'}];assert.equal(mentionCandidates(members,'ngoc')[0].id,1);assert.equal(mentionCandidates(members,'ngoc').length,1);
 assert.equal(mentionAt('mail@example.com'),null);assert.deepEqual(mentionAt('Chào @Ngọc'),{start:5,end:10,query:'Ngọc'});
 assert.deepEqual(messageParts('<script> @Ngọc Nguyễn!',members),[{text:'<script> '},{text:'@Ngọc Nguyễn',mention:true},{text:'!'}]);
 assert.equal(insertComposerText('a'.repeat(2000),2000,2000,'⚽'),null);
});
