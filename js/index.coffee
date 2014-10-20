class BubbleChart
  constructor: (data) ->
    @data = data
    @width = $(window).width()
    @height = $(window).height() - 105

    # set node ids
    $.each @data, (i, d) =>
      d.node_id = i

    @tooltip = CustomTooltip("node_tooltip")

    @vis = d3.select("#vis").append("svg")
       .attr("viewBox", "0 0 #{@width} #{@height}")

    @force = d3.layout.force()
      .gravity(-0.01)
      .charge((d) -> -Math.pow(d.radius, 2.0) * 1.5)
      .size([@width, @height])

    # this is necessary so graph and model stay in sync
    # http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
    @nodes = @force.nodes()

    @labels = []

    @curr_filters = []
    this.create_filters()

    this.split_buttons()
    if data.length != 1933
      this.color_buttons()

  # the logic behind taking the csv and determining what the categorical data is
  create_filters: () =>
    @filters = {}
    @filter_names = []
    $.each @data[0], (d) =>
      # columns named node_id or name are treated specially
      if d != 'node_id' && d != 'name'
        @filter_names.push {value: d}
        @filters[d] = []

    # populate the filters from the dataset
    @data.forEach (d) =>
      $.each d, (k, v) =>
        if k != 'node_id' && k != 'name'
          filter_exists = $.grep @filters[k], (e) =>
            return e.filter == k && e.value == v
          if filter_exists.length == 0
            @filters[k].push({filter: k, value: v})

    b_groups = []

    $.each @filters, (k, v) =>

      b_group = new Bloodhound {
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value')
        queryTokenizer: Bloodhound.tokenizers.whitespace
        limit: Infinity
        local: v
      }

      # kicks off the loading/processing of `local` and `prefetch`
      b_group.initialize();

      b_groups.push({
        name: k
        displayKey: 'value'
        source: (query, cb) =>
          b_group.get(query, (suggestions) =>
            cb(this.s_filter(suggestions))
          )
        templates: {
          header: '<h3 class="filter-header">'+k+'</h3>'
        }
      })

    $('#filter-select .typeahead').typeahead({
      hint: true
      minLength: 1
      autoselect: true
    }, b_groups).on 'typeahead:selected typeahead:autocompleted', (e, d) =>
      this.add_filter(d['filter'], d['value'])
      $('.typeahead').typeahead('val', '')

  s_filter: (suggestions) =>
    return $.grep(suggestions, (s) =>
      # if this suggestion is a curr_filter, return false
      return $.grep(@curr_filters, (e) => e.value == s.value).length == 0
    )

  add_filter: (field, val) =>
    # this is the first filter
    if @curr_filters.length == 0
      $("#filter-select").find('input').attr("placeholder", "Add another subset")
      $("#filter-select-buttons").text("Current subsets: ")

    @curr_filters.push({filter: field, value: val})

    filter_button = $("<button>"+val+"</button>")
    filter_button.on "click", (e) =>
      this.remove_filter(field, val, filter_button)
    $("#filter-select-buttons").append(filter_button)

    this.add_nodes(field, val)

  remove_filter: (field, val, filter_button) =>
    this.remove_nodes(field, val)
    filter_button.detach()
    # that was the last filter
    if @curr_filters.length == 0
      $("#filter-select").find('input').attr("placeholder", "Choose a subset")
      $("#filter-select-buttons").text("")

  add_nodes: (field, val) =>
    @data.forEach (d) =>
      if d[field] == val
        if $.grep(@nodes, (e) => e.id == d.node_id).length == 0 # if it doesn't already exist in nodes

          vals = {} # create a hash with the appropriate filters
          $.each @filter_names, (k, f) =>
            vals[f.value] = d[f.value]

          curr_class = ''
          curr_r = 5

          # TODO temp hack for NFL dataset
          if d['team']
            curr_class = d.team
            curr_r = 8

          node = {
            id: d.node_id
            radius: curr_r
            name: d.name
            values: vals
            color: "#777"
            class: curr_class
            x: Math.random() * 900
            y: Math.random() * 800
            tarx: @width/2.0
            tary: @height/2.0
          }
          @nodes.push node
    this.update()

    # apply any existing splits
    split_id = $(".split-option.active").attr('id')
    if split_id != undefined
      this.split_by(split_id.split('-')[1])

  remove_nodes: (field, val) =>
    # remove this filter from the @curr_filters
    @curr_filters = $.grep @curr_filters, (e) =>
      return e['filter'] != field || e['value'] != val

    # this was the only array iterator + removal I could get to work
    len = @nodes.length
    while (len--)
      if @nodes[len]['values'][field] == val # node with offending value found
        # now check that it doesnt have other values that would allow it to stay
        should_remove = true
        @curr_filters.forEach (k) =>
          if @nodes[len]['values'][k['filter']] == k['value']
            should_remove = false
        # we can now remove it
        if should_remove == true
          @nodes.splice(len, 1)

    this.update()

  split_buttons: () =>
    $("#modifier-buttons").append("<div id='split-wrapper' class='modifier-wrapper'><button id='split-button' class='modifier-button'>Split By</button><div id='split-menu' class='modifier-menu'></div></div>")
    $("#split-button").hover () ->
      $("#split-menu").slideDown(100)

    $("#split-wrapper").mouseleave () ->
      $("#split-menu").slideUp(100)

    d3.select("#split-menu").selectAll('div').data(@filter_names).enter()
      .append("div")
      .text((d) -> d.value)
      .attr("class", 'modifier-option split-option')
      .attr("id", (d) -> 'split-' + d.value)
      .on("click", (d) =>
        this.split_by(d.value)
      )

  split_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    $(".split-option").removeClass('active')
    $("#split-"+split).addClass('active')

    # reset the @labels array
    while @labels.length > 0
      @labels.pop()

    curr_vals = []

    # first get number of unique values in the filter
    @circles.each (c) =>
      if curr_vals.indexOf(c['values'][split]) < 0
        curr_vals.push c['values'][split]

    # then determine what spots all the values should go to
    num_rows = Math.round(Math.sqrt(curr_vals.length)) + 1
    num_cols = curr_vals.length / (num_rows - 1)

    curr_row = 0
    curr_col = 0

    # padding because the clumps tend to float off the screen
    width_2 = @width * 0.75
    height_2 = @height * 0.8

    curr_vals.sort()

    # calculate positions for each filter group
    curr_vals.forEach (s, i) =>
      curr_vals[i] = { split: s, tarx: (@width*0.08) + (0.5 + curr_col) * (width_2 / num_cols), tary: (@height*0.15) + (0.5 + curr_row) * (height_2 / num_rows)}

      label = {
        val: s
        split: split
        x: curr_vals[i].tarx
        y: curr_vals[i].tary
        tarx: curr_vals[i].tarx
        tary: curr_vals[i].tary
      }

      @labels.push label

      curr_col++
      if curr_col >= num_cols
        curr_col = 0
        curr_row++

    # then update all circles tarx and tary appropriately
    @circles.each (c) =>
      curr_vals.forEach (s) =>
        if s.split == c['values'][split]
          c.tarx = s.tarx
          c.tary = s.tary

    # then update
    this.update()

  color_buttons: () =>
    $("#modifier-buttons").append("<div id='color-wrapper' class='modifier-wrapper'><button id='color-button' class='modifier-button'>Color By</button><div id='color-menu' class='modifier-menu'></div></div>")
    $("#color-button").hover () ->
      $("#color-menu").slideDown(100)

    $("#color-wrapper").mouseleave () ->
      $("#color-menu").slideUp(100)

    d3.select("#color-menu").selectAll('div').data(@filter_names).enter()
      .append("div")
      .text((d) -> d.value)
      .attr("class", 'modifier-option color-option')
      .attr("id", (d) -> 'color-' + d.value)
      .on("click", (d) =>
        this.color_by(d.value)
      )

  color_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    $(".color-button").removeClass('active')
    $("#color-"+split).addClass('active')

    curr_vals = []

    # first get number of unique values in the filter
    @circles.each (c) =>
      if curr_vals.indexOf(c['values'][split]) < 0
        curr_vals.push c['values'][split]

    num_colors = curr_vals.length

    colors = d3.scale.ordinal()
      .domain(curr_vals)
      .range(['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf',
              '#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5','#c49c94','#f7b6d2','#c7c7c7','#dbdb8d','#9edae5'])

    # remove the current legend
    d3.select("#color-legend").selectAll("*").remove()

    l_size = 30

    # update the legend
    legend = d3.select("#color-legend").append("svg")
      .attr("width", 150)
      .attr("height", colors.domain().length * l_size)
      .style("padding", "20px 0 0 20px")

    g = legend.selectAll("g")
      .data(colors.domain())
      .enter().append("g")

    g.append("rect")
      .attr("y", (d, i) -> i * l_size)
      .attr("rx", l_size * 0.5)
      .attr("ry", l_size * 0.5)
      .attr("width", l_size * 0.5)
      .attr("height", l_size * 0.5)
      .style("fill", (d) => colors(d))

    g.append("text")
      .attr("x", 20)
      .attr("y", (d, i) -> i * l_size + 12)
      .text((d) -> d)

    # then update all circle colors appropriately
    @circles.each (c) =>
      curr_vals.forEach (s) =>
        if s == c['values'][split]
          c.color = String(colors(s))

    @circles.attr("fill", (d) -> d.color)

  update: () =>
    @circles = @vis.selectAll("circle")
      .data(@nodes, (d) -> d.id)

    # create new circles as needed
    that = this
    @circles.enter().append("circle")
      .attr("r", 0)
      .attr("stroke-width", 3)
      .attr("id", (d) -> "bubble_#{d.id}")
      .attr("fill", (d) -> d.color)
      .on("mouseover", (d,i) -> that.show_details(d,i,this))
      .on("mouseout", (d,i) -> that.hide_details(d,i,this))
      .attr("class", (d) ->
        if d.class.length > 0
          d.class.toLowerCase().replace(/\s/g, '_').replace('.','')
        else
          ''
      )

    # Fancy transition to make bubbles appear to 'grow in'
    @circles.transition().duration(2000).attr("r", (d) -> d.radius)

    # this is IMPORTANT otherwise removing nodes won't work
    @circles.exit().remove()

    # remove any currently present split labels
    @vis.selectAll(".split-labels").remove()

    @text = @vis.selectAll(".split-labels")
      .data(@labels)

    # now do the text labels
    @text.enter().append("text")
      .attr("x", (d) -> d.x)
      .attr("y", (d) -> d.y)
      .attr("class", 'split-labels')
      .text((d) -> d.val)

    @text.exit().remove()

    @force.on "tick", (e) =>
      @circles.each(this.move_towards_target(e.alpha))
        .attr("cx", (d) -> d.x)
        .attr("cy", (d) -> d.y)
      @text.each(this.adjust_label_pos())
      @text.each(this.move_towards_target(e.alpha))
        .attr("x", (d) -> d.x)
        .attr("y", (d) -> d.y)

    @force.start()

  adjust_label_pos: () =>
    (d) =>
      min_y = 10000
      min_x = 10000
      max_x = 0
      @circles.each (c) =>
        if d.val == c['values'][d.split]
          if (c.y - c.radius) < min_y
            min_y = (c.y - c.radius)
          if (c.x - c.radius) < min_x
            min_x = (c.x - c.radius)
          if (c.x + c.radius) > max_x
            max_x = (c.x + c.radius)

      d.tary = min_y - 10
      d.tarx = (max_x - min_x) / 2.0 + min_x

  # move node towards the target defined in (tarx,tary)
  move_towards_target: (alpha) =>
    (d) =>
      d.x = d.x + (d.tarx - d.x) * (0.7) * alpha
      d.y = d.y + (d.tary - d.y) * (0.7) * alpha

  show_details: (data, i, element) =>
    content = "<div class='tooltip-name'>#{data.name}</div>"
    $.each data.values, (k, v) ->
      content +="#{v}<br/>"
    @tooltip.showTooltip(content,d3.event)

  hide_details: (data, i, element) =>
    @tooltip.hideTooltip()

  safe_string: (input) =>
    input.toLowerCase().replace(/\s/g, '_').replace('.','')

root = exports ? this

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
