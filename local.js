/* كنترول – الوضع المحلي: لا حسابات ولا سحابة. البيانات على هذا الجهاز + نسخ احتياطي بملف */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mime=n=>/\.pdf$/i.test(n)?'application/pdf':/\.jpe?g$/i.test(n)?'image/jpeg':/\.png$/i.test(n)?'image/png':/\.json$/i.test(n)?'application/json':/\.csv$/i.test(n)?'text/csv':'application/octet-stream';
const fmtKB=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const dl={save:({filename,data,after})=>{
 const type=mime(filename),blob=new Blob([data],{type}),url=URL.createObjectURL(blob);
 let file=null;try{file=new File([blob],filename,{type})}catch(e){}
 const can=!!(file&&navigator.canShare&&navigator.canShare({files:[file]}));
 const old=document.getElementById('dlm');if(old)old.remove();
 const m=document.createElement('div');m.id='dlm';
 m.innerHTML=`<div class="dlb"><div style="font-size:34px">✅</div><b>الملف جاهز</b><div class="dln">${esc(filename)}<br><small>${fmtKB(blob.size)}</small></div>
 ${can?'<button class="dlp" data-d="share">📤 مشاركة / حفظ في الملفات</button>':''}<button class="dlp ${can?'g':''}" data-d="open">👁️ فتح الملف</button><button class="dlp g" data-d="down">⬇️ تنزيل</button><button class="dlp g" data-d="x">إغلاق</button>
 <p class="dls">للحفظ: اختر «مشاركة» ثم «حفظ في الملفات»، أو أرسله مباشرة عبر واتساب أو البريد.</p></div>`;
 document.body.appendChild(m);
 m.addEventListener('click',async e=>{const b=e.target.closest('[data-d]');if(!b){if(e.target===m){m.remove()}return}
  const a=b.dataset.d;
  if(a==='share'){try{await navigator.share({files:[file],title:filename});after&&after()}catch(er){}}
  else if(a==='open'){window.open(url,'_blank');after&&after()}
  else if(a==='down'){const l=document.createElement('a');l.href=url;l.download=filename;document.body.appendChild(l);l.click();l.remove();after&&after()}
  else if(a==='x'){m.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}});
 return Promise.resolve()}};
window.claude={use:async n=>n==='downloads'?dl:null};
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const W=(k,v)=>{try{localStorage.setItem(k,typeof v==='string'&&k==='ctl_school_raw'?v:JSON.stringify(v))}catch(e){}};
/* ---------- IndexedDB (وثائق وصور الغياب) ---------- */
let DB;const idb=()=>DB?Promise.resolve(DB):new Promise((r,j)=>{const q=indexedDB.open('control',1);q.onupgradeneeded=()=>q.result.createObjectStore('f',{keyPath:'id'});q.onsuccess=()=>{DB=q.result;r(DB)};q.onerror=()=>j(q.error)});
const idbAll=async()=>{const d=await idb();return new Promise((r,j)=>{const q=d.transaction('f').objectStore('f').getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error)})};
const idbClear=async()=>{const d=await idb();return new Promise((r,j)=>{const q=d.transaction('f','readwrite').objectStore('f').clear();q.onsuccess=()=>r();q.onerror=()=>j(q.error)})};
const idbPut=async list=>{const d=await idb();return new Promise((r,j)=>{const t=d.transaction('f','readwrite'),o=t.objectStore('f');list.forEach(x=>o.put(x));t.oncomplete=()=>r();t.onerror=()=>j(t.error)})};
/* ---------- النسخ الاحتياطي ---------- */
const KEEP=k=>k.indexOf('ctl_')===0&&k!=='ctl_lastbk'&&k!=='ctl_snooze';
async function makeBackup(full){
 const ls={};Object.keys(localStorage).filter(KEEP).forEach(k=>{ls[k]=localStorage.getItem(k)});
 const sc=LS('ctl_school',null);
 const out={_v:2,_local:1,_full:!!full,_at:new Date().toISOString(),_school:sc?sc.name:'',ls};
 if(full)out.docs=await idbAll();
 return out}
async function saveBackup(full){
 const d=await makeBackup(full),name='control-'+(full?'full':'light')+'-'+new Date().toISOString().slice(0,10)+'.json',json=JSON.stringify(d);
 await dl.save({filename:name,data:new TextEncoder().encode(json),after:()=>W('ctl_lastbk',Date.now())});return true}

function fromCloud(d){ /* تحويل نسخة السحابة القديمة إلى بيانات محلية */
 const g=(c,id)=>d[c]&&d[c][id]?d[c][id]:null,v=(c,id)=>{const o=g(c,id);return o&&Array.isArray(o.v)?o.v:null};
 const ls={};const put=(k,x)=>{ls[k]=JSON.stringify(x)};
 if(v('cfg','sched'))put('ctl_sched',v('cfg','sched'));if(v('cfg','adm'))put('ctl_adm',v('cfg','adm'));
 ['obs','cmt','f03','rcv','pin','dck'].forEach(k=>{if(v('cfg',k))put('ctl_x_'+k,v('cfg',k))});
 const sc=g('cfg','school');if(sc&&sc.v&&!Array.isArray(sc.v))put('ctl_school',sc.v);
 let man=[];Object.values(d.man||{}).forEach(o=>{if(o&&Array.isArray(o.v))man=man.concat(o.v)});put('ctl_man',man);
 put('ctl_halls',Object.values(d.rooms||{}).map(x=>({n:x.n,st:x.st||[],sup:x.sup||{},ch:x.ch||[],ev:x.ev||[]})));
 [['abs','ctl_abs'],['checks','ctl_chk'],['admab','ctl_admab']].forEach(([c,k])=>{const m={};Object.values(d[c]||{}).forEach(o=>{if(o&&o.k)m[o.k]=1});put(k,m)});
 put('ctl_v',6);
 return{ls,docs:Object.values(d.docs||{})}}
async function restore(d){
 let r;if(d&&d._local&&d.ls)r={ls:d.ls,docs:d.docs||[]};else if(d&&(d.rooms||d.man||d.cfg))r=fromCloud(d);else throw new Error('هذا الملف ليس نسخة احتياطية من كنترول');
 Object.keys(localStorage).filter(KEEP).forEach(k=>localStorage.removeItem(k));
 Object.keys(r.ls).forEach(k=>{if(KEEP(k))localStorage.setItem(k,r.ls[k])});
 localStorage.setItem('ctl_inited','1');
 if(d._full!==false||!d._local){await idbClear();if(r.docs.length)await idbPut(r.docs)}
 return Object.keys(r.ls).length}
function pickFile(){return new Promise(res=>{const f=document.createElement('input');f.type='file';f.onchange=()=>res(f.files[0]||null);f.click()})}
async function doRestore(msgEl){
 const f=await pickFile();if(!f)return;
 let d;try{d=JSON.parse(await f.text())}catch(e){msgEl.style.color='#dc2626';msgEl.textContent='تعذرت قراءة الملف';return}
 if(!confirm('سيحل هذا الملف محل البيانات الموجودة على هذا الجهاز. متابعة؟'))return;
 try{const n=await restore(d);msgEl.style.color='#059669';msgEl.textContent='تم الاسترجاع… جارٍ إعادة التحميل';setTimeout(()=>location.reload(),900)}
 catch(e){msgEl.style.color='#dc2626';msgEl.textContent=e.message||String(e)}}
window.ctlRestore=doRestore;
/* ---------- لوحة الإعدادات ---------- */
const css=document.createElement('style');
css.textContent=`#adm{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:none;align-items:flex-start;justify-content:center;padding:16px;overflow:auto}
#adm .bx{background:var(--card);color:var(--tx);border-radius:22px;padding:18px;width:100%;max-width:460px;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#adm h3{margin:14px 0 6px}#adm .pbtn{width:100%;padding:13px;border:0;border-radius:14px;background:#c4283f;color:#fff;font:700 16px Tajawal,system-ui,sans-serif;margin-top:8px;cursor:pointer}
#adm .pbtn.g{background:#e5e7eb;color:#111}#adm .pbtn.r{background:#fee2e2;color:#b91c1c}#adm .msg{font-size:13px;margin-top:6px;min-height:18px}#adm .st{font-size:13px;opacity:.8;line-height:1.8}
#dlm{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px}
#dlm .dlb{background:var(--card,#fff);color:var(--tx,#111);border-radius:22px;padding:20px;width:100%;max-width:380px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#dlm .dln{margin:8px 0 12px;font-size:14px;word-break:break-all;direction:ltr}
#dlm .dlp{width:100%;padding:13px;border:0;border-radius:14px;background:#c4283f;color:#fff;font:700 16px Tajawal,system-ui,sans-serif;margin-top:8px;cursor:pointer}#dlm .dlp.g{background:#e5e7eb;color:#111}
#dlm .dls{font-size:12px;opacity:.7;margin:12px 0 0;line-height:1.7}
#bkb{position:fixed;top:0;inset-inline:0;z-index:8000;background:#fef3c7;color:#78350f;padding:9px 12px;display:none;align-items:center;gap:8px;font:600 13px Tajawal,system-ui,sans-serif}
#bkb button{border:0;border-radius:10px;padding:6px 10px;font:700 12px Tajawal,system-ui,sans-serif;cursor:pointer}`;
document.head.appendChild(css);
const adm=()=>{let e=$('#adm');if(!e){e=document.createElement('div');e.id='adm';document.body.appendChild(e)}return e};
const ago=t=>{if(!t)return 'لم تُحفظ نسخة بعد';const d=Math.floor((Date.now()-t)/864e5);return d<1?'اليوم':'قبل '+d+' يومًا'};
async function panel(){
 const e=adm();e.style.display='flex';
 const halls=LS('ctl_halls',[]),man=LS('ctl_man',[]),sc=LS('ctl_school',null);
 const stu=halls.reduce((a,h)=>a+(h.st||[]).length,0)+man.length;let docs=0;try{docs=(await idbAll()).length}catch(x){}
 let use='';try{const s=await navigator.storage.estimate();use=((s.usage||0)/1048576).toFixed(1)+' MB'}catch(x){}
 e.innerHTML=`<div class="bx"><div style="display:flex;justify-content:space-between;align-items:center"><b>⚙️ الإعدادات</b><button class="pbtn g" data-u="x" style="width:auto;padding:8px 14px;margin:0">إغلاق</button></div>
 <h3>📊 بيانات هذا الجهاز</h3><div class="st">${esc(sc?'مدرسة '+sc.name:'مدرسة الخليل بن أحمد (الإعداد الافتراضي)')}<br>الطلاب: ${stu} · الوثائق والصور: ${docs}${use?' · المساحة: '+use:''}<br>آخر نسخة احتياطية: ${ago(LS('ctl_lastbk',0))}</div>
 <h3>🏫 المدرسة</h3><button class="pbtn" data-u="su">إعداد المدرسة والصفوف والمواعيد واستيراد الطلاب</button>
 <h3>💾 النسخ الاحتياطي</h3><button class="pbtn" data-u="bf">حفظ نسخة كاملة (مع الصور)</button><button class="pbtn g" data-u="bl">حفظ نسخة خفيفة (بدون صور)</button><button class="pbtn g" data-u="rs">استرجاع نسخة من ملف</button>
 <div class="msg" id="um"></div>
 <p class="st">بياناتك محفوظة على هذا الجهاز فقط. احفظ النسخة في «الملفات» أو أرسلها لنفسك، وكرّر ذلك بين وقت وآخر.</p>
 <h3>🆕 فصل دراسي جديد</h3><p class="st">للانتقال إلى الفصل الثاني: احفظ أرشيف الفصل الحالي، ثم صفِّر الغياب والتصحيح والجدول والوثائق مع إبقاء المدرسة والقاعات والطلاب لتعدّلها.</p>
 <button class="pbtn g" data-u="nt1">1) حفظ نسخة أرشيف الفصل (كاملة)</button><button class="pbtn" data-u="nt2">2) بدء فصل جديد</button><div class="msg" id="um2"></div>
 <h3>📖 دليل البدء</h3><a class="pbtn g" href="guide.html" target="_blank" style="display:block;text-align:center;text-decoration:none">دليل استخدام كنترول خطوة بخطوة</a>
 <h3>🗑️ حذف</h3><button class="pbtn r" data-u="wp">مسح كل بيانات هذا الجهاز</button></div>`}
document.addEventListener('click',async ev=>{
 const b=ev.target.closest&&ev.target.closest('[data-a="bk"]');if(b){panel();return}
 const bb=ev.target.closest&&ev.target.closest('#bkb [data-b]');if(bb){const a=bb.dataset.b,bar=$('#bkb');if(a==='go'){bar.style.display='none';if(await saveBackup(true))bar.style.display='none'}else{W('ctl_snooze',Date.now());bar.style.display='none'}return}
 const t=ev.target.closest&&ev.target.closest('#adm [data-u]');if(!t)return;const a=t.dataset.u,m=()=>$('#um');
 if(a==='x')adm().style.display='none';
 else if(a==='su'){adm().style.display='none';window.openSetup&&window.openSetup()}
 else if(a==='bf'||a==='bl'){m().style.color='#059669';m().textContent='جارٍ التجهيز…';try{const ok=await saveBackup(a==='bf');m().textContent=ok?'تم تجهيز النسخة. احفظها في «الملفات» أو أرسلها لنفسك':'';if(ok)setTimeout(panel,1500)}catch(er){m().style.color='#dc2626';m().textContent='تعذر الحفظ: '+(er&&er.message||er)}}
 else if(a==='rs')doRestore(m());
 else if(a==='nt1'){m().style.color='#059669';m().textContent='جارٍ التجهيز…';try{await saveBackup(true);m().textContent='احفظ الملف من النافذة (مشاركة أو تنزيل)، ثم اضغط «2) بدء فصل جديد»'}catch(er){m().style.color='#dc2626';m().textContent='تعذر الحفظ: '+(er&&er.message||er)}}
 else if(a==='nt2'){const ok=Date.now()-LS('ctl_lastbk',0)<20*60000;if(!ok){m().style.color='#dc2626';m().textContent='احفظ نسخة الأرشيف أولًا (الخطوة 1) وأكّد حفظها من نافذة الملف.';return}
  if(!confirm('سيتم تصفير الغياب والتصحيح والمراقبين والجدول والوثائق والصور. ستبقى المدرسة والقاعات والطلاب. هل حفظت نسخة الأرشيف؟'))return;
  try{abs={};checks={};admAb={};svH();sv('ctl_chk',checks);sv('ctl_admab',admAb);
   halls.forEach(h=>{h.sup={};h.ch=[];h.ev=[]});svH();
   X.obs=[];X.rcv=[];X.dck=[];(X.f03||[]).forEach(f=>{f.done=0;f.note=''});['obs','rcv','dck','f03'].forEach(sx);
   sched=[];sv('ctl_sched',sched);await idbClear();
   adm()&&(adm().style.display='none');toast('تم بدء الفصل الجديد. عدّل الإعداد (الفترات والقاعات) ثم استورد قائمة الطلاب والجدول',0);
   setTimeout(()=>{window.__fresh=false;window.openSetup&&window.openSetup();renderToday();renderCats()},700)}
  catch(er){m().style.color='#dc2626';m().textContent='تعذر التصفير: '+(er&&er.message||er)}}
 else if(a==='wp'){if(!confirm('سيُحذف كل شيء على هذا الجهاز (الطلاب والغياب والصور والإعدادات) ولا يمكن التراجع. هل حفظت نسخة احتياطية؟'))return;if(!confirm('تأكيد أخير: مسح كل البيانات؟'))return;
  Object.keys(localStorage).filter(k=>k.indexOf('ctl_')===0).forEach(k=>localStorage.removeItem(k));try{await idbClear()}catch(x){}location.reload()}
});
/* ---------- تذكير النسخ الاحتياطي ---------- */
function remind(){
 const has=LS('ctl_halls',[]).some(h=>(h.st||[]).length)||LS('ctl_man',[]).length;if(!has)return;
 const last=LS('ctl_lastbk',0),snooze=LS('ctl_snooze',0),now=Date.now();
 if(now-snooze<864e5)return;const days=last?(now-last)/864e5:99;if(days<7)return;
 let bar=$('#bkb');if(!bar){bar=document.createElement('div');bar.id='bkb';document.body.appendChild(bar)}
 bar.innerHTML=`<span style="flex:1">💾 ${last?'لم تحفظ نسخة احتياطية منذ '+Math.floor(days)+' أيام':'لم تحفظ نسخة احتياطية بعد'}</span><button style="background:#c4283f;color:#fff" data-b="go">احفظ الآن</button><button style="background:#fde68a;color:#78350f" data-b="later">لاحقًا</button>`;bar.style.display='flex'}
/* ---------- التشغيل ---------- */
function start(){
 const lk=$('#lk');if(lk)lk.style.display='none';
 const g=$('[data-a="bk"]');if(g)g.style.display='';
 const o=$('[data-a="lock"]');if(o)o.style.display='none';
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
 const first=!localStorage.getItem('ctl_school')&&!localStorage.getItem('ctl_inited');
 if(first)setTimeout(()=>{window.__fresh=true;window.openSetup&&window.openSetup();const x=document.querySelector('#bx .top .btn.g');if(x)x.style.display='none'},900);
 else setTimeout(remind,2500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
