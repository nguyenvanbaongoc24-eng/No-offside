import {getUserClient,getAuthUser,bearerToken,apiError,setCorsHeaders} from './_storageHelper.js';
export default async function handler(req,res) {
  setCorsHeaders(res);
  res.setHeader('Cache-Control','private, no-store');
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!bearerToken(req))return res.status(401).json({error:'Vui lòng đăng nhập lại.'});
  try {
    const client=getUserClient(req), user=await getAuthUser(req,client);
    if(!user)return res.status(401).json({error:'Vui lòng đăng nhập lại.'});
    let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({error:'Dữ liệu không hợp lệ.'});}
    if(body?.action!=='password' || typeof body.oldPassword!=='string' || body.oldPassword.length>256 || typeof body.password!=='string' || body.password.length!==6 || !/^[0-9]{6}$/.test(body.password))return res.status(400).json({error:'Mật khẩu mới phải gồm đúng 6 chữ số.'});
    if(body.oldPassword===body.password)return res.status(400).json({error:'Mật khẩu mới phải khác mật khẩu hiện tại.'});
    if(!user.email)return res.status(400).json({error:'Tài khoản chưa có phương thức đổi mật khẩu này.'});
    // A stateless request-scoped client verifies the old password. Never use an admin password reset.
    const passwordClient=getUserClient({headers:{}});
    const verified=await passwordClient.auth.signInWithPassword({email:user.email,password:body.oldPassword});
    if(verified.error || verified.data?.user?.id!==user.id){if(verified.data?.session)await passwordClient.auth.signOut({scope:'local'}).catch(()=>{});return res.status(400).json({error:'Mật khẩu hiện tại chưa chính xác hoặc tài khoản chưa thiết lập mật khẩu.'});}
    let changed;try{changed=await passwordClient.auth.updateUser({password:body.password});}finally{await passwordClient.auth.signOut({scope:'local'}).catch(()=>{});}
    if(changed.error)return res.status(400).json({error:'Không đổi được mật khẩu. Kiểm tra chính sách mật khẩu hoặc thử lại sau.'});
    return res.status(200).json({success:true});
  }catch(error){return apiError(res,error);}
}
