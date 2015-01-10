class window.Potato
  default_params = {split: true, color: true, size: true, class: null}

  constructor: (@data, params = default_params) ->
    @width = $(window).width()
    # 55 is the height of the toolbar, which I unfortunately can't grab programatically
    # as the toolbar doesn't gain a height until this.create_filters is called
    @height = $(window).height() - 55

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

    this.zoom()

    @force = d3.layout.force()
      .gravity(-0.01)
      .charge((d) -> -Math.pow(d.radius, 2.0) * 1.4)
      .size([@width, @height])

    # this is necessary so graph and model stay in sync
    # http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
    @nodes = @force.nodes()

    @labels = []
    @axis = []

    @mousedown = false
    this.drag_select()

    this.create_filters()

    $.each params, (k, v) =>
      this.create_buttons(k) if k != 'class' && v == true

    this.add_all()

  zoom: () =>
    zoomListener = d3.behavior.zoom()
      .scaleExtent([.5, 10])
      .on("zoom", =>
        if !@mousedown
          #  @vis.attr("transform","translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")")

          # positive is scroll up which on a map is zoom out
          dy = d3.event.sourceEvent.deltaY

          radius_change = if dy > 0 then 0.95 else 1.05

          # lower/upper bounds
          if (@nodes[0].radius < 2 and radius_change < 1) or (@nodes[0].radius > 75 and radius_change > 1)
            return

          $.each @nodes, (i, n) =>
            n.radius *= radius_change

          this.update()
      )
    @vis.call(zoomListener)

#    svg = d3.select("#vis").select("svg")
#      .call(zoomListener)

#    rect = svg.append("rect")
#       .attr("width", @width)
#       .attr("height", @height)
#       .style("fill", "none")
#       .style("pointer-events", "all")

#    @vis = svg.append("g")

  drag_select: () =>
    that = this
    @vis.on("mousedown", ->
      that.mousedown = true
      d3.select(this).select("rect.select-box").remove()

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
          x0: p[0]
          y0: p[1]
        })
    ).on("mousemove", ->
      s = d3.select(this).select("rect.select-box")

      if !s.empty()
        p = d3.mouse(this)
        d = {
          x: parseInt(s.attr("x"), 10)
          y: parseInt(s.attr("y"), 10)
          width: parseInt(s.attr("width"), 10)
          height: parseInt(s.attr("height"), 10)
        }

        x0 = parseInt(s.attr("x0"), 10)
        y0 = parseInt(s.attr("y0"), 10)

        # anchor at least one corner to the original click point (x1,y1)
        if p[0] < x0
          d.width = x0 - p[0]
          d.x = p[0]
        else
          d.width = p[0] - d.x
          d.x = x0

        if p[1] < y0
          d.height = y0 - p[1]
          d.y = p[1]
        else
          d.height = p[1] - d.y
          d.y = y0

        s.attr(d)

        #TODO there has got to be a more efficient way to do this...?
        that.circles.each (c) =>
          if c.x > d.x && c.x < d.x + d.width && c.y > d.y && c.y < d.y + d.height
            that.highlight_node(d3.select("#bubble_#{c.id}"), true)
          else
            that.highlight_node(d3.select("#bubble_#{c.id}"), false)

    ).on("mouseup", =>
      s = @vis.select("rect.select-box")

      sx = parseInt(s.attr('x'),10)
      sx2 = sx + parseInt(s.attr('width'),10)
      sy = parseInt(s.attr('y'),10)
      sy2 = sy + parseInt(s.attr('height'),10)

      nodes_to_remove = []

      @circles.each (c) =>
        that.highlight_node(d3.select("#bubble_#{c.id}"), false)
        if c.x < sx || c.x > sx2 || c.y < sy || c.y > sy2
          nodes_to_remove.push(c.id)

      if nodes_to_remove.length > 0 && nodes_to_remove.length != @nodes.length
        this.remove_nodes(nodes_to_remove)

      s.remove()
      @mousedown = false
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
        d_mod = d.replace(/\(|\)/g," ")
        @filter_names.push {value: d_mod}
        sorted_filters[d_mod] = []

    # populate the filters from the dataset
    @data.forEach (d) =>
      $.each d, (k, v) =>
        k_mod = k.replace(/\(|\)/g," ")
        if k_mod != 'node_id'
          filter_exists = $.grep sorted_filters[k_mod], (e) =>
            return e.filter == k_mod && e.value == v
          if filter_exists.length == 0
            sorted_filters[k_mod].push({filter: k_mod, value: v})

    @categorical_filters = []
    @numeric_filters = []

    $.each sorted_filters, (f, v) =>
      if isNaN(v[0].value.replace("%","").replace(",",""))
        if v.length != @data.length && v.length < 500 # every filter value is not unique
          @categorical_filters.push({value: f, type: 'cat'})
      else
        @numeric_filters.push({value: f, type: 'num'})

    # for the categoricals, put them in sorted alpha order
    $.each @categorical_filters, (k, v) =>
      sorted_filters[v.value].sort (a, b) ->
        return if a.value == b.value then 0 else (a.value > b.value) || -1

    reset_tooltip = $("<div class='tooltip' id='reset-tooltip'>Click and drag on the canvas to select nodes.</div>")

    reset_button = $("<button id='reset-button' class='disabled-button modifier-button'><span id='reset-icon'>&#8635;</span> Reset Selection</button>")
    reset_button.on("click", (e) =>
      if !reset_button.hasClass('disabled-button')
        this.add_all()
    ).on("mouseover", (e) => reset_tooltip.show()
    ).on("mouseout", (e) => reset_tooltip.hide())

    reset_button.append(reset_tooltip)
    reset_tooltip.hide()

    $("#filter-select-buttons").append(reset_button)

  # add all data nodes to screen
  add_all: () =>
    if @nodes.length != @data.length
      @data.forEach (d) =>
        if $.grep(@nodes, (e) => e.id == d.node_id).length == 0 # if it doesn't already exist in nodes
          temp_obj = {}
          $.each d, (k, v) =>
            k_mod = k.replace(/\(|\)/g," ")
            temp_obj[k_mod] = v
          this.add_node(temp_obj)

    $("#reset-button").addClass('disabled-button')
    this.update()
    this.apply_filters()

  # apply any existing splits/colors/sizes
  apply_filters: () =>
    $(".active-filter").each((i, filterObj) =>
      filter_id = $(filterObj).attr('id')
      dash_loc = filter_id.indexOf('-')

      type = filter_id.substr(0, dash_loc)
      val = filter_id.substr(dash_loc + 1)

      this.apply_filter(type, val, $(filterObj).attr('data-type'))
    )

  add_node: (d) =>
    vals = {} # create a hash with the appropriate filters
    $.each @filter_names, (k, f) =>
      vals[f.value] = d[f.value]

    @nodes.push {
      id: d.node_id
      radius: 5
      values: vals
      color: "#777"
      class: if @node_class? then d[@node_class] else ''
      x: Math.random() * 900
      y: Math.random() * 800
      tarx: @width/2.0
      tary: @height/2.0
    }

  remove_nodes: (nodes_to_remove) =>
    len = @nodes.length
    while (len--)
      if nodes_to_remove.indexOf(@nodes[len]['id']) >= 0 # node with offending value found
        @nodes.splice(len, 1)

    $("#reset-button").removeClass('disabled-button')

    this.update()
    setTimeout(this.apply_filters, 200)

  create_buttons: (type) =>
    type_upper = type[0].toUpperCase() + type.slice(1);
    $("#modifiers").append("<div id='#{type}-wrapper' class='modifier-wrapper'><button id='#{type}-button' class='modifier-button'>#{type_upper}<span class='button-arrow'>&#x25BC;</span><span id='#{type}-hint' class='modifier-hint'></span></button><div id='#{type}-menu' class='modifier-menu'></div></div>")
    $("##{type}-button").hover () ->
      $("##{type}-menu").slideDown(100)

    $("##{type}-wrapper").mouseleave () ->
      $("##{type}-menu").slideUp(100)

    $("##{type}-button").on "click", () =>
      this.reset(type)

    button_filters = @numeric_filters if type == "size"
    button_filters = @categorical_filters.concat(@numeric_filters) if type == "color" || type == "split"

    d3.select("##{type}-menu").selectAll('div').data(button_filters).enter()
      .append("div")
      .text((d) -> d.value)
      .attr("class", "modifier-option #{type}-option")
      .attr("data-type", (d) -> "#{d.type}")
      .attr("id", (d) -> "#{type}-#{d.value}")
      .on("click", (d) => this.apply_filter(type, d.value, d.type))

  reset: (type) =>
    $(".#{type}-option").removeClass('active-filter')
    $("##{type}-hint").html("")

    if type == 'color'
      d3.select("#color-legend").selectAll("*").remove()
      @circles.each (c) ->
        c.color = "#777"
      @circles.attr("fill", (d) -> d.color)
      @circles.attr("stroke", (d) -> d3.rgb(d.color).darker())

    else if type == 'size'
      @circles.each (c) =>
        c.radius = 5

    else if type == 'split' || type == 'order'
      while @axis.length > 0
        @axis.pop()
      while @labels.length > 0
        @labels.pop()
      @circles.each (c) =>
        c.tarx = @width/2.0
        c.tary = @height/2.0

    this.update()

  apply_filter: (type, filter, data_type) =>
    this.split_by(filter, data_type) if type == "split"
    this.color_by(filter, data_type) if type == "color"
    this.size_by(filter) if type == "size"

  split_by: (filter, data_type) =>
    if @circles == undefined || @circles.length == 0
      return

    this.reset('split')

    $("#split-hint").html("<br>#{filter}")
    $("#split-#{filter}").addClass('active-filter')

    if data_type == "num"
      this.order_by(filter)
    else

      curr_vals = []

      # first get number of unique values in the filter
      @circles.each (c) =>
        if curr_vals.indexOf(c['values'][filter]) < 0
          curr_vals.push c['values'][filter]

      # then determine what spots all the values should go to
      num_cols = Math.ceil(Math.sqrt(curr_vals.length))
      num_rows = Math.ceil(curr_vals.length / (num_cols))

      curr_row = 0
      curr_col = 0

      # padding because the clumps tend to float off the screen
      width_2 = @width * 0.8
      height_2 = @height * 0.8

      curr_vals.sort()

      # calculate positions for each filter group
      curr_vals.forEach (s, i) =>
        curr_vals[i] = {
          split: s
          tarx: (@width*0.12) + (0.5 + curr_col) * (width_2 / num_cols)
          tary: (@height*0.10) + (0.5 + curr_row) * (height_2 / num_rows)
        }

        label = {
          val: s
          split: filter
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
          if s.split == c['values'][filter]
            c.tarx = s.tarx
            c.tary = s.tary

      # then update
      this.update()

  color_by: (filter, data_type) =>
    if @circles == undefined || @circles.length == 0
      return

    this.reset('color')

    $("#vis").append("<div id='color-legend'></div>") if $("#color-legend").length < 1
    $("#color-hint").html("<br>#{filter}")
    $("#color-#{filter}").addClass('active-filter')

    curr_vals_with_count = {}

    numeric = (data_type == 'num')

    # first get number of unique values in the filter
    @circles.each (c) =>
      val = c['values'][filter]
      if curr_vals_with_count.hasOwnProperty(val)
        curr_vals_with_count[val] += 1
      else
        curr_vals_with_count[val] = 1

    curr_vals_tuples = []
    $.each curr_vals_with_count, (k, c) =>
      curr_vals_tuples.push([k, c])

    # descending order
    curr_vals_tuples.sort((a,b) -> b[1] - a[1])

    if !numeric && curr_vals_tuples.length > 18
      curr_vals_tuples = curr_vals_tuples.slice(0, 18)
      curr_vals_tuples.push(['other', 0])

    curr_vals = []

    $.each curr_vals_tuples, (c, arr) =>
      curr_vals.push(arr[0])

    num_colors = curr_vals.length

    if numeric == true
      curr_max = d3.max(curr_vals, (d) -> parseFloat(d))
      non_zero_min = curr_max

      $.each curr_vals, (k, c) =>
        if c > 0 && c < non_zero_min
          non_zero_min = c

      colors = d3.scale.linear()
        .domain([non_zero_min, curr_max])
        .range(["#ccc", "#1f77b4"])
    else
      colors = d3.scale.ordinal()
        .domain(curr_vals)
        .range(['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#bcbd22','#17becf',
                '#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5','#c49c94','#f7b6d2','#dbdb8d','#9edae5',
                '#777777'])

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
        if s == c['values'][filter]
          c.color = String(colors(s))

    @circles.attr("fill", (d) -> d.color)
    @circles.attr("stroke", (d) -> d3.rgb(d.color).darker())

  size_by: (filter) =>
    if @circles == undefined || @circles.length == 0
      return

    this.reset('size')

    $("#size-hint").html("<br>#{filter}")
    $("#size-#{filter}").addClass('active-filter')

    curr_vals = []

    # first get all the values for this filter
    @circles.each (c) =>
      curr_vals.push parseFloat(c['values'][filter])

    curr_max = d3.max(curr_vals, (d) -> parseFloat(d))
    non_zero_min = curr_max

    $.each curr_vals, (k, v) =>
      if v > 0 && v < non_zero_min
        non_zero_min = v

    sizes = d3.scale.sqrt()
      .domain([non_zero_min, curr_max])
      .range([2,20])

    # then update all circle sizes appropriately
    @circles.each (c) =>
      s_val = c['values'][filter]
      if !isNaN(s_val) and s_val != ""
        c.radius = sizes(parseFloat(s_val))
      else
        c.radius = 0

    this.update()

  order_by: (filter) =>
    curr_vals = []

    # first get all the values for this filter
    @circles.each (c) =>
      curr_vals.push parseFloat(c['values'][filter])

    curr_max = d3.max(curr_vals, (d) -> d)
    non_zero_min = curr_max

    $.each curr_vals, (k, c) =>
      if c > 0 && c < non_zero_min
        non_zero_min = c

    orders = d3.scale.sqrt()
      .domain([non_zero_min, curr_max])
      .range([220, @width - 160])

    # then update all circle positions appropriately
    @circles.each (c) =>
      s_val = c['values'][filter]
      if !isNaN(s_val) and s_val != ""
        c.tarx = orders(parseFloat(s_val))
      else
        c.tarx = -100

    @labels.push {type: "order", val: non_zero_min, label_id: "head-label", split: filter, x: 220, y: 0, tarx: 220, tary: 0}
    @labels.push {type: "order", val: curr_max, label_id: "tail-label", split: filter, x: @width - 160, y: 0, tarx: @width - 160, tary: 0}
    @labels.push {type: "order", val: filter, label_id: "text-label", x: @width / 2.0, y: 0, tarx: @width / 2.0, tary: 0}

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
      .attr("stroke-width", (d) ->
        if d.class.length > 0
          d.radius * 0.3
        else
          0
      )
      .attr("stroke", (d) -> d3.rgb(d.color).darker())
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

    axis.exit().remove()

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
        else if count > 0
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
      d.x = d.x + (d.tarx - d.x) * (0.5) * alpha
      d.y = d.y + (d.tary - d.y) * (0.5) * alpha

  show_details: (data, i, element) =>
    content = ""
    $.each data.values, (k, v) ->
      content +="#{v}<br/>"
    $("#node-tooltip").html(content)
    this.update_position(d3.event, "node-tooltip")
    $("#node-tooltip").show()
    this.highlight_node(d3.select(element), true)

  hide_details: (data, i, element) =>
    $("#node-tooltip").hide()
    this.highlight_node(d3.select(element), false)

  highlight_node: (element, highlight) =>
    if element.attr("class").length <= 0 #ignore custom colors?
      if highlight
        s_width = element.attr("r") * 0.3
      else
        s_width = 0
      element
        .attr("r", (d) => d.radius + (s_width / 2.0))
        .attr("stroke-width", s_width)

  update_position: (e, id) =>
    xOffset = 20
    yOffset = 10
    # move tooltip to fit on screen as needed
    ttw = $("##{id}").width()
    tth = $("##{id}").height()
    ttleft = if ((e.pageX + xOffset*2 + ttw) > $(window).width()) then e.pageX - ttw - xOffset*2 else e.pageX + xOffset
    tttop = if ((e.pageY + yOffset*2 + tth) > $(window).height()) then e.pageY - tth - yOffset*2 else e.pageY + yOffset
    $("##{id}").css('top', tttop + 'px').css('left', ttleft + 'px')

root = exports ? this
