import fs from 'node:fs';
import path from 'node:path';

export class RatingStore {
  constructor(file=process.env.DATA_FILE || path.resolve('data/players.json')) {
    this.file=file;this.records=Object.create(null);this.pending=null;
    try {
      const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
      if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) {
        for(const [key,value] of Object.entries(parsed)) {
          if(/^[a-f0-9]{64}$/.test(key)&&value&&typeof value==='object')this.records[key]=value;
        }
      }
    } catch(e) {if(e.code!=='ENOENT') console.warn('Cannot load player ratings:',e.message);}
  }
  get(key){return this.records[key] || null;}
  set(key,value){
    this.records[key]=value;
    if(!this.pending) {
      this.pending=setTimeout(()=>{this.pending=null;this.flush();},200);
      this.pending.unref?.();
    }
  }
  top(limit=30) {
    return Object.values(this.records).filter(p=>Number.isFinite(p.rating) && p.matches>0)
      .sort((a,b)=>b.rating-a.rating||b.wins-a.wins).slice(0,limit)
      .map(p=>({id:p.id,name:p.name,country:p.country,rating:p.rating,
        matches:p.matches,wins:p.wins,losses:p.losses,draws:p.draws}));
  }
  flush(){
    if(this.pending){clearTimeout(this.pending);this.pending=null;}
    try{
      fs.mkdirSync(path.dirname(this.file),{recursive:true});
      const tmp=this.file+'.tmp';
      fs.writeFileSync(tmp,JSON.stringify(this.records),'utf8');
      fs.renameSync(tmp,this.file);
    } catch(e){console.error('Rating persistence failed:',e);}
  }
}
