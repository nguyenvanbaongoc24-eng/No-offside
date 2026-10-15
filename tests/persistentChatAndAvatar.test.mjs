import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
import {validateImage} from '../api/_imageValidation.js';
let db;
before(async()=>{db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_app_create_team',['chat-a','FC Chat',{}]);await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values('chat-a',$1,'Member','member','active')",[member]);});
after(async()=>{await db.close();});
test('chat persists with canonical schema (no owner_id, no direct membership table grants)',async()=>{
 await asUser(db,member);const first=await rpc(db,'no_app_send_message',['chat-a','message-1','Xin chào cả đội!']);assert.equal(first.sender_id,member);
 const retry=await rpc(db,'no_app_send_message',['chat-a','message-1','Different retry text']);assert.equal(retry.id,first.id);assert.equal(retry.text,'Xin chào cả đội!');
 await assert.rejects(()=>db.query("insert into no_team_messages(team_id,sender_id,client_msg_id,text) values('chat-a',$1,'forged','Impersonation')",[owner]),/permission denied|row-level security/);
 assert.equal((await db.query('select count(*)::int as n from no_team_messages')).rows[0].n,1);
});
test('outsider, missing-team and removed identities cannot read or send',async()=>{
 await asUser(db,outsider);assert.equal((await db.query('select * from no_team_messages')).rows.length,0);
 await assert.rejects(()=>rpc(db,'no_app_send_message',['chat-a','outsider','Hello']),/không có quyền/);
 await assert.rejects(()=>rpc(db,'no_app_send_message',['missing','outsider','Hello']),/không có quyền/);
 await db.exec('reset role');await db.query("update no_gov_members set status='removed' where user_id=$1",[member]);
 await asUser(db,member);assert.equal((await db.query('select * from no_team_messages')).rows.length,0);await assert.rejects(()=>rpc(db,'no_app_send_message',['chat-a','removed','Hello']),/không có quyền/);
});
test('invalid message payload and anonymous sender are rejected',async()=>{
 await asUser(db,owner);await assert.rejects(()=>rpc(db,'no_app_send_message',['chat-a','empty','   ']),/không hợp lệ/);
 await assert.rejects(()=>rpc(db,'no_app_send_message',['chat-a','long','x'.repeat(2001)]),/không hợp lệ/);
 await asUser(db,null);await assert.rejects(()=>rpc(db,'no_app_send_message',['chat-a','anon','Hello']),/permission denied/);
});
test('avatar validates actual bytes as well as declared type, dimensions and size',()=>{
 assert.equal(validateImage(Buffer.from('<svg onload="alert(1)">'),'image/png'),false);
 assert.equal(validateImage(Buffer.alloc(0),'image/jpeg'),false);
 const png=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(96,16);png.writeUInt32BE(96,20);
 assert.equal(validateImage(png,'image/png'),true);assert.equal(validateImage(png,'image/webp'),false);png.writeUInt32BE(10000,16);assert.equal(validateImage(png,'image/png'),false);
 assert.equal(validateImage(Buffer.alloc(2*1024*1024+1),'image/png'),false);
});
