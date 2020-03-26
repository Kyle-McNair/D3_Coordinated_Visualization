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

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 41.83])
        .rotate([87.65, 0, 0])
        .parallels([40, 45])
        .scale(95000.00)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];

    promises.push(d3.csv("data/Chicago_Neighborhoods.csv"));
    promises.push(d3.json("data/Chicago_Neighborhoods.topojson"));
    promises.push(d3.json("data/LakeMichigan.topojson"));
    promises.push(d3.json("data/states.topojson"));

    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        chicago = data[1];
        lake =data[2];
        state = data[3];

        var chicagoNeighborhoods = topojson.feature(chicago, chicago.objects.Chicago_Neighborhoods).features;
        var lakeRegions = topojson.feature(lake, lake.objects.LakeMichigan);
        var stateRegions = topojson.feature(state, state.objects.states);

        var midwest = map.append("path")
            .datum(stateRegions)
            .attr("class", "states")
            .attr("d", path); 

        var greatLake = map.append("path")
            .datum(lakeRegions)
            .attr("class", "LakeMichigan")
            .attr("d",path);

        var chi = map.selectAll(".community")
            .data(chicagoNeighborhoods)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "community " + d.properties.Neighborho;
            })
            .attr("d", path);
        };
};