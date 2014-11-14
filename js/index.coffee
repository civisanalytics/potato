$ ->
  chart = null

  render_vis = (csv, params = null) ->
    $(".load-screen").hide()
    chart = new Potato csv, params

  $("#file-uploader").on 'change', (e) =>
    file = e.target.files[0]

    if file.type == 'text/csv'
      fileReader = new FileReader()
      fileReader.onload = (e) =>
        render_vis(d3.csv.parse(fileReader.result))
      fileReader.readAsText(file)

  $("#nfl-dataset").on 'click', (e) =>
    d3.csv "data/football/players_2.csv", (csv) ->
      render_vis(csv, {split: true, color: false, size: false, class: 'team'})
  $("#nba-dataset").on 'click', (e) =>
    d3.csv "data/basketball/basketball.csv", (csv) ->
      render_vis(csv, {split: true, color: false, size: true, class: 'team'})
  $("#billionaire-dataset").on 'click', (e) =>
    d3.csv "data/billion/billionaire.csv", (csv) ->
      render_vis(csv)
  $("#auto-dataset").on 'click', (e) =>
    d3.csv "data/auto/auto.csv", (csv) ->
      render_vis(csv)
