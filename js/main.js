//variables for data join
//Updated names of the array tht will be joined with data
var attrArray = ["No High School Diploma", "High School Diploma", "Some College", "Bachelors Degree or Higher",	"Education Total",
    "Owner Occupied", "Renter Occupied", "Total Housing", "Below Poverty", "Percent Below Poverty",	"Total with Health Insurance",
    "Percent Insured",	"Percent Uninsured", "Income < $10,000",	"Income $10,000-$14,999", "Income $15,000-$19,999",	"Income $20,000-$24,999",
    "Income $25,000-$29,999", "Income $30,000-$34,999", "Income $35,000-$39,999", "Income $40,000-$44,999", "Income $45,000-$49,999",
    "Income $50,000-$59,999", "Income $60,000-$74,999", "Income $75,000-$99,999", "Income $100,000-$124,999", "Income $125,000-$149,999",
    "Income $150,000-$199,999",	"Income > $200,000", "Total Count",	"Median Household Income"];

//expressed goes through each attribute from attrArray
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

        //set enumeration units function is called
        setEnumerationUnits(chicagoNeighborhoods, map, path, colorScale);

        //set Title function is called
        setTitle(csvData)
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        };
};

function makeColorScale(data){
    //green color ranges
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
    //goes through the attribute selected to create the color scale
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
    //return the color scale that can be used for the enumeration units
    return colorScale;
};

function joinData(chicagoNeighborhoods, csvData){
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.Neighborho; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<chicagoNeighborhoods.length; a++){
            //goes through the csv and joins the chicago neighborhood json to join the data by the neighborhood name
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
    //chicagoNeighborhoods json is updated and will be returned for enumeration units and color scale
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
            //use value variable from the expressed value
            var value = d.properties[expressed];
            if(value){
                //colors are used from the expressed global variable
                return colorScale(d.properties[expressed]);
            } else{
                return "#ccc"
            }
        });
};
//create a title above the horizontal bar chart
function setTitle(csvData){
    //same width as bar chart, but height is a lot shorter.
    var titleWidth = window.innerWidth * 0.47,
        titleHeight = 30;
    //append through svg and is the same settings as bar chart, only text title is
    //what is being used.
    var chartTitle = d3.select("body")
        .append("svg")
        .attr("width", titleWidth)
        .attr("height", titleHeight)
        .attr("class", "chartTitle");

    var chartText = chartTitle.append("text")
        .attr("x", 10)
        .attr("y", 25)
        .attr("class", "titleText")
        //go through each attribute to be named
        .text("Chicago Demographic Data: " + expressed);
};

function setChart(csvData, colorScale){

    //chart frame dimensions
    //creating a horizontal bar chart
    var chartWidth = window.innerWidth * 0.47,
        chartHeight = 660;

    //adding a blank svg to the html page
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //the xScale is based on the width of the chart, and the domain is the median household income variable for now.
    var xScale = d3.scaleLinear()
        .range([0, chartWidth])
        .domain([0, 125000]);
        
    //select the bars and bring in the csvData that was joined
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            //this function sorts from highest to lowest values
            return b[expressed] - a[expressed]
        })
        //bars are based on the neighborhood values
        .attr("class", function(d){
            return "bars " + d.Neighborho;
        })
        //height of each bar
        .attr("height", chartHeight / csvData.length - 1)
        .attr("y", function(d, i){
            return i * (chartHeight / csvData.length);
        })
        //width of the bar is based on the attribute value
        .attr("width", function(d){
            return xScale(parseFloat(d[expressed]));
        })
        //color fill is used from the colorscale function of natural breaks
        .style("fill", function(d){
                return colorScale(d[expressed]);
        })
        //line colors and width
        .style("stroke", "#000000")
        .style("stroke-width", "0.5px");
    
    //adding numbers to the horizontal bar chart
    var numbers = chart.selectAll(".numbers")//used to bring in labels of the total values
        //bring in the data
        .data(csvData)
        .enter()
        //bring in the text of each bar value
        .append("text")
        .sort(function(a, b){
            //sort from highest to lowest
            return b[expressed] - a[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.Neighborho;
        })
        //the number texts will be in the middle from each bar
        .attr("text-anchor", "middle")
        .attr("y", function(d, i){
            var fraction = chartHeight / csvData.length;
            return i * fraction + (fraction - 1);
        })
        //this brings the text outside of the bar from the right by 15 pixels
        .attr("x", function (d){
            return xScale(d[expressed]) + 15;})
        //text has the dashes and the attribute value called from the expressed variable
        .text(function(d){
            return " -- " + d[expressed];
        });

};