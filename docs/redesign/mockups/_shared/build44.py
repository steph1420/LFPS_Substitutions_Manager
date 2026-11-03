"""Bundle 44 — builds M04 Assign Substitute + M05 Uncovered (phone, dark only, interactive).
Reuses Bundle 43 placeholder data from build.py. Codenames only. Run: python build44.py [--png]"""
import pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from build import PER, TIMES, T, COVER, cell, ICON, head, days, tabs
STAMP = "v2.0.0-alpha.3 · 697a8a6 · 4 Nov 2026 IST"   # placeholder footer stamp (Q-HARM-7)
SEL = ("Teacher-B", 4)   # EVS 1 B, 3rd period
PHONE_CSS = """<link rel="stylesheet" href="../_shared/namecol.css"><style>
.app{width:390px;height:844px;display:flex;flex-direction:column}
.ph-hdr{padding:8px 4px 10px 16px;border-bottom:1px solid var(--lucid-color-border)}
.ph-hdr .r1{display:flex;align-items:center;height:48px} .ph-hdr .r2{padding-right:12px;margin-top:4px}
.live{margin-left:12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--lucid-color-accent-soft);display:flex;align-items:center;gap:6px}
.sp{flex:1} .ttl{padding:14px 16px 8px} .ttl h1{font-size:28px;font-weight:600;letter-spacing:-.3px;color:var(--lucid-color-text-strong)}
.ttl p{font-size:13px;color:var(--lucid-color-text-secondary);margin-top:2px}
.main{flex:1;overflow-y:auto;position:relative;scrollbar-width:none}
.tabs{padding-bottom:4px;background:#0a0b0f;position:relative;z-index:12}
.stamp{position:relative;z-index:12;font-size:10.5px;color:var(--lucid-color-text-faint);text-align:center;padding:4px 0 14px;background:#0a0b0f;cursor:pointer}
.btn{height:48px;border-radius:var(--lucid-radius-button-app);display:inline-flex;align-items:center;justify-content:center;padding:0 18px;font-size:14px;font-weight:500}
.btn.pri{background:var(--lucid-color-accent);color:var(--lucid-color-on-accent)}
.btn.quiet{background:transparent;border:1px solid var(--lucid-color-line-button);color:var(--lucid-color-text-secondary)}
.sheet{position:absolute;left:0;right:0;bottom:var(--dock,0px);z-index:10;background:#161a20;border-top-left-radius:var(--lucid-radius-sheet);border-top-right-radius:var(--lucid-radius-sheet);border-top:1px solid var(--lucid-color-sheet-border);box-shadow:0 -20px 60px rgba(0,0,0,.7);padding:8px 16px 16px;transition:transform var(--lfps-spring-dur) var(--lfps-spring)}
.sheet.down{transform:translateY(calc(100% - 28px))}.sheet.gone{display:none}
.dlg .sheet{bottom:0;padding-bottom:calc(16px + var(--lucid-safe-bottom))}
.grab{width:40px;height:4px;border-radius:2px;background:var(--lucid-color-border-highlight);margin:4px auto 10px}
.sh-h{display:flex;align-items:baseline;justify-content:space-between}
.sh-h h2{font-size:17px;font-weight:600;color:var(--lucid-color-text-strong)}
.ctx{font-size:12.5px;color:var(--lucid-color-text-secondary);margin:4px 0 12px}
.ctx b{color:var(--lucid-color-warning-text);font-weight:500}
.cand{display:flex;align-items:center;gap:12px;height:56px;border-bottom:1px solid var(--lucid-color-line-card)}
.cand .av{width:36px;height:36px;border-radius:50%;background:var(--lucid-color-fill-3);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--lucid-color-text-primary)}
.cand .who{flex:1} .cand .who b{display:block;font-size:14px;font-weight:500;color:var(--lucid-color-text-display)}
.cand .who small{font-size:11.5px;color:var(--lucid-color-text-muted)}
.cand.on{background:var(--lucid-color-accent-fill);box-shadow:inset 0 0 0 1px var(--lucid-color-accent-ring);border-radius:12px;border:0;padding:0 8px;margin:0 -8px}
.fit{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--lfps-free)}
.row-btns{display:flex;gap:8px;margin-top:14px} .row-btns .btn{flex:1}
.hint{font-size:10.5px;color:var(--lucid-color-text-muted);padding:6px 16px 0;letter-spacing:.04em}
@media (prefers-reduced-motion: reduce){.sheet{transition:opacity var(--lfps-fade-dur)}}
</style>"""
def header(): 
    return ('<header class="ph-hdr"><div class="r1"><div class="wordmark">LFPS <b>·</b> Subs</div><div class="live"><span class="dot"></span>Live</div><div class="sp"></div>'
            f'<span class="ico">{ICON["bell"]}</span><span class="ico">{ICON["gear"]}</span><span class="ico">{ICON["user"]}</span></div><div class="r2">{days()}</div></header>')
def table(sel=None, hl=None):
    ph = "".join(f'<div class="g-ph{" brk" if p=="BREAK" else ""}{" hl" if i==hl else ""}"><b>{p}</b><small>{TIMES[i]}</small></div>' for i,p in enumerate(PER))
    cells, names = "", '<div class="h"><span class="label lbl">Teacher</span></div>'
    for t in T:
        for i in range(len(PER)):
            c = cell(t, i, phone=True)
            if sel and (t[0], i) == sel: c = c.replace('class="cell need', 'class="cell need sel', 1)
            cells += c
        names += f'<div class="n {t[3]}"><div class="full"><b>{t[0]}</b><small>{t[2]}</small></div><div class="strip"><span>{t[0]}</span></div></div>'
    return f'<div class="tbl"><div class="xs"><div class="grid">{ph}{cells}</div></div><div class="nc">{names}</div></div>'
def foot(on): return f'{tabs(on)}<div class="stamp" title="Tap: What\'s New">{STAMP}</div>'
def m04():
    cands = [("TD","Teacher-D","Free 3rd · 1 sub today","Best fit · Hindi, knows 1 B",True),
             ("TC","Teacher-C","Free 3rd · 0 subs today","",False),
             ("TH","Teacher-H","Free 3rd · 1 sub today","",False),
             ("TJ","Teacher-J","Free 3rd · 0 subs today","",False)]
    rows = "".join(f'<div class="cand{" on" if on else ""}"><div class="av">{a}</div><div class="who"><b>{n}</b><small>{s}</small></div>{f"<span class=fit>{f}</span>" if f else ""}</div>' for a,n,s,f,on in cands)
    sheet = (f'<div class="sheet" id="sh"><div class="grab"></div><div class="sh-h"><h2>Assign substitute</h2><span class="label">1 of 10 need sub</span></div>'
             f'<div class="ctx"><b>3rd · 10:05 · EVS 1 B</b> — Teacher-B is absent</div>{rows}'
             '<div class="row-btns"><span class="btn quiet">Skip for now</span><span class="btn pri">Assign Teacher-D</span></div></div>')
    body = (f'<div class="app">{header()}<div class="ttl"><h1>Routine</h1><p>Monday 2 November · tap a Need-sub cell to assign</p></div>'
            f'<div class="main">{table(SEL, 4)}<p class="hint">Scroll periods → name column folds after you let go. Tap the strip to peek.</p></div>'
            f'{sheet}{foot("Routine")}</div>')
    js = '<script src="../_shared/namecol.js"></script><script>const sh=document.getElementById("sh");sh.querySelector(".grab").onclick=()=>sh.classList.toggle("down");const dk=()=>document.querySelector(".app").style.setProperty("--dock",(document.querySelector(".tabs").offsetHeight+document.querySelector(".stamp").offsetHeight)+"px");dk();addEventListener("resize",dk);if(new URLSearchParams(location.search).has("nosheet"))sh.classList.add("gone");</script>'
    return head("M04 Assign Substitute phone", 390) + PHONE_CSS + "</head><body>" + body + js + "</body></html>"
def m05():
    need = [(t, i) for t in T if t[3] in "AW" for i,v in enumerate(t[4]) if v not in ("-","Free") and (t[0],i) not in COVER]
    need.sort(key=lambda x: x[1])
    groups, html = {}, ""
    for t,i in need: groups.setdefault(i, []).append(t)
    for i, ts in groups.items():
        html += f'<div class="grp"><div class="label">{PER[i]} · {TIMES[i]} <em>{len(ts)}</em></div>'
        for t in ts:
            s, c = t[4][i].split(" ",1)
            why = "Absent" if t[3]=="A" else "Away · duty"
            html += f'<div class="unc"><div><b>{s} · {c}</b><small>{t[0]} · <span class="{t[3]}">{why}</span></small></div><span class="btn quiet sm">Assign ›</span></div>'
        html += "</div>"
    css = """<style>.kp{display:flex;gap:8px;padding:0 16px 12px}.kp div{flex:1;padding:10px;border-radius:10px;background:var(--lucid-color-fill-1);border:1px solid var(--lucid-color-border)}
.kp b{display:block;font-size:24px;font-weight:200;color:var(--lucid-color-text-display)}.kp .need b{color:var(--lfps-need)}.kp .cov b{color:var(--lucid-color-accent)}
.grp{padding:6px 16px 10px}.grp .label em{font-style:normal;color:var(--lucid-color-warning-text);margin-left:6px}
.unc{display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 12px;margin-top:8px;border-radius:12px;background:var(--lfps-need-fill);box-shadow:inset 0 0 0 1px var(--lfps-need-ring)}
.unc div{flex:1}.unc b{display:block;font-size:14px;font-weight:500;color:var(--lucid-color-text-display)}.unc small{font-size:11.5px;color:var(--lucid-color-text-muted)}
.unc .A{color:var(--lfps-absent)}.unc .W{color:var(--lfps-away)}.btn.sm{height:40px;padding:0 14px;font-size:13px;color:var(--lucid-color-warning-text);border-color:var(--lfps-need-ring)}
.tools{display:flex;gap:8px;padding:0 16px 12px;align-items:center}</style>"""
    body = (f'<div class="app">{header()}<div class="ttl"><h1>Uncovered</h1><p>Monday 2 November · {len(need)} periods need a substitute</p></div>'
            f'<div class="kp"><div class="need"><span class="label">Need sub</span><b>{len(need)}</b></div><div class="cov"><span class="label">Covered</span><b>{len(COVER)}</b></div><div><span class="label">Free now</span><b>6</b></div></div>'
            f'<div class="tools"><span class="chip on">By period</span><span class="chip">By teacher</span><span class="sp" style="flex:1"></span><span class="btn quiet" style="height:40px;font-size:13px">Auto-suggest all</span></div>'
            f'<div class="main">{html}</div>{foot("Subs")}</div>')
    return head("M05 Uncovered phone", 390) + PHONE_CSS + css + "</head><body>" + body + "</body></html>"
def write():
    (ROOT/"M04"/"index.html").write_text(m04()); (ROOT/"M05"/"index.html").write_text(m05())
if __name__ == "__main__":
    write(); print("wrote M04, M05")
