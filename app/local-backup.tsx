"use client";
import {useRef,useState} from 'react';
import {Download,Upload,HardDrive} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {downloadBackup,exportLocalBackup,importLocalBackup} from '@/lib/local-store';
import {parseBackup} from '@/lib/local-model';

export function LocalBackup({onRestore}:{onRestore:()=>Promise<void>}) {
  const [open,setOpen]=useState(false),[pending,setPending]=useState<unknown>(null),[summary,setSummary]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const input=useRef<HTMLInputElement>(null);
  async function choose(file?:File){
    setError('');setPending(null);setNotice('');
    if(!file)return;
    try{
      if(file.size>20*1024*1024)throw Error('O limite do backup é 20 MB.');
      const raw=JSON.parse(await file.text()),data=parseBackup(raw);
      setPending(raw);setSummary(`${data.aulas.length} horários, ${data.docentes.length} docentes, ${data.disciplinas.length} disciplinas e ${data.semestres.length} semestres.`);
    }catch{setError('Arquivo inválido ou incompatível. Escolha um backup JSON do Campus de até 20 MB.');}
    finally{if(input.current)input.current.value='';}
  }
  async function restore(){
    setBusy(true);setError('');
    try{
      downloadBackup(await exportLocalBackup(),'campus-antes-da-restauracao');
      await importLocalBackup(pending);await onRestore();setPending(null);setNotice('Backup restaurado. Seu usuário e sua senha foram mantidos.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível restaurar. Os dados anteriores foram preservados.');}
    finally{setBusy(false);}
  }
  return <><button className="secondary" onClick={()=>setOpen(true)}><HardDrive size={16}/>Dados e backup</button><Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v)}}><DialogContent className="local-backup-dialog"><DialogHeader><DialogTitle>Dados neste navegador</DialogTitle><DialogDescription>Os cadastros e horários ficam somente neste navegador, neste aparelho. Não são enviados à Vercel e não sincronizam com outros dispositivos.</DialogDescription></DialogHeader><p>Limpar os dados do site, trocar de navegador ou usar uma janela anônima pode fazer você perder o acesso às informações. Salve uma cópia regularmente.</p><p>Use sempre o mesmo endereço do site. Um endereço de prévia da Vercel tem armazenamento separado.</p><div className="local-backup-actions"><button className="primary" disabled={busy} onClick={async()=>{setError('');try{downloadBackup(await exportLocalBackup());setNotice('Download solicitado. Guarde o arquivo em um lugar seguro: ele contém os cadastros e horários, sem senha.');}catch{setError('Não foi possível exportar. Entre novamente e tente outra vez.');}}}><Download size={16}/>Exportar backup</button><button className="secondary" disabled={busy} onClick={()=>input.current?.click()}><Upload size={16}/>Importar backup</button><input ref={input} type="file" accept=".json,application/json" aria-label="Arquivo de backup" hidden onChange={e=>void choose(e.target.files?.[0])}/></div>{pending!=null&&<div className="local-restore-confirm"><strong>Substituir os dados atuais?</strong><p>{summary}</p><p>Os cadastros e horários deste navegador serão substituídos. Antes disso, será baixada uma cópia dos dados atuais. O usuário e a senha não mudam.</p><div className="local-backup-actions"><button className="secondary" disabled={busy} onClick={()=>setPending(null)}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void restore()}>{busy?'Restaurando…':'Confirmar restauração'}</button></div></div>}{error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</DialogContent></Dialog></>;
}
