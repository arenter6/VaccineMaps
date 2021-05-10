//TODO!!
//Implement search by location
//Show the nearest locations (default 10 miles) Leaflet uses meters by default so must multiply input by 1600!
//Have side table sorted by nearest location and availability (Other options include range and availability)
//Selection Menu
//Sort by availability and closest to user input

//Dynamic map scrolling that updates the pins and table near map center

//Corner cases!!
    //Make sure user cannot enter in non-US zipcode or non-US address
    //Make sure user only inputs alpha-numerical input

    //Make sure range is non negative and zipcode is between 500 and 99500
    //Clear markers every time a new zip code is entered
    //Bug where if the state is small, will only display that state's locations  <-- Import entire US instead of state, problem -> may cost more time to run

//Change some jQuery to Axios
    //XML parser

//TODO
  //Each pin should have a custom icon
  //Green pin for available, Red pin for not available
  //If a site has been reviewed, blue stroke but with availability colored pin
  //If pin is clicked on, call database to get table of reviews
  //Implement table that has coordinates from its address
  //Include images (if have time)


//Vue stuff here
let app = {};

let init = (app) => {
    app.data = {
        search_location: "",
        state: "CA", //by Default it is california
        zipcode: "",
        geoJson: null,
        map_layer: null,
        range: { // Default search radius is 10 miles
            number: 10,
        },
        //Vaccine types (not likely)
    };

    app.clear_search = function() {
        app.vue.zipcode = "";
    };

    app.search = function() {
        // USPS Adddress API - POST request - City/State Lookup Web Tool
        // Params.: API: CityStateLookup,
        // XML: <CityStateLookupRequest USERID="{{USERID}}"><ZipCode ID="0"><Zip5>20024</Zip5></ZipCode></CityStateLookupRequest>
        let request_city = "https://secure.shippingapis.com/ShippingAPI.dll?API=CityStateLookup&XML=<CityStateLookupRequest USERID=\"";
        // Concatenate USERID to request
        request_city += user_id + "\"><ZipCode ID='0'><Zip5>";
        // Add zipcode from input and finish request string
        request_city += app.vue.zipcode + "</Zip5></ZipCode></CityStateLookupRequest>";

        if (app.vue.geoJson) {
            console.log("Removed the map layer");
            app.vue.geoJson.clearLayers();
        }
        // Parse USPS City/State Lookup request
        axios.get(request_city).then(function(response) {
            console.log(response);
            var xml = $.parseXML(response.data),
                      $xml = $( xml ),
                      $state = $xml.find('State');
            // Assign U.S. state variable
            app.vue.state = $state.text();
            console.log(app.vue.state);
            // Process GET request from openstreetmap.org using Zip code and U.S. state
            $.get("https://nominatim.openstreetmap.org/search?format=json&limit=3&q="+app.vue.zipcode+"+"+app.vue.state, function(coord){
                console.log(coord);
                // request will fill latitude and longtitude variables
                var lat = coord[0]['lat'];
                var lng = coord[0]['lon'];
                // Use flyTo() to smoothly interpolate between locations
                // Params.: center: [lat, lng] - where lat, lng are numbers; centers map position
                // zoom: number - zoom level set to 13 when searches are conducted
                map.flyTo([lat, lng], 13);

                //var lng_float = Math.abs(parseFloat(lng), map.getBounds().getEast());
                //console.log(lng_float);
                var distance = app.vue.range.number*1600; //Converts miles from range input to meters
                console.log("The radius is " + distance + " meters");
                axios.get("https://www.vaccinespotter.org/api/v0/states/" + app.vue.state + ".json").then(function(response) {
                    let data = response.data;
                    console.log("Successfully loaded data");
                    console.log(data);
                    app.vue.geoJson = L.geoJson(data, { filter:
                        function(feature, layer) {
                            if(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([lat,lng])) <= distance) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    }).bindPopup(function (layer) {
                        var popup = "<b>" + layer.feature.properties.name + "</b>";
                        popup += "<h2>" + "Provider: " + layer.feature.properties.provider_brand_name + "</h2>";
                        popup += "<h2>" + "Address: " + layer.feature.properties.address + "</h2>";
                        popup += "<h2>" + "City: " + layer.feature.properties.city + "</h2>";
                        popup += "<h2>" + "Zip Code: " + layer.feature.properties.postal_code + "</h2>";
                        //Calculate distance from user input
                        //No way to tell what vaccine each site carries
                        if(layer.feature.properties.appointments_available == true) {
                            popup += "<h2 class='has-text-success'>Available</h2>";
                            popup += "<a href='" + layer.feature.properties.url + "'>" + "Book an Appointment" + "</a>";
                        } else {
                            popup += "<h2 class='has-text-danger'>Not Available</h2>";
                        }
                        return popup;
                    }).addTo(map);
                    app.clear_search();
                });
            });
        });
    };

    app.methods = {
        clear_search: app.clear_search,
        search: app.search,
    };

    app.vue = new Vue({
        el : "#vue-target",
        data: app.data,
        methods: app.methods
    });

    app.init = () => {
    };
    app.init();
};

init(app);

// setView(); position map, to UCSC Campus w/ zoom level 13 when Map initiates
var map = L.map('mapid').setView([36.9881, -122.0582], 13);

// Mapbox Static Tiles API
// https://docs.mapbox.com/help/troubleshooting/migrate-legacy-static-tiles-api/
// https://docs.mapbox.com/api/maps/static-tiles/
// Tiles are 512x512 pixels and are offset by 1 zoom level.
// {z}/{x}/{y}: Are the tile coordinates. They specify the tile's zoom level, column, and row respectively.
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    // String to be shown in the attribution control. Legal obligation towards copyright holders and tile providers 
    attribution: 'Room 12 Prototype Mark II Alpha 0.91 Beta 4.20 Demo 6 Area 51 Operation Made You Look',
    
    // The max zoom level up to which this layer will be displayed (inclusive)
    maxZoom: 18,
    // ***** WARNING: If you do not include the tileSize: 512 and zoomOffset: -1 options, your map will still
    // ***** load but labels, icons, and other features may appear much smaller than expected.  
    
    // Width and height of tiles in the grid. Default is 512
    // Use a num if width and height are equal, or L.point(width, height) otherwise
    tileSize: 512,
    
    // The zoom number used in tile URLs will be offset with this value. Default is 0
    zoomOffset: -1,
    
    // The ID of the style from which to return a raster tile     
    id: 'mapbox/streets-v11',

    // Maps API key
    accessToken: api_key
}).addTo(map);

// Commented out the marker for UCSC, since we only want markers for Vaccine Locations
// Unless we start with the marker, then clear it in the search.
var marker; //= L.marker([36.9881, -122.0582]).addTo(map);
marker.bindPopup("<b>University of California Santa Cruz</b><br>Sorry but it takes a long time to load big states");





