import {database} from '@/db/connection';
import {authenticated,digest,passwordHash,randomToken,sessionCookie,sessionToken} from '@/lib/auth';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(request:Request){try{return reply({semestres:(await database().prepare('SELECT id,nome FROM semestres ORDER BY nome').all()).results,authenticated:await authenticated(request),needsSetup:!await database().prepare('SELECT id FROM auth_account WHERE id=1').first()})}catch{return reply({error:'Não foi possível verificar o acesso. Tente novamente.'},503)}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Origem não autorizada.'},403);
 const body=await request.json() as {action?:string;username?:string;password?:string};const db=database();
 if(body.action==='logout'){await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(sessionToken(request))).run();return reply({ok:true},200,sessionCookie(request,'',0))}
 if(body.action!=='login'&&body.action!=='setup')return reply({error:'Operação inválida.'},400);
 const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';const password=typeof body.password==='string'?body.password:'';
 if(!username||username.length>80||password.length<1||password.length>256)return reply({error:'Informe usuário e senha válidos.'},400);
 const account=await db.prepare('SELECT * FROM auth_account WHERE id=1').first<{username:string;salt:string;password_hash:string;locked_until:number}>();
 if(body.action==='setup'){
  if(account)return reply({error:'O acesso já foi configurado. Entre com seu usuário e senha.'},409);
  if(username.length<3||password.length<10)return reply({error:'Use pelo menos 3 caracteres no usuário e 10 na senha.'},400);
  const salt=randomToken();const result=await db.prepare('INSERT OR IGNORE INTO auth_account(id,username,salt,password_hash) VALUES(1,?,?,?)').bind(username,salt,await passwordHash(password,salt)).run();if(!result.meta.changes)return reply({error:'O acesso já foi configurado. Atualize a página.'},409);
 }else{
  if(!account)return reply({error:'Configure o primeiro acesso.'},400);
  if(account.locked_until>Date.now())return reply({error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.'},429);
  await db.prepare('UPDATE auth_account SET failures=0,locked_until=0 WHERE id=1 AND locked_until>0 AND locked_until<=?').bind(Date.now()).run();
  const hash=await passwordHash(password,account.salt);let mismatch=0;for(let i=0;i<hash.length;i++)mismatch|=hash.charCodeAt(i)^account.password_hash.charCodeAt(i);
  if(username!==account.username||mismatch){await db.prepare('UPDATE auth_account SET failures=failures+1,locked_until=CASE WHEN failures+1>=5 THEN ? ELSE 0 END WHERE id=1').bind(Date.now()+900000).run();return reply({error:'Usuário ou senha incorretos.'},401)}
  await db.prepare('UPDATE auth_account SET failures=0,locked_until=0 WHERE id=1').run();
 }
 const token=randomToken();await db.batch([db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(Date.now()),db.prepare('INSERT INTO auth_sessions(token_hash,expires_at) VALUES(?,?)').bind(await digest(token),Date.now()+28800000)]);return reply({ok:true},200,sessionCookie(request,token));
 }catch{return reply({error:'Não foi possível entrar. Tente novamente.'},503)}}
