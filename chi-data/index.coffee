class BubbleChart
  constructor: (data) ->
    @data = data
    @width = 940
    @height = 700

    @tooltip = CustomTooltip("player_tooltip")

    @vis = d3.select("#vis").append("svg")
      .attr("width", @width)
      .attr("height", @height)

    @force = d3.layout.force()
      .gravity(-0.01)
      .charge((d) -> -Math.pow(d.radius, 2.0) / 6 )
      .size([@width, @height])

    # this is necessary so graph and model stay in sync
    # http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
    @nodes = @force.nodes()

    this.do_teams()
    this.do_schools()
    this.do_positions()

  do_teams: ->
    teams = []

    @data.forEach (d) => # from data, add all unique teams to array
      if teams.indexOf(d.team) < 0
        teams.push d.team

    teams = teams.sort()

    d3.select("#team-select").selectAll('option').data(teams).enter()
      .append("option")
      .attr("value", (d) -> d)
      .text((d) -> d)

    $("#team-select").select2({
      placeholder: 'Select a Team',
      width: 'resolve'
    }).on("change", (e) => this.toggleField('team', e))

  do_schools: ->
    schools = []

    @data.forEach (d) => # from data, add all unique schools to array
      if schools.indexOf(d.school) < 0
        schools.push d.school

    d3.select("#school-select").selectAll('option').data(schools).enter()
      .append("option")
      .attr("value", (d) -> d)
      .text((d) -> d)

    $("#school-select").select2({
      placeholder: 'Select a School',
      width: 'resolve'
    }).on("change", (e) => this.toggleField('school', e))


    @conferences = [ { name: "SEC", teams: [ "LSU", "Alabama", "Florida", "Georgia", "Kentucky", "Missouri", "South Carolina", "Tennessee", "Vanderbilt", "Arkansas", "Auburn", "Mississippi", "Mississippi State", "Texas A&M;" ] },
      { name: "ACC", teams: [ "Boston College", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami (Fla.)", "North Carolina", "North Carolina State", "Pittsburgh", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest" ] }
    ]
    # conferences
    d3.select("#school-select-wrapper").selectAll('button').data(@conferences).enter()
      .append("button")
      .attr("value", (d) -> d.name)
      .text((d) -> d.name)
      .on("click", (d) -> $("#school-select").select2('val', d.teams, true))

  do_positions: ->
    positions = []

    @data.forEach (d) => # from data, add all unique positions to array
      if positions.indexOf(d.position) < 0
        positions.push d.position

    d3.select("#position-select").selectAll('option').data(positions).enter()
      .append("option")
      .attr("value", (d) -> d)
      .text((d) -> d)

    $("#position-select").select2({
      placeholder: 'Select a Position',
      width: 'resolve'
    }).on("change", (e) => this.toggleField('position', e))

  # select2 passes in object e, which contains either .added or .removed based on action
  # e.added.id && e.removed.id are the values of the options,
  # eg. team name or school name
  toggleField: (field, e) =>
    if typeof e.added != 'undefined'
      if typeof e.added.id != 'undefined'
        this.add_nodes(field, e.added.id)
      else # a group was added

        this.remove_nodes('radius', 8) # hacky way to clear the board

        e.added.forEach (item) =>
          this.add_nodes(field, item.id)
    else if typeof e.removed != 'undefined'
      this.remove_nodes(field, e.removed.id)

  add_nodes: (field, val) =>
    @data.forEach (d) =>
      if d[field] == val
        node = {
          id: d.id
          radius: 8
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

    # create new circles as needed
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
    content = "<div class='tooltip-name'>#{data.name}</div>"
    content +="#{data.team}<br/>"
    content +="#{data.school}<br/>"
    content +="#{data.position}"
    @tooltip.showTooltip(content,d3.event)

  hide_details: (data, i, element) =>
    @tooltip.hideTooltip()

root = exports ? this

$ ->
  chart = null

  render_vis = (csv) ->
    chart = new BubbleChart csv

  d3.csv "data/players.csv", render_vis
