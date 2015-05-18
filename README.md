potato
=======

A d3 force graph visualization tool/toy.  Useful for exploration
of relatively small ( <1500 data points), flat datasets.

Live Demo: http://www.chasjhin.com/potato

Inspired by:
 - http://vallandingham.me/bubble_charts_in_d3.html
 - http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
 - http://www.delimited.io/blog/2013/12/19/force-bubble-charts-in-d3

The file uploader uses the HTML5 file API.  As a result, uploaded files
stay in your browser and do **not** travel the tubes.
In other words, any uploaded data is relatively secure.

### Wishlist:
- [ ] Limit number of filters/categories for a given column/category
- [ ] Catch massive datasets to prevent browser from crashing
- [ ] Size scale when size filter is set (aka size legend?)
- [ ] Allow users to change the colors.... perhaps by interacting with
  the color legend?
- [ ] More intelligent placement of split groups to better make use of
  available screen space
- [ ] Hints/tutorial for csv upload as well as for first time dataset
  exploration.  (ie. billionaire: Try splitting by source and coloring
by gender)
- [ ] Hint about zooming?...
- [ ] Allow users to either keep or remove selection?

### License
Potato is released under the [MIT License](http://www.opensource.org/licenses/MIT)

All demo datasets are derived from publically available data.
- Basketball: stats.nba.com + http://www.basketball-reference.com/contracts/players.html
- Billionaire: bloomberg.com + forbes.com
- Automobile: [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/Automobile)
All datasets and the contents/names/rights are owned by their respective owners.
