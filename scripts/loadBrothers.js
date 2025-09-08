---
---

// loadbrother.js

// Runs after the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  fetch("/scripts/brotherdata.json")
    .then(response => response.json())
    .then(brothers => displayBrotherData(brothers))
    .catch(err => console.error("Error loading brother data:", err));
});

function displayBrotherData(dictionary) {
  const container = document.getElementById("headshots");
  container.innerHTML = "";

  for (const semester in dictionary) {
    const section = document.createElement("div");
    section.className = "container";

    const title = document.createElement("h2");
    title.textContent = semester;

    const grid = document.createElement("div");
    grid.className = "grid";

    for (const name in dictionary[semester]) {
      const brother = dictionary[semester][name];
      const card = document.createElement("div");

      const img = document.createElement("img");
      img.src = brother.headshot;
      img.alt = name;
      img.loading = "lazy";

      if (brother.data) {
        img.dataset.collective = brother.data;
        card.appendChild(img);
      } else {
        const link = document.createElement("a");
        link.href = `//${brother.linkedin}`;
        link.appendChild(img);
        card.appendChild(link);
      }

      const caption = document.createElement("p");
      caption.textContent = name;
      card.appendChild(caption);

      grid.appendChild(card);
    }

    section.appendChild(title);
    section.appendChild(document.createElement("hr"));
    section.appendChild(grid);
    container.appendChild(section);
  }

  // Keep this if you already have loadCollective() defined elsewhere
  if (typeof loadCollective === "function") {
    loadCollective();
  }
}

/*
//RUNS ON LOAD
// RUNS ON LOAD
loadJSON(function(response) {
  // Parse JSON string into object
  var brothers = JSON.parse(response);
  displayBrotherData(brothers);
});

function loadJSON(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', '/scripts/brotherdata.json', true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState === 4 && xobj.status === 200) {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in async mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

function displayBrotherData(dictionary) {
  var html = "";
  for (var semester in dictionary) {
    html += "<div class='container'><h2>" + semester + "</h2><hr><div class='grid'>";
    for (var name in dictionary[semester]) {
      var brother = dictionary[semester][name];
      if (brother['data']) {
        html += "<div><img data-collective='" + brother['data'] + "' loading='lazy' src='" + brother['headshot'] + "'/><p>" + name + "</p></div>";
      } else {
        html += "<div><a href='//" + brother['linkedin'] + "'><img loading='lazy' src='" + brother['headshot'] + "'/></a><p>" + name + "</p></div>";
      }
    }
    html += "</div></div>";
  }
  document.getElementById("headshots").innerHTML = html;
  loadCollective();
}  */
