$ ->
  chart = null

  init_menu_buttons()

  render_vis = (dataset_name, data, params = null) =>
    $(".load-screen").hide()
    chart = new Potato data, params
    $(".menu-button-wrapper").show()
    $(".help-wrapper").show()
    set_help_text(dataset_name)

  $("#file-uploader").on 'change', (e) =>
    file = e.target.files[0]
    console.log(file)

#    if file.type == 'text/csv'
    fileReader = new FileReader()
    fileReader.onload = (e) =>
      render_vis(fileReader.name, d3.csv.parse(fileReader.result))
    fileReader.readAsText(file)

  $("#basketball-dataset").on 'click', (e) =>
    d3.csv "data/basketball/basketball.csv", (data) ->
      render_vis('basketball', data, {split: true, size: true, class: 'team'})
  $("#billionaire-dataset").on 'click', (e) =>
    d3.csv "data/billion/billionaire.csv", (data) ->
      render_vis('billionaire', data)
  $("#auto-dataset").on 'click', (e) =>
    d3.csv "data/auto/auto.csv", (data) ->
      render_vis('auto', data)

##################################
# can't do this in the 'on click' because the functions returned dont' have
# access to the DOM
set_help_text = (name) ->
  $(".dataset-name").html(name)

  if name == "basketball"
    $(".dataset-info").html("
      <b>Fun things to try:</b>
      <ul>
        <li>split by 'position' and size by 'height' </li>
        <li>split by 'age' and size by 'salary'</li>
        <li>split by 'team', click-n-drag to select your favorite team, and explore from there</li>
      </ul>
    ")
  else if name == "billionaire"
    $(".dataset-info").html("
      <b>Fun things to try:</b>
      <ul>
        <li>split by 'source' and color by 'gender'</li>
        <li>split by 'age' and size by 'net-worth'</li>
        <li>split by 'country', click-n-drag to select a country of interest, and explore from there</li>
      </ul>
    ")
  else if name == "auto"
    $(".dataset-info").html("
      <b>Fun things to try:</b>
      <ul>
        <li>split by 'drive-wheels' and color by 'price'</li>
        <li>split by 'highway-mpg' and size by 'horsepower'</li>
        <li>split by 'make', click-n-drag to select a make, and explore from there</li>
      </ul>
    ")
  else #custom


##################################
# js for the menu/help interactions
init_menu_buttons = () ->
  # menu button interaction js
  $(".menu-button").hover () ->
    $(".menu-items").slideDown(100)
  $(".menu-button-wrapper").mouseleave () ->
    $(".menu-items").slideUp(100)

  $("#new-option").on "click", () =>
    # not really sure how to properly garbage collect chart...
    # so the hack workaround is just reload the page?
    location.reload()
  $("#help-option").on "click", () =>
    # not really sure how to properly garbage collect chart...
    # so the hack workaround is just reload the page?
    $(".help-wrapper").show()

  $(".help-wrapper").on "click", () =>
    $(".help-wrapper").hide()
