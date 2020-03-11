//execute script when window is loaded
window.onload = function(){

    var w = 900, h = 500;

    var container = d3.select("body") //get the <body> element from the DOM
          .append("svg") //put a new svg in the body
            .attr("width", w) //assign the width
            .attr("height", h) //assign the height
            .attr("class", "container")
            .style("background-color", "rgba(0,0,0,0.2)");

            //innerRect block
    var innerRect = container.append("rect") //put a new rect in the svg
            .datum(400) //a single value is a datum
            .attr("width", function(d){return d * 2;})
            .attr("height", function(d){return d;})
            .attr("class", "innerRect") //class name
            .attr("x", 50) //position from left on the x (horizontal) axis
            .attr("y", 50) //position from top on the y (vertical) axis
            .style("fill", "#FFFFFF"); //fill color


    var cityPop = [
    {
        city: 'Madison',
        population: 233209
    },
    {
        city: 'Milwaukee',
        population: 594833
    },
    {
        city: 'Green Bay',
        population: 104057
    },
    {
        city: 'Superior',
        population: 27244
    }];



    var x = d3.scaleLinear() //create the scale
        .range([90, 810]) //output min and max
        .domain([0, 3]); //input min and max

    var minPop = d3.min(cityPop, function(d){return d.population;});

        //find the maximum value of the array
    var maxPop = d3.max(cityPop, function(d){return d.population;});

        //scale for circles center y coordinate
    var y = d3.scaleLinear().range([450, 50]).domain([0, 700000]); //was minPop, maxPop);

    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])
        .domain([
            minPop,
            maxPop
        ]);

    var circles = container.selectAll(".circles")
            .data(cityPop) //here we feed in an array
            .enter() //one of the great mysteries of the universe
            .append("circle") //add a circle for each datum
              .attr("class", "circles") //apply a class name to all circles
              .attr("id", function(d){return d.city;})
              .attr("r", function(d){var area = d.population * 0.01; return Math.sqrt(area/Math.PI);})
              .attr("cx", function(d, i){ return x(i);})
              .attr("cy", function(d){return y(d.population);})
              .style("fill", function(d, i){ return color(d.population);})
              .style("stroke", "#000"); //black circle stroke

    var yAxis = d3.axisLeft(y);

    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);
};
