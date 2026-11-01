from build import *
def hdr_phone():
    return f'''<header class="ph-hdr"><div class="r1"><div class="wordmark">LFPS <b>·</b> Subs</div><div class="live"><span class="dot"></span>Live</div><div class="sp"></div><span class="ico">{ICON["bell"]}</span><span class="ico">{ICON["gear"]}</span><span class="ico">{ICON["user"]}</span></div><div class="r2">{days()}</div></header>'''
PH_CSS = '''<style>
.app{width:390px;height:844px;display:flex;flex-direction:column}
.ph-hdr{padding:8px 4px 10px 16px;border-bottom:1px solid var(--lucid-color-border)}
.ph-hdr .r1{display:flex;align-items:center;height:48px}
.ph-hdr .r2{padding-right:12px;margin-top:4px}
.live{margin-left:12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--lucid-color-accent-soft);display:flex;align-items:center;gap:6px}
.sp{flex:1}
.ttl{padding:16px 16px 0}
.ttl h1{font-size:28px;font-weight:600;letter-spacing:-.3px;color:var(--lucid-color-text-strong)}
.ttl p{font-size:13px;color:var(--lucid-color-text-secondary);margin-top:2px}
.tools{display:flex;gap:8px;padding:12px 16px;overflow:hidden}
.main{flex:1;overflow:hidden;position:relative}
.tabs{padding-bottom:20px}
</style>'''
def m01():
    rows=[t for t in T if t[3]!="A"]  # Hide Absent ON
    COLW=96; NAMEW=64
    hdr='<div class="g-corner"><span class="label" style="letter-spacing:.14em">Staff</span></div>'+"".join(f'<div class="g-ph{" brk" if p=="BREAK" else ""}"><b>{p if p!="BREAK" else "BRK"}</b><small>{TIMES[i]}</small></div>' for i,p in enumerate(PER))
    body=""
    for t in rows:
        st={"W":'<i class="sd away"></i>',"P":""}[t[3]]
        body+=f'<div class="g-name{" w" if t[3]=="W" else ""}"><b>{t[1]}</b>{st}</div>'+"".join(f'<div class="g-c{" brk" if PER[i]=="BREAK" else ""}">{cell(t,i,phone=True)}</div>' for i in range(8))
    cols=f"{NAMEW}px "+" ".join("44px" if p=="BREAK" else f"{COLW}px" for p in PER)
    return head("M01 Routine Matrix phone",390)+PH_CSS+f'''<style>
.grid{{display:grid;grid-template-columns:{cols};grid-auto-rows:60px;gap:4px;padding:0 0 0 12px;width:max-content}}
.g-corner,.g-name{{position:sticky;left:0;z-index:2;background:#0e0f13}}
.g-corner{{display:flex;align-items:flex-end;padding-bottom:8px;height:48px;align-self:end}}
.grid > .g-ph,.grid>.g-corner{{height:48px}}
.g-ph{{display:flex;flex-direction:column;justify-content:flex-end;padding:0 8px 8px;border-bottom:1px solid var(--lucid-color-divider)}}
.g-ph b{{font-size:12px;letter-spacing:.12em;font-weight:500;color:var(--lucid-color-text-primary)}}
.g-ph small{{font-size:10px;color:var(--lucid-color-text-muted)}}
.g-ph.brk b{{color:var(--lucid-color-text-faint)}}
.g-name{{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;padding-left:4px;border-right:1px solid var(--lucid-color-divider-vertical)}}
.g-name b{{font-size:15px;font-weight:500;color:var(--lucid-color-text-display);letter-spacing:.04em}}
.sd{{display:block;height:3px;width:22px;border-radius:2px}}
.sd.away{{background:var(--lfps-away)}}
.g-name.w b{{color:var(--lfps-away)}}
.grid{{grid-template-rows:48px}}
.grid .cell{{gap:1px;padding:5px 8px}} .grid .cell .tag{{display:block;font-size:9.5px}}
.fade{{position:absolute;right:0;top:0;bottom:0;width:36px;background:linear-gradient(90deg,transparent,rgba(10,11,15,.9));pointer-events:none}}
.legend{{padding:4px 16px 10px;font-size:11px;gap:12px}}
</style></head><body><div class="app">{hdr_phone()}
<div class="ttl"><h1>Routine</h1><p>Monday 2 November · Teachers × Periods</p></div>
<div class="tools"><span class="chip on">✓ Hide absent</span><span class="chip">Teachers</span><span class="chip">Names ▸</span></div>
<div class="legend"><span><i style="background:var(--lfps-free)"></i>Free</span><span><i style="background:var(--lfps-need)"></i>Need sub</span><span><i style="background:var(--lucid-color-accent)"></i>Covered</span><span><i style="background:var(--lfps-away)"></i>Away</span></div>
<div class="main"><div class="grid">{hdr}{body}</div><div class="fade"></div></div>
{tabs("Routine")}</div></body></html>'''

def m02():
    hdrs='<div class="g-corner">Teacher</div>'+"".join(f'<div class="g-ph{" brk" if p=="BREAK" else ""}"><b>{p}</b><small>{TIMES[i]}</small></div>' for i,p in enumerate(PER))
    body=""
    for t in T:
        tag={"A":'<span class="pill abs">Absent</span>',"W":'<span class="pill away">Away · duty</span>',"P":""}[t[3]]
        body+=f'<div class="g-name {t[3]}"><div><b>{t[0]}</b>{tag}</div><small>{t[2]}</small></div>'+"".join(f'<div class="g-c">{cell(t,i)}</div>' for i in range(8))
    kp=[("Absent","2","abs"),("Away","1","away"),("Need sub","5","need"),("Covered","3","cov")]
    kpis="".join(f'<div class="kpi {c}"><span class="label">{l}</span><b>{n}</b></div>' for l,n,c in kp)
    nav="".join(f'<div class="nav{" on" if l=="Routine Matrix" else ""}">{ICON[i]}<span>{l}</span></div>' for i,l in [("grid","Routine Matrix"),("swap","Substitutions"),("people","Staff Roster")])
    return head("M02 Routine Matrix desktop",1440)+f'''<style>
.app{{width:1440px;height:900px;display:grid;grid-template-columns:184px 1fr;grid-template-rows:64px 1fr}}
.top{{grid-column:1/3;display:flex;align-items:center;padding:0 16px 0 24px;border-bottom:1px solid var(--lucid-color-border);gap:24px}}
.top .days{{width:480px;margin-left:96px}}
.live{{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--lucid-color-accent-soft);display:flex;align-items:center;gap:8px}}
.live span.t{{color:var(--lucid-color-text-muted);letter-spacing:.04em;text-transform:none;font-size:12px}}
.sp{{flex:1}}
.side{{border-right:1px solid var(--lucid-color-border);padding:16px 12px;display:flex;flex-direction:column;gap:4px}}
.nav{{height:48px;border-radius:var(--lucid-radius-control);display:flex;align-items:center;gap:12px;padding:0 12px;color:var(--lucid-color-text-secondary);font-size:14px}}
.nav svg{{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.5}}
.nav.on{{background:var(--lucid-color-accent-fill);color:var(--lucid-color-accent);box-shadow:inset 0 0 0 1px var(--lucid-color-accent-ring)}}
.kpis{{margin-top:24px;display:flex;flex-direction:column;gap:8px}}
.kpi{{display:flex;justify-content:space-between;align-items:baseline;padding:12px;border-radius:10px;background:var(--lucid-color-fill-1);border:1px solid var(--lucid-color-border)}}
.kpi b{{font-size:26px;font-weight:200;color:var(--lucid-color-text-display)}}
.kpi.abs b{{color:var(--lfps-absent)}} .kpi.away b{{color:var(--lfps-away)}} .kpi.need b{{color:var(--lfps-need)}} .kpi.cov b{{color:var(--lucid-color-accent)}}
.ver{{margin-top:auto;font-size:11px;color:var(--lucid-color-text-faint);padding:0 12px}}
.mainw{{padding:24px 28px 0;overflow:hidden;display:flex;flex-direction:column}}
.mh{{display:flex;align-items:flex-end;gap:12px;margin-bottom:18px}}
.mh h1{{font-size:30px;font-weight:600;letter-spacing:-.3px;color:var(--lucid-color-text-strong)}}
.mh p{{font-size:14px;color:var(--lucid-color-text-secondary);margin-top:4px}}
.seg{{display:flex;padding:3px;border-radius:999px;border:1px solid var(--lucid-color-border-highlight);background:var(--lucid-color-fill-1)}}
.seg span{{height:30px;padding:0 14px;border-radius:999px;display:flex;align-items:center;font-size:13px;color:var(--lucid-color-text-secondary)}}
.seg span.on{{background:var(--lucid-color-fill-selected);color:var(--lucid-color-text-strong)}}
.gridwrap{{border:1px solid var(--lucid-color-border);border-radius:14px;background:rgba(255,255,255,.012);overflow:hidden;flex:1;margin-bottom:24px}}
.grid{{display:grid;grid-template-columns:212px repeat(2,1fr) 64px repeat(5,1fr);grid-template-rows:52px;grid-auto-rows:50px;gap:4px;padding:0 12px 12px 0}}
.g-corner{{display:flex;align-items:center;padding-left:20px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--lucid-color-text-muted);border-bottom:1px solid var(--lucid-color-divider);border-right:1px solid var(--lucid-color-divider-vertical)}}
.g-ph{{display:flex;align-items:baseline;gap:8px;padding:0 10px;border-bottom:1px solid var(--lucid-color-divider);align-items:center}}
.g-ph b{{font-size:12px;letter-spacing:.14em;font-weight:500;color:var(--lucid-color-text-primary)}}
.g-ph small{{font-size:11px;color:var(--lucid-color-text-muted)}}
.g-ph.brk{{flex-direction:column;justify-content:center;gap:0;padding:0}} .g-ph.brk b{{color:var(--lucid-color-text-faint);font-size:10px;letter-spacing:.1em}}
.g-name{{display:flex;flex-direction:column;justify-content:center;padding-left:20px;border-right:1px solid var(--lucid-color-divider-vertical)}}
.g-name div{{display:flex;align-items:center;gap:8px}}
.g-name b{{font-size:14px;font-weight:500;color:var(--lucid-color-text-display)}}
.g-name small{{font-size:11px;color:var(--lucid-color-text-muted);margin-top:2px}}
.g-name.A b{{color:var(--lfps-absent)}} .g-name.W b{{color:var(--lfps-away)}}
.pill{{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border-radius:999px;font-weight:500}}
.pill.abs{{color:var(--lfps-absent);background:var(--lfps-absent-fill);box-shadow:inset 0 0 0 1px var(--lfps-absent-ring)}}
.pill.away{{color:var(--lfps-away);background:var(--lfps-away-fill);box-shadow:inset 0 0 0 1px rgba(167,126,230,.3)}}
.g-name.A{{background:linear-gradient(90deg,var(--lfps-absent-fill),transparent)}}
.cell .act{{float:right;font-size:11px;color:var(--lucid-color-warning-text)}}
.cell .c{{display:block}}
.legend{{margin-left:24px}}
</style></head><body><div class="app">
<div class="top"><div class="wordmark">LFPS <b>·</b> Substitutions</div>{days()}<div class="sp"></div><div class="live"><span class="dot"></span>Live <span class="t">synced 08:42 IST</span></div><span class="ico">{ICON["bell"]}</span><span class="ico">{ICON["gear"]}</span><span class="chip">{ICON["user"].replace("<svg","<svg width=16 height=16 style='stroke:currentColor;fill:none;stroke-width:1.5'")} Staff login</span></div>
<aside class="side">{nav}<div class="kpis">{kpis}</div><div class="ver">Front desk · Guest<br>v2 mockup</div></aside>
<section class="mainw"><div class="mh"><div><h1>Routine Matrix</h1><p>Monday 2 November · Teachers × Periods</p></div><div class="sp"></div>
<div class="legend"><span><i style="background:var(--lfps-free)"></i>Free</span><span><i style="background:var(--lfps-need)"></i>Need sub</span><span><i style="background:var(--lucid-color-accent)"></i>Covered</span></div>
<div class="seg"><span class="on">Teachers</span><span>Classes</span></div><span class="chip">Sort · Role</span><span class="chip">Hide absent</span></div>
<div class="gridwrap"><div class="grid">{hdrs}{body}</div></div></section>
</div></body></html>'''

def m03(sheet=False):
    absent=[("Teacher-B","TB","Class Teacher · 1 B","Full day","4 periods · 2 covered",2),
            ("Teacher-I","TI","Subject · Art","1st, 3rd","2 periods · 0 covered",2)]
    cards="".join(f'''<div class="rc"><div class="av">{a}</div><div class="rt"><b>{n}</b><small>{r}</small><div class="meta"><span class="pill abs">Absent · {d}</span><span class="need">{x.split(" · ")[1]}</span></div></div><span class="more">⋯</span></div>''' for n,a,r,d,x,_ in absent)
    return head("M03 Staff Roster phone",390)+PH_CSS+f'''<style>
.kp{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 16px 0}}
.kp div{{background:var(--lucid-color-fill-1);border:1px solid var(--lucid-color-border);border-radius:12px;padding:10px 10px 8px}}
.kp b{{display:block;font-size:24px;font-weight:200;color:var(--lucid-color-text-display);line-height:1.1}}
.kp span{{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--lucid-color-text-secondary)}}
.kp .abs{{border-color:var(--lfps-absent-ring);background:var(--lfps-absent-fill)}} .kp .abs b{{color:var(--lfps-absent)}}
.kp .away b{{color:var(--lfps-away)}} .kp .nos b{{color:var(--lfps-free)}}
.search{{margin:14px 16px 0;height:48px;border-radius:12px;background:var(--lucid-color-fill-2);border:1px solid var(--lucid-color-border);display:flex;align-items:center;gap:8px;padding:0 14px;color:var(--lucid-color-text-muted);font-size:15px}}
.search svg{{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.6}}
.filt{{display:flex;margin:12px 16px 0;padding:3px;border-radius:12px;background:var(--lucid-color-fill-1);border:1px solid var(--lucid-color-border)}}
.filt span{{flex:1;height:40px;display:flex;align-items:center;justify-content:center;border-radius:9px;font-size:13px;color:var(--lucid-color-text-secondary)}}
.filt span.on{{background:var(--lfps-absent-fill);color:var(--lfps-absent);box-shadow:inset 0 0 0 1px var(--lfps-absent-ring)}}
.sec{{display:flex;justify-content:space-between;align-items:center;padding:18px 16px 8px}}
.sec .mp{{font-size:13px;color:var(--lucid-color-accent);height:36px;display:flex;align-items:center}}
.rc{{margin:0 16px 8px;display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;background:linear-gradient(90deg,var(--lfps-absent-fill),rgba(255,255,255,.02));border:1px solid var(--lfps-absent-ring)}}
.av{{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:var(--lfps-absent);background:rgba(227,154,164,.12)}}
.rt{{flex:1}} .rt b{{font-size:16px;font-weight:500;color:var(--lucid-color-text-strong)}} .rt small{{display:block;font-size:12px;color:var(--lucid-color-text-secondary);margin-top:1px}}
.meta{{display:flex;gap:8px;align-items:center;margin-top:7px}}
.pill{{font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:999px;font-weight:500}}
.pill.abs{{color:var(--lfps-absent);background:var(--lfps-absent-fill);box-shadow:inset 0 0 0 1px var(--lfps-absent-ring)}}
.need{{font-size:12px;color:var(--lucid-color-warning-text)}}
.more{{width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:var(--lucid-color-icon);font-size:20px}}
.hint{{margin:10px 20px;font-size:12px;line-height:1.5;color:var(--lucid-color-text-muted)}}
.scrim{{position:absolute;inset:0;background:var(--lucid-color-scrim)}}
.sheet{{position:absolute;left:0;right:0;bottom:0;background:var(--lucid-color-surface-raised);border-top:1px solid var(--lucid-color-border-highlight);border-radius:20px 20px 0 0;padding:8px 16px 28px}}
.grab{{width:36px;height:5px;border-radius:3px;background:var(--lucid-color-tick);margin:0 auto 14px}}
.sh{{display:flex;gap:12px;align-items:center;margin-bottom:14px}}
.sh .av{{color:var(--lucid-color-text-display);background:var(--lucid-color-fill-4)}}
.sh b{{font-size:17px;font-weight:500;color:var(--lucid-color-text-strong)}} .sh small{{display:block;font-size:12px;color:var(--lucid-color-text-secondary)}}
.opt{{height:56px;display:flex;align-items:center;gap:14px;padding:0 14px;border-radius:12px;background:var(--lucid-color-fill-2);margin-bottom:8px;font-size:15px;color:var(--lucid-color-text-primary)}}
.opt i{{width:10px;height:10px;border-radius:50%}}
.opt span{{margin-left:auto;font-size:12px;color:var(--lucid-color-text-muted)}}
.cancel{{height:48px;display:flex;align-items:center;justify-content:center;color:var(--lucid-color-text-secondary);font-size:15px;margin-top:4px}}
</style></head><body><div class="app">{hdr_phone()}
<div class="ttl"><h1>Staff Roster</h1><p>Monday 2 November · 12 staff</p></div>
<div class="kp"><div><b>9</b><span>Present</span></div><div class="abs"><b>2</b><span>Absent</span></div><div class="away"><b>1</b><span>Away</span></div><div class="nos"><b>3</b><span>No subs</span></div></div>
<div class="search">{ICON["search"]}Search name or role</div>
<div class="filt"><span>All</span><span>Present</span><span class="on">Absent</span><span>No subs</span></div>
<div class="main"><div class="sec"><span class="label">Absent today · 2</span><span class="mp">Mark all present</span></div>{cards}<p class="hint">Away on duty (1) is not counted as Absent. Tap any name in All to mark absent or away.</p>
{SHEET if sheet else ""}</div>
{tabs("Roster")}{SHEET2 if sheet else ""}</div></body></html>'''
SHEET=""
SHEET2='''<div class="scrim"></div><div class="sheet"><div class="grab"></div><div class="sh"><div class="av">TL</div><div><b>Teacher-L</b><small>Subject · English · present</small></div></div>
<div class="opt"><i style="background:var(--lfps-absent)"></i>Mark absent — full day</div>
<div class="opt"><i style="background:var(--lfps-absent);opacity:.5"></i>Mark absent — some periods<span>pick periods</span></div>
<div class="opt"><i style="background:var(--lfps-away)"></i>Mark away on duty…<span>periods + venue</span></div>
<div class="cancel">Cancel</div></div>'''
def write(root):
    (root/"M03"/"sheet.html").write_text(m03(True))
    for k,f in {"M01":m01,"M02":m02,"M03":m03}.items():
        (root/k/"index.html").write_text(f()); print("wrote",k,flush=True)
