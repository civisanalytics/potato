potato
=======

A d3 force graph visualization tool/toy.  Useful for initial exploration
of relatively small ( < 2500 data points), categorical datasets.

Live Demo: http://www.chasjhin.com/potato

Heavily inspired by:
 - http://vallandingham.me/bubble_charts_in_d3.html
 - http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
 - http://www.delimited.io/blog/2013/12/19/force-bubble-charts-in-d3

Originally I built this just for the NFL dataset, and then decided
to try and abstract the tool to work with any categorical dataset in csv form.

The file uploader uses the HTML5 file API.  As a result, uploaded files
are 'uploaded' to your browser and **not** to my website (aka never travel the tubes).
Moral of the story, any uploaded data is relatively secure, and I certainly won't see it

All demo datasets are derived from publically available data.
- Football: ESPN.go.com
- Billionaire: bloomberg.com
- Automobile: [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/Automobile)
All datasets and the contents/names/rights are owned by their respective owners.

Wishlist:
- [ ] Data doesn't always fit on the screen well.
- [ ] Limit number of filters/categories for a given column/category
- [ ] Catch massive datasets to prevent browser from crashing
- [ ] click and drag RTS style rectangle selector
- [ ] continuous variables (obvious use is for node radius/
  size, but color could be useful as well).
