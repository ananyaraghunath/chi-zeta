// Shared behaviour for every page.
//
// Reveal-on-scroll, the Brothers/E-Board tab switch, and the careers placement
// dock. Each part no-ops when its markup is absent, so one file serves all six
// pages.
(function () {
  var io = null;

  function observe() {
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('.rv:not(.in), .tl-item:not(.in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { return; }
      if (r.top < window.innerHeight * 0.92) { el.classList.add('in'); } else { io.observe(el); }
    });
  }

  document.addEventListener('click', function (ev) {
    var tab = ev.target.closest('[data-tab]');
    if (!tab) return;
    ev.preventDefault();
    var id = tab.getAttribute('data-tab');
    var grp = tab.closest('.tabs');
    var ids = [];
    (grp || document).querySelectorAll('[data-tab]').forEach(function (b) {
      b.classList.toggle('is-on', b === tab); ids.push(b.getAttribute('data-tab'));
    });
    ids.forEach(function (pid) { var p = document.getElementById(pid); if (p) p.hidden = (pid !== id); });
    var title = document.getElementById('bro-title');
    if (title) title.textContent = (id === 'tab-eboard') ? 'E-Board' : 'Brothers';
    document.querySelectorAll('#' + id + ' .rv').forEach(function (el) { el.classList.remove('in'); });
    observe();
  });

  // Placement dock: every tile's scale and opacity is a function of its
  // distance from the cursor, so the neighbours swell with the one under it.
  // Positions are read from the layout box once, never from the transformed
  // rect, otherwise each frame measures the previous frame's scaling.
  (function(){
    var dock = document.getElementById('dock');
    if (!dock) return;
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var chips = [].slice.call(dock.querySelectorAll('.chip'));
    var pos = [], R = 258, raf = null, mx = 0, my = 0, active = false;

    function measure(){
      pos = chips.map(function(c){
        return { el: c, ox: c.offsetLeft + c.offsetWidth / 2, oy: c.offsetTop + c.offsetHeight / 2 };
      });
    }
    function paint(){
      raf = null;
      var r = dock.getBoundingClientRect();
      for (var i = 0; i < pos.length; i++) {
        var p = pos[i];
        var dx = mx - (r.left + p.ox), dy = my - (r.top + p.oy);
        var t = 1 - Math.sqrt(dx * dx + dy * dy) / R;
        t = t < 0 ? 0 : t * t;
        p.el.style.transform = 'scale(' + (1 + 0.72 * t).toFixed(3) + ')';
        p.el.style.opacity = (0.85 + 0.15 * t).toFixed(3);
        p.el.style.zIndex = t > 0.02 ? String(2 + Math.round(t * 40)) : '';
        p.el.style.boxShadow = t > 0.05
          ? '0 ' + (5 + 16 * t).toFixed(0) + 'px ' + (12 + 26 * t).toFixed(0) + 'px rgba(20,22,26,' + (0.10 + 0.16 * t).toFixed(3) + ')'
          : 'none';
      }
    }
    function reset(){
      for (var i = 0; i < chips.length; i++) {
        chips[i].style.transform = ''; chips[i].style.opacity = '';
        chips[i].style.zIndex = ''; chips[i].style.boxShadow = '';
      }
    }
    dock.addEventListener('pointerenter', function(){ active = true; measure(); });
    dock.addEventListener('pointermove', function(ev){
      if (!active) { active = true; measure(); }
      mx = ev.clientX; my = ev.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    });
    dock.addEventListener('pointerleave', function(){ active = false; reset(); });
    window.addEventListener('resize', function(){ if (active) measure(); });
  })();


  // the roster is built after load, so expose a re-scan for it
  window.revealScan = observe;

  observe();
})();
