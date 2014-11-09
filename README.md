potato
=======

A d3 force graph visualization tool/toy.  Useful for exploration
of relatively small ( <1500 data points), flat datasets.

Live Demo: http://www.chasjhin.com/potato

Inspired by:
 - http://vallandingham.me/bubble_charts_in_d3.html
 - http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
 - http://www.delimited.io/blog/2013/12/19/force-bubble-charts-in-d3

Originally I built this just for the NFL dataset, and then decided
to try and abstract the tool to work with any categorical dataset in csv form.

The file uploader uses the HTML5 file API.  As a result, uploaded files
stay in your browser and do **not** travel the tubes.
In other words, any uploaded data is relatively secure.

All demo datasets are derived from publically available data.
- Football: ESPN.go.com
- Billionaire: bloomberg.com + forbes.com
- Automobile: [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/Automobile)
All datasets and the contents/names/rights are owned by their respective owners.

Wishlist:
- [ ] Data doesn't always fit on the screen well.
- [ ] Limit number of filters/categories for a given column/category
- [ ] Catch massive datasets to prevent browser from crashing
- [ ] click and drag RTS style rectangle selector
- [ ] color by continuous variables
