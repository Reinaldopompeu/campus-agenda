import { z } from 'zod';
import { applyAction, joined, LocalError, makeBackup, newData, parseBackup } from './local-model';
import type { Data } from './schedule';

type Account = {username:string;salt:string;hash:string;failures:number;lockedUntil:number};
type Store = {version:1;data:Data;account?:Account;sessions:{hash:string;expires:number}[];revision:number};
const fresh = (): Store => ({version:1,data:newData(),sessions:[],revision:0});
const sessionKey = 'campus_local_session';
const response = (body:unknown,status=200) => Response.json(body,{status});
let openPromise: Promise<IDBDatabase> | undefined;
function openStore() {
  if (!openPromise) openPromise = new Promise<IDBDatabase>((resolve,reject) => {
    const request = indexedDB.open('campus-local',1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(new Error('O navegador não permitiu abrir os dados locais. Verifique as permissões de armazenamento.'));
    request.onblocked = () => reject(new Error('Feche as outras abas do Campus e tente novamente.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => {request.result.close(); openPromise=undefined;};
      resolve(request.result);
    };
  }).catch(error => {openPromise=undefined; throw error;});
  return openPromise;
}
// Read, validate and replace in the same IndexedDB transaction: tabs cannot overwrite stale snapshots.
async function transaction<T>(fn:(store:Store)=>T, write=false):Promise<T> {
  const db = await openStore();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state',write?'readwrite':'readonly');
    const objectStore = tx.objectStore('state');
    let result:T, failure:unknown;
    const request = objectStore.get('main');
    request.onsuccess = () => {
      try {
        const store:Store = request.result ?? fresh();
        if (store.version !== 1) throw new Error('Versão dos dados locais não suportada.');
        result = fn(store);
        if (write) {store.revision++;objectStore.put(store,'main');}
      } catch(error) {failure=error;tx.abort();}
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure ?? new Error('Não foi possível salvar neste navegador. Libere espaço ou faça um backup.'));
    tx.onerror = () => { failure ??= tx.error; };
  });
}
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const hex = (value:ArrayBuffer) => Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
const encoder = new TextEncoder();
async function digest(value:string) { return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value))); }
async function passwordHash(password:string,salt:string) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256));
}
async function currentSession() { return digest(sessionStorage.getItem(sessionKey) ?? ''); }
function authorized(store:Store,hash:string) {return store.sessions.some(s=>s.hash===hash&&s.expires>Date.now());}
function requireSession(store:Store,hash:string) {if(!authorized(store,hash))throw new LocalError('Entre para acessar a agenda.',401);}
function notify() { if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('campus-local');channel.postMessage('changed');channel.close();} }
export async function localRequest(path:string, init?:RequestInit):Promise<Response> {
  try {
    const hash = await currentSession();
    if (!init?.method || init.method === 'GET') {
      return await transaction(store => {
        if(path==='/api/auth')return response({semestres:store.data.semestres,authenticated:authorized(store,hash),needsSetup:!store.account});
        requireSession(store,hash);
        return response(joined(store.data));
      });
    }
    const body=JSON.parse(String(init.body ?? '{}'));
    if(path==='/api/auth') {
      if(body.action==='logout') {
        await transaction(store=>{store.sessions=store.sessions.filter(s=>s.hash!==hash);},true);
        sessionStorage.removeItem(sessionKey);
        return response({ok:true});
      }
      if(!['login','setup'].includes(body.action))throw new LocalError('Operação inválida.');
      const username=z.string().trim().min(1).max(80).parse(body.username).toLowerCase();
      const password=z.string().min(1).max(256).parse(body.password);
      const old=await transaction(store=>store.account);
      const salt=old?.salt ?? random();
      const computed=await passwordHash(password,salt);
      const token=random(),tokenHash=await digest(token);
      const result=await transaction(store=>{
        if(body.action==='setup') {
          if(store.account)return response({error:'O acesso já foi configurado neste navegador.'},409);
          if(username.length<3||password.length<10)return response({error:'Use 3 caracteres no usuário e 10 na senha.'},400);
          store.account={username,salt,hash:computed,failures:0,lockedUntil:0};
        }else{
          const account=store.account;
          if(!account)return response({error:'Crie seu acesso neste navegador.'},400);
          if(account.salt!==salt)return response({error:'O acesso mudou. Tente novamente.'},409);
          if(account.lockedUntil>Date.now())return response({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
          if(account.lockedUntil){account.failures=0;account.lockedUntil=0;}
          if(account.username!==username||account.hash!==computed){
            account.failures++;
            if(account.failures>=5)account.lockedUntil=Date.now()+900000;
            return response({error:'Usuário ou senha incorretos.'},401);
          }
          account.failures=0;account.lockedUntil=0;
        }
        store.sessions=store.sessions.filter(s=>s.expires>Date.now());
        store.sessions.push({hash:tokenHash,expires:Date.now()+28800000});
        return response({ok:true});
      },true);
      if(result.ok)sessionStorage.setItem(sessionKey,token);
      return result;
    }
    const result=await transaction(store=>{requireSession(store,hash);return response(applyAction(store.data,body));},true);
    notify();
    return result;
  }catch(error){
    if(error instanceof LocalError)return response({error:error.message,...error.details},error.status);
    if(error instanceof z.ZodError || error instanceof SyntaxError)return response({error:'Confira os dados informados.'},400);
    return response({error:'Não foi possível acessar ou salvar os dados neste navegador. Verifique o espaço e as permissões de armazenamento.'},503);
  }
}
export async function exportLocalBackup() {
  const hash=await currentSession();
  return transaction(store=>{requireSession(store,hash);return makeBackup(store.data);});
}
export async function importLocalBackup(raw:unknown) {
  const data=parseBackup(raw),hash=await currentSession();
  await transaction(store=>{requireSession(store,hash);store.data=data;},true);
  notify();
}
export function downloadBackup(backup:unknown,prefix='campus-backup') {
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`${prefix}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
