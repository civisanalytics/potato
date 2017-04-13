
document.addEventListener("DOMContentLoaded", function(event) {
  initMenuButtons();
  var renderVis = function(dataset_name, data, params) {
    d3.select(".load-screen").style("display", "none");
    var chart = new Potato(data, params);
    d3.select(".menu-button-wrapper").style("display", "block");
    d3.select(".help-wrapper").style("display", "block");
  };

  d3.select("#file-uploader").on('change', function(e) {
    var file = e.target.files[0];
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
      return renderVis(fileReader.name, d3.csvParse(fileReader.result));
    };
    fileReader.readAsText(file);
  });

  d3.select("#basketball-dataset").on('click', function(e) {
    d3.csv("data/basketball/basketball.csv", function(data) {
      renderVis('basketball', data, {
        split: true,
        size: true,
        "class": 'team'
      });
    });
  });

  d3.select("#billionaire-dataset").on('click', function(e) {
    d3.csv("data/billion/billionaire.csv", function(data) {
      renderVis('billionaire', data);
    });
  });

  d3.select("#auto-dataset").on('click', function(e) {
    d3.csv("data/auto/auto.csv", function(data) {
      renderVis('auto', data);
    });
  });
});

var initMenuButtons = function() {
  d3.select(".menu-button").on("mouseover", function() {
    d3.select(".menu-items").style("display", "block");
  });

  d3.select(".menu-button-wrapper").on("mouseleave", function() {
    d3.select(".menu-items").style("display", "none");
  });

  d3.select("#new-option").on("click", function() {
    location.reload();
  });

  d3.select("#help-option").on("click", function() {
    d3.select(".help-wrapper").style("display", "block");
  });

  d3.select(".help-wrapper").on("click", function() {
    d3.select(".help-wrapper").style("display", "none");
  });
};


// TODO: Not currently being used
/*
var setHelpText = function(name) {
  $("#toolbar").append("<div class='dataset-info'></div>");
  if (name === "basketball") {
    $(".dataset-info").html("<b>Fun things to try:</b> <ul> <li>split by 'position' and size by 'height' </li> <li>split by 'age' and size by 'salary'</li> <li>split by 'team', click-n-drag to select your favorite team, and explore from there</li> </ul>");
  } else if (name === "billionaire") {
    $(".dataset-info").html("<b>Fun things to try:</b> <ul> <li>split by 'source' and color by 'gender'</li> <li>split by 'age' and size by 'net-worth'</li> <li>split by 'country', click-n-drag to select a country of interest, and explore from there</li> </ul>");
  } else if (name === "auto") {
    $(".dataset-info").html("<b>Fun things to try:</b> <ul> <li>split by 'drive-wheels' and color by 'price'</li> <li>split by 'highway-mpg' and size by 'horsepower'</li> <li>split by 'make', click-n-drag to select a make, and explore from there</li> </ul>");
  }
};
*/
