import test from 'node:test';import assert from 'node:assert/strict';import {matchesMemberSearch} from '../src/lib/memberSearch.js';
const member={name:'Nguyễn Quang Hải',number:19,role:'Tiền vệ',customTitle:'Đội phó'};
test('member search supports jersey marker, whitespace, case and accentless Vietnamese',()=>{for(const query of ['19','#19',' # 19 ','quang hai','NGUYỄN','doi pho','tien ve','  nguyen   quang '])assert.equal(matchesMemberSearch(member,query),true,query);assert.equal(matchesMemberSearch(member,'#1'),false);assert.equal(matchesMemberSearch(member,'#20'),false);});
