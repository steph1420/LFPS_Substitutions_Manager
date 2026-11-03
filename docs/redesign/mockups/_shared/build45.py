"""Bundle 45 — M06 Settings + M07 Pairing (phone, dark only, interactive). Codenames only.
Run: python build45.py"""
import pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from build import head, tabs, ICON
from build44 import PHONE_CSS, STAMP
CSS = """<style>
.bar{display:flex;align-items:center;height:56px;padding:0 8px;border-bottom:1px solid var(--lucid-color-border)}
.bar .back{width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:var(--lucid-color-accent);font-size:22px;cursor:pointer}
.bar h1{font-size:17px;font-weight:600;color:var(--lucid-color-text-strong);flex:1;text-align:center;margin-right:48px}
.view{display:none;flex:1;overflow-y:auto;scrollbar-width:none;flex-direction:column}.view.on{display:flex}.view>*{flex-shrink:0}
.big{padding:14px 16px 6px;font-size:28px;font-weight:600;letter-spacing:-.3px;color:var(--lucid-color-text-strong)}
.sec{padding:14px 16px 6px}.grp{margin:0 16px;border-radius:14px;background:var(--lucid-color-fill-1);border:1px solid var(--lucid-color-border);overflow:hidden}
.row{display:flex;align-items:center;gap:12px;min-height:56px;padding:0 14px;border-bottom:1px solid var(--lucid-color-line-card);cursor:pointer;user-select:none}
.row:last-child{border-bottom:0}.row .t{flex:1}.row .t b{display:block;font-size:15px;font-weight:400;color:var(--lucid-color-text-primary)}
.row .t small{font-size:11.5px;color:var(--lucid-color-text-muted)}.row .v{font-size:14px;color:var(--lucid-color-text-secondary)}
.row .chev{color:var(--lucid-color-text-faint);font-size:18px}.row.dis{opacity:.45;cursor:default}
.row.danger b{color:var(--lucid-color-danger-text)}
.foot{font-size:11.5px;color:var(--lucid-color-text-muted);padding:8px 28px 4px;line-height:1.45}
.tg{width:51px;height:31px;border-radius:999px;background:var(--lucid-color-toggle-off);position:relative}.tg::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:var(--lucid-color-toggle-knob)}
.tg.on{background:var(--lucid-color-accent)}.tg.on::after{left:22px;background:var(--lucid-color-toggle-knob-on)}
.toast{position:absolute;left:16px;right:16px;bottom:96px;z-index:20;background:var(--lucid-color-toast);border:1px solid var(--lucid-color-line-toast);box-shadow:var(--lucid-shadow-toast);border-radius:14px;padding:14px 16px;font-size:13.5px;color:var(--lucid-color-text-primary);opacity:0;transform:translateY(8px);transition:opacity var(--lfps-fade-dur),transform var(--lfps-spring-dur) var(--lfps-spring);pointer-events:none}
.toast.on{opacity:1;transform:none}
.drag{display:flex;align-items:center;gap:12px;height:60px;padding:0 14px;border-bottom:1px solid var(--lucid-color-line-card);background:var(--lucid-color-fill-1);touch-action:none;transition:transform var(--lfps-spring-dur) var(--lfps-spring)}
.drag .n{width:24px;height:24px;border-radius:50%;background:var(--lucid-color-accent-fill);color:var(--lucid-color-accent);font-size:12px;display:flex;align-items:center;justify-content:center}
.drag .hd{color:var(--lucid-color-text-faint);font-size:18px;cursor:grab;padding:8px}.drag.lift{background:var(--lucid-color-fill-selected);box-shadow:0 10px 30px rgba(0,0,0,.6);position:relative;z-index:2;transition:none}
.drag.off .t b{color:var(--lucid-color-text-muted);text-decoration:line-through}
.wn{padding:0 16px}.wn h3{font-size:13px;color:var(--lucid-color-accent-soft);margin:14px 0 6px;letter-spacing:.06em}.wn li{font-size:13.5px;color:var(--lucid-color-text-primary);margin:0 0 6px 18px;line-height:1.4}
.code{display:flex;justify-content:center;gap:8px;margin:18px 0 6px}.code span{width:44px;height:58px;border-radius:12px;background:var(--lucid-color-fill-2);border:1px solid var(--lucid-color-border-highlight);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:300;color:var(--lucid-color-text-display)}
.qr{width:168px;height:168px;margin:12px auto;background:#e9ecee;border-radius:12px;padding:10px;display:grid;grid-template-columns:repeat(21,1fr)}.qr i{display:block}.qr i.k{background:#05121a}
.meta{display:flex;justify-content:center;gap:18px;font-size:12px;color:var(--lucid-color-text-secondary)}.meta b{color:var(--lucid-color-text-display);font-weight:500}
.ring{height:4px;margin:10px 40px;border-radius:2px;background:var(--lucid-color-fill-3);overflow:hidden}.ring i{display:block;height:100%;background:var(--lucid-color-accent);transition:width 1s linear}
.ok{display:none;flex-direction:column;align-items:center;gap:8px;padding:28px 16px}.ok .ic{width:72px;height:72px;border-radius:50%;background:var(--lucid-color-accent-fill);box-shadow:inset 0 0 0 1px var(--lucid-color-accent-ring);display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--lucid-color-accent)}
.ok b{font-size:17px;color:var(--lucid-color-text-strong)}.ok small{font-size:12.5px;color:var(--lucid-color-text-secondary);text-align:center}
.inp{position:relative;margin:20px auto 8px;width:max-content}.inp input{position:absolute;inset:0;opacity:0;font-size:16px}
.inp .code{margin:0}.inp .code span.cur{border-color:var(--lucid-color-accent);box-shadow:0 0 0 3px var(--lucid-color-accent-fill)}
.err{text-align:center;font-size:12.5px;color:var(--lucid-color-text-secondary);min-height:18px}.err.bad{color:var(--lucid-color-danger-text)}
.c{text-align:center;padding:0 24px;font-size:13.5px;color:var(--lucid-color-text-secondary);line-height:1.45}
.btns{display:flex;flex-direction:column;gap:10px;padding:16px}
.btn.dangerb{background:var(--lucid-color-btn-danger-fill);border:1px solid var(--lucid-color-btn-danger-border);color:var(--lucid-color-btn-danger-text)}
.pill2{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border-radius:999px;color:var(--lucid-color-accent);background:var(--lucid-color-accent-fill)}
.pill2.rv{color:var(--lucid-color-text-muted);background:var(--lucid-color-fill-3)}
.dlg{position:absolute;inset:0;z-index:30;background:var(--lucid-color-scrim);display:none;align-items:flex-end}.dlg.on{display:flex}
.dlg .sheet{position:relative}
</style>"""
def bar(title, back=None):
    b = f'<span class="back" data-go="{back}">‹</span>' if back else '<span style="width:48px"></span>'
    return f'<div class="bar">{b}<h1>{title}</h1></div>'
def stamp(): return f'<div class="stamp" id="stamp">{STAMP}</div>'
QR = "".join('<i class="k"></i>' if ((x*7+y*13+x*y)%3==0 or (x<7 and y<7 and (x in(0,6) or y in(0,6) or (1<x<5 and 1<y<5)))) else '<i></i>' for y in range(21) for x in range(21))
# ---------- M06 ----------
M06_JS = r"""<script>
/* ONE registry (Q-HARM-5). This app (LFPS) declares only what it needs (Q-HARM-6 modular). */
const REGISTRY=[
 {id:'display.theme',sec:'Display',type:'choice',label:'Theme',def:'Dark',note:'Dark only in v1',locked:true},
 {id:'display.reduceMotion',sec:'Display',type:'toggle',label:'Reduce motion',def:false,note:'Follows the phone; fades instead of springs'},
 {id:'subs.bestFit',sec:'Substitutes',type:'order',label:'Best-fit order',def:['free','fewest','same'],go:'best'},
 {id:'subs.hideAbsent',sec:'Substitutes',type:'toggle',label:'Hide absent in Routine',def:true},
 {id:'pair.devices',sec:'Account & Pairing',type:'link',label:'Devices & pairing',value:'This device paired',href:'../M07/index.html?state=devices'},
 {id:'pair.login',sec:'Account & Pairing',type:'link',label:'Staff login',value:'Guest'},
 {id:'data.sync',sec:'Data',type:'info',label:'Last sync',value:'08:42 IST · Live'},
 {id:'about.version',sec:'About',type:'version',label:'Version'},
 {id:'about.whatsnew',sec:'About',type:'link',label:"What's New",go:'whatsnew'},
 {id:'dev.deviceExpiry',sec:'Developer',type:'number',label:'Unused-device expiry',def:90,unit:'days',dev:true},
 {id:'dev.settleMs',sec:'Developer',type:'number',label:'Name-column settle wait',def:80,unit:'ms',dev:true},
 {id:'dev.dataSource',sec:'Developer',type:'choice',label:'Data source',def:'Apps Script',note:'Apps Script · Go relay · Fake',dev:true},
 {id:'dev.lock',sec:'Developer',type:'action',label:'Hide Developer options',dev:true},
];
const CRIT={free:['Free that period','Must be free; no class this period'],fewest:['Fewest subs today','Spreads the load fairly'],same:['Same subject / class','Knows the class or teaches the subject']};
const P=new URLSearchParams(location.search);let devOn=P.get('state')==='dev'||P.has('dev'),taps=0,tapT=0;
let order=['free','fewest','same'],offs=new Set();
const $=s=>document.querySelector(s);
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1600)}
function render(){
  const secs=[...new Set(REGISTRY.filter(o=>!o.dev||devOn).map(o=>o.sec))];let h='';
  for(const s of secs){h+=`<div class="sec label">${s}</div><div class="grp">`;
    for(const o of REGISTRY.filter(o=>o.sec===s&&(!o.dev||devOn))){
      let v='';if(o.type==='toggle')v=`<span class="tg ${o.cur??o.def?'on':''}"></span>`;
      else if(o.type==='order')v=`<span class="v">${order.filter(k=>!offs.has(k)).map((k,i)=>i+1).join(' · ')?CRIT[order[0]][0]+' first':''}</span><span class="chev">›</span>`;
      else if(o.type==='number')v=`<span class="v">${o.def} ${o.unit}</span><span class="chev">›</span>`;
      else if(o.type==='version')v=`<span class="v" id="ver">2.0.0-alpha.3</span>`;
      else if(o.type==='link')v=`<span class="v">${o.value||''}</span><span class="chev">›</span>`;
      else if(o.type==='action')v='';else v=`<span class="v">${o.value||o.def}</span>`;
      h+=`<div class="row${o.locked?' dis':''}" data-id="${o.id}"><div class="t"><b>${o.label}</b>${o.note?`<small>${o.note}</small>`:''}</div>${v}</div>`}
    h+='</div>';if(s==='Display')h+='<p class="foot">Light theme comes after v1.</p>'}
  h+=`<p class="foot" style="text-align:center;padding-top:18px">Only options this app needs are built in.</p>`;
  $('#list').innerHTML=h;
}
function renderBest(){$('#best').innerHTML=order.map((k,i)=>`<div class="drag${offs.has(k)?' off':''}" data-k="${k}"><span class="n">${i+1}</span><div class="t" style="flex:1"><b style="font-size:15px;font-weight:400;display:block">${CRIT[k][0]}</b><small style="font-size:11.5px;color:var(--lucid-color-text-muted)">${CRIT[k][1]}</small></div><span class="tg ${offs.has(k)?'':'on'}" data-t></span><span class="hd">≡</span></div>`).join('')}
function show(v){const w=v==='whatsnew';document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+(w?'main':v)));$('#wn').classList.toggle('on',v==='whatsnew')}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g){show(g.dataset.go);return}
  const r=e.target.closest('.row[data-id]');if(r){const o=REGISTRY.find(x=>x.id===r.dataset.id);
    if(o.go)show(o.go);else if(o.href)location.href=o.href;
    else if(o.type==='toggle'){o.cur=!(o.cur??o.def);render()}
    else if(o.type==='version')verTap();
    else if(o.id==='dev.lock'){devOn=false;render();toast('Developer options hidden')}}
  if(e.target.closest('#stamp')||e.target.closest('#ver'))return;
  const t=e.target.closest('[data-t]');if(t){const k=t.closest('.drag').dataset.k;offs.has(k)?offs.delete(k):offs.add(k);if(offs.size===3){offs.delete(k);toast('Keep at least one rule on')}renderBest();render()}
  if(e.target.closest('#reset')){order=['free','fewest','same'];offs.clear();renderBest();render();toast('Default order restored')}
  if(e.target.closest('#wnclose')||e.target.id==='wn')show('main');
});
$('#stamp').addEventListener('click',()=>show('whatsnew'));
function verTap(){ if(devOn){toast('Developer options are already on');return}
  const now=Date.now();if(now-tapT>1500)taps=0;tapT=now;taps++;
  const left=7-taps;if(left<=0){devOn=true;taps=0;render();toast('Developer options unlocked');setTimeout(()=>$('#list').lastElementChild.previousElementSibling.scrollIntoView({behavior:'smooth'}),200)}
  else if(taps>=3)toast(`${left} more tap${left>1?'s':''} to Developer options`)}
/* drag to reorder (pointer events; works with touch). */
let drag=null;
$('#best').addEventListener('pointerdown',e=>{const h=e.target.closest('.hd');if(!h)return;const el=h.closest('.drag');drag={el,y0:e.clientY,i:order.indexOf(el.dataset.k)};el.classList.add('lift');el.setPointerCapture(e.pointerId)});
$('#best').addEventListener('pointermove',e=>{if(!drag)return;const dy=e.clientY-drag.y0;drag.el.style.transform=`translateY(${dy}px) scale(1.02)`;
  const ni=Math.max(0,Math.min(2,drag.i+Math.round(dy/60)));drag.ni=ni});
addEventListener('pointerup',()=>{if(!drag)return;const ni=drag.ni??drag.i;const k=order.splice(drag.i,1)[0];order.splice(ni,0,k);drag=null;renderBest();render();if(ni!==undefined)toast('Order saved')});
render();renderBest();
const st=P.get('state');if(st==='best')show('best');if(st==='whatsnew')show('whatsnew');if(st==='taps'){taps=3;tapT=Date.now();toast('4 more taps to Developer options')}
if(st==='dev')setTimeout(()=>$('#v-main').scrollTop=9999,50);
if(P.has('order')){order=P.get('order').split(',');renderBest();render()}
if(P.has('rm'))document.documentElement.style.setProperty('--lfps-spring-dur','0ms');
</script>"""
def m06():
    wn = ('<div class="dlg" id="wn"><div class="sheet"><div class="grab"></div><div class="sh-h"><h2>What\'s New</h2><span class="label" id="wnclose" style="cursor:pointer">Done</span></div>'
          f'<div class="ctx">{STAMP}</div><div class="wn"><h3>2.0.0-alpha.3</h3><ul><li>Name column folds after you let go; tap the strip to peek.</li><li>Assign substitute: best fit first.</li><li>Uncovered list by period.</li></ul>'
          '<h3>2.0.0-alpha.2</h3><ul><li>Calm dark look.</li></ul></div></div></div>')
    body = (f'<div class="app"><div class="view on" id="v-main">{bar("Settings")}<div id="list"></div><div style="height:16px"></div></div>'
            f'<div class="view" id="v-best">{bar("Best-fit order","main")}<p class="c" style="padding-top:14px;text-align:left;padding:14px 16px 10px">Drag ≡ to change which rule counts first when suggesting a substitute. Switch a rule off to ignore it.</p>'
            '<div class="grp" id="best"></div><p class="foot">Saved in the shared Settings registry as <code>subs.bestFit</code>.</p><div class="btns"><span class="btn quiet" id="reset">Restore default order</span></div></div>'
            f'{wn}<div class="toast" id="toast"></div>{tabs("")}{stamp()}</div>')
    return head("M06 Settings phone",390)+PHONE_CSS+CSS+"</head><body>"+body+M06_JS+"</body></html>"
# ---------- M07 ----------
M07_JS = r"""<script>
const P=new URLSearchParams(location.search),$=s=>document.querySelector(s);
const CODE='482913';let left=300,tries=5,used=false,timer;
function show(v){document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));if(v==='client')setTimeout(()=>$('#ci').focus(),60);if(v==='host')startHost()}
function fmt(s){return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function startHost(){used=false;left=300;$('#hostcode').style.display='';$('#hostok').style.display='none';
  $('#hc').innerHTML=CODE.split('').map(d=>`<span>${d}</span>`).join('');tick();clearInterval(timer);timer=setInterval(tick,1000)}
function tick(){if(used)return;$('#left').textContent=fmt(left);$('#tries').textContent=tries;$('#ring').style.width=(left/300*100)+'%';
  if(left--<=0){clearInterval(timer);$('#left').textContent='expired';}}
function hostUsed(label){used=true;clearInterval(timer);$('#hostcode').style.display='none';$('#hostok').style.display='flex';$('#oklabel').textContent=label+' paired';
  setTimeout(()=>{if(!P.has('hold'))startHost()},3500)}  /* instant block + reset to a fresh code */
function render(){const v=$('#ci').value;$('#cc').innerHTML=[0,1,2,3,4,5].map(i=>`<span class="${i===v.length?'cur':''}">${v[i]||''}</span>`).join('')}
$('#ci').addEventListener('input',e=>{const el=e.target;el.value=el.value.replace(/\D/g,'').slice(0,6);render();$('#cerr').textContent='';$('#cerr').className='err';
  if(el.value.length===6){ /* auto-submit at 6 digits */
    if(el.value===CODE&&!used){$('#cerr').textContent='Pairing…';setTimeout(()=>{hostUsed('Desk phone');show('paired')},400)}
    else{tries--;$('#cerr').className='err bad';$('#cerr').textContent=used?'That code was already used. Ask for a new one.':tries>0?`Wrong code · ${tries} tries left`:'Too many tries. Ask for a new code.';el.value='';setTimeout(render,0)}}});
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)show(g.dataset.go);
  const r=e.target.closest('[data-rv]');if(r){r.closest('.row').querySelector('.pill2').className='pill2 rv';r.closest('.row').querySelector('.pill2').textContent='Revoked';r.remove()}
  if(e.target.closest('#rall'))$('#dlg').classList.add('on');if(e.target.closest('#dlgx'))$('#dlg').classList.remove('on');
  if(e.target.closest('#dlgok')){$('#dlg').classList.remove('on');document.querySelectorAll('#devs .pill2').forEach(p=>{p.className='pill2 rv';p.textContent='Revoked'});document.querySelectorAll('[data-rv]').forEach(x=>x.remove())}
  if(e.target.closest('.tg'))e.target.closest('.tg').classList.toggle('on')});
$('#cc').addEventListener('click',()=>$('#ci').focus());
render();const st=P.get('state')||'host';
if(st==='used'){show('host');hostUsed('Desk phone')}else if(st==='client6'){show('client');$('#ci').value=CODE.slice(0,5);render()}else show(st);
</script>"""
def m07():
    dev = [("This phone (Front desk)","Paired 2 Nov · seen now","guest view · real names"),("Desk phone","Paired 4 Nov · seen 2 min ago","guest view · real names"),
           ("Staff room tablet","Paired 12 Oct · seen 3 days ago","guest view"),("Teacher-K phone","Login + retained · seen yesterday","edit.roster")]
    rows = "".join(f'<div class="row"><div class="t"><b>{n} <span class="pill2">Active</span></b><small>{s} · {c}</small></div>{"" if i==0 else "<span class=\"btn quiet\" style=\"height:36px;font-size:12.5px\" data-rv>Revoke</span>"}</div>' for i,(n,s,c) in enumerate(dev))
    body = ('<div class="app">'
      f'<div class="view" id="v-host">{bar("Pair a device","devices")}<p class="c" style="padding-top:12px">On the other device open LFPS → <b>Pair with code</b>, type this code or scan the QR.</p>'
      f'<div id="hostcode"><div class="code" id="hc"></div><div class="qr">{QR}</div><div class="ring"><i id="ring"></i></div>'
      '<div class="meta"><span>Expires in <b id="left">5:00</b></span><span><b id="tries">5</b> tries</span><span>Works <b>once</b></span></div>'
      '<div class="btns"><span class="btn quiet" data-go="client">Demo: open client screen ›</span></div></div>'
      '<div class="ok" id="hostok"><div class="ic">✓</div><b id="oklabel">Device paired</b><small>Code used and blocked. A fresh code appears in a moment.</small></div></div>'
      f'<div class="view" id="v-client">{bar("Pair with code","devices")}<p class="c" style="padding-top:18px">Type the 6-digit code shown on the host device.</p>'
      '<label class="inp"><input id="ci" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" autofocus aria-label="Pairing code"><div class="code" id="cc"></div></label>'
      '<div class="err" id="cerr"></div><div class="btns"><span class="btn quiet">Scan QR instead</span><span class="btn quiet" data-go="login">Log in instead</span></div></div>'
      f'<div class="view" id="v-paired">{bar("Paired")}<div class="ok" style="display:flex"><div class="ic">✓</div><b>This device is paired</b><small>Real names now show without login.<br>Device key saved on this device only.</small></div><div class="btns"><span class="btn pri" data-go="devices">Done</span></div></div>'
      f'<div class="view" id="v-login">{bar("Staff login","client")}<div class="ok" style="display:flex"><div class="ic">✓</div><b>Logged in as Teacher-K</b><small>You can see real names while logged in.</small></div>'
      '<div class="grp"><div class="row"><div class="t"><b>Retain pairing on this device</b><small>Keep real names after you log out. Revoke anytime in Devices.</small></div><span class="tg on"></span></div></div>'
      '<div class="btns"><span class="btn pri" data-go="devices">Continue</span><span class="btn quiet" data-go="devices">Not now</span></div></div>'
      f'<div class="view" id="v-devices">{bar("Devices & pairing")}<div class="sec label">Paired devices</div><div class="grp" id="devs">{rows}</div>'
      '<p class="foot">Each device has its own key. Unused devices expire after 90 days (Developer option).</p>'
      '<div class="btns"><span class="btn pri" data-go="host">Pair a new device</span><span class="btn quiet" data-go="client">Pair this device with a code</span><span class="btn dangerb" id="rall">Reset shared token (revoke all)</span></div></div>'
      f'<div class="view" id="v-guest">{bar("Routine")}<div class="grp" style="margin-top:16px">'+"".join(f'<div class="row"><div class="t"><b>Teacher-{c}</b><small>name hidden · not paired</small></div></div>' for c in "ABCD")+
      '</div><p class="foot">This device is not paired and nobody is logged in, so only codenames show.</p><div class="btns"><span class="btn pri" data-go="client">Pair with code</span><span class="btn quiet" data-go="login">Staff login</span></div></div>'
      '<div class="dlg" id="dlg"><div class="sheet"><div class="grab"></div><div class="sh-h"><h2>Revoke every device?</h2></div><p class="ctx">This resets the shared token. Every device, including this one, must pair again. Emergency use only.</p>'
      '<div class="row-btns"><span class="btn quiet" id="dlgx">Cancel</span><span class="btn dangerb" id="dlgok">Revoke all</span></div></div></div>'
      f'{tabs("")}{stamp()}</div>')
    return head("M07 Pairing phone",390)+PHONE_CSS+CSS+"</head><body>"+body+M07_JS+"</body></html>"
if __name__ == "__main__":
    (ROOT/"M06"/"index.html").write_text(m06()); (ROOT/"M07"/"index.html").write_text(m07()); print("wrote M06, M07")
