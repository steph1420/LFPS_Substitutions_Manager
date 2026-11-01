"""Builds Bundle 43 mockups (M01-M03) from placeholder data and renders PNG @2x.
Codename / placeholder data only. Run: python build.py (needs playwright + chromium)."""
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
PER = ["G/PD","1st","BREAK","2nd","3rd","4th","5th","6th"]
TIMES = ["8:00","8:15","9:00","9:20","10:05","10:50","11:35","12:20"]
# (name, abbr, role, state, cells)  state: P present, A absent, W away
T = [
 ("Teacher-A","TA","Class Teacher · KG A","P",["ASSEMBLY KG A","ENG KG A","-","MATH KG A","Free","EVS KG A","ART KG A","Free"]),
 ("Teacher-B","TB","Class Teacher · 1 B","A",["ASSEMBLY 1 B","MATH 1 B","-","ENG 1 B","EVS 1 B","Free","HINDI 1 B","PE 1 B"]),
 ("Teacher-C","TC","Subject · Science","P",["Free","SCI 5 A","-","SCI 6 B","Free","SCI 4 A","Free","SCI 7 A"]),
 ("Teacher-D","TD","Subject · Hindi","P",["Free","HINDI 3 A","-","Free","HINDI 2 B","HINDI 4 A","Free","Free"]),
 ("Teacher-E","TE","Class Teacher · 2 A","W",["ASSEMBLY 2 A","Free","-","ENG 2 A","MATH 2 A","EVS 2 A","Free","Free"]),
 ("Teacher-F","TF","Subject · Maths","P",["Free","MATH 6 A","-","MATH 5 B","MATH 7 A","Free","MATH 4 B","Free"]),
 ("Teacher-G","TG","Subject · Computer","P",["Free","Free","-","COMP 5 A","COMP 6 A","Free","COMP 3 B","COMP 7 B"]),
 ("Teacher-H","TH","Class Teacher · 3 B","P",["ASSEMBLY 3 B","EVS 3 B","-","Free","ENG 3 B","MATH 3 B","Free","Free"]),
 ("Teacher-I","TI","Subject · Art","A",["Free","ART 2 A","-","Free","ART 4 B","Free","ART 1 A","Free"]),
 ("Teacher-J","TJ","Subject · PE","P",["Free","PE 5 A","-","PE 6 A","Free","PE 3 A","Free","PE 4 A"]),
 ("Teacher-K","TK","Class Teacher · KG B","P",["ASSEMBLY KG B","ENG KG B","-","Free","MATH KG B","Free","EVS KG B","Free"]),
 ("Teacher-L","TL","Subject · English","P",["Free","ENG 6 A","-","ENG 7 B","Free","ENG 5 A","Free","Free"]),
]
COVER = {("Teacher-B",1):"ST-1 · Teacher-D", ("Teacher-B",3):"Teacher-H", ("Teacher-E",3):"Teacher-K"}  # covered slots
def cell(t, i, dim=False, phone=False):
    name, st, v = t[0], t[3], t[4][i]
    off = " off" if dim else ""
    if v == "-": return '<div class="cell brk"><span class="s">—</span></div>'
    if v == "Free": return f'<div class="cell free{off}"><span class="s">Free</span></div>'
    s, c = v.split(" ",1)
    if st in "AW":
        if (name,i) in COVER:
            sub = COVER[(name,i)].split(" · ")[-1]
            if phone: sub = "T" + sub[-1]
            return f'<div class="cell cov"><span class="s">{s}</span><span class="c">{c} <span class="tag">↳ {sub}</span></span></div>'
        act = "" if phone else '<span class="act">Assign ›</span>'
        return f'<div class="cell need"><span class="s">{s}</span><span class="c">{c} <span class="tag">{"Need sub" if phone else "· Need sub"}</span>{act}</span></div>'
    return f'<div class="cell{off}"><span class="s">{s}</span><span class="c">{c}</span></div>'
ICON = {
 "bell":'<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
 "gear":'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
 "user":'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
 "grid":'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
 "swap":'<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
 "people":'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.5 4.8 4"/></svg>',
 "search":'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>',
}
def head(title, w):
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="../_shared/tokens.css"><link rel="stylesheet" href="../_shared/lfps.css"><style>body{{width:{w}px}}</style>'
DAYS = [("MON","2"),("TUE","3"),("WED","4"),("THU","5"),("FRI","6"),("SAT","7")]
def days(on="MON"):
    return '<div class="days">'+"".join(f'<div class="day{" on" if d==on else ""}">{d}<small>{n}</small></div>' for d,n in DAYS)+'</div>'
def tabs(on):
    items=[("grid","Routine"),("swap","Subs"),("people","Roster")]
    return '<nav class="tabs">'+"".join(f'<div class="tab{" on" if l==on else ""}">{ICON[i]}{l}</div>' for i,l in items)+'</nav>'
def render():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        for m,(w,h) in {"M01":(390,844),"M02":(1440,900),"M03":(390,844)}.items():
            pg = b.new_page(viewport={"width":w,"height":h}, device_scale_factor=2)
            for src,out in ([("index.html",f"{m}.png")]+([("sheet.html","M03-sheet.png")] if m=="M03" else [])):
                pg.goto((ROOT/m/src).as_uri()); pg.wait_for_timeout(300)
                pg.screenshot(path=str(ROOT/m/out)); print("rendered", m, out, flush=True)
        b.close()
if __name__ == "__main__":
    sys.path.insert(0, str(ROOT/"_shared"))
    import frames; frames.write(ROOT)
    render()
