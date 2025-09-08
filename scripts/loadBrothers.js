---
---

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
}
