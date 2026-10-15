import test from 'node:test';
import assert from 'node:assert/strict';
import {createMasterDb,asUser,rpc,owner,member} from './helpers/masterDb.mjs';
test('legacy Auth account without a profile restores only itself; repeat boot preserves edits and never grants team roles',async()=>{
 const db=await createMasterDb();
 try{
  await db.exec('reset role');
  await db.query('delete from profiles where id=$1',[owner]);
  await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{full_name:'Tên tài khoản cũ',username:'restored-player',role:'owner',teamId:'forged'},owner]);
  await asUser(db,null);await assert.rejects(()=>rpc(db,'no_app_ensure_profile',[]),/permission denied/);
  await asUser(db,owner);const profile=await rpc(db,'no_app_ensure_profile',[]);
  assert.equal(profile.id,owner);assert.equal(profile.full_name,'Tên tài khoản cũ');assert.equal(profile.username,'restored-player');
  assert.deepEqual(await rpc(db,'no_gov_my_memberships',[]),[]);
  await db.exec('reset role');await db.query("update profiles set full_name='Edited profile' where id=$1",[owner]);
  await asUser(db,owner);assert.equal((await rpc(db,'no_app_ensure_profile',[])).full_name,'Edited profile');
  await db.exec('reset role');await db.query('delete from profiles where id=$1',[member]);await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'restored-player'},member]);
  await asUser(db,member);const second=await rpc(db,'no_app_ensure_profile',[]);assert.equal(second.id,member);assert.equal(second.username,null);
 }finally{await db.close();}
});
