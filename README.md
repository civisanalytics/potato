pigskin
=======

Football season is starting, and I wanted an excuse to play around with d3 force graphs.  

Live Demo: http://www.chasjhin.com/pigskin

Heavily inspired by:
 - http://vallandingham.me/bubble_charts_in_d3.html
 - http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
 - http://www.delimited.io/blog/2013/12/19/force-bubble-charts-in-d3

All player names, team names, colors, organization names, conference names, etc are owned by their respective owners. And not by me. Obviously. Although do the player's really own their names anyways? What does that even mean?

TODO
- [x] grab player data
- [x] create a basic d3 force graph based off of http://vallandingham.me/bubble_charts_in_d3.html
- [x] display from a selection of teams/schools/positions
- [x] use select2
- [x] color nodes by team colors
- [ ] switch between college and professional colors
- [x] physically group by school/team/position (aka clumps)
- [x] 'grouped selectors'
  - AFC/NFC
  - SEC/ACC/PAC etc
- [ ] some colors are too close,
  - cincinatti bengals and cleveland browns
  - san diego and jacksonville
- [ ] click and drag RTS style rectangle selector
- [x] nodes will 'fall off' the boundary of the screen occasionally
- [x] headers when grouped (so if you group by team, show the team names in grey above each group)
- [x] some weird behavior occurs when you select a team and a school, but then remove one. (ends up showing A - B - (A && B), where B was the group removed)

Random things that might be possible in the future
- include continuous variables such as height/weight/salary/age and sort the vis somehow
