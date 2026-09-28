import {database} from '@/db/connection';
const encoder=new TextEncoder();
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256))}
export function sessionToken(request:Request){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('campus_session='))?.slice(15)||''}
export async function authenticated(request:Request){const token=sessionToken(request);if(!/^[a-f0-9]{64}$/.test(token))return false;return !!await database().prepare('SELECT token_hash FROM auth_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first()}
export function sessionCookie(request:Request,token:string,maxAge=28800){return `campus_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`}
