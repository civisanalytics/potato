class BubbleChart
  constructor: (data) ->
    @data = data
    @width = $(window).width()
    @height = $(window).height() - 105

    @tooltip = CustomTooltip("player_tooltip")

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
    if data.length != 2886
      this.color_buttons()

  create_filters: () =>
    @filter_names = []
    i = 1
    $.each @data[0], (d) =>
      if d != 'id' && d != 'name'
        @filter_names.push {value: d, color: 'color-' + i }
        i += 1

    @filters = []

    # populate the filters from the dataset
    @data.forEach (d) =>
      $.each d, (k, v) =>
        if k != 'id' && k != 'name'
          filter_obj = {filter: k, value: v}
          filter_exists = $.grep @filters, (e) =>
            return e.filter == k && e.value == v
          if filter_exists.length == 0
            @filters.push(filter_obj)

    # add the filters to the select
    d3.select("#filter-select").selectAll('option').data(@filters).enter()
      .append("option")
      # unfortunately value is the only thing passed to select2
      # so we have to hack together this string param
      .attr("value", (d) => d.filter + ":" + d.value)
      .text((d) -> d.value)

    # create the actual select2 obj and add a change listener
    $("#filter-select").select2({
      placeholder: 'Select a filter',
      width: '300px',
      dropdownCssClass: "customdrop"
    }).on("change", (e) =>
      if typeof e.added != 'undefined'
        if typeof e.added.id != 'undefined'
          val = e.added.id.split(':')
          this.add_nodes(val[0], val[1])
          this.add_filter(val[0], val[1])

#          @filters = $.grep(@filters, (e) => e.filter != val[0] || e.value != val[1])
#          d3.select("#filter-select").selectAll('option').data(@filters).exit().remove()
    )

  add_filter: (field, val) =>
    @curr_filters.push({filter: field, value: val})

    # until I can figure out how to get the id based on the val
    rand = String(Math.random()).substring(2,12)
    $("#filter-select-buttons").append("<button id='"+rand+"'>"+val+"</button>")

    button = $("#"+rand)
    button.on("click", (e) =>
      this.remove_nodes(field, val)
      button.detach()
    )
    button_color = $.grep(@filter_names, (e) => e.value == field)[0].color
    #TODO temporarily remove the button colors
#    button.addClass(button_color)

  add_nodes: (field, val) =>
    @data.forEach (d) =>
      if d[field] == val
        if $.grep(@nodes, (e) => e.id == d.id).length == 0 # if it doesn't already exist in nodes

          vals = {} # create a hash with the appropriate filters
          $.each @filter_names, (k, f) =>
            vals[f.value] = d[f.value]

          curr_class = ''
          curr_r = 5

          # TODO temp hack to allow for NFL dataset
          if d['team']
            curr_class = d.team
            curr_r = 8

          node = {
            id: d.id
            radius: curr_r
            name: d.name
            values: vals
            color: "#000"
            class: curr_class
            x: Math.random() * 900
            y: Math.random() * 800
            tarx: @width/2.0
            tary: @height/2.0
          }
          @nodes.push node
    this.update()

  remove_nodes: (field, val) =>
    # remove this filter from the @curr_filters
    @curr_filters = $.grep @curr_filters, (e) =>
      return e['filter'] != field && e['value'] != val

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
    $("#split-buttons").text("Split By: ")
    d3.select("#split-buttons").selectAll('button').data(@filter_names).enter()
      .append("button")
      .text((d) -> d.value)
      .attr("class", 'split-button')
      .attr("id", (d) -> 'split-' + d.value)
      .on("click", (d) =>
        $(".split-button").removeClass('active')
        $("#split-"+d.value).addClass('active')
        this.split_by(d.value)
      )

  split_by: (split) =>
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
    width_2 = @width * 0.7
    height_2 = @height * 0.8

    # calculate positions for each filter group
    curr_vals.forEach (s, i) =>
      curr_vals[i] = { split: s, tarx: (@width*0.1) + (0.5 + curr_col) * (width_2 / num_cols), tary: (@height*0.2) + (0.5 + curr_row) * (height_2 / num_rows)}

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
    $("#color-buttons").text("Color By: ")
    d3.select("#color-buttons").selectAll('button').data(@filter_names).enter()
      .append("button")
      .text((d) -> d.value)
      .attr("class", 'color-button')
      .attr("id", (d) -> 'color-' + d.value)
      .on("click", (d) =>
        $(".color-button").removeClass('active')
        $("#color-"+d.value).addClass('active')
        this.color_by(d.value)
      )

  color_by: (split) =>
    # remove the current legend
    d3.select("#color-legend").selectAll("*").remove()
    curr_vals = []

    # first get number of unique values in the filter
    @circles.each (c) =>
      if curr_vals.indexOf(c['values'][split]) < 0
        curr_vals.push c['values'][split]

    num_colors = curr_vals.length

    colors = d3.scale.category10()
    colors.domain(curr_vals)

    console.log(colors.domain())

    l_size = 30

    # update the legend
    legend = d3.select("#color-legend").append("svg:svg")
      .attr("width", 150)
      .attr("height", colors.domain().length * l_size)
      .style("padding", "20px 0 0 20px")

    g = legend.selectAll("g")
      .data(colors.domain())
      .enter().append("svg:g")

    g.append("svg:rect")
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
    $("#filter-select-wrapper").css("visibility", "visible")
    $("#modifier-buttons").css("visibility", "visible")
    $(".fileContainer").hide()
    chart = new BubbleChart csv

  $("#file-uploader").on 'change', (e) =>
    file = e.target.files[0]

    if file.type == 'text/csv'
      fileReader = new FileReader()
      fileReader.onload = (e) =>
        render_vis(d3.csv.parse(fileReader.result))
      fileReader.readAsText(file)

  $("#nfl-dataset").on 'click', (e) =>
    d3.csv "data/football/players.csv", render_vis
