/* كنترول – طبقة الاتصال: تسجيل الدخول + Firestore (بديل واجهة claude.db) */
(function(){
const CFG={apiKey:"AIzaSyDaXL3TWFWosOuStW_fPcspkM0ZjZlDF_o",authDomain:"school-control-f3a9c.firebaseapp.com",projectId:"school-control-f3a9c",storageBucket:"school-control-f3a9c.firebasestorage.app",messagingSenderId:"278238362989",appId:"1:278238362989:web:d192d8c82186cb5fb2ae64"};
const COLS=['cfg','man','rooms','abs','checks','admab','docs','meta'];
const AUDIT_ON=/^(man\/|cfg\/(sched|adm|cmt|pin)|docs\/)/;
const S={user:null,sid:null,role:null,name:'',school:''};
let fs,auth,fb=window.firebase,resolveReady,ready=new Promise(r=>resolveReady=r),done=false;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=s=>document.querySelector(s);
const P=p=>'schools/'+S.sid+'/'+p;
const online=()=>navigator.onLine!==false;
const css=document.createElement('style');
css.textContent=`#lk input,#adm input,#adm select{width:100%;box-sizing:border-box;padding:13px;border-radius:14px;border:1px solid #cbd5e1;margin:5px 0;font:inherit;font-size:16px;background:var(--card);color:var(--tx);direction:ltr;text-align:left}
#lk .pbtn,#adm .pbtn{width:100%;padding:13px;border:0;border-radius:14px;background:#c4283f;color:#fff;font:700 16px Tajawal,system-ui,sans-serif;margin-top:8px;cursor:pointer}
#lk .plink,#adm .plink{background:none;border:0;color:#c4283f;font:600 14px Tajawal,system-ui,sans-serif;margin-top:10px;cursor:pointer}
#lk .pbtn.g,#adm .pbtn.g{background:#e5e7eb;color:#111}
#lk .pe{min-height:20px;color:#dc2626;font-size:13px;margin-top:4px}
#adm{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:none;align-items:flex-start;justify-content:center;padding:16px;overflow:auto}
#adm .bx{background:var(--card);color:var(--tx);border-radius:22px;padding:18px;width:100%;max-width:460px;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#adm h3{margin:14px 0 6px}#adm .u{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid rgba(128,128,128,.25);font-size:14px}
#adm .u small{opacity:.7;direction:ltr;display:block}#adm button.sm{padding:6px 10px;border-radius:10px;border:0;background:#e5e7eb;color:#111;font:600 12px Tajawal,system-ui,sans-serif;cursor:pointer;margin-inline-start:4px}
#adm .msg{font-size:13px;margin-top:6px;min-height:18px}`;
document.head.appendChild(css);
function box(html){const e=$('#lk');if(!e)return;e.style.display='flex';e.innerHTML='<div class="pb">'+html+'</div>'}
function loginUI(msg,em){box(`<div style="font-size:40px">🔐</div><h2 style="margin:4px 0">تسجيل الدخول</h2><div style="opacity:.75;font-size:13px;margin-bottom:8px">كنترول الاختبارات</div>
<input id="fe" type="email" inputmode="email" autocapitalize="off" autocomplete="username" placeholder="البريد الإلكتروني" value="${esc(em||'')}">
<input id="fp" type="password" autocomplete="current-password" placeholder="كلمة المرور">
<div class="pe" id="fm">${msg||''}</div><button class="pbtn" id="fb">دخول</button><button class="plink" id="fr">نسيت كلمة المرور؟</button><br><button class="plink" id="fc" style="opacity:.7;font-size:12px">أول مرة؟ إنشاء حساب (للمنسق فقط)</button>`)}
const errT=e=>({'auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة','auth/wrong-password':'البريد أو كلمة المرور غير صحيحة','auth/user-not-found':'البريد أو كلمة المرور غير صحيحة','auth/invalid-email':'صيغة البريد غير صحيحة','auth/too-many-requests':'محاولات كثيرة، انتظر قليلًا ثم أعد المحاولة','auth/network-request-failed':'لا يوجد اتصال بالإنترنت','auth/email-already-in-use':'هذا البريد مسجّل مسبقًا','auth/weak-password':'كلمة المرور ضعيفة (6 أحرف على الأقل)','permission-denied':'لا تملك صلاحية لهذا الإجراء'}[e&&e.code]||('خطأ: '+(e&&e.message||e)));
async function signIn(){const em=$('#fe').value.trim(),pw=$('#fp').value;if(!em||!pw){$('#fm').textContent='أدخل البريد وكلمة المرور';return}
 $('#fb').disabled=true;$('#fm').textContent='';try{await auth.signInWithEmailAndPassword(em,pw)}catch(e){loginUI(esc(errT(e)),em)}}
async function resetPw(){const em=$('#fe').value.trim();if(!em){$('#fm').textContent='اكتب بريدك أولًا ثم اضغط «نسيت كلمة المرور»';return}
 try{await auth.sendPasswordResetEmail(em);$('#fm').style.color='#059669';$('#fm').textContent='أُرسل رابط تغيير كلمة المرور إلى بريدك'}catch(e){$('#fm').textContent=errT(e)}}
/* ---------- استيراد / تصدير ---------- */
async function exportAll(){const out={_v:1,_school:S.school,_at:new Date().toISOString()};
 for(const c of COLS){out[c]={};const q=await fs.collection(P(c)).get();q.docs.forEach(d=>{out[c][d.id]=d.data()})}return out}
async function importAll(data,onP){const items=[];COLS.forEach(c=>{const m=data[c]||{};Object.keys(m).forEach(id=>items.push([c+'/'+id,m[id]]))});
 let i=0;while(i<items.length){const b=fs.batch();let sz=0,n=0;while(i<items.length&&n<20&&sz<6e6){const[p,o]=items[i];sz+=JSON.stringify(o).length;b.set(fs.doc(P(p)),o);i++;n++}await b.commit();onP&&onP(i,items.length)}
 await fs.doc(P('meta/init')).set({ts:Date.now()});return items.length}
function pickFile(){return new Promise(res=>{const f=document.createElement('input');f.type='file';f.accept='.json,application/json';f.onchange=()=>res(f.files[0]||null);f.click()})}
async function readJson(f){return JSON.parse(await f.text())}
/* ---------- الدخول وتحديد المدرسة ---------- */
async function boot(u){
 box('<div style="font-size:34px">⏳</div><p>جارٍ تحميل حسابك…</p>');
 let ud;try{ud=await fs.doc('users/'+u.uid).get()}catch(e){box(`<p style="color:#dc2626">${esc(errT(e))}</p><button class="pbtn g" id="fo">تسجيل الخروج</button>`);return}
 if(!ud.exists){
  box(`<div style="font-size:36px">🚫</div><h2>حسابك غير مرتبط بمدرسة</h2><p style="font-size:14px;opacity:.8">اطلب من منسق الكنترول إضافتك. بريدك: <b dir="ltr">${esc(u.email)}</b></p>
  <button class="pbtn" id="fn">أنا المنسق: إنشاء مدرسة</button><button class="pbtn g" id="fo">تسجيل الخروج</button>`);return}
 const d=ud.data();S.user=u;S.sid=d.sid;S.role=d.role;S.name=d.name||u.email;
 try{const sd=await fs.doc('schools/'+S.sid).get();S.school=(sd.data()||{}).name||''}catch(e){}
 if(S.role==='admin'){let has=true;try{has=(await fs.doc(P('meta/init')).get()).exists}catch(e){}
  if(!has){box(`<div style="font-size:36px">📦</div><h2>بيانات المدرسة فارغة</h2><p style="font-size:14px;opacity:.8">يمكنك استيراد ملف نسخة احتياطية (JSON) أو البدء بقاعدة جديدة.</p>
   <div class="pe" id="fm"></div><button class="pbtn" id="fi">استيراد ملف نسخة احتياطية</button><button class="pbtn g" id="fs">بدء فارغًا</button>`);return}}
 finish()}
async function syncSchool(){let v=null,fresh=false;
 try{const d=await fs.doc(P('cfg/school')).get();if(d.exists)v=(d.data()||{}).v||null}catch(e){return}
 try{fresh=!!((await fs.doc('schools/'+S.sid).get()).data()||{}).fresh}catch(e){}
 let cur=null;try{cur=localStorage.getItem('ctl_school')}catch(e){}
 const nw=v?JSON.stringify(v):null;
 if(nw!==cur){try{nw?localStorage.setItem('ctl_school',nw):localStorage.removeItem('ctl_school')}catch(e){}
  const k='ctl_scrl';let n=0;try{n=+sessionStorage.getItem(k)||0;sessionStorage.setItem(k,n+1)}catch(e){}
  if(n<2){location.reload();return 'reload'}}
 S.needSetup=!v&&fresh&&S.role==='admin'}
async function finish(){if(done)return;if(await syncSchool()==='reload')return;done=true;try{sessionStorage.setItem('ctl_scrl',0)}catch(e){}$('#lk').style.display='none';const b=$('[data-a="bk"]');if(b)b.style.display=S.role==='admin'?'':'none';resolveReady(true);if(S.needSetup)setTimeout(()=>{window.__fresh=true;window.openSetup&&window.openSetup()},1500)}
async function newSchool(){
 const nm=prompt('اسم المدرسة (بدون كلمة مدرسة)','');if(!nm)return;
 const nn=prompt('اسمك (المنسق)','المنسق');if(!nn)return;
 const sid='s'+Date.now().toString(36),u=auth.currentUser;
 try{await fs.doc('schools/'+sid).set({name:nm,at:Date.now(),fresh:true});await fs.doc('users/'+u.uid).set({sid,role:'admin',name:nn,em:u.email,at:Date.now()});boot(u)}
 catch(e){alert(errT(e)+'\n(إنشاء مدرسة جديدة مسموح لحساب المنسق الرئيسي فقط)')}}
document.addEventListener('click',async e=>{const t=e.target;if(!t||!t.id)return;
 if(t.id==='fc'){const em=$('#fe').value.trim(),pw=$('#fp').value;if(!em||pw.length<8){$('#fm').textContent='اكتب بريدك وكلمة مرور من 8 أحرف على الأقل ثم اضغط مرة أخرى';return}try{await auth.createUserWithEmailAndPassword(em,pw)}catch(er){$('#fm').textContent=errT(er)}}else if(t.id==='fb')signIn();else if(t.id==='fr')resetPw();else if(t.id==='fo')logout();else if(t.id==='fn')newSchool();
 else if(t.id==='fs'){S.sid&&await fs.doc(P('meta/init')).set({ts:Date.now()});finish()}
 else if(t.id==='fi'){const f=await pickFile();if(!f)return;try{const d=await readJson(f);t.disabled=true;const n=await importAll(d,(a,b)=>{$('#fm').style.color='#059669';$('#fm').textContent='تم '+a+' من '+b});$('#fm').textContent='تم استيراد '+n+' عنصرًا';setTimeout(finish,600)}catch(er){t.disabled=false;$('#fm').style.color='#dc2626';$('#fm').textContent='تعذر الاستيراد: '+er.message}}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&(e.target.id==='fp'||e.target.id==='fe'))signIn()});
async function logout(){try{Object.keys(localStorage).filter(k=>k.indexOf('ctl_')===0).forEach(k=>localStorage.removeItem(k))}catch(e){}
 try{indexedDB.databases&&(await indexedDB.databases()).forEach(d=>{if(/control|ctl/i.test(d.name||''))indexedDB.deleteDatabase(d.name)})}catch(e){}
 try{await auth.signOut()}catch(e){}try{await fs.terminate();await fs.clearPersistence()}catch(e){}location.reload()}
window.CTLAUTH={signOut:logout};
/* ---------- لوحة الإدارة (المنسق) ---------- */
function admBox(){let e=$('#adm');if(!e){e=document.createElement('div');e.id='adm';document.body.appendChild(e)}return e}
async function admOpen(){if(S.role!=='admin')return;const e=admBox();e.style.display='flex';e.innerHTML='<div class="bx">…</div>';
 const q=await fs.collection('users').where('sid','==',S.sid).get();
 const rows=q.docs.map(d=>{const x=d.data();return `<div class="u"><div>${esc(x.name)} ${x.role==='admin'?'⭐':''}<small>${esc(x.em||'')}</small></div><div><button class="sm" data-u="rs" data-e="${esc(x.em||'')}">رابط كلمة المرور</button>${d.id===S.user.uid?'':`<button class="sm" data-u="rm" data-i="${d.id}">إزالة</button>`}</div></div>`}).join('');
 e.innerHTML=`<div class="bx"><div style="display:flex;justify-content:space-between;align-items:center"><b>⚙️ الإدارة</b><button class="sm" data-u="x" style="padding:8px 14px">إغلاق</button></div>
 <h3>👥 المشرفون والمستخدمون</h3>${rows||'<div>لا يوجد</div>'}
 <h3>➕ إضافة مستخدم</h3><input id="un" placeholder="الاسم" style="direction:rtl;text-align:right"><input id="ue" type="email" placeholder="البريد الإلكتروني"><input id="up" type="text" placeholder="كلمة مرور مؤقتة (8 أحرف على الأقل)">
 <select id="ur" style="direction:rtl"><option value="sup">مشرف</option><option value="admin">منسق (صلاحية كاملة)</option></select><button class="pbtn" data-u="add">إضافة</button><div class="msg" id="um"></div>
 <h3>🏫 إعداد المدرسة</h3><button class="pbtn" data-u="su">إعداد المدرسة والصفوف والمواعيد واستيراد الطلاب</button>
 <h3>💾 النسخ الاحتياطي</h3><button class="pbtn g" data-u="ex">تصدير نسخة (ملف JSON)</button><button class="pbtn g" data-u="im">استيراد نسخة (يستبدل المتطابق)</button>
 <h3>🚪 الحساب</h3><button class="pbtn g" data-u="out">تسجيل الخروج</button></div>`}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-a="bk"]');if(b){admOpen();return}
 const t=e.target.closest&&e.target.closest('#adm [data-u]');if(!t)return;const a=t.dataset.u,m=()=>$('#um');
 if(a==='x')$('#adm').style.display='none';
 else if(a==='su'){$('#adm').style.display='none';window.openSetup&&window.openSetup()}
 else if(a==='out')logout();
 else if(a==='rs'){try{await auth.sendPasswordResetEmail(t.dataset.e);m().style.color='#059669';m().textContent='أُرسل رابط تغيير كلمة المرور'}catch(er){m().style.color='#dc2626';m().textContent=errT(er)}}
 else if(a==='rm'){if(!confirm('إزالة وصول هذا المستخدم؟'))return;try{await fs.doc('users/'+t.dataset.i).delete();admOpen()}catch(er){alert(errT(er))}}
 else if(a==='add'){const n=$('#un').value.trim(),em=$('#ue').value.trim(),pw=$('#up').value,ro=$('#ur').value;m().style.color='#dc2626';
  if(!n||!em||pw.length<8){m().textContent='أكمل الاسم والبريد وكلمة مرور 8 أحرف على الأقل';return}
  let sec;try{sec=fb.apps.find(x=>x.name==='sec')||fb.initializeApp(CFG,'sec');const sa=sec.auth();await sa.setPersistence(fb.auth.Auth.Persistence.NONE);
   const c=await sa.createUserWithEmailAndPassword(em,pw);await fs.doc('users/'+c.user.uid).set({sid:S.sid,role:ro,name:n,em,at:Date.now()});await sa.signOut();admOpen()}
  catch(er){m().textContent=errT(er)}}
 else if(a==='ex'){try{const d=await exportAll();await dl.save({filename:'control-backup-'+new Date().toISOString().slice(0,10)+'.json',data:new TextEncoder().encode(JSON.stringify(d))});m().style.color='#059669';m().textContent='تم تجهيز الملف'}catch(er){m().textContent=errT(er)}}
 else if(a==='im'){const f=await pickFile();if(!f)return;if(!confirm('سيُستبدل ما يطابق معرفاته من البيانات الحالية. متابعة؟'))return;try{const n=await importAll(await readJson(f),(x,y)=>{m().textContent='تم '+x+' من '+y});m().style.color='#059669';m().textContent='تم استيراد '+n+' عنصرًا. أعد فتح التطبيق.'}catch(er){m().style.color='#dc2626';m().textContent='تعذر: '+er.message}}});
/* ---------- بديل claude.use ---------- */
const mime=n=>/\.pdf$/i.test(n)?'application/pdf':/\.jpe?g$/i.test(n)?'image/jpeg':/\.png$/i.test(n)?'image/png':/\.json$/i.test(n)?'application/json':'application/octet-stream';
const dl={save:async({filename,data})=>{const bl=new Blob([data],{type:mime(filename)}),a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},6000)}};
const audit=(o,p)=>{if(!AUDIT_ON.test(p)&&o!=='del')return;try{fs.collection(P('audit')).add({u:S.user.uid,n:S.name,o,p,t:Date.now()}).catch(()=>{})}catch(e){}};
const wrapW=(pr)=>online()?pr:(pr.catch(e=>console.error(e)),Promise.resolve());
const adapter={
 doc:p=>{const r=()=>fs.doc(P(p));return{
  get:()=>online()?r().get():r().get({source:'cache'}).catch(()=>r().get()),
  set:o=>{const pr=r().set(o);audit('set',p);return wrapW(pr)},
  delete:()=>{const pr=r().delete();audit('del',p);return wrapW(pr)}}},
 collection:c=>({get:()=>fs.collection(P(c)).get(),onSnapshot:(a,b)=>fs.collection(P(c)).onSnapshot(a,b)})};
const user={isOwner:()=>S.role==='admin',canEdit:()=>S.role==='admin',can:async()=>S.role==='admin'||S.role==='sup',id:async()=>S.user&&S.user.uid,me:async()=>({id:S.user&&S.user.uid,name:S.name})};
window.claude={use:async n=>{if(n==='downloads')return dl;if(n==='db'){await ready;return adapter}if(n==='user'){await ready;return user}return null}};
/* ---------- تشغيل ---------- */
function start(){
 if(!fb){loginUI('تعذر تحميل مكتبة الاتصال. تأكد من الإنترنت وأعد فتح التطبيق.');return}
 fb.initializeApp(CFG);auth=fb.auth();fs=fb.firestore();
 try{fs.enablePersistence({synchronizeTabs:true}).catch(e=>console.warn('persist',e.code))}catch(e){}
 loginUI();
 auth.onAuthStateChanged(u=>{if(u){boot(u)}else if(done){location.reload()}else loginUI()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
