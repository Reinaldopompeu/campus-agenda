import type {Aula,Entity} from './schedule';
export function printScheduleGroups(aulas:Aula[],turmas:Entity[]){
 const groups=new Map<string,{key:string;title:string;turno:string;aulas:Aula[]}>();
 for(const aula of aulas){
  const semester=aula.semestre_curso??turmas.find(t=>t.id===aula.turma_id)?.semestre_curso;
  const key=[aula.semestre_id,aula.turma_id,semester??'',aula.turno].join(':');
  const shift:Record<string,string>={'Manhã':'MATUTINO','Tarde':'VESPERTINO','Noite':'NOTURNO'};
  if(!groups.has(key))groups.set(key,{key,turno:aula.turno,title:(semester?semester+'º SEMESTRE':'SEMESTRE DO CURSO NÃO INFORMADO')+' ('+(shift[aula.turno]||aula.turno.toUpperCase())+') - TURMA '+aula.turma+' - '+aula.semestre,aulas:[]});
  groups.get(key)!.aulas.push(aula);
 }
 return [...groups.values()].sort((a,b)=>a.title.localeCompare(b.title,'pt-BR',{numeric:true}));
}
