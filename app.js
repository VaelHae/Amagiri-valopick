const MD={maps:[],byId:{},api:{},offset:0};
MD.init=async()=>{
 MD.maps=await (await fetch('/maps.json')).json();MD.maps.forEach(m=>MD.byId[m.id]=m);
 try{const c=new AbortController();setTimeout(()=>c.abort(),3000);
  const j=await (await fetch('https://valorant-api.com/v1/maps',{signal:c.signal})).json();
  j.data.forEach(m=>MD.api[m.displayName.toLowerCase()]=m.splash)}catch{}
};
MD.url=m=>m.image||MD.api[m.name.toLowerCase()]||'';
MD.h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
MD.art=m=>{const d=MD.h('div','art');d.style.background=`linear-gradient(135deg,hsl(${m.hue} 55% 24%),#0b0b0e)`;
 const u=MD.url(m);if(u){const i=new Image();i.alt='';i.onerror=()=>i.remove();i.src=u;d.append(i)}return d};
MD.post=async(u,b)=>{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})});return r.json()};
MD.connect=cb=>{const es=new EventSource('/events');es.onmessage=e=>{try{const s=JSON.parse(e.data);MD.offset=s.now-Date.now();cb(s)}catch{}}};
MD.Stage=class{
 constructor(vp,onDone){this.vp=vp;this.onDone=onDone;this.track=MD.h('div','track idle');vp.append(this.track);this.anim=null;this.seen=new Set();this.key=''}
 card(m){const c=MD.h('div','rc');c.append(MD.art(m),MD.h('span',null,m.name));return c}
 sync(s){const d=s.match&&s.match.draw;
  if(this.anim&&(!s.match||s.match.id!==this.anim.matchId)){this.anim=null;this.key=''}
  if(d&&!this.seen.has(d.id)){this.seen.add(d.id);this.start(d)}else if(!this.anim)this.idle(s)}
 start(d){this.anim=d;this.key='';this.track.className='track';
  this.track.replaceChildren(...d.strip.map(i=>this.card(MD.byId[i])));
  const step=()=>{if(this.anim!==d)return;
   const p=Math.min(1,Math.max(0,(Date.now()+MD.offset-d.startedAt)/d.duration)),e=1-Math.pow(1-p,5);
   const c=this.track.children[d.winnerIndex],full=this.vp.clientWidth/2-(c.offsetLeft+c.offsetWidth/2);
   this.track.style.transform=`translate3d(${full*e}px,0,0)`;
   if(p>=1){c.classList.add('win');this.anim=null;this.onDone()}else requestAnimationFrame(step)};
  requestAnimationFrame(step)}
 idle(s){const m=s.match,l=m&&m.picks[m.picks.length-1],k=l?l.map:'-';if(k===this.key)return;this.key=k;
  this.track.className='track idle';this.track.style.transform='none';
  this.track.replaceChildren(l?this.card(MD.byId[l.map]):MD.h('div','ph','ROULETTE SIAP'))}
};
MD.view=(s,st)=>{const m=s.match;if(!m)return{picks:[],drawing:false};
 const hide=st.anim?st.anim.id:null;return{picks:m.picks.filter(p=>p.drawId!==hide||!hide),drawing:!!st.anim}};
MD.status=(s,st)=>{const v=MD.view(s,st);return v.drawing?'GACHA IN PROGRESS':v.picks.length?'MAP LOCKED':'AWAITING MAP'};
MD.mainName=(s,st)=>{const v=MD.view(s,st);return v.drawing?'SELECTING MAP...':v.picks.length?MD.byId[v.picks[v.picks.length-1].map].name.toUpperCase():'AWAITING MAP'};
MD.slots=(el,s,st)=>{el.replaceChildren();const m=s.match;if(!m)return;const v=MD.view(s,st);
 for(let i=0;i<m.n;i++){const p=v.picks[i],d=MD.h('div','slot');d.append(MD.h('small',null,'MAP '+(i+1)));
  if(p){d.append(MD.art(MD.byId[p.map]),MD.h('b',null,MD.byId[p.map].name.toUpperCase()));if(p.by)d.append(MD.h('small',null,'PICK '+(p.by==='A'?m.teamA:m.teamB)))}
  else if(v.drawing&&i===v.picks.length){d.classList.add('drawing');d.append(MD.h('b',null,'DRAWING...'))}
  else{d.classList.add('empty');d.append(MD.h('b',null,'—'))}
  el.append(d)}};
