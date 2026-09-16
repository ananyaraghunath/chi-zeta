// Builds the roster from scripts/brotherdata.json.
//
// Adding a class means adding it to that file and dropping the photographs into
// assets/headshots -- no build step, no tooling. A brother with no headshot
// renders as initials, and a brother with no LinkedIn renders unlinked rather
// than as a link that goes nowhere.

var LI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>';

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
             .map(function (w) { return w[0]; }).join("").toUpperCase();
}

function displayBrotherData(dictionary) {
  var container = document.getElementById("headshots");
  if (!container) return;
  var html = "";
  var first = true;

  for (var semester in dictionary) {
    var cls = semester.trim();
    var tag = first ? ' <span class="tag">Newest class</span>' : "";
    first = false;
    html += '<section class="panel rv">' +
            '<h2 class="anton cls">' + esc(cls) + tag + "</h2>" +
            '<div class="roster">';

    for (var raw in dictionary[semester]) {
      var b = dictionary[semester][raw];
      // a trailing asterisk in the data marks an alumnus. It is rendered as
      // its own element so it can be styled and announced, rather than left
      // as a stray character hanging off the end of a name.
      var alum = /\*/.test(raw);
      var nm = raw.replace(/\*/g, "").trim();
      var mark = alum ? '<span class="alum" title="Alumni">*</span>' : "";
      var name = nm;
      var media = b.headshot
        ? '<img src="' + esc(b.headshot) + '" alt="' + esc(name) + '" loading="lazy" decoding="async">'
        : '<span class="mono">' + esc(initials(name)) + "</span>";

      if (b.linkedin) {
        html += '<a class="bro" href="//' + esc(b.linkedin) + '" target="_blank" rel="noopener">' +
                '<span class="frame">' + media + '<span class="hov">' + LI_ICON + "</span></span>" +
                '<span class="nm">' + esc(name) + mark + "</span></a>";
      } else {
        html += '<span class="bro"><span class="frame">' + media + "</span>" +
                '<span class="nm">' + esc(name) + mark + "</span></span>";
      }
    }
    html += "</div></section>";
  }

  container.innerHTML = html;
  // the shared reveal observer runs on load, before this markup exists
  if (typeof window.revealScan === "function") window.revealScan();
}

document.addEventListener("DOMContentLoaded", function () {
  fetch("/scripts/brotherdata.json")
    .then(function (r) { return r.json(); })
    .then(displayBrotherData)
    .catch(function (e) { console.error("Error loading brother data:", e); });
});
