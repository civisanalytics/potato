class BubbleChart
  constructor: (data) ->
    @data = data
    @width = 940
    @height = 700

    @tooltip = CustomTooltip("nfl_tooltip", 240)

    @vis = d3.select("#vis").append("svg")
      .attr("width", @width)
      .attr("height", @height)

    @force = d3.layout.force()
      .gravity(-0.01)
      .charge((d) -> -Math.pow(d.radius, 2.0) / 8 )
      .size([@width, @height])

    @nodes = @force.nodes()

    # default center
    @center = {x: @width / 2, y: @height / 2}

    @teams = []

    @data.forEach (d) =>
      if @teams.indexOf(d.team) < 0
        @teams.push d.team

    @teams.forEach (t, i) =>
      @teams[i] = { name: t, visible: false }

    that = this

    d3.select("body").selectAll("input").data(@teams).enter()
      .append("input")
      .attr("type","button")
      .attr("class","button")
      .attr("value", (d) -> d.name)
      .on("click", (d) -> that.toggleTeam(d))

  toggleTeam: (team) =>
    if !team.visible
      this.add_nodes(team)
      team.visible = true
    else
      this.remove_nodes(team)
      team.visible = false

  add_nodes: (team) =>
    @data.forEach (d) =>
      if d.team == team.name
        node = {
          id: d.id
          radius: 10
          name: d.name
          team: d.team
          school: d.school
          position: d.position
          x: Math.random() * 900
          y: Math.random() * 800
        }
        @nodes.push node
    this.update()

  remove_nodes: (team) =>
    # note to self, coffeescript array iteration is the worst
    len = @nodes.length
    while (len--)
      if @nodes[len].team == team.name
        @nodes.splice(len, 1)
    this.update()

  update: () =>
    @circles = @vis.selectAll("circle")
      .data(@nodes, (d) -> d.id)

    that = this

    # radius will be set to 0 initially.
    # see transition below
    @circles.enter().append("circle")
      .attr("r", 0)
      .attr("stroke-width", 3)
      .attr("id", (d) -> "bubble_#{d.id}")
      .attr("class", (d) -> d.team.toLowerCase().replace(/\s/g, '_'))
      .on("mouseover", (d,i) -> that.show_details(d,i,this))
      .on("mouseout", (d,i) -> that.hide_details(d,i,this))

    # Fancy transition to make bubbles appear, ending with the
    # correct radius
    @circles.transition().duration(2000).attr("r", (d) -> d.radius)

    # this is IMPORTANT otherwise removing ndoes won't work
    @circles.exit().remove()

    @force.on "tick", (e) =>
        @circles.each(this.move_towards_center(e.alpha))
          .attr("cx", (d) -> d.x)
          .attr("cy", (d) -> d.y)

    @force.start()

  # Moves all circles towards the @center
  # of the visualization
  move_towards_center: (alpha) =>
    (d) =>
      d.x = d.x + (@center.x - d.x) * (0.1) * alpha
      d.y = d.y + (@center.y - d.y) * (0.1) * alpha

  show_details: (data, i, element) =>
    content = "<span class=\"name\">Name:</span><span class=\"value\"> #{data.name}</span><br/>"
    content +="<span class=\"name\">Team:</span><span class=\"value\"> #{data.team}</span><br/>"
    content +="<span class=\"name\">School:</span><span class=\"value\"> #{data.school}</span><br/>"
    content +="<span class=\"name\">Position:</span><span class=\"value\"> #{data.position}</span>"
    @tooltip.showTooltip(content,d3.event)

  hide_details: (data, i, element) =>
    @tooltip.hideTooltip()

root = exports ? this

$ ->
  chart = null

  render_vis = (csv) ->
    chart = new BubbleChart csv

  d3.csv "data/players.csv", render_vis
