$ ->
  chart = null

  # menu button interaction js
  $(".menu-button").hover () ->
    $(".menu-items").slideDown(100)
  $(".menu-button-wrapper").mouseleave () ->
    $(".menu-items").slideUp(100)

  $("#new-option").on "click", () =>
    # not really sure how to properly garbage collect chart...
    # so the hack workaround is just reload the page?
    location.reload()

  render_vis = (csv, params = null) =>
    $(".load-screen").hide()
    chart = new Potato csv, params
    $(".menu-button-wrapper").show()

  $("#file-uploader").on 'change', (e) =>
    file = e.target.files[0]
    console.log(file)

#    if file.type == 'text/csv'
    fileReader = new FileReader()
    fileReader.onload = (e) =>
      render_vis(d3.csv.parse(fileReader.result))
    fileReader.readAsText(file)

  $("#basketball-dataset").on 'click', (e) =>
    d3.csv "data/basketball/basketball.csv", (csv) ->
      render_vis(csv, {split: true, size: true, class: 'team'})
  $("#billionaire-dataset").on 'click', (e) =>
    d3.csv "data/billion/billionaire.csv", (csv) ->
      render_vis(csv)
  $("#auto-dataset").on 'click', (e) =>
    d3.csv "data/auto/auto.csv", (csv) ->
      render_vis(csv)
