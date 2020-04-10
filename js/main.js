(function(){
//variables for data join
//Updated names of the array tht will be joined with data
var attrArray = ["No High School Diploma", "High School Diploma", "Some College", "Bachelors Degree or Higher",	"Education Total",
    "Owner Occupied", "Renter Occupied", "Total Housing", "Below Poverty", "Percent Below Poverty",	"Total with Health Insurance",
    "Percent Insured",	"Percent Uninsured", "Income < $10,000",	"Income $10,000-$14,999", "Income $15,000-$19,999",	"Income $20,000-$24,999",
    "Income $25,000-$29,999", "Income $30,000-$34,999", "Income $35,000-$39,999", "Income $40,000-$44,999", "Income $45,000-$49,999",
    "Income $50,000-$59,999", "Income $60,000-$74,999", "Income $75,000-$99,999", "Income $100,000-$124,999", "Income $125,000-$149,999",
    "Income $150,000-$199,999",	"Income > $200,000", "Total Count",	"Median Household Income"];

//expressed goes through each attribute from attrArray
var expressed = attrArray[0]; //initial attribute


//chart frame dimensions
var chartWidth = window.innerWidth * 0.55,
chartHeight = 400
leftPadding = 55,
rightPadding = 10,
topBottomPadding = 10,
chartInnerWidth = chartWidth - leftPadding - rightPadding,
chartInnerHeight = chartHeight - topBottomPadding * 2,
translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
.range([380, 0])
.domain([0, 130000]);

//begin script when window loads
window.onload = setMap();


//set up choropleth map
function setMap(){
    
    //map frame dimensions
    var width = window.innerWidth*0.4,
        height = 800;

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

        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        createDropdown(csvData)
        

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
        var csvKey = csvRegion.Neighborhood; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<chicagoNeighborhoods.length; a++){
            //goes through the csv and joins the chicago neighborhood json to join the data by the neighborhood name
            var geojsonProps = chicagoNeighborhoods[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.Neighborhood; //the geojson primary key

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
            return "community " + d.properties.Neighborhood;
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
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    var desc = chi.append("desc")
        .text('{"stroke": "#000", "stroke-width": "1px"}');
};


function setChart(csvData, colorScale){

    //adding a blank svg to the html page
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

//create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    // var yScale = d3.scaleLinear()
    //     .range([380, 0])
    //     .domain([0, 130000]);

    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
                    //this function sorts from highest to lowest values
                return b[expressed] - a[expressed]
                })
        .attr("class", function(d){
            return "bar " + d.Neighborhood;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');


    var yAxis = d3.axisLeft()
        .scale(yScale);
        

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 300)
        .attr("y", 30)
        .attr("class", "titleText")
        .text("Chicago Demographic Data: " + expressed);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    updateChart(bars, csvData.length, colorScale);

};
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    var chi = d3.selectAll(".community")
        .transition()
        .duration(750)
        .style("fill", function(d){
            //use value variable from the expressed value
            var value = d.properties[expressed];
            if(value){
                //colors are used from the expressed global variable
                return colorScale(value);
            } else{
                return "#ccc"
            }
        });

    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition()
        .delay(function(d, i){
            return i * 10
        })
        .duration(500)

    updateChart(bars, csvData.length, colorScale, csvData);
};
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 380 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
    });
    var chartTitle = d3.select(".titleText")
    .text("Chicago Demographic Data: " + expressed);
};
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.Neighborhood)
        .style("stroke", "#4a1486")
        .style("stroke-width", "3");
    setLabel(props)
};
function dehighlight(props){
    var selected = d3.selectAll("." + props.Neighborhood)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.Neighborhood + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.Neighborhood);
};
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
})();