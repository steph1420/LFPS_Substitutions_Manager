/* Bundle 44 — overlay name column behaviour (mockup reference, PROPOSED).
   Rules (Steve t15u–t17u):
   - Shrinks/expands ONLY after the finger is released AND scroll momentum has fully settled.
   - Expanded only when settled at the exact full-left edge (scrollLeft <= 0.5).
     Passing the start mid-drag never expands; a few px away after settle => shrink.
   - Tap on the strip = temporary peek (overlay, no reflow); closes on tap elsewhere or scroll start.
   - No swipe gesture. Reduce-motion => fade only (no spring width animation). */
(function(){
  const SETTLE_MS = 80;                // no scroll events for this long => momentum settled
  document.querySelectorAll('.tbl').forEach(tbl => {
    const xs = tbl.querySelector('.xs'), nc = tbl.querySelector('.nc');
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    if (rm.matches || new URLSearchParams(location.search).has('rm')) tbl.classList.add('rm');
    let touching = false, timer = 0, lastX = xs.scrollLeft;
    // one consistent font size: fit the LONGEST name into the row height
    const fit = () => {
      const spans = [...nc.querySelectorAll('.strip span')];
      const avail = parseFloat(getComputedStyle(tbl).getPropertyValue('--nc-row')) - 10;
      tbl.style.setProperty('--nc-strip-fs', '12px');
      const longest = Math.max(...spans.map(s => s.getBoundingClientRect().height));
      const fs = Math.max(8, Math.min(12, 12 * avail / longest));
      tbl.style.setProperty('--nc-strip-fs', fs.toFixed(2) + 'px');
    };
    fit();
    const settle = () => {
      timer = 0;
      if (touching) return;                       // wait for release
      nc.classList.remove('peek');
      nc.classList.toggle('shrunk', xs.scrollLeft > 0.5);
    };
    const arm = () => { clearTimeout(timer); timer = setTimeout(settle, SETTLE_MS); };
    xs.addEventListener('scroll', () => {
      if (Math.abs(xs.scrollLeft - lastX) > 0) nc.classList.remove('peek'); // scroll start closes peek
      lastX = xs.scrollLeft; arm();
    }, {passive:true});
    xs.addEventListener('scrollend', () => { if (!touching) { clearTimeout(timer); settle(); } });
    const down = () => { touching = true; clearTimeout(timer); };
    const up = () => { touching = false; arm(); };    // momentum may continue; settle waits for it
    xs.addEventListener('touchstart', down, {passive:true});
    xs.addEventListener('touchend', up); xs.addEventListener('touchcancel', up);
    xs.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') down(); });
    addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && touching) up(); });
    // tap on strip = peek
    nc.addEventListener('click', e => {
      if (!nc.classList.contains('shrunk')) return;
      nc.classList.toggle('peek'); e.stopPropagation();
    });
    document.addEventListener('pointerdown', e => { if (!nc.contains(e.target)) nc.classList.remove('peek'); });
    // mockup hook for still renders: ?state=shrunk|peek
    const st = new URLSearchParams(location.search).get('state');
    if (st) { xs.scrollLeft = 260; lastX = 260; nc.classList.add('shrunk'); if (st === 'peek') nc.classList.add('peek'); }
  });
})();
