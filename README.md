potato
=======

A d3 force graph visualization tool/toy.  Useful for initial exploration
of relatively small ( < 2500 data points), categorical datasets.

Live Demo: http://www.chasjhin.com/potato

Heavily inspired by:
 - http://vallandingham.me/bubble_charts_in_d3.html
 - http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
 - http://www.delimited.io/blog/2013/12/19/force-bubble-charts-in-d3

Originally I built this to just handle the NFL dataset, and then decided
to try and abstract the tool to work with any categorical dataset in csv
form.

The file uploader uses the HTML5 file API.  As a result, uploaded files
are 'uploaded' to your browser and *not* to my website (aka never travel
the tubes).
So, short of someone stealing information from your browser, any
uploaded data is relatively secure. 

All demo datasets are derived from publically available data.
The football data is mostly pulled from ESPN.go.com, the billionaire database is a mixture of bloomberg's website and forbes.
All of those names/rights to the data are owned by their respective owners.

Wishlist:
- [ ] Data doesn't always fit on the screen well.
- [ ] Limit number of filters/categories for a given column/category
- [ ] Catch massive datasets to prevent browser from crashing
- [ ] click and drag RTS style rectangle selector
- [ ] continuous variables (obvious use is for node radius/
  size, but color could be useful as well).
