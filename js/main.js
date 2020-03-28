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
        };
};