//variables for data join

var attrArray = ["No_HS_Diploma", "HS_Diploma", "Some_College", "Bachelors_or_Greater", "Edu_Total","Owner_Occ","Renter_Occ","Total_Housing",
"Below_Pov","Pct_Below_Poverty","Total_Ins","Perc_Ins","Perc_Unins","Less_10G","10G_15G","15G_20G","20G_25G","25G_30G","30G_35G",
"35G_40G","40G_45G","45G_50G","50G_60G","60G_75G","75G_100G","100G_125G", "125G_150G", "150G_200G", "200G_More", "Total_Count", "Median_Household"];
var expressed = attrArray[0]; //initial attribute


//begin script when window loads
window.onload = setMap();


//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 800,
        height = 800;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Chicago
    var projection = d3.geoAlbers()
        .center([0, 41.83])
        .rotate([87.65, 0, 0])
        .parallels([40, 45])
        .scale(95000.00)//extra zoom since this is a large scale map
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

        setEnumerationUnits(chicagoNeighborhoods, map, path);
        };
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

function setEnumerationUnits(chicagoNeighborhoods, map, path){
    console.log(chicagoNeighborhoods)
    //.community is different as the map will select all from the chicagoNeighborhoods data and then brings it in.
    var chi = map.selectAll(".community")
        .data(chicagoNeighborhoods)
        .enter()
        .append("path")
        //draws the boundaries of each neighborhood
        .attr("class", function(d){
            return "community " + d.properties.Neighborho;
                })
        .attr("d", path);
}