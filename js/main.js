//variables for data join

var attrArray = ["No High School Diploma", "High School Diploma", "Some College", "Bachelors Degree or Higher",	"Education Total",
    "Owner Occupied", "Renter Occupied", "Total Housing", "Below Poverty", "Percent Below Poverty",	"Total with Health Insurance",
    "Percent Insured",	"Percent Uninsured", "Income < $10,000",	"Income $10,000-$14,999", "Income $15,000-$19,999",	"Income $20,000-$24,999",
    "Income $25,000-$29,999", "Income $30,000-$34,999", "Income $35,000-$39,999", "Income $40,000-$44,999", "Income $45,000-$49,999",
    "Income $50,000-$59,999", "Income $60,000-$74,999", "Income $75,000-$99,999", "Income $100,000-$124,999", "Income $125,000-$149,999",
    "Income $150,000-$199,999",	"Income > $200,000", "Total Count",	"Median Household Income"];


var expressed = attrArray[30]; //initial attribute


//begin script when window loads
window.onload = setMap();


//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth*0.5,
        height = 700;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)
        .style("float","left");

    //create Albers equal area conic projection centered on Chicago
    var projection = d3.geoAlbers()
        .center([-0.05, 41.83])
        .rotate([87.65, 0, 0])
        .parallels([40, 45])
        .scale(97000.00)//extra zoom since this is a large scale map
        .translate([width / 2, height / 2]);
    //call in the projection
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    //promises will use d3 to push the csv and topojson files of Chicago neighborhood boundaries,
    //Lake Michigan, and the Illinois/Indiana state boundaries.
    promises.push(d3.csv("data/Chicago_Neighborhoods.csv"));
    promises.push(d3.json("data/Chicago_Neighborhoods.topojson"));
    promises.push(d3.json("data/LakeMichigan.topojson"));
    promises.push(d3.json("data/states.topojson"));
    //list of promises goes and has the callback function be called
    Promise.all(promises).then(callback);

    //callback brings in the data
    function callback(data){
        //these 4 variables list are from the promise list
        //this will be used for the topojson work.
        csvData = data[0];
        chicago = data[1];
        lake =data[2];
        state = data[3];

        //topojson is used to be brought into the datum when using d3
        //chicagoNeighborhoods has .features at the end so it can map out all the nieghborhood boundaries
        var chicagoNeighborhoods = topojson.feature(chicago, chicago.objects.Chicago_Neighborhoods).features;
        var lakeRegions = topojson.feature(lake, lake.objects.LakeMichigan);
        var stateRegions = topojson.feature(state, state.objects.states);

        chicagoNeighborhoods = joinData(chicagoNeighborhoods, csvData);

        //midwest variable brings in the Illinois and Indiana state boundarie
        var midwest = map.append("path")
            //calls the stateRegions from above
            .datum(stateRegions)
            //states class used to change color in css
            .attr("class", "states")
            .attr("d", path); 

        //greatLake variable brings in Lake Michigan
        var greatLake = map.append("path")
            //calls the lakeRegions from above
            .datum(lakeRegions)
            //LakeMichigan is used to change colors in css
            .attr("class", "LakeMichigan")
            .attr("d",path);

        //create the color scale
        var colorScale = makeColorScale(csvData);

        setEnumerationUnits(chicagoNeighborhoods, map, path, colorScale);

        setTitle(csvData)
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        };
};

function makeColorScale(data){
    var colorClasses = [
        "#edf8e9",
        "#bae4b3",
        "#74c476",
        "#31a354",
        "#006d2c"];
    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

function joinData(chicagoNeighborhoods, csvData){
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.Neighborho; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<chicagoNeighborhoods.length; a++){

            var geojsonProps = chicagoNeighborhoods[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.Neighborho; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return chicagoNeighborhoods;
};

function setEnumerationUnits(chicagoNeighborhoods, map, path, colorScale){
    //.community is different as the map will select all from the chicagoNeighborhoods data and then brings it in.
    var chi = map.selectAll(".community")
        .data(chicagoNeighborhoods)
        .enter()
        .append("path")
        //draws the boundaries of each neighborhood
        .attr("class", function(d){
            return "community " + d.properties.Neighborho;
                })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value){
                return colorScale(d.properties[expressed]);
            } else{
                return "#ccc"
            }
        });
};

function setTitle(csvData){
    var titleWidth = window.innerWidth * 0.47,
        titleHeight = 30;

    var chartTitle = d3.select("body")
        .append("svg")
        .attr("width", titleWidth)
        .attr("height", titleHeight)
        .attr("class", "chartTitle");

    var chartText = chartTitle.append("text")
        .attr("x", 10)
        .attr("y", 25)
        .attr("class", "titleText")
        .text("Chicago Demographic Data: " + expressed);
};

function setChart(csvData, colorScale){

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.47,
        chartHeight = 660;

    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var xScale = d3.scaleLinear()
        .range([0, chartWidth])
        .domain([0, 125000]);
        
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed] - a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.Neighborho;
        })
        .attr("height", chartHeight / csvData.length - 1)
        .attr("y", function(d, i){
            return i * (chartHeight / csvData.length);
        })
        .attr("width", function(d){
            return xScale(parseFloat(d[expressed]));
        })
        // .attr("x", function(d){
        //     return chartWidth - xScale(parseFloat(d[expressed]))
        // })
        .style("fill", function(d){
                return colorScale(d[expressed]);
        })
        .style("stroke", "#000000")
        .style("stroke-width", "0.5px");

    var numbers = chart.selectAll(".numbers")//used to bring in labels of the total values
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return b[expressed] - a[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.Neighborho;
        })
        .attr("text-anchor", "middle")
        .attr("y", function(d, i){
            var fraction = chartHeight / csvData.length;
            return i * fraction + (fraction - 1);
        })
        .attr("x", function (d){
            return xScale(d[expressed]) + 15;})
        .text(function(d){
            return " -- " + d[expressed];
        });

};