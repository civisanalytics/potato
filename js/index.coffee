class BubbleChart
  constructor: (data) ->
    @data = data
    @width = $(window).width()
    @height = $(window).height() - 105

    # set node ids
    $.each @data, (i, d) =>
      d.node_id = i

    $("body").append("<div class='tooltip' id='node-tooltip'></div>");

    # scale vis size to fit browser window
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
    this.size_buttons()

    this.subset_selection()

  # the logic behind taking the csv and determining what the categorical data is
  create_filters: () =>

    # get filter names from header row
    @filter_names = []
    $.each @data[0], (d) =>
      # columns named node_id or name are treated specially
      if d != 'node_id' && d != 'name'
        @filter_names.push {value: d}

    @filters = {}
    filter_counter = 1

    # populate the filters from the dataset
    @data.forEach (d) =>
      $.each d, (k, v) =>
        if k != 'node_id' && k != 'name' # ignore columns named node_id or name, TODO remove this?
          filter_exists = 0
          $.each @filters, (f, e) =>
            if e.filter == k && e.value == v
              filter_exists = 1
              return
          if filter_exists == 0
            @filters[filter_counter] = {id: filter_counter, filter: k, value: v}
            filter_counter += 1

  # given the filters, create the subset selection modal
  subset_selection: () =>
    subset_select_button = $("<button id='subset-select-button'>Select Subset</button>")
    subset_select_button.on "click", (e) =>
      $("#subset-selection").toggle()
    $("#modifiers").append(subset_select_button)

    $("#subset-selection").height(@height)

    that = this
    $("#all-data").addClass("filter-0").on "click", (e) ->
      if $(this).hasClass("active")
        that.remove_all()
      else
        $(this).addClass("active")
        that.add_all()
        $("#subset-selection").hide()

    # copy a modified version of @filters into subsets, where the filters are sorted by filter
    subsets = {}
    $.each @filter_names, (k, v) =>
      subsets[v.value] = []
    $.each @filters, (k, v) =>
      subsets[v.filter].push v

    $.each subsets, (k, v) =>
      filter_id = "filter" + k
      filter_group = $("<div class='filter-group-wrapper'><div class='filter-group-header'>"+k+"</div><div class='filter-group' id='"+filter_id+"'></div></div>")
      $("#subset-groups").append(filter_group)

      that = this
      d3.select("#"+filter_id).selectAll('div').data(v).enter()
        .append("div")
        .attr("class", (d) -> return "filter-value filter-" + d.id)
        .text((d) -> return d.value)
        .on("click", (d) ->
          if $(this).hasClass("active")
            that.remove_filter(d.id)
          else
            that.add_filter(d.id)
            $(this).addClass("active")
        )

    $("#subset-selection").show()

  # add all data nodes to screen
  add_all: () =>
    if @nodes.length != @data.length

      if @curr_filters.length > 0
        # remove any currently selected filters
        this.remove_all()

      @curr_filters.push({id: 0})

      filter_button = $("<button class='active filter-button filter-0'>All Data</button>")
      filter_button.on "click", (e) =>
        this.remove_all()
      $("#filter-select-buttons").append(filter_button)

      this.add_nodes(null)

  remove_all: () =>
    $.each @curr_filters, (k, f) =>
      this.remove_filter(f.id)

  # add a filter by id
  # this entails both adding the actual nodes as well as the subset button
  add_filter: (id) =>
    curr_filter = @filters[id]

    # if the only filter is the all filter, remove the all filter
    if @curr_filters.length == 1 && @curr_filters[0].id == 0
      this.remove_all()

    # this is the first filter
    if @curr_filters.length == 0
      $("#filter-select-buttons").text("Current subsets: ")

    @curr_filters.push(curr_filter)

    filter_button = $("<button class='active filter-button filter-"+id+"'>"+curr_filter.value+"</button>")
    filter_button.on "click", (e) =>
      this.remove_filter(id)
    $("#filter-select-buttons").append(filter_button)

    this.add_nodes(id)

  # remove a filter by id
  # this entails both removing the actual nodes as well as removing the subset button
  # and changing the active state in the subset_select modal
  remove_filter: (id) =>
    curr_filter = @filters[id]

    this.remove_nodes(id)

    # remove or turn off any necessary buttons / sub_selectors
    $(".filter-"+id).each (k, v) ->
      f_obj = $(v)
      if f_obj.hasClass('filter-button')
        f_obj.detach()
      else
        f_obj.removeClass("active")

    # that was the last filter
    if @curr_filters.length == 0
      $("#filter-select-buttons").text("")

  add_nodes: (id) =>
    if id
      curr_filter = @filters[id]

    @data.forEach (d) =>
      if id == null || d[curr_filter.filter] == curr_filter.value
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

  remove_nodes: (id) =>
    if id == 0
      while @nodes.length > 0 # we can't just set @nodes = [] because that creates a new object
        @nodes.pop()

      while @curr_filters.length > 0
        @curr_filters.pop()
    else
      curr_filter = @filters[id]

      # remove this filter from the @curr_filters
      @curr_filters = $.grep @curr_filters, (e) =>
        return e['filter'] != curr_filter.filter || e['value'] != curr_filter.value

      # this was the only array iterator + removal I could get to work
      len = @nodes.length
      while (len--)
        if @nodes[len]['values'][curr_filter.filter] == curr_filter.value # node with offending value found
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
    $("#modifiers").append("<div id='split-wrapper' class='modifier-wrapper'><button id='split-button' class='modifier-button'>Split By<span class='button-arrow'>&#x25BC;</span><span id='split-hint' class='modifier-hint'></span></button><div id='split-menu' class='modifier-menu'></div></div>")
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

    $("#split-hint").html("<br>"+split)

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
    $("#modifiers").append("<div id='color-wrapper' class='modifier-wrapper'><button id='color-button' class='modifier-button'>Color By<span class='button-arrow'>&#x25BC;</span><span id='color-hint' class='modifier-hint'></span></button><div id='color-menu' class='modifier-menu'></div></div>")
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

    $("#color-hint").html("<br>"+split)

    $(".color-option").removeClass('active')
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

  size_buttons: () =>
    $("#modifiers").append("<div id='size-wrapper' class='modifier-wrapper'><button id='size-button' class='modifier-button'>Size By<span class='button-arrow'>&#x25BC;</span><span id='size-hint' class='modifier-hint'></span></button><div id='size-menu' class='modifier-menu'></div></div>")
    $("#size-button").hover () ->
      $("#size-menu").slideDown(100)

    $("#size-wrapper").mouseleave () ->
      $("#size-menu").slideUp(100)

    d3.select("#size-menu").selectAll('div').data(@filter_names).enter()
      .append("div")
      .text((d) -> d.value)
      .attr("class", 'modifier-option size-option')
      .attr("id", (d) -> 'size-' + d.value)
      .on("click", (d) =>
        this.size_by(d.value)
      )

  size_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    $("#size-hint").html("<br>"+split)

    $(".size-option").removeClass('active')
    $("#size-"+split).addClass('active')

    curr_vals = []

    # first get number of unique values in the filter
    @circles.each (c) =>
      if curr_vals.indexOf(c['values'][split]) < 0
        curr_vals.push c['values'][split]

    curr_max = d3.max(curr_vals, (d) -> d)
    non_zero_min = curr_max

    $.each curr_vals, (k, c) =>
      if c > 0 && c < non_zero_min
        non_zero_min = c

    sizes = d3.scale.linear()
      .domain([Math.sqrt(non_zero_min), Math.sqrt(curr_max)])
      .range([3,20])
      .clamp(true) # allows us to handle null values

    # then update all circle sizes appropriately
    @circles.each (c) =>
      c.radius = sizes(Math.sqrt(c['values'][split]))

    this.update()

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
    $("#node-tooltip").html(content)
    this.update_details(d3.event)

  hide_details: (data, i, element) =>
    $("#node-tooltip").hide()

  update_position: (e) =>
    xOffset = 20
    yOffset = 10

    # move tooltip to fit on screen as needed
    ttw = $("#node-tooltip").width()
    tth = $("#node-tooltip").height()
    ttleft = ((e.pageX + xOffset*2 + ttw) > $(window).width()) ? e.pageX - ttw - xOffset*2 : e.pageX + xOffset
    tttop = ((e.pageY + yOffset*2 + tth) > $(window).height()) ? e.pageY - tth - yOffset*2 : e.pageY + yOffset
    $("#node-tooltip").css('top', tttop + 'px').css('left', ttleft + 'px')

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
