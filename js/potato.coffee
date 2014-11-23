class window.Potato
  constructor: (data, params = {split: true, color: true, size: true, order: true, class: null}) ->
    @data = data
    @width = $(window).width()
    @height = $(window).height() - 105

    @node_class = params.class

    # set node ids
    $.each @data, (i, d) =>
      d.node_id = i

    $("#vis").append("<div class='tooltip' id='node-tooltip'></div>")
      .append("<div id='toolbar'><div id='modifiers'></div><div id='filter-select-buttons'></div></div>")
    $("#node-tooltip").hide()

    # scale vis size to fit browser window
    @vis = d3.select("#vis").append("svg")
       .attr("viewBox", "0 0 #{@width} #{@height}")
       .attr("id", "vis-svg")

    @force = d3.layout.force()
      .gravity(-0.01)
      .charge((d) -> -Math.pow(d.radius, 2.0) * 1.5)
      .size([@width, @height])


    # this is necessary so graph and model stay in sync
    # http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
    @nodes = @force.nodes()

    @labels = []
    @axis = []

    @dragging = false
    this.drag_select()
    this.zoom()

    this.create_filters()

    this.create_buttons('split') if params.split
    this.create_buttons('color') if params.color
    this.create_buttons('size') if params.size
    this.create_buttons('order') if params.order

    this.add_all()

  zoom: () =>
    zoomListener = d3.behavior.zoom()
      .scaleExtent([0, 1])
      .on("zoom", =>
        return if @dragging

        trans = "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"

        # positive is scroll up which on a map is zoom out
        dy = d3.event.sourceEvent.deltaY

        radius_change = if dy > 0 then 0.95 else 1.05

        # lower bound
        if (@nodes[0].radius < 2 and radius_change < 1) or (@nodes[0].radius > 75 and radius_change > 1)
          return

        $.each @nodes, (i, n) =>
          n.radius *= radius_change

        this.update()
      )

    @vis.call(zoomListener)

  # initialize drag select
  drag_select: () =>
    that = this
    @vis.on("mousedown", ->
      that.dragging = true
      s = d3.select(this).select("rect.select-box")
      s.remove()

      p = d3.mouse(this)

      d3.select(this).append("rect")
        .attr({
          rx: 6
          ry: 6
          class: "select-box"
          x: p[0]
          y: p[1]
          width: 0
          height: 0
        })
    ).on("mousemove", ->
      s = d3.select(this).select("rect.select-box")

      if !s.empty()
        p = d3.mouse(this)
        d = {
          x: parseInt( s.attr( "x"), 10)
          y: parseInt( s.attr( "y"), 10)
          width: parseInt( s.attr( "width"), 10)
          height: parseInt( s.attr( "height"), 10)
        }
        move = {x: p[0] - d.x, y : p[1] - d.y}

        if( move.x < 1 || (move.x*2 < d.width))
          d.x = p[0]
          d.width -= move.x
        else
          d.width = move.x

        if( move.y < 1 || (move.y*2 < d.height))
          d.y = p[1]
          d.height -= move.y
        else
          d.height = move.y

        s.attr(d)
    ).on("mouseup", =>
      s = @vis.select("rect.select-box")

      sx = parseInt(s.attr('x'),10)
      sx2 = sx + parseInt(s.attr('width'),10)
      sy = parseInt(s.attr('y'),10)
      sy2 = sy + parseInt(s.attr('height'),10)

      @circles.each (c) =>
        if c.x > sx && c.x < sx2 && c.y > sy && c.y < sy2
          # TODO this is hugely inefficient
          this.remove_node(c.id)

      s.remove()
      @dragging = false
    )

  # the logic behind taking the csv and determining what the categorical data is
  create_filters: () =>
    # a hash where the key is the filter type and the value is an array of filters
    # used only in construction to determine filter attributes and allow for faster filter creation
    sorted_filters = {}

    # get filter names from header row
    @filter_names = []
    $.each @data[0], (d) =>
      if d != 'node_id'
        @filter_names.push {value: d}
        sorted_filters[d] = []

    # populate the filters from the dataset
    @data.forEach (d) =>
      $.each d, (k, v) =>
        if k != 'node_id'
          filter_exists = $.grep sorted_filters[k], (e) =>
            return e.filter == k && e.value == v
          if filter_exists.length == 0
            sorted_filters[k].push({filter: k, value: v})

    @categorical_filters = []
    @numeric_filters = []

    $.each sorted_filters, (f, v) =>
      if isNaN(v[0].value)
        if v.length != @data.length && v.length < 500 # every filter value is not unique
          @categorical_filters.push({value: f})
      else
        @numeric_filters.push({value: f})

    # for the categoricals, put them in sorted alpha order
    $.each @categorical_filters, (k, v) =>
      sorted_filters[v.value].sort (a, b) ->
        return if a.value == b.value then 0 else (a.value > b.value) || -1

    filter_button = $("<button id='reset-button' class='modifier-button'><span id='reset-icon'>&#8635;</span> Reset Nodes</button>")
    filter_button.on "click", (e) =>
      this.add_all()
    $("#filter-select-buttons").append(filter_button)

  # add all data nodes to screen
  add_all: () =>
    if @nodes.length != @data.length
      @data.forEach (d) =>
        if $.grep(@nodes, (e) => e.id == d.node_id).length == 0 # if it doesn't already exist in nodes
          this.add_node(d)
    this.update()

    # apply any existing splits/colors/sizes
    split_id = $(".split-option.active").attr('id')
    this.split_by(split_id.substr(split_id.indexOf("-") + 1)) if split_id != undefined
    color_id = $(".color-option.active").attr('id')
    this.color_by(color_id.substr(color_id.indexOf("-") + 1)) if color_id != undefined
    size_id = $(".size-option.active").attr('id')
    this.size_by(size_id.substr(size_id.indexOf("-") + 1)) if size_id != undefined

  add_node: (d) =>
    vals = {} # create a hash with the appropriate filters
    $.each @filter_names, (k, f) =>
      vals[f.value] = d[f.value]

    curr_class = ''
    curr_r = 5

    # this is set by params
    if @node_class?
      curr_class = d[@node_class]

    node = {
      id: d.node_id
      radius: curr_r
      values: vals
      color: "#777"
      class: curr_class
      x: Math.random() * 900
      y: Math.random() * 800
      tarx: @width/2.0
      tary: @height/2.0
    }
    @nodes.push node

  remove_node: (id) =>
    # this was the only array iterator + removal I could get to work
    len = @nodes.length
    while (len--)
      if @nodes[len]['id'] == id # node with offending value found
        @nodes.splice(len, 1)
        break

    this.update()

  create_buttons: (type) =>
    $("#modifiers").append("<div id='#{type}-wrapper' class='modifier-wrapper'><button id='#{type}-button' class='modifier-button'>#{type} By<span class='button-arrow'>&#x25BC;</span><span id='#{type}-hint' class='modifier-hint'></span></button><div id='#{type}-menu' class='modifier-menu'></div></div>")
    $("##{type}-button").hover () ->
      $("##{type}-menu").slideDown(100)

    $("##{type}-wrapper").mouseleave () ->
      $("##{type}-menu").slideUp(100)

    $("##{type}-button").on "click", () =>
      this.reset_split() if type == "split"
      this.reset_color() if type == "color"
      this.reset_size() if type == "size"
      this.reset_order() if type == "order"

    button_filters = @categorical_filters if type == "split" || type == "color"
    button_filters = @numeric_filters if type == "size" || type == "order"

    d3.select("##{type}-menu").selectAll('div').data(button_filters).enter()
      .append("div")
      .text((d) -> d.value)
      .attr("class", "modifier-option #{type}-option")
      .attr("id", (d) -> "#{type}-#{d.value}")
      .on("click", (d) =>
        this.split_by(d.value) if type == "split"
        this.color_by(d.value) if type == "color"
        this.size_by(d.value) if type == "size"
        this.order_by(d.value) if type == "order"
      )

  reset_split: () =>
    $(".split-option").removeClass('active')
    $("#split-hint").html("")
    while @labels.length > 0
      @labels.pop()
    @circles.each (c) =>
      c.tarx = @width/2.0
      c.tary = @height/2.0
    this.update()

  split_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    this.reset_order()

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

  reset_color: () =>
    # remove the current legend
    d3.select("#color-legend").selectAll("*").remove()
    $(".color-option").removeClass('active')
    $("#color-hint").html("")
    @circles.attr("fill", "#777")

  color_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    $("#vis").append("<div id='color-legend'></div>") if $("#color-legend").length < 1

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

  reset_size: () =>
    $(".size-option").removeClass('active')
    $("#size-hint").html("")
    @circles.each (c) =>
      c.radius = 5
    this.update()

  size_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    $("#size-hint").html("<br>"+split)

    $(".size-option").removeClass('active')
    $("#size-"+split).addClass('active')

    curr_vals = []

    # first get all the values for this filter
    @circles.each (c) =>
      curr_vals.push parseFloat(c['values'][split])

    curr_max = d3.max(curr_vals, (d) -> d)
    non_zero_min = curr_max

    $.each curr_vals, (k, c) =>
      if c > 0 && c < non_zero_min
        non_zero_min = c

    sizes = d3.scale.sqrt()
      .domain([non_zero_min, curr_max])
      .range([2,20])
      .clamp(true) # allows us to handle null values

    # then update all circle sizes appropriately
    @circles.each (c) =>
      s_val = c['values'][split]
      if !isNaN(s_val) and s_val != ""
        c.radius = sizes(parseFloat(s_val))
      else
        c.radius = 0

    this.update()

  reset_order: () =>
    $(".order-option").removeClass('active')
    $("#order-hint").html("")
    while @axis.length > 0
      @axis.pop()
    while @labels.length > 0
      @labels.pop()
    @circles.each (c) =>
      c.tarx = @width/2.0
    this.update()

  order_by: (split) =>
    if @circles == undefined || @circles.length == 0
      return

    this.reset_split()

    $("#order-hint").html("<br>"+split)

    $(".order-option").removeClass('active')
    $("#order-"+split).addClass('active')

    while @labels.length > 0
      @labels.pop()

    curr_vals = []

    # first get all the values for this filter
    @circles.each (c) =>
      curr_vals.push parseFloat(c['values'][split])

    curr_max = d3.max(curr_vals, (d) -> d)
    non_zero_min = curr_max

    #TODO sort curr_vals and then take some segment, maybe 4? 5?
    #and add those selected variables to labels....

    $.each curr_vals, (k, c) =>
      if c > 0 && c < non_zero_min
        non_zero_min = c

    orders = d3.scale.sqrt()
      .domain([non_zero_min, curr_max])
      .range([220, @width - 160])
      .clamp(true) # allows us to handle null values

    # then update all circle positions appropriately
    @circles.each (c) =>
      s_val = c['values'][split]
      if !isNaN(s_val) and s_val != ""
        c.tarx = orders(parseFloat(s_val))
      else
        c.tarx = -100

    @labels.push {type: "order", val: non_zero_min, label_id: "head-label", split: split, x: 220, y: 0, tarx: 220, tary: 0}
    @labels.push {type: "order", val: curr_max, label_id: "tail-label", split: split, x: @width - 160, y: 0, tarx: @width - 160, tary: 0}
    @labels.push {type: "order", val: split, label_id: "text-label", x: @width / 2.0, y: 0, tarx: @width / 2.0, tary: 0}

    @axis.push {
      x1: 220
      x2: @width - 160
      y1: 0
      y2: 0
    }

    this.update()

  update: () =>
    @circles = @vis.selectAll("circle")
      .data(@nodes, (d) -> d.id)

    # create new circles as needed
    that = this
    @circles.enter().append("circle")
      .attr("r", 0)
      .attr("stroke-width", 2)
      .attr("id", (d) -> "bubble_#{d.id}")
      .attr("fill", (d) -> d.color)
      .on("mouseover", (d,i) -> that.show_details(d,i,this))
      .on("mouseout", (d,i) -> that.hide_details(d,i,this))
      .on("click", (d) => this.remove_node(d.id))
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

    text = @vis.selectAll(".split-labels")
      .data(@labels)

    # now do the text labels
    text.enter().append("text")
      .attr("x", (d) -> d.x)
      .attr("y", (d) -> d.y)
      .attr("class", 'split-labels')
      .attr("id", (d) -> d.label_id)
      .text((d) -> d.val)

    text.exit().remove()

    @vis.selectAll(".axis-label").remove()

    axis = @vis.selectAll(".axis-label")
      .data(@axis)

    axis.enter().append("line")
      .attr("x1", (d) -> d.x1)
      .attr("x2", (d) -> d.x2)
      .attr("y1", (d) -> d.y1)
      .attr("y2", (d) -> d.y2)
      .attr("stroke", "#999")
      .attr("class", "axis-label")

    @force.on "tick", (e) =>
      @circles.each(this.move_towards_target(e.alpha))
        .attr("cx", (d) -> d.x)
        .attr("cy", (d) -> d.y)
      text.each(this.adjust_label_pos())
      text.each(this.move_towards_target(e.alpha))
        .attr("x", (d) -> d.x)
        .attr("y", (d) -> d.y)

      head_label = @vis.select("#head-label")
      tail_label = @vis.select("#tail-label")

      if head_label[0][0]?
        axis.attr("x1", parseInt(head_label.attr('x')) + 35)
        axis.attr("y1", head_label.attr('y') - 7)
        axis.attr("x2", tail_label.attr('x') - 40)
        axis.attr("y2", tail_label.attr('y') - 7)

    @force.start()

  adjust_label_pos: () =>
    (d) =>
      min_y = 10000
      min_x = 10000
      max_x = 0

      if d.type == "order" # an order by label, not a split
        totx = 0
        count = 0
        @circles.each (c) =>
          if (c.y - c.radius) < min_y
            min_y = (c.y - c.radius)

          if d.label_id != "text-label" && d.val == parseFloat(c['values'][d.split])
            totx += c.x
            count += 1

        if d.label_id == "text-label"
          d.tary = min_y - 40
        else
          d.tary = min_y - 20
          d.tarx = totx / count

      else
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
    content = ""
    $.each data.values, (k, v) ->
      content +="#{v}<br/>"
    $("#node-tooltip").html(content)
    this.update_position(d3.event)
    $("#node-tooltip").show()

  hide_details: (data, i, element) =>
    $("#node-tooltip").hide()

  update_position: (e) =>
    xOffset = 20
    yOffset = 10
    # move tooltip to fit on screen as needed
    ttw = $("#node-tooltip").width()
    tth = $("#node-tooltip").height()
    ttleft = if ((e.pageX + xOffset*2 + ttw) > $(window).width()) then e.pageX - ttw - xOffset*2 else e.pageX + xOffset
    tttop = if ((e.pageY + yOffset*2 + tth) > $(window).height()) then e.pageY - tth - yOffset*2 else e.pageY + yOffset
    $("#node-tooltip").css('top', tttop + 'px').css('left', ttleft + 'px')

root = exports ? this
