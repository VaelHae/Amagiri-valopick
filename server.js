const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||3000,DIR=path.join(__dirname,'data'),FILE=path.join(DIR,'state.json');
const MAPS=JSON.parse(fs.readFileSync(path.join(__dirname,'maps.json'),'utf8'));
const IDS=new Set(MAPS.map(m=>m.id));
let S={match:null,history:[]},timer=null;const clients=new Set();
const URI=process.env.MONGODB_URI;let coll=null,chain=Promise.resolve();
const save=()=>{
 if(coll){const snap=JSON.parse(JSON.stringify({_id:'state',match:S.match,history:S.history}));
  chain=chain.then(()=>coll.replaceOne({_id:'state'},snap,{upsert:true})).catch(e=>console.error('MongoDB:',e.message));return}
 try{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(S))}catch(e){console.error(e.message)}};
async function init(){
 if(URI){const{MongoClient}=require('mongodb');const c=new MongoClient(URI,{serverSelectionTimeoutMS:8000});await c.connect();
  coll=c.db(process.env.MONGODB_DB||'mapdraft').collection('state');
  const d=await coll.findOne({_id:'state'});if(d)S=Object.assign(S,{match:d.match||null,history:d.history||[]});console.log('Penyimpanan: MongoDB')}
 else{try{S=Object.assign(S,JSON.parse(fs.readFileSync(FILE,'utf8')))}catch(e){if(e.code!=='ENOENT'){try{fs.renameSync(FILE,FILE+'.broken')}catch{}}}console.log('Penyimpanan: file data/state.json')}
 if(!Array.isArray(S.history))S.history=[];
 if(S.match&&S.match.draw)schedule();
}
const pub=()=>JSON.stringify({match:S.match,history:S.history,now:Date.now()});
const push=()=>{save();const d='data: '+pub()+'\n\n';clients.forEach(r=>r.write(d))};
const clean=(v,d)=>String(v??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,24)||d;
const avail=m=>m.pool.filter(id=>!m.picks.some(p=>p.map===id)&&!m.bans.some(b=>b.map===id));
function defSeq(mode,n,p){
 const alt=(k,t)=>Array.from({length:k},(_,i)=>(i%2?'B':'A')+':'+t);
 if(mode==='gacha')return Array(n).fill('gacha');
 if(mode==='tournament')return[...(p>=n+2?alt(2,'ban'):[]),...Array(n).fill('gacha')];
 if(n===1)return[...alt(p-1,'ban'),'decider'];
 return[...alt(2,'ban'),...alt(n-1,'pick'),...alt(Math.max(p-n-2,0),'ban'),'decider'];
}
function parseSeq(str,n,p){
 const seq=String(str).split(',').map(t=>t.trim().toLowerCase()).filter(Boolean).map(t=>{
  const [a,b]=t.split(':');const by=b?a.toUpperCase():null,type=b||a;
  if(!['ban','pick','gacha','decider'].includes(type)||(b&&!['A','B'].includes(by))||(['ban','pick'].includes(type)&&!by))throw Error('Token veto tidak valid: '+t);
  return{by,type}});
 const take=seq.filter(s=>s.type!=='ban').length,bans=seq.length-take;
 if(take!==n)throw Error(`Urutan harus berisi tepat ${n} langkah pick/gacha/decider (sekarang ${take})`);
 if(bans+n>p)throw Error('Map pool terlalu sedikit untuk urutan ini');
 return seq;
}
function settle(m){
 for(;;){const s=m.seq[m.step];const a=avail(m);
  if(s&&s.type==='decider'&&a.length===1&&m.picks.length<m.n){m.picks.push({map:a[0],by:null,drawId:null});m.step++;continue}
  break}
 if(m.picks.length>=m.n&&!m.done){m.done=true;m.finishedAt=Date.now();archive(m,'completed')}
}
function archive(m,status){
 if(m.archived)return;m.archived=true;
 S.history.unshift({id:m.id,teamA:m.teamA,teamB:m.teamB,n:m.n,mode:m.mode,picks:m.picks.map(p=>({map:p.map,by:p.by})),bans:m.bans,startedAt:m.startedAt,finishedAt:Date.now(),status});
 S.history=S.history.slice(0,200);
}
function schedule(){
 clearTimeout(timer);const m=S.match;if(!m||!m.draw)return;const d=m.draw;
 timer=setTimeout(()=>{if(S.match!==m||m.draw!==d)return;m.picks.push({map:d.strip[d.winnerIndex],by:null,drawId:d.id});m.step++;m.draw=null;settle(m);push()},
  Math.max(0,d.startedAt+d.duration-Date.now())+150);
}
const uid=()=>crypto.randomBytes(6).toString('hex');
function api(url,b,res){
 const m=S.match,fail=(c,e)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e}))};
 const ok=()=>{push();res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}')};
 if(url==='/api/match'){
  try{
   const n=Math.floor(+b.n);if(!(n>=1&&n<=9))throw Error('Jumlah map harus 1-9');
   const mode=['gacha','ban','tournament'].includes(b.mode)?b.mode:'gacha';
   const pool=[...new Set(Array.isArray(b.pool)?b.pool:[])].filter(i=>IDS.has(i));
   if(pool.length<n)throw Error('Map pool aktif kurang dari jumlah map seri');
   const seq=parseSeq(b.seq||defSeq(mode,n,pool.length).join(','),n,pool.length);
   if(m&&!m.archived&&(m.picks.length||m.bans.length))archive(m,'reset');
   clearTimeout(timer);
   S.match={id:uid(),teamA:clean(b.teamA,'TEAM A'),teamB:clean(b.teamB,'TEAM B'),n,mode,pool,seq,step:0,picks:[],bans:[],draw:null,done:false,spinMs:Math.min(12000,Math.max(3000,+b.spinMs||6500)),startedAt:Date.now()};
   settle(S.match);return ok();
  }catch(e){return fail(400,e.message)}
 }
 if(url==='/api/reset'){if(m&&!m.archived&&(m.picks.length||m.bans.length))archive(m,'reset');clearTimeout(timer);S.match=null;return ok()}
 if(url==='/api/history/clear'){S.history=[];return ok()}
 if(!m||m.done||m.draw)return fail(409,'Tidak ada aksi yang bisa dilakukan sekarang');
 const s=m.seq[m.step];if(!s)return fail(409,'Seri selesai');
 if(url==='/api/action'){
  if(!['ban','pick'].includes(s.type))return fail(409,'Langkah saat ini bukan ban/pick');
  if(!avail(m).includes(b.map))return fail(400,'Map tidak tersedia');
  if(s.type==='ban')m.bans.push({map:b.map,by:s.by});else m.picks.push({map:b.map,by:s.by,drawId:null});
  m.step++;settle(m);return ok();
 }
 if(url==='/api/gacha'){
  if(!['gacha','decider'].includes(s.type))return fail(409,'Langkah saat ini bukan gacha');
  const a=avail(m);if(!a.length)return fail(409,'Tidak ada map tersisa');
  const W=46,strip=[];
  for(let i=0;i<60;i++){let c;do{c=a[crypto.randomInt(a.length)]}while(a.length>1&&c===strip[i-1]);strip.push(c)}
  strip[W]=a[crypto.randomInt(a.length)];
  if(a.length>1)for(const j of[W-1,W+1])while(strip[j]===strip[W])strip[j]=a[crypto.randomInt(a.length)];
  m.draw={id:uid(),matchId:m.id,startedAt:Date.now()+500,duration:m.spinMs,strip,winnerIndex:W};
  schedule();return ok();
 }
 fail(404,'Endpoint tidak dikenal');
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const OK=/^\/(index\.html|app\.js|style\.css|maps\.json|(ban-map|select-map|overlay)\/[\w.-]*|assets\/[\w\/.-]+)?$/;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://x'),p=u.pathname;
 if(p==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write('retry: 1500\ndata: '+pub()+'\n\n');clients.add(res);
  const k=setInterval(()=>res.write(': k\n\n'),20000);req.on('close',()=>{clients.delete(res);clearInterval(k)});return}
 if(p==='/api/state'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(pub())}
 if(p==='/api/seq'){const n=+u.searchParams.get('n'),pool=(u.searchParams.get('pool')||'').split(',').filter(i=>IDS.has(i));
  res.writeHead(200,{'Content-Type':'application/json'});
  if(!(n>=1)||pool.length<n)return res.end(JSON.stringify({error:'Map pool aktif kurang dari jumlah map seri'}));
  return res.end(JSON.stringify({seq:defSeq(u.searchParams.get('mode'),n,pool.length).join(',')}))}
 if(req.method==='POST'&&p.startsWith('/api/')){let d='';req.on('data',c=>{d+=c;if(d.length>20000)req.destroy()});
  req.on('end',()=>{let b={};try{b=JSON.parse(d||'{}')}catch{res.writeHead(400);return res.end('{"error":"JSON rusak"}')}api(p,b,res)});return}
 if(p==='/'){res.writeHead(302,{Location:'/ban-map/'});return res.end()}
 if(p==='/ban-map'||p==='/select-map'||p==='/overlay'){res.writeHead(302,{Location:p+'/'});return res.end()}
 const rel=p.endsWith('/')?p+'index.html':p,f=path.normalize(path.join(__dirname,rel));
 if(!OK.test(rel)||!f.startsWith(__dirname)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('404')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);
});
init().then(()=>server.listen(PORT,()=>console.log(`MapDraft jalan:\n  Controller : http://localhost:${PORT}/ban-map/\n  OBS Overlay: http://localhost:${PORT}/overlay/`))).catch(e=>{console.error('Gagal start:',e.message);process.exit(1)});
