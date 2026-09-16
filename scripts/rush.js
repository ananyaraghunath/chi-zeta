// The rush scroll sequence: photographic flight layers over a WebGL
// shoreline, driven entirely by scroll position. Loaded only by /rush.
(function () {
  // ---- rush scene: scroll position drives the whole sequence ----
  // Photographic flight layers over a WebGL shoreline. The sticky stage is
  // 100vh inside a tall wrapper, so scroll through the wrapper is progress.
  var rushWrapEl = document.getElementById('rushWrap');
  var rushViewEl = document.getElementById('view-rush');
  var hintEl = document.getElementById('scrollHint');
  var subEl = document.querySelector('.shellSub');
  var ctaEl = document.querySelector('.shellCta');
  function progress() {
    if (!rushWrapEl) return 0;
    var r = rushWrapEl.getBoundingClientRect();
    var span = rushWrapEl.offsetHeight - window.innerHeight;
    return span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
  }

/* ======================= FLIGHT LAYER (part of one scroll) ======================= */
var Flight = (function () {
  var sky = document.getElementById("lSky"),
      cFar = document.getElementById("lCloudFar"),
      cNear = document.getElementById("lCloudNear"),
      wrap = document.getElementById("planeWrap"),
      scene = document.getElementById("sceneAir");

  // A layer translated by X% of the stage shows its own edge unless the scale
  // gives at least X% of overhang on that side: overhang = (scale-1)/2. The
  // previous scales were under that, which is why the right edge appeared.
  function draw(p) {
    var q = Math.min(1, p / 0.46);                       // progress within the flight
    sky.style.transform   = "scale(1.14) translateX(" + (-2.5 * q).toFixed(2) + "%)";
    cFar.style.transform  = "scale(1.30) translate(" + (-8.6 * q).toFixed(2) + "%, 6%)";
    cNear.style.transform = "scale(2.10) translate(" + (-22 * q).toFixed(2) + "%, 26%)";

    var x = -32 + q * 138, y = 46 - q * 13, sc = 1.16 - q * 0.30, rot = -1.6 + q * 4.2;
    wrap.style.transform = "translate(" + x.toFixed(2) + "vw," + y.toFixed(2) + "%) rotate("
      + rot.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";

    // the camera drops through the deck and the sky gives way to the water
    var out = Math.max(0, Math.min(1, (p - 0.38) / 0.14));
    scene.style.opacity = String(1 - out);
    scene.style.transform = "scale(" + (1 + 0.16 * out).toFixed(3) + ")";
  }
  return { draw: draw };
})();


(function () {
  var canvas = document.getElementById("gl");
  var scrub = document.getElementById("scrub"), val = document.getElementById("scrubVal");
  var sceneSea = document.getElementById("sceneSea");
  var aerial = document.getElementById("aerialWrap");

  function fit() {
    var w = canvas.clientWidth || 900;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.25) * 0.72;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * 7 / 16 * dpr);
  }
  fit();

  var gl = canvas.getContext("webgl2"), ver = "WebGL 2";
  if (!gl) { gl = canvas.getContext("webgl"); ver = "WebGL 1"; }
  if (!gl) { return; }

  var VERT = "attribute vec2 p; varying vec2 vUv; void main(){ vUv=p*0.5+0.5; gl_Position=vec4(p,0.0,1.0); }";

  var FRAG = [
    "precision highp float;",
    "varying vec2 vUv; uniform float uT, uTime, uAspect;",
    "float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }",
    "float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y); }",
    "float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.07; a*=0.5; } return v; }",
    "float turb(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*abs(noise(p)*2.0-1.0); p*=2.11; a*=0.5; } return v; }",

    "void main(){",
    "  vec2 P = vec2(vUv.x*uAspect, vUv.y);",
    // Sea is at the TOP of the frame, beach at the bottom. The sheet ADVANCES by
    // the waterline moving DOWN, and drains by it moving back up. The previous
    // version had this inverted, which is why nothing ever looked like retreat.
    "  float up   = 1.0 - pow(1.0 - clamp(uT/0.50,0.0,1.0), 5.0);",
    "  float back = pow(clamp((uT-0.50)/0.50,0.0,1.0), 2.4);",
    "  float REST = 0.74;",
    "  float wob = 0.021*sin(P.x*4.6 + uTime*0.35)",
    "            + 0.030*(fbm(vec2(P.x*2.0, uTime*0.14))-0.5)",
    "            + 0.013*(fbm(vec2(P.x*6.0, uTime*0.20))-0.5);",
    "  float line  = REST - 0.48*up + 0.44*back + wob;",
    "  float lowest = REST - 0.48*up + wob;",   // furthest the water reached
    "  float d = vUv.y - line;",                 // >0 = seaward

    // waves travelling shoreward, breaking as they shoal
    "  float ph = (d + uTime*0.085)/0.150;",
    "  float cyc = fract(ph);",
    "  float crest = exp(-pow((cyc-0.52)/0.20,2.0));",
    "  float brk = smoothstep(0.0,0.055,d)*smoothstep(0.58,0.10,d);",

    // ---- sand ----
    "  float grain = fbm(P*vec2(210.0,150.0));",
    "  float rip = fbm(P*vec2(24.0,42.0));",
    "  vec3 dry = vec3(0.880,0.760,0.520);",
    "  vec3 wetS = vec3(0.505,0.385,0.215);",
    // everything between the furthest reach and the current line is soaked
    "  float damp = smoothstep(0.0,0.055, line - vUv.y) * (1.0 - smoothstep(0.0,0.20, lowest - vUv.y));",
    "  damp = max(damp, smoothstep(0.0,0.10, line-vUv.y)*(1.0-smoothstep(0.0,0.06,lowest-vUv.y)));",
    "  vec3 sand = mix(dry, wetS, clamp(damp,0.0,1.0)*0.80);",
    "  sand *= 0.945 + 0.11*grain;",
    "  sand *= 0.975 + 0.05*rip;",

    // ---- water ----
    "  float depth = clamp(d/0.30,0.0,1.0);",
    "  vec3 water = mix(vec3(0.40,0.79,0.76), vec3(0.055,0.455,0.560), smoothstep(0.0,0.34,depth));",
    "  water = mix(water, vec3(0.020,0.190,0.335), smoothstep(0.34,1.0,depth));",
    "  vec2 warp = vec2(fbm(P*1.7+vec2(0.0,uTime*0.03)), fbm(P*1.7+vec2(4.7,2.1)));",
    "  water *= 0.82 + 0.38*fbm(P*2.1 + warp*1.2 + vec2(0.0,uTime*0.022));",
    "  water = mix(water, vec3(0.24,0.64,0.62), smoothstep(0.45,0.92,fbm(P*3.0+warp))*0.32*(1.0-depth));",
    "  float swell = 0.5+0.5*cos((cyc-0.52)*6.28318);",
    "  water *= 0.90 + 0.19*swell*smoothstep(0.05,0.55,depth);",
    "  float clar = 1.0 - smoothstep(0.0,0.26,d);",
    "  water = mix(water, mix(water, sand*0.86, 0.78), clar*clar);",

    // ---- foam ----
    "  vec2 fq = vec2(P.x*5.5, P.y*13.0) + vec2(uTime*0.02, -uTime*0.55);",
    "  vec2 fw = vec2(fbm(fq*vec2(0.55,0.10)), fbm(fq*vec2(0.55,0.10)+vec2(3.3,1.7)));",
    "  float f = turb(fq + vec2(fw.x*2.2, fw.y*0.40));",
    "  float lacy = smoothstep(0.14,0.50,f);",
    "  float s0 = exp(-pow((d-0.006)/0.044,2.0));",
    "  float rollers = crest*brk*(0.30+0.85*lacy);",
    "  float foam = clamp(s0*(0.80+0.55*lacy) + rollers*1.30, 0.0, 1.0);",

    // ---- the draining film: the thing the reference has and we did not ----
    // Behind the retreating edge the water is a thin sheet with the wet sand
    // showing through, torn into lace and arcs rather than a solid front.
    "  float bel = line - vUv.y;",                       // distance onto the sand
    "  float filmBody = smoothstep(0.0,0.010,bel) * (1.0 - smoothstep(0.010,0.115,bel));",
    "  float film = filmBody * (0.30 + 0.70*back);",
    "  float sheen = film * (0.55 + 0.45*fbm(P*vec2(18.0,30.0) - vec2(0.0,uTime*0.25)));",
    // a thin water film over sand: sand still reads through it
    "  vec3 filmCol = mix(sand, mix(sand*0.90, vec3(0.34,0.68,0.68), 0.34), 0.70);",
    // torn lace at the trailing edge, strongest where the film is thinnest
    "  float tear = turb(vec2(P.x*9.0, P.y*20.0) - vec2(0.0, uTime*0.34));",
    "  float lace = film * smoothstep(0.46,0.68,tear) * (0.55+0.65*back);",
    "  float rim = exp(-pow(bel/0.010,2.0)) * (0.45+0.75*back) * smoothstep(0.18,0.56,tear);",

    "  vec3 col = d > 0.0 ? water : sand;",
    "  col = mix(col, filmCol, clamp(film*0.62,0.0,1.0));",
    "  col += vec3(0.06,0.08,0.08)*sheen;",
    "  col = mix(col, vec3(0.975,0.995,1.0), clamp(foam*0.96 + lace*0.75 + rim*0.85, 0.0, 1.0));",
    "  gl_FragColor = vec4(col,1.0);",
    "}"
  ].join("\n");

  function sh(t, src) {
    var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = null, uT = null, uTime = null, uAspect = null, glReady = false;
  function initGL() {
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      var lo = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(lo);
      gl.vertexAttribPointer(lo, 2, gl.FLOAT, false, 0, 0);
      uT = gl.getUniformLocation(prog, "uT");
      uTime = gl.getUniformLocation(prog, "uTime");
      uAspect = gl.getUniformLocation(prog, "uAspect");
      glReady = true;
    } catch (e) { glReady = false; }
  }
  initGL();
  // A dropped context leaves a transparent canvas; recover rather than strand
  // the shell overlay on nothing.
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault(); glReady = false;
    if (sceneSea) sceneSea.style.visibility = "hidden";
  }, false);
  canvas.addEventListener("webglcontextrestored", function () {
    initGL(); fit();
    if (sceneSea) sceneSea.style.visibility = "";
  }, false);

  /* ---- shells: RUSH AKPSI, stroked letterforms sampled into shell positions ---- */
  var LETTERS = {
    R: [[0,0,0,6],[0,6,2.7,6],[2.7,6,2.7,3.6],[2.7,3.6,0,3.6],[1.3,3.6,3.0,0]],
    U: [[0,6,0,1.4],[0,1.4,.8,.15],[.8,.15,1.9,.15],[1.9,.15,2.7,1.4],[2.7,1.4,2.7,6]],
    S: [[2.7,5.5,.5,6],[.5,6,0,4.6],[0,4.6,1.5,3.4],[1.5,3.4,2.7,2.3],[2.7,2.3,2.2,.3],[2.2,.3,0,.6]],
    H: [[0,0,0,6],[2.7,0,2.7,6],[0,3.1,2.7,3.1]],
    A: [[0,0,1.45,6],[1.45,6,2.9,0],[.62,2.4,2.28,2.4]],
    K: [[0,0,0,6],[0,3.1,2.7,6],[0,3.1,2.7,0]],
    P: [[0,0,0,6],[0,6,2.7,6],[2.7,6,2.7,3.4],[2.7,3.4,0,3.4]],
    I: [[1.2,0,1.2,6]]
  };
  function shellPoints(word, step) {
    var pts = [], cursor = 0;
    for (var i = 0; i < word.length; i++) {
      var ch = word[i];
      if (ch === " ") { cursor += 2.0; continue; }
      var segs = LETTERS[ch] || [];
      for (var j = 0; j < segs.length; j++) {
        var s2 = segs[j], dx = s2[2]-s2[0], dy = s2[3]-s2[1];
        var len = Math.sqrt(dx*dx + dy*dy), n = Math.max(1, Math.round(len/step));
        for (var k = 0; k <= n; k++) {
          var t = k/n;
          pts.push([cursor + s2[0] + dx*t, s2[1] + dy*t]);
        }
      }
      cursor += 3.9;
    }
    // drop near-duplicates so joints do not stack shells on top of each other
    var out = [];
    for (var a = 0; a < pts.length; a++) {
      var keep = true;
      for (var c = 0; c < out.length; c++) {
        if (Math.abs(out[c][0]-pts[a][0]) < 0.42 && Math.abs(out[c][1]-pts[a][1]) < 0.42) { keep = false; break; }
      }
      if (keep) out.push(pts[a]);
    }
    return out;
  }

  var rnd = (function (s) { return function () { return (s = (s*1664525+1013904223) >>> 0)/4294967296; }; })(7);
  var pts = shellPoints("RUSH AKPSI", 0.60);
  var maxX = 0; pts.forEach(function (p) { if (p[0] > maxX) maxX = p[0]; });
  var VB_W = 1600, VB_H = 700;
  var scale = (VB_W * 0.69) / maxX;
  var offX = (VB_W - maxX*scale)/2, offY = VB_H*0.70;

  var shellSvg = ['<svg viewBox="0 0 1600 700" preserveAspectRatio="none" style="width:100%;height:100%">',
    '<defs>',
      '<radialGradient id="shg" cx=".38" cy=".22" r=".85">',
        '<stop offset="0" stop-color="#fffdf7"/><stop offset=".55" stop-color="#f6e6cd"/>',
        '<stop offset="1" stop-color="#d9bd94"/></radialGradient>',
      '<linearGradient id="shr" x1="0" y1="0" x2="0" y2="1">',
        '<stop offset="0" stop-color="#c8a678" stop-opacity=".0"/>',
        '<stop offset="1" stop-color="#9a7444" stop-opacity=".55"/></linearGradient>',
    '</defs>', '<g id="shells">'];
  pts.forEach(function (p) {
    var x = offX + p[0]*scale, y = offY - p[1]*scale*0.98;
    var rot = (rnd()*40 - 20).toFixed(1), sc = (0.85 + rnd()*0.4).toFixed(3);
    shellSvg.push(
      '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + rot + ') scale(' + sc + ')">' +
        '<ellipse cx="1.5" cy="9" rx="12" ry="4" fill="#8a6a3e" opacity=".26"/>' +
        '<path d="M0,-11 C7.6,-11 13,-4.4 13,3.2 C13,6.2 11.4,7.6 8.4,7.6 L-8.4,7.6 C-11.4,7.6 -13,6.2 -13,3.2 C-13,-4.4 -7.6,-11 0,-11 Z" fill="url(#shg)"/>' +
        '<path d="M0,-11 C7.6,-11 13,-4.4 13,3.2 C13,6.2 11.4,7.6 8.4,7.6 L-8.4,7.6 C-11.4,7.6 -13,6.2 -13,3.2 C-13,-4.4 -7.6,-11 0,-11 Z" fill="url(#shr)"/>' +
        '<g stroke="#b08d5e" stroke-width="1.05" fill="none" stroke-linecap="round" opacity=".75">' +
          '<path d="M0,-9.4 L0,7"/><path d="M-4.4,-8.6 L-6.2,6.8"/><path d="M4.4,-8.6 L6.2,6.8"/>' +
          '<path d="M-8.2,-6.2 L-11,5.6"/><path d="M8.2,-6.2 L11,5.6"/>' +
        '</g>' +
        '<path d="M-3.2,-9.6 C-1.4,-10.6 1.4,-10.6 3.2,-9.6" stroke="#fffdf6" stroke-width="1.5" fill="none" opacity=".85"/>' +
      '</g>');
  });
  shellSvg.push('</g></svg>');
  document.getElementById("shellLayer").innerHTML = shellSvg.join("");
  var shellG = document.getElementById("shells");
  if (shellG) shellG.setAttribute("opacity", "1");

  var t0 = performance.now(), raf = null;
  var lastFrame = 0, lastMask = "", MIN_MS = 22;   // ~45fps is plenty for water
  function draw(now) {
    raf = requestAnimationFrame(draw);
    if (rushViewEl && rushViewEl.hidden) return;
    if (now - lastFrame < MIN_MS) return;
    lastFrame = now;

    var P0 = progress();
    // the flight layers are gone past 0.55; stop transforming them
    if (P0 < 0.56) Flight.draw(P0);
    var h = document.getElementById('scrollHint');
    var sb = document.querySelector('.shellSub');
    var ct = document.querySelector('.shellCta');
    if (h) h.style.opacity = String(Math.max(0, 1 - P0 / 0.08) * 0.85);
    if (sb) sb.style.opacity = String(Math.max(0, Math.min(1, (P0 - 0.88) / 0.06)));
    if (ct) ct.style.opacity = String(Math.max(0, Math.min(1, (P0 - 0.91) / 0.06)));
    var seaOp = Math.max(0, Math.min(1, (P0 - 0.40) / 0.14));
    sceneSea.style.opacity = String(seaOp);
    // nothing of the shoreline is on screen yet: skip the shader entirely
    if (seaOp <= 0.002 || !glReady) return;

    var p = Math.max(0, Math.min(1, (P0 - 0.45) / 0.55));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uT, p);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform1f(uAspect, canvas.width / Math.max(1, canvas.height));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // shells sit on the sand: hidden under the sheet, uncovered as it drains
    if (aerial) {
      // the aircraft crosses overhead before the surf takes over
      var ax = Math.max(0, Math.min(1, (P0 - 0.46) / 0.26));
      aerial.style.transform = "translate(" + (-20 + ax * 132).toFixed(2) + "vw,"
        + (16 + ax * 9).toFixed(2) + "vh) rotate(" + (-3 + ax * 6).toFixed(2) + "deg)";
      aerial.style.opacity = String(Math.min(1, ax / 0.12) * (1 - Math.max(0, (ax - 0.86) / 0.14)));
    }
    var up = 1 - Math.pow(1 - Math.min(p/0.50, 1), 5);
    var back = Math.pow(Math.max(0, (p-0.50)/0.50), 2.4);
    var line   = 0.74 - 0.48*up + 0.44*back;
    var lowest = 0.74 - 0.48*up;                      // furthest the water got
    // A shell is only there if the water covered that sand and has since gone
    // back past it. Above the current line it is still under water; below the
    // furthest reach the water never arrived, so nothing was ever left there.
    var top = (1 - line) * 100, bot = (1 - lowest) * 100;
    var m = (top >= bot - 0.4)
      ? "linear-gradient(to bottom, transparent 0%, transparent 100%)"
      : "linear-gradient(to bottom, transparent " + Math.max(0, top - 1.5).toFixed(2) + "%, "
        + "#000 " + Math.min(100, top + 3.5).toFixed(2) + "%, "
        + "#000 " + Math.min(100, bot - 0.5).toFixed(2) + "%, "
        + "transparent " + Math.min(100, bot + 1.5).toFixed(2) + "%)";
    if (m !== lastMask) {
      lastMask = m;
      var host = shellG.parentNode;
      host.style.webkitMaskImage = m; host.style.maskImage = m;
      host.style.webkitMaskSize = "100% 100%"; host.style.maskSize = "100% 100%";
    }
  }
  window.addEventListener("resize", fit);
  requestAnimationFrame(draw);

  window.__rushDraw = function () { draw(performance.now()); };
})();

  // the rush film carries its own source now that the hero is a photograph

})();
