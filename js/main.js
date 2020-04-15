// Kyle McNair - D3 Coordinated Visualization

// Have the whole main js be a function
(function(){
//variables for data join
//Updated names of the array tht will be joined with data
var attrArray = ["No High School Diploma","High School Diploma","Some College","Bachelors Degree or Higher","Below Poverty",
"Have Health Insurance", "Median Household Income"];

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
        
        //add coordinated visualizations to the map
        //bar chart
        setChart(csvData, colorScale);
        // parallel plot
        setParallelPlot(csvData)
        //function to add the dropdown menu
        createDropdown(csvData)
        //setCredits just appends text through d3 to add the source data.
        setCredits()
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
        //info label and highlight appears wherever mouse is hovered
        .on("mouseover", function(d){
            highlight(d.properties);
        }) // when the enumeration unit is not highlighted, the unit will be dehighlighted 
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })//while the mouse is hovered on a unit, the info label html div element will adjust its position based on screen real estate. 
        .on("mousemove", moveLabel);

    // the "desc" adds the text of the initial stroke line style properties. This is essential for the dehighlight function, as it reverts
    // back to the desc element and will reapply the style based on this desc.
    var desc = chi.append("desc")
        .text('{"stroke": "#000", "stroke-width": "1px"}');
};

function setChart(csvData, colorScale){
    //yDomain is a local variable
    var yDomain;
    //incomeDomain is the Y domain for the median household income variable
    var incomeDomain = 120000;
    //percentDomain is the Y domain for all the other attributes, which are normalized as percentages.
    var percentDomain = 100;
    // IF statement: if the expressed variable is selected as Median Household Income, then the
    // yDomain will be 120000, this will determine how the Yaxis is labeled on the bar chart.
    if(expressed == 'Median Household Income'){
        yDomain = incomeDomain
    } else {
        yDomain = percentDomain
    };
    // yScale will have the yDomain as the .domain
    var yScale = d3.scaleLinear()
        .range([780, 0])
        .domain([0, yDomain]);

    //adding a blank svg to the html page
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart"); // .chart is for css

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground") // .chartBackground is for css
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create the bars on the chart
    var bars = chart.selectAll(".bar")
        .data(csvData)// use the csv data
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
        .on("mouseover", highlight) // the mouseover/out/move functions are applied just like the enumeration units.
        .on("mouseout", dehighlight) //the bars will be highlighted and dehighlighted.
        .on("mousemove", moveLabel); // infoLabel html element will adjust position based on mouse and screen real estate.
    
    // the desc will also be appeneded in the bars so the dehighlight function can call this desc tag in to bring back the original style.
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    
    // create Yaxis, the yscale is brought in which contains the yDomain 
    var yAxis = d3.axisLeft()
        .scale(yScale)
        
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 280)
        .attr("y", 30)
        .attr("class", "titleText") // .titleText is for css
        .text("Chicago Demographic Data: " + expressed); // expressed is the attribute name.
        

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis") //.axis is for css
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //update chart is used to adjust the colors, bar sizing, and the axis based on the selected attribute.
    updateChart(bars, csvData.length, colorScale, chart, axis);

};
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")//.dropwdown is for css, this will also determine the placement on the screen
        .on("change", function(){
            changeAttribute(this.value, csvData)// when attribute is changed, the changeAttribute function is called to update.
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption") //.titleOption for css
        .attr("disabled", "true")
        .text("Select Demographic"); // initial text when opening the page

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray) //the list of data inside the dropdown menu
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

    // chicago neighborhood boundaries are going to be updated
    var chi = d3.selectAll(".community")
        .transition() //transition is the "animation" for changing the data display
        .duration(750) //duration of transition (750 is 0.75 seconds)
        .style("fill", function(d){
            //use value variable from the expressed value
            var value = d.properties[expressed];
            if(value){
                //colors are used from the expressed global variable
                return colorScale(value);
            } else{
                return "#ccc" //if there are values without any values, #ccc is the default color value
            }
        });

    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            //sorts out form highest to lowest for the bar chart
            return b[expressed] - a[expressed];
        })
        .transition() // changes the data through transition
        .delay(function(d, i){ //delay is to have the chart transition with a slight delay
            return i * 10
        })
        .duration(500)
    
    //updateChart is also called, as this will update the colorScale and bars on the chart/map.
    updateChart(bars, csvData.length, colorScale, csvData);
};
function updateChart(bars, n, colorScale){
    //similar to setChart, the updateChart follows the same procedure for yDomain
    var yDomain;
    var yTick; // since the first default attribute is in percent, the updateChart will update the tickformat on the Y axis.
    var incomeDomain = 120000;
    var percentDomain = 100;
    if(expressed == "Median Household Income"){
        yDomain = incomeDomain
        yTick = (d => "$" + d3.format(",.0f")(d))//tick format will be in dollar sign if Median Household Income is selected.
    } else {
        yDomain = percentDomain
        yTick = (d => d + "%") // the tick format will be in percent if it Median Household Income is not selected. 
    };
    //yDomain is entered to determine yScale.
    var yScale = d3.scaleLinear()
        .range([380, 0])
        .domain([0, yDomain]);

    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 380 - yScale(parseFloat(d[expressed]));
        })
        //bars adjusted based on the yScale
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
    //yAxis is created, the .tickFormat is added in order to change the tick syntax.
    var yAxis = d3.axisLeft()
        .tickFormat(yTick)
        .scale(yScale)

    var axis = d3.select(".axis")
        .transition()//changing the axis with design.
        .duration(750)
        .call(yAxis)
    
    var chartTitle = d3.select(".titleText")
    // chart title is updated based on selected attribute. 
        .text("Chicago Demographic Data: " + expressed);
};
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.Neighborhood )//if the mouse is hovered over an element with .Neighborhood name, the charts and map will highlight that unit.
        .style("stroke", "#c51b8a") //color and stroke width
        .style("stroke-width", "3");
    setLabel(props)//html element will popup if hovered over a unit.
};
function dehighlight(props){
    var selected = d3.selectAll("." + props.Neighborhood) //same condition as highlight, but if the mouse is not hovered over.
        .style("stroke", function(){
            return getStyle(this, "stroke") //getStyle is a function inside this function to restore original styles.
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc") //the desc finds the same as the element to go back to original style.
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel") //remove the htlm tag.
        .remove();
};
function setLabel(props){
    //label content
    var labelAttribute

    //percent is the label for attributes with percentages
    var percent = "<h1>" + props[expressed]+"%" +
        "</h1>"+expressed;

    //income is the label for the Median Household Income percentages
    var income = "<h1>" + "$"+ d3.format(",")(props[expressed]) +
    "</h1>"+expressed;

    //IF statement, if the map/chart is showing a certain attribute, then the labelAttribute will be as follows.
    if(expressed == 'Median Household Income'){
        labelAttribute = income
    } else {
        labelAttribute = percent
    };

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")//.inforlabel for css
        .attr("id", props.Label + "_label") //this attribute is based on the selected attribute.
        .html(labelAttribute); //.html calls up the html tag

    var regionName = infolabel.append("div") //calls the region name
        .attr("class", "labelname")//.labelname for css
        .html(props.Label);// .html calls up the html tag to 
};
function moveLabel(){
    //get width of labels
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()//studies screen real estate.
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10, //determines the html placement depending where the mouse moves.
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //x for the horizontal, avoids overlap
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //y for the horizontal, avoids overlap
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel") //the infolabel html will now adjust based on mouse location
        .style("left", x + "px")
        .style("top", y + "px");
};
function setParallelPlot(csvData){
    //dimensions of the Parallel Coordinate Plot
    var margin = {top: 50, right: 80, bottom: 10, left: 80};
    width = chartWidth - margin.left - margin.right;
    height = 360 - margin.top - margin.bottom;

    //add the plot below the bar chart
    var plot = d3.select("body")
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", 375) 
    .attr("class", "plot")// .plot for css
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    //keep is a list of the csv header names. The Unique ID and label columns will not be kept. These are the attributes that are visualized in the plot.
    var keep = ["No High School Diploma","High School Diploma","Some College","Bachelors Degree or Higher","Below Poverty",
        "Have Health Insurance", "Median Household Income"]

    //dimensions variable filters the csvData based on the keep variable. 
    dimensions = d3.keys(csvData[0]).filter(function(csvData) { return keep.indexOf(csvData) >= 0 })
        
    //yDomain is used in the same process as the bar chart
    var yDomain;
    var incomeDomain = 120000;
    var percentDomain = 100;
    var y = {}
    for (i in dimensions) {
        name = dimensions[i]
        if(name == 'Median Household Income'){
        yDomain = (incomeDomain)
        } else {
        yDomain = percentDomain
        }
        y[name] = d3.scaleLinear()
            .domain( [0, yDomain] ) // --> Same axis range for each group
            .range([300, 0])
    };
    //create the x scale
    x = d3.scalePoint()
        .range([0, width])
        .domain(dimensions);//dimensions determines how the domain for the x scale is plotted. 
    
    // path is a function that goes into the csv data and "connects" the values with eachother based on the input dimensions. 
    function path(csvData) {
        return d3.line()(dimensions.map(function(p) { return [x(p), y[p](csvData[p])]; }));
        }
    //plot the lines
    plot.selectAll("body")
        .data(csvData)//uses csvData
        .enter()
        .append("path")//adds the lines
        .attr("d",  path)// path function is called
        .attr("class", function(d){
            return "path " + d.Neighborhood; //name each path as the neighborhood. This is the same approach for the other chart/map for the highlighting.
                })
        .style("opacity","1")//line color and style
        .style("fill", "none")
        .style("stroke", "#b3b3b3")
        .style("stroke-width", "0.5px")
        .append("desc")//bring in the desc for dehighlight function to work.
        .text('{"stroke": "#b3b3b3", "stroke-width": "0.5px"}');

    //plot the axis:
    plot.selectAll("body")
        //dimensions are the y axis
        .data(dimensions).enter()
        .append("g")
        .attr("class", "plotAxis")//.plotAxis for css
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        // labeling the ticks on each y Axis
        //if the axis is Median Household Income, the tick format on the axis will be in $
        //if the axis is not Median Household Income, the tick format on the axis will be in %
        .each(function(d) { if(d == 'Median Household Income'){ 
            d3.select(this)
            .call(d3.axisLeft()
            .tickFormat(d => "$" + d3.format(",.0f")(d))
            .ticks(10)
            .scale(y[d])); } else{
             d3.select(this)
            .call(d3.axisLeft()
            .tickFormat(d => d + "%")
            .ticks(10)
            .scale(y[d])); }})
        //bring in title for each axis
        .append("text")
        .attr("class","plotTitles")
        .style("text-anchor", "middle") //title is centered over the y axis
        .attr("y", -30)
        .attr("x", -10)
        .text(function(d) { return d; })//text is based on dimensions variable
        .style("padding", "5px")
        .style("fill", "Black")
        .call(wrap, 100)// wrap function is called to wrap text, this was created by Mike Bostock from D3
        // 100 is the max width for text. 
};
// wrap function created by Mike Bostock.
function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, 
          y = text.attr("y"),
          dy = 0 //in this plot keep 0, as it is above the chart.
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }
function setCredits(){
    //author is an html element of my name/site and data sources/site
    var author = "<p>Data retrieved from <a href = 'https://robparal.com/chicago-data/' target = 'blank'>Rob Paral & Associates</a> and the 2014-2018 American Community Survey from the U.S. Census Bureau</p><br><p>Created by <a href = 'https://kyle-mcnair.github.io' target = 'blank'>Kyle McNair</a></p><br><p>Last Updated: April 14, 2020</p>";
    
    //bring the html text below the map/charts
    var creditsData = d3.select("body")
        .append("div")
        .html(author)
        .attr("class", "about")
}
})();