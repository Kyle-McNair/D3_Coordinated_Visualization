//execute script when window is loaded
window.onload = function(){
    // set the variables height and width
    var w = 900, h = 500;
    // set the container parameters in your body element on the html sight
    var container = d3.select("body") //get the <body> element from the DOM
          .append("svg") //put a new svg in the body
            .attr("width", w) //assign the width (from w variable)
            .attr("height", h) //assign the height (from h variable)
            .attr("class", "container") //create a new class called container
            .style("background-color", "rgba(0,0,0,0.2)"); // set the background color

            //innerRect block
    var innerRect = container.append("rect") //put a new rect in the svg
            .datum(400) //a single value is a datum
            .attr("width", function(d){return d * 2;}) //always have to return a value if you want to have an attribute
            .attr("height", function(d){return d;})
            .attr("class", "innerRect") //class name
            .attr("x", 50) //position from left on the x (horizontal) axis
            .attr("y", 50) //position from top on the y (vertical) axis
            .style("fill", "#FFFFFF"); //set fill color

    // set the dataset
    // cityPop is a list of Wisconsin cities with its population
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


    // set the parameters for the x variable and the x axis of the d3 chart (bubblechart in this case)
    var x = d3.scaleLinear() //create the scale
        .range([90, 810]) //output min and max
        .domain([0, 3]); //input min and max
    //minPop is used to later set the color range of the bubble chart (the darker the color the more populated)
    var minPop = d3.min(cityPop, function(d){return d.population;});

        //find the maximum value of the array with the same d.population attribute
    var maxPop = d3.max(cityPop, function(d){return d.population;});

        //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50])
        .domain([0, 700000]); //was minPop, maxPop);
    //set the color range for the bubble chart based on population
    var color = d3.scaleLinear()
        .range([ //range is between two colors in hex code
            "#FDBE85",
            "#D94701"
        ])
        .domain([// domains are the populations
            minPop,
            maxPop
        ]);
    //create the circles to be on the chart
    var circles = container.selectAll(".circles")
            .data(cityPop) //here we feed in an array
            .enter() //one of the great mysteries of the universe
            .append("circle") //add a circle for each datum
              .attr("class", "circles") //apply a class name to all circles
              .attr("id", function(d){return d.city;})
              .attr("r", function(d){var area = d.population * 0.01; return Math.sqrt(area/Math.PI);})//get radius of the circle
              .attr("cx", function(d, i){ return x(i);})//where the circle is placed on the x axis
              .attr("cy", function(d){return y(d.population);})//where the circle is placed on the y axis
              .style("fill", function(d, i){ return color(d.population);})//this is where the color range is used based on population
              .style("stroke", "#000"); //black circle stroke
    //create yAxis variable that will be called in axis variable    
    var yAxis = d3.axisLeft(y);
    //create y axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);
    //append the title to your chart
    var title = container.append("text")
        .attr("class", "title")//class is title - can be edited in CSS
        .attr("text-anchor", "middle")//title be in the middle of the chart
        .attr("x", 450)//where on the x and y plot to have the title in the text tag
        .attr("y", 30)
        .text("City Populations in Wisconsin"); //name of title

    var labels = container.selectAll(".labels")
        .data(cityPop) //bring in cityPop data for labels
        .enter()//enter is needed to bring in the labels
        .append("text")//bring in text tag with the class "labels" that can be edited in CSS
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){return y(d.population) + 5;});//this moves the label 5 pixels up

    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")//CSS class for the city label
        .attr("x", function(d,i){return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;}) //putting the city name label to the right of the circle
        .text(function(d){return d.city;}); //City label appears

    var format = d3.format(",") //this puts a comma in the population labels

    var popLine = labels.append("tspan")
        .attr("class", "popLine") //CSS class for the population label
        .attr("x", function(d,i){return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;}) //putting the population label to the right of the circle
        .attr("dy", "15")
        .text(function(d){return "Pop. " + format(d.population);});//population appears with "Pop. " before it


};
