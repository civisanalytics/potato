class BubbleChart
  constructor: (data) ->
    @data = data
    @width = 940
    @height = 700

    @tooltip = CustomTooltip("player_tooltip", 130)

    @vis = d3.select("#vis").append("svg")
      .attr("width", @width)
      .attr("height", @height)

    @force = d3.layout.force()
      .gravity(-0.01)
      .charge((d) -> -Math.pow(d.radius, 2.0) / 8 )
      .size([@width, @height])

    @nodes = @force.nodes()

    this.do_teams()

  do_teams: ->
    @teams = []
    that = this

    @data.forEach (d) => # from data, add all unique teams to @teams
      if @teams.indexOf(d.team) < 0
        @teams.push d.team

    d3.select("#team-select").selectAll('option').data(@teams).enter()
      .append("option")
      .attr("value", (d) -> d)
      .text((d) -> d)

    $("#team-select").select2({
      placeholder: 'Select a Team',
      width: 'resolve'
    }).on("change", (e) -> that.toggleTeam(e))

  # select2 passes in object e, which contains either .added or .removed based on action
  # e.added.id && e.removed.id are the values of the options, 
  # eg. team name or school name
  toggleTeam: (e) =>
    if typeof e.added != 'undefined'
      this.add_nodes('team', e.added.id)
    else if typeof e.removed != 'undefined'
      this.remove_nodes('team', e.removed.id)

  add_nodes: (field, val) =>
    @data.forEach (d) =>
      if d[field] == val
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

  remove_nodes: (field, val) =>
    # this was the only array interator + removal I could get to work
    len = @nodes.length
    while (len--)
      if @nodes[len][field] == val
        @nodes.splice(len, 1)
    this.update()

  update: () =>
    @circles = @vis.selectAll("circle")
      .data(@nodes, (d) -> d.id)

    that = this

    @circles.enter().append("circle")
      .attr("r", 0)
      .attr("stroke-width", 3)
      .attr("id", (d) -> "bubble_#{d.id}")
      .attr("class", (d) -> d.team.toLowerCase().replace(/\s/g, '_'))
      .on("mouseover", (d,i) -> that.show_details(d,i,this))
      .on("mouseout", (d,i) -> that.hide_details(d,i,this))

    # Fancy transition to make bubbles appear to 'grow in'
    @circles.transition().duration(2000).attr("r", (d) -> d.radius)

    # this is IMPORTANT otherwise removing ndoes won't work
    @circles.exit().remove()

    @force.on "tick", (e) =>
        @circles.each(this.move_towards_center(e.alpha))
          .attr("cx", (d) -> d.x)
          .attr("cy", (d) -> d.y)

    @force.start()

  # forces nodes into a circlular clump
  move_towards_center: (alpha) =>
    (d) =>
      d.x = d.x + (@width/2.0 - d.x) * (0.1) * alpha
      d.y = d.y + (@height/2.0 - d.y) * (0.1) * alpha

  show_details: (data, i, element) =>
    content = "<span class=\"value\"> #{data.name}</span><br/>"
    content +="<span class=\"value\"> #{data.team}</span><br/>"
    content +="<span class=\"value\"> #{data.school}</span><br/>"
    content +="<span class=\"value\"> #{data.position}</span>"
    @tooltip.showTooltip(content,d3.event)

  hide_details: (data, i, element) =>
    @tooltip.hideTooltip()

root = exports ? this

$ ->
  chart = null

  render_vis = (csv) ->
    chart = new BubbleChart csv

  d3.csv "data/players.csv", render_vis
