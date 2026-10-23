(async()=>{await MD.init();
const $=i=>document.getElementById(i),h=MD.h;let S=null;
const stage=new MD.Stage($('vp'),()=>render());
const PAGE=document.body.dataset.page;
document.querySelector('h2').textContent+=PAGE==='ban'?' — BAN & PICK':' — GACHA MAP';
[...$('mode').options].forEach(o=>{if((PAGE==='ban')!==(o.value==='ban'))o.remove()});
const nVal=()=>$('bo').value==='c'?+$('boN').value:+$('bo').value;
const poolSel=()=>[...document.querySelectorAll('#pool input:checked')].map(i=>i.value);
MD.maps.forEach(m=>{const l=h('label'),c=document.createElement('input');c.type='checkbox';c.value=m.id;c.checked=true;l.append(c,m.name);$('pool').append(l)});
async function seqRefresh(){const r=await fetch(`/api/seq?mode=${$('mode').value}&n=${nVal()}&pool=${poolSel()}`).then(r=>r.json());$('seq').value=r.seq||'';$('err').textContent=r.error||''}
['bo','boN','mode'].forEach(i=>$(i).onchange=()=>{$('cw').hidden=$('bo').value!=='c';seqRefresh()});
$('pool').onchange=seqRefresh;seqRefresh();
$('start').onclick=async()=>{const m=S&&S.match;
 if(m&&!m.done&&(m.picks.length||m.bans.length)&&!confirm('Match aktif belum selesai. Arsipkan sebagai reset dan mulai match baru?'))return;
 const r=await MD.post('/api/match',{teamA:$('tA').value,teamB:$('tB').value,n:nVal(),mode:$('mode').value,spinMs:+$('spin').value*1000,pool:poolSel(),seq:$('seq').value});$('err').textContent=r.error||''};
$('reset').onclick=()=>{if(confirm('Reset match aktif? Progres akan dihapus dari layar dan overlay.'))MD.post('/api/reset')};
$('hclr').onclick=()=>{if(confirm('Hapus SEMUA riwayat pertandingan?'))MD.post('/api/history/clear')};
$('ctl').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const r=b.dataset.map?await MD.post('/api/action',{map:b.dataset.map}):await MD.post('/api/gacha');if(r.error)$('err').textContent=r.error};
const tn=(m,by)=>by==='A'?m.teamA:m.teamB;
function render(){const m=S.match;stage.sync(S);
 $('stat').textContent=MD.status(S,stage);$('main').textContent=MD.mainName(S,stage);MD.slots($('sl'),S,stage);
 $('ctl').replaceChildren();$('chips').replaceChildren();
 if(!m){$('info').textContent='Belum ada match aktif. Atur pengaturan di kiri lalu mulai.';$('turn').textContent=''}
 else{const v=MD.view(S,stage),s=m.seq[m.step],busy=!!(stage.anim||m.draw),mine=(PAGE==='ban')===(m.mode==='ban');
  $('info').textContent=`${m.teamA} vs ${m.teamB} · BO${m.n} · ${{gacha:'Pure Gacha',ban:'Ban & Pick',tournament:'Tournament Gacha'}[m.mode]} · Map ${Math.min(v.picks.length+1,m.n)}/${m.n}`;
  m.seq.forEach((x,i)=>$('chips').append(h('span',i<m.step?'done':i===m.step&&!m.done?'cur':'',(x.by?tn(m,x.by)+' ':'')+x.type.toUpperCase())));
  $('turn').textContent=m.done?'SERIES COMPLETE — semua map terkunci.':!s?'':['ban','pick'].includes(s.type)?`Giliran ${tn(m,s.by)} — ${s.type.toUpperCase()}`:'Tekan GACHA MAP';
  if(mine&&!m.done&&s&&['gacha','decider'].includes(s.type)){const g=h('button','red','GACHA MAP');g.disabled=busy;$('ctl').append(g)}
  const grid=h('div','grid');
  m.pool.forEach(id=>{const mp=MD.byId[id],ban=m.bans.find(b=>b.map===id),pk=v.picks.find(p=>p.map===id),
   b=h('button','mc'+(ban?' off':''));b.append(MD.art(mp),h('span',null,mp.name));
   if(ban)b.append(h('em',null,'BAN'));else if(pk)b.append(h('em',null,'PICK'));
   const can=mine&&!m.done&&!busy&&s&&['ban','pick'].includes(s.type)&&!ban&&!pk;b.disabled=!can;b.dataset.map=id;grid.append(b)});
  $('ctl').append(grid);if(!mine)$('turn').textContent='Match aktif memakai mode '+(m.mode==='ban'?'Ban & Pick — kontrolnya ada di /ban-map/':'Gacha — kontrolnya ada di /select-map/')}
 $('hist').replaceChildren(...(S.history.length?S.history.map(x=>{const d=h('div','hist');
  d.append(h('b',null,`${x.teamA} vs ${x.teamB} · BO${x.n} · ${x.mode} · ${x.status}`),h('div',null,new Date(x.startedAt).toLocaleString()),
   h('div',null,'Map: '+(x.picks.map(p=>MD.byId[p.map].name).join(' | ')||'-')),h('div',null,'Ban: '+(x.bans.map(b=>MD.byId[b.map].name+' ('+(b.by==='A'?x.teamA:x.teamB)+')').join(', ')||'-')));return d}):[h('div','hist','Belum ada riwayat.')]))}
MD.connect(s=>{S=s;render()});
})();
