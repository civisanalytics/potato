$ ->
  chart = null

  render_vis = (csv) ->
    $("#toolbar").css("visibility", "visible")
    $(".load-screen").hide()
    chart = new BubbleChart csv

  $("#file-uploader").on 'change', (e) =>
    file = e.target.files[0]

    if file.type == 'text/csv'
      fileReader = new FileReader()
      fileReader.onload = (e) =>
        render_vis(d3.csv.parse(fileReader.result))
      fileReader.readAsText(file)

  $("#nfl-dataset").on 'click', (e) =>
    d3.csv "data/football/players_2.csv", render_vis
  $("#billionaire-dataset").on 'click', (e) =>
    d3.csv "data/billion/billionaire.csv", render_vis
  $("#auto-dataset").on 'click', (e) =>
    d3.csv "data/auto/auto.csv", render_vis
