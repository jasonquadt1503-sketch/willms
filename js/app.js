const C=window.CFG,sb=supabase.createClient(C.URL,C.KEY),$=s=>document.querySelector(s),BER='Europe/Berlin';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{timeZone:BER,dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'';
const hm=v=>v?String(v).slice(0,5):'',tm=s=>{const[a,b]=(s||'0:0').split(':');return +a*60+ +b};
const loc=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);
const SV=['verfügbar','im Linienverkehr','auf dem Betriebshof','in Wartung','defekt','Reserve','außer Betrieb'];
const ST=['pünktlich','verspätet','unterwegs','Fahrt beendet','Fahrt fällt aus','Ersatzverkehr'];
const CAT=['Verspätung','Fahrzeugdefekt','Unfallmeldung','Umleitung','Fahrt fällt aus','Ersatzfahrzeug','Sonstiges'];
// Feld: [Spalte, Beschriftung, Typ (text|num|time|sel|area|ts|dt), Pflicht, Optionen]
const T={
vehicles:{n:'Fahrzeuge',s:'fleet_no',F:[['fleet_no','Wagen-Nr.','text',1],['type','Fahrzeugtyp','text',1],['plate','Kennzeichen'],['depot','Betriebshof'],['line_no','Linie'],['roster_no','Umlauf'],['status','Status','sel',1,SV],['delay_min','Verspätung (min)','num'],['status_changed_at','Letzte Statusänderung','ts'],['notes','Bemerkungen','area']]},
lines:{n:'Linien',s:'line_no',F:[['line_no','Linie','text',1],['from_stop','Starthaltestelle','text',1],['to_stop','Zielhaltestelle','text',1],['notes','Bemerkungen','area']]},
trips:{n:'Abfahrten',s:'planned_time',F:[['line_no','Linie','text',1],['from_stop','Start'],['to_stop','Ziel'],['fleet_no','Wagen-Nr.'],['roster_no','Umlauf'],['planned_time','Soll','time',1],['actual_time','Ist','time'],['delay_min','Verspätung (min)','num'],['status','Status','sel',1,ST]]},
rosters:{n:'Umläufe',s:'roster_no',F:[['roster_no','Umlauf','text',1],['fleet_no','Wagen-Nr.'],['line_no','Linie'],['start_time','Dienstbeginn','time',1],['end_time','Dienstende','time',1],['departures','Abfahrten'],['driver_code','Fahrer-Kürzel'],['breaks','Pausen'],['notes','Bemerkungen','area']]},
events:{n:'Ereignisse',s:'occurred_at',F:[['occurred_at','Datum/Uhrzeit','dt',1],['fleet_no','Wagen-Nr.'],['line_no','Linie'],['category','Kategorie','sel',1,CAT],['priority','Priorität','sel',1,['niedrig','normal','hoch','kritisch']],['description','Beschreibung','area',1],['action','Maßnahme','area'],['state','Status','sel',1,['offen','in Bearbeitung','erledigt']]]}};
const INL={vehicles:['status','delay_min'],trips:['status','delay_min'],events:['state']};
const D={vehicles:[],lines:[],trips:[],rosters:[],events:[]},UI={};let on=false,tmr;
function toast(m){const e=$('#toast');e.textContent=m;e.hidden=false;clearTimeout(e.t);e.t=setTimeout(()=>e.hidden=true,4000)}
function setSync(s){const e=$('#sync');e.className='pill '+s;e.textContent={ok:'Synchronisiert',busy:'Synchronisierung läuft',off:'Verbindung unterbrochen'}[s]}
function theme(t){const h=document.documentElement,c=localStorage.th||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');const n=t?(c=='dark'?'light':'dark'):c;localStorage.th=n;h.dataset.theme=n}theme();
async function load(t){const{data,error}=await sb.from(t).select('*').limit(5000);if(error){setSync('off');toast(navigator.onLine?'Fehler: '+error.message:'Keine Internetverbindung.');return}D[t]=data;render()}
async function loadAll(){setSync('busy');await Promise.all(Object.keys(T).map(load));setSync(navigator.onLine?'ok':'off')}
function rt(){sb.channel('rt').on('postgres_changes',{event:'*',schema:'public'},()=>{clearTimeout(tmr);tmr=setTimeout(loadAll,200)}).subscribe(s=>{if(s=='SUBSCRIBED')loadAll();else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s))setSync('off')})}
addEventListener('offline',()=>{setSync('off');toast('Keine Internetverbindung.')});addEventListener('online',()=>on&&loadAll());
function conf(){const o={},R=D.rosters,add=(k,v)=>(o[k]=o[k]||[]).push(v);
R.forEach(a=>R.forEach(b=>{if(a.id<b.id&&a.fleet_no&&a.fleet_no==b.fleet_no&&tm(a.start_time)<tm(b.end_time)&&tm(b.start_time)<tm(a.end_time)){add(a.id,b.roster_no);add(b.id,a.roster_no)}}));
const s={};D.trips.forEach(x=>{if(!x.fleet_no)return;const k=x.fleet_no+hm(x.planned_time);if(s[k]){add(x.id,'Wagen doppelt');add(s[k],'Wagen doppelt')}s[k]=x.id});return o}
function cell(t,r,f){const[k,,ty,,op]=f,v=r[k];
if(INL[t]?.includes(k))return ty=='sel'?`<select onchange="quick('${t}','${r.id}',{${k}:this.value})">${op.map(o=>`<option${o==v?' selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input type="number" min="0" class="n" value="${v??0}" onchange="quick('${t}','${r.id}',{${k}:+this.value})">`;
if(ty=='ts'||ty=='dt')return fmt(v);if(ty=='time')return hm(v);
if(ty=='sel'){const c=['defekt','kritisch','Fahrt fällt aus','außer Betrieb'].includes(v)?'bad':['hoch','verspätet','in Wartung','Ersatzverkehr','offen'].includes(v)?'warn':v=='erledigt'||v=='pünktlich'?'ok':'';return`<span class="tag ${c}">${esc(v)}</span>`}
return esc(v)}
const isNew=r=>r.occurred_at&&r.state!='erledigt'&&Date.now()-new Date(r.occurred_at)<36e5;
function rows(t){const c=T[t],u=UI[t],q=u.q.toLowerCase(),cf=conf();
const R=D[t].filter(r=>(!q||Object.values(r).join(' ').toLowerCase().includes(q))&&Object.entries(u.f).every(([k,v])=>!v||r[k]==v)&&(!u.dt||new Date(r.occurred_at).toLocaleDateString('sv',{timeZone:BER})==u.dt));
const s=u.s||c.s,d=u.s?u.d:(t=='events'?-1:1);R.sort((a,b)=>((a[s]??'')>(b[s]??'')?1:(a[s]??'')<(b[s]??'')?-1:0)*d);
return R.map(r=>`<tr class="${isNew(r)?'new':''} ${r.priority=='kritisch'&&r.state!='erledigt'?'crit':''}">${c.F.map((f,i)=>`<td>${cell(t,r,f)}${i==0&&cf[r.id]?` <span class="tag bad">⚠ Konflikt: ${esc(cf[r.id].join(', '))}</span>`:''}${i==0&&isNew(r)?' <span class="tag ok">NEU</span>':''}</td>`).join('')}<td class="act"><button onclick="openForm('${t}','${r.id}')">Details</button><button onclick="del('${t}','${r.id}')">Löschen</button></td></tr>`).join('')||'<tr><td colspan="99">Keine Einträge.</td></tr>'}
const tb=t=>{const e=$('#tb-'+t);if(e)e.innerHTML=rows(t)};
function srt(t,k){const u=UI[t];u.s==k?u.d*=-1:(u.s=k,u.d=1);render()}
function list(t){const c=T[t],u=UI[t]=UI[t]||{q:'',f:{},s:null,d:1};
return`<section class="card"><div class="bar"><h2>${c.n}</h2><input class="q" placeholder="Suchen…" value="${esc(u.q)}" oninput="UI.${t}.q=this.value;tb('${t}')">${c.F.filter(f=>f[2]=='sel').map(f=>`<select onchange="UI.${t}.f.${f[0]}=this.value;tb('${t}')"><option value="">${f[1]}: alle</option>${f[4].map(o=>`<option${u.f[f[0]]==o?' selected':''}>${o}</option>`).join('')}</select>`).join('')}${t=='events'?`<input type="date" value="${u.dt||''}" onchange="UI.events.dt=this.value;tb('events')">`:''}<button class="pri" onclick="openForm('${t}')">+ Neu</button></div><div class="sc"><table><thead><tr>${c.F.map(f=>`<th onclick="srt('${t}','${f[0]}')">${f[1]}${u.s==f[0]?(u.d>0?' ▲':' ▼'):''}</th>`).join('')}<th>Aktion</th></tr></thead><tbody id="tb-${t}">${rows(t)}</tbody></table></div></section>`}
const mini=(h,R)=>`<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${R.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')||'<tr><td>–</td></tr>'}</tbody></table>`;
function kpi(){const V=D.vehicles,n=s=>V.filter(v=>v.status==s).length;
const K=[['Fahrzeuge gesamt',V.length],['Im Einsatz',n('im Linienverkehr')],['Verfügbar',n('verfügbar')],['Mit Störung',n('defekt')+n('in Wartung')],['Verspätungen',V.filter(v=>v.delay_min>0).length],['Offene Meldungen',D.events.filter(e=>e.state!='erledigt').length],['Konflikte',Object.keys(conf()).length]];
return`<div class="kpi">${K.map(([l,v])=>`<div class="card"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`}
function panels(){const now=new Date().toLocaleTimeString('de-DE',{timeZone:BER,hour:'2-digit',minute:'2-digit'}),k=x=>(hm(x.planned_time)<now?'1':'0')+hm(x.planned_time);
const tr=D.trips.filter(x=>x.status!='Fahrt beendet').sort((a,b)=>k(a)>k(b)?1:-1).slice(0,8),ev=[...D.events].sort((a,b)=>b.occurred_at>a.occurred_at?1:-1).slice(0,6),ve=[...D.vehicles].sort((a,b)=>b.status_changed_at>a.status_changed_at?1:-1).slice(0,6);
return`<div class="g3"><section class="card"><h2>Nächste Abfahrten</h2>${mini(['Soll','Linie','Wagen','Status'],tr.map(x=>[hm(x.planned_time),esc(x.line_no),esc(x.fleet_no),esc(x.status)]))}</section><section class="card"><h2>Aktuelle Ereignisse</h2>${mini(['Zeit','Kategorie','Prio','Status'],ev.map(e=>[fmt(e.occurred_at)+(isNew(e)?' <span class="tag ok">NEU</span>':''),esc(e.category),esc(e.priority),esc(e.state)]))}</section><section class="card"><h2>Zuletzt geänderte Fahrzeuge</h2>${mini(['Wagen','Status','Verspät.','Geändert'],ve.map(v=>[esc(v.fleet_no),esc(v.status),v.delay_min+' min',fmt(v.status_changed_at)]))}</section></div>`}
function backup(){return`<section class="card"><h2>Datensicherung</h2><p>Bitte regelmäßig (z. B. wöchentlich) einen JSON-Export speichern. Der kostenlose Tarif enthält keine garantierte Sicherung.</p><div class="row" style="flex-wrap:wrap"><button onclick="csv('vehicles')">CSV Fahrzeuge</button><button onclick="csv('events')">CSV Ereignisse</button><button class="pri" onclick="expJson()">JSON-Export (alles)</button><label>JSON-Import<input type="file" accept=".json" onchange="imp(this)"></label></div></section>`}
function dl(n,x,m){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([x],{type:m}));a.download=n;a.click()}
const today=()=>new Date().toISOString().slice(0,10);
function csv(t){const F=T[t].F,R=[F.map(f=>f[1]),...D[t].map(r=>F.map(f=>['ts','dt'].includes(f[2])?fmt(r[f[0]]):r[f[0]]??''))];dl(`${t}-${today()}.csv`,'\ufeff'+R.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\r\n'),'text/csv')}
function expJson(){dl(`leitstelle-simulation-${today()}.json`,JSON.stringify({simulation:true,exported:new Date().toISOString(),data:D},null,1),'application/json')}
async function imp(i){const f=i.files[0];if(!f)return;try{const j=JSON.parse(await f.text()),d=j.data||j;if(!confirm('Daten importieren? Einträge mit gleicher ID werden überschrieben.')){i.value='';return}
for(const t of Object.keys(T))if(d[t]?.length){const{error}=await sb.from(t).upsert(d[t],{onConflict:'id'});if(error)throw error}toast('Import abgeschlossen.');loadAll()}catch(e){toast('Import fehlgeschlagen: '+e.message)}i.value=''}
async function quick(t,id,p){setSync('busy');const{error}=await sb.from(t).update(p).eq('id',id);if(error)toast('Fehler: '+error.message);load(t)}
async function del(t,id){if(!confirm('Eintrag wirklich endgültig löschen?'))return;const{error}=await sb.from(t).delete().eq('id',id);error?toast('Fehler: '+error.message):load(t)}
function openForm(t,id){const c=T[t],r=id?D[t].find(x=>x.id==id):{},fs=c.F.filter(f=>f[2]!='ts');
$('#dlg').innerHTML=`<form id="fm"><h2>${id?'Details / Bearbeiten':'Neu'}: ${c.n}</h2>${fs.map(([k,l,ty,rq,o])=>{let v=r[k]??(ty=='dt'?loc(new Date()):ty=='num'?0:o?o[0]:'');if(ty=='time')v=hm(v);if(ty=='dt'&&r[k])v=loc(new Date(r[k]));const a=`name="${k}"${rq?' required':''}`;
return`<label>${l}${rq?' *':''}${ty=='sel'?`<select ${a}>${o.map(x=>`<option${x==v?' selected':''}>${x}</option>`).join('')}</select>`:ty=='area'?`<textarea ${a}>${esc(v)}</textarea>`:`<input ${a} type="${ty=='dt'?'datetime-local':ty}" value="${esc(v)}"${ty=='num'?' min="0"':''}>`}</label>`}).join('')}<p id="err" class="err"></p><div class="row"><button class="pri">Speichern</button><button type="button" onclick="$('#dlg').close()">Abbrechen</button></div></form>`;
$('#fm').onsubmit=async e=>{e.preventDefault();const b=$('#fm .pri');if(b.disabled)return;b.disabled=true;const fd=new FormData(e.target),o={};
fs.forEach(([k,,ty])=>{let v=fd.get(k);o[k]=ty=='num'?+v||0:ty=='dt'?new Date(v).toISOString():(v||'').trim()||null});
const{error}=await(id?sb.from(t).update(o).eq('id',id):sb.from(t).insert(o));
if(error){$('#err').textContent=error.code=='23505'?'Diese Nummer existiert bereits.':navigator.onLine?'Speichern fehlgeschlagen: '+error.message:'Keine Internetverbindung.';b.disabled=false;return}
$('#dlg').close();load(t)};$('#dlg').showModal()}
const V={dash:()=>kpi()+panels(),vehicles:()=>list('vehicles'),lines:()=>list('lines'),trips:()=>list('trips'),rosters:()=>list('rosters'),events:()=>list('events'),backup,m1:()=>kpi()+panels()+list('vehicles'),m2:()=>list('trips')+list('rosters')+list('lines'),m3:()=>kpi()+list('events')};
function render(){if(!on)return;if(document.activeElement?.classList.contains('q')){Object.keys(T).forEach(tb);return}
const v=location.hash.slice(1)||'dash';document.querySelectorAll('aside nav a').forEach(a=>a.classList.toggle('on',a.hash=='#'+v));
const e=!D.vehicles.length&&!D.events.length?'<div class="card">Noch keine Daten. Entweder fehlt <code>supabase/seed.sql</code> oder dein Konto ist noch nicht freigeschaltet (siehe README, Schritt 4).</div>':'';
$('#main').innerHTML=(V[v]||V.dash)()+(v=='dash'?e:'')}
addEventListener('hashchange',render);
function show(s){$('#login').hidden=!!s;$('#app').hidden=!s;if(s&&!on){on=true;rt();render()}if(!s&&on){on=false;sb.removeAllChannels()}}
$('#lf').onsubmit=async e=>{e.preventDefault();const b=e.submitter,f=new FormData(e.target);b.disabled=true;$('#lerr').textContent='';
const{error}=await sb.auth.signInWithPassword({email:f.get('e').trim(),password:f.get('p')});b.disabled=false;
if(error)$('#lerr').textContent=!navigator.onLine?'Keine Internetverbindung.':/invalid login/i.test(error.message)?'E-Mail oder Passwort falsch.':/confirm/i.test(error.message)?'E-Mail-Adresse noch nicht bestätigt.':'Anmeldung fehlgeschlagen: '+error.message};
sb.auth.getSession().then(({data})=>{show(data.session);sb.auth.onAuthStateChange((_e,s)=>show(s))});
