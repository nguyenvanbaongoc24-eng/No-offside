import test from 'node:test';
import assert from 'node:assert/strict';
import {localToday,validBirthday,birthdayLabel} from '../src/lib/calendarDate.js';
import {birthdaysToday} from '../src/lib/announcements.js';
import {createMasterDb,asUser,rpc,owner,member} from './helpers/masterDb.mjs';
test('birthday remains a calendar day, accepts leap dates and blank, rejects impossible/future days',()=>{
 assert.equal(localToday(new Date(2026,9,16,0,1)),'2026-10-16');
 for(const day of ['','2000-02-29','1901-01-01'])assert.equal(validBirthday(day,'2026-10-16'),true);
 for(const day of ['1900-02-29','2025-02-29','2026-02-30','0000-01-01','2026-10-17','12/05/1990'])assert.equal(validBirthday(day,'2026-10-16'),false);
 assert.equal(birthdayLabel('2000-02-29'),'29/02/2000');
 assert.deepEqual(birthdaysToday([{id:'server',birthdayToday:true},{id:'removed',birthdayToday:true,membershipStatus:'removed'}]).map(x=>x.id),['server']);
});
test('server persists private birthday across sessions, validates dates, and exposes only birthday-today to roster',async()=>{
 const db=await createMasterDb();try{
 await asUser(db,owner);await rpc(db,'no_app_create_team',['birthday-test','Đội ngày sinh',{}]);
 const profile={name:'Chủ đội',number:12,role:'Tiền đạo',teamId:'birthday-test',birthday:'2000-02-29'};
 const saved=await rpc(db,'no_app_save_profile',[profile]);assert.equal(saved.birthday,'2000-02-29');
 await asUser(db,member);assert.equal((await db.query('select birthday from profiles where id=$1',[owner])).rows.length,0);
 await asUser(db,owner);assert.equal((await rpc(db,'no_app_ensure_profile',[])).birthday,'2000-02-29');
 await assert.rejects(()=>rpc(db,'no_app_save_profile',[{...profile,birthday:'2025-02-29'}]),/Ngày sinh/);
 await assert.rejects(()=>rpc(db,'no_app_save_profile',[{...profile,birthday:'2999-01-01'}]),/tương lai/);
 await assert.rejects(()=>rpc(db,'no_app_save_profile',[{...profile,birthday:'2026-13-01'}]),/Ngày sinh/);
 // Omitting the key preserves previous clients' existing birthday.
 const {birthday,...withoutBirthday}=profile;assert.equal((await rpc(db,'no_app_save_profile',[withoutBirthday])).birthday,'2000-02-29');
 const today=(await db.query("select to_char(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD') d")).rows[0].d;
 await rpc(db,'no_app_save_profile',[{...profile,birthday:today}]);
 const snapshot=await rpc(db,'no_app_snapshot',['birthday-test']);const me=snapshot.team.members.find(x=>x.id===owner);
 assert.equal(me.birthdayToday,true);assert.equal('birthday' in me,false);assert.equal(JSON.stringify(me).includes(today),false);
 assert.equal((await rpc(db,'no_app_save_profile',[{...profile,birthday:''}])).birthday,null);
 }finally{await db.close();}
});
