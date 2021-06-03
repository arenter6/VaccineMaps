//set data_url variable
<script src='https://d3js.org/d3.v4.min.js'></script>
var margin = { top: 20, right: 30, bottom: 40, left: 40 },
    width = 600 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object
var svg = d3.select("#rating-viz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");
// get the data
d3.csv("test_dataa.csv", function (data) {
    // X axis
    // var x = d3.scaleBand()
    var x = d3.scaleLinear()
        .domain([1, 5])
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    var histogram = d3.histogram()
        .value(function (d) { return d.rating; })
        .domain(x.domain())
        .thresholds(5);

    // get data bins
    var bins = histogram(data);
    // Y axis: scale and draw:
    // var y = d3.scalePoint()
    var y = d3.scaleLinear()
        .range([height, 0]);
    //y domain is capped at the highest bar
    y.domain([0, d3.max(bins, function (d) { return d.length; }) + d3.max(bins, function (d) { return d.length; }) / 10]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // appends x label
    svg.append("text")
        .attr("transform",
            "translate(" + (width / 2) + " ," +
            (height + margin.top + 10) + ")")
        .style("text-anchor", "middle")
        .text("Rating");

    //appens y label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Count");

    // append the bar rectangles to the svg element
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", 1)
        .attr("transform", function (d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
        .attr("width", function (d) { return x(d.x1) - x(d.x0) - 1; })
        .attr("height", function (d) { return height - y(d.length); })
        .style("fill", "#89cff0")

});
