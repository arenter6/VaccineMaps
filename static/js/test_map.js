//TODO Search and Side Menu
//Have side table sorted by nearest location and availability (Other options include range and availability)
//Implement search by address as well!


//TODO MAP optional
    //Dynamic map scrolling that updates the pins and table near map center
        //Get Lat, Long from center and get the state from API, send state to API and update map
    //Place special marker on where you enter
    //When click on a marker, it highlights its respective row on the table
        //when click off, unhighlights
        //Popped up command?
    //Check to see if range is valid (0-100) also add slider for range (css sass)


//TODO Corner cases!!
    //Make sure user cannot enter in non-US zipcode or non-US address
        //check using API and validate
    //Make sure user only inputs alpha-numerical input (non-negative)
        //Parse string
    //Make sure range is non negative and zipcode is between 500 and 99500
        //Make either an v-if statement or form validator
    //Bug where if the state is small, will only display that state's locations  <-- Import entire US instead of state, problem -> may cost more time to run
    //Make sure zipcode lookup goes to USA

//TODO code cleanup

//TODO customization
  //If a site has been reviewed, blue stroke but with availability colored pin
  //If pin is clicked on, call database to get average reviews and table of reviews
  //Implement table that has coordinates from its address
  //Include images (if have time)

//TODO table
    //make it sortable (provider, distance, availability)
    //make it default sort by distance and availability
    //when click on a row, opens respective popup on map <-- probably uses database

//TODO Comments


//Vue stuff here
let app = {};

let init = (app) => {

    app.lati = 0; //Latitude
    app.long = 0; //Longitude
    app.city = ""; //Data that will be obtained from zipcode
    app.state = ""; 

    app.data = { //This is Vue data
        search_location: null,
        zipcode: null,
        geoJson: null,
        range: { //Default search radius is 10 miles
            number: 10,
        },
        zipcode_error: false,
        range_error: false,
        map_layer: null,
        rows: [],
        page_initialized: false,
    };

    app.clear_search = function() {
        app.vue.zipcode = "";
    };

    //TODO make sure 00501 < zipcode < 99950
    //TODO Make sure range is positive
    app.check_form = function (e) {
        if (!app.vue.zipcode) {
            app.vue.zipcode_error = true;
        }
        //TODO check validity of zipcode using api/csv
        if (!this.email) {
            this.errors.push('Email required.');
        } else if (!this.validEmail(this.email)) {
            this.errors.push('Valid email required.');
        }

        if (!app.vue.zipcode) {
            app.vue.zipcode_error = true;
        }
    };

<<<<<<< HEAD
    //TODO dynamic map
    //map.getBounds()
    //esri api
    // map html should have click event

    app.search = function() {
        app.vue.page_initialized = true;
        // USPS Address API - POST request - City/State Lookup Web Tool
        // Params.: API: CityStateLookup,
        // XML: <CityStateLookupRequest USERID="{{USERID}}"><ZipCode ID="0"><Zip5>20024</Zip5></ZipCode></CityStateLookupRequest>
        let request_city = "https://secure.shippingapis.com/ShippingAPI.dll?API=CityStateLookup&XML=<CityStateLookupRequest USERID=\"";
        // Concatenate USERID to request
        request_city += user_id + "\"><ZipCode ID='0'><Zip5>";
        // Add zipcode from input and finish request string
        request_city += app.vue.zipcode + "</Zip5></ZipCode></CityStateLookupRequest>";
=======
    app.search = function() {
>>>>>>> 15dee056e4f6387705ab9011decff1cabc9fd5ce

        if (app.vue.geoJson) {
            console.log("Removed the map layer and table");
            app.vue.rows = [];
            app.vue.geoJson.clearLayers();
        }

<<<<<<< HEAD
        axios.get(request_city).then(function(response) { // Requests information using zipcode and returns state, city
            console.log(response);
            var xml = $.parseXML(response.data),
                      $xml = $( xml ),
                      $state = $xml.find('State'),
                      $city = $xml.find('City');
            app.vue.state = $state.text(); // Assign U.S. state variable
            app.vue.city = $city.text(); // Assign city variable
            console.log(app.vue.state);
            console.log(app.vue.city);
            // Process GET request from openstreetmap.org using Zip code and U.S. state
            // Can reduce the call into one
            axios.get("https://nominatim.openstreetmap.org/search?format=json&limit=3&q="+app.vue.zipcode+"+"+app.vue.city+"+"+app.vue.state + "+us").then(function(result) {
                var coord = result.data;
                console.log(coord);
                // request will fill latitude and longitude variables
                var lat = coord[0]['lat'];
                var lng = coord[0]['lon'];
                map.flyTo([lat, lng], 13); //Moves to searched location
                var distance = app.vue.range.number*1600; //Converts miles from range input to meters
                console.log("The radius is " + distance + " meters");
                //may want to use USA instead of state in case of zip codes on edge but results in slower response time (noticeable lag)
                axios.get("https://www.vaccinespotter.org/api/v0/states/" + app.vue.state + ".json").then(function(response) { //Gets searched states vaccination data
                //axios.get("https://www.vaccinespotter.org/api/v0/US.json").then(function(response) {
                    let data = response.data;
                    console.log("Successfully loaded data");
                    console.log(data);
                    app.vue.geoJson = L.geoJson(data, // From the json request, we parse information according to our needs and display onto the map
                    {
                        onEachFeature: function(feature, layer) { //For every location, we set the appropriate information to rows so html can iterate nicely
                            let distanceToInput = roundToTwo((L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([lat,lng])))/1600);
                            let available = "No";
                            if(feature.properties.appointments_available) {
                                available = "Yes";
                            }
                            let theCity = feature.properties.city.charAt(0) + feature.properties.city.substring(1).toLowerCase();
                            let theAddress = toTitleCase(feature.properties.address);
                            let addressSearch = theAddress.split(' ').join('+');
                            addressSearch = "https://www.google.com/maps/place/" + addressSearch + "+" + theCity;
                            app.vue.rows.push({ //Adds location to array
                                provider: feature.properties.provider_brand_name,
                                address: theAddress,
                                addressLink: addressSearch,
                                city: toTitleCase(theCity),
                                zipcode: feature.properties.postal_code,
                                distance: distanceToInput,
                                availability: available,
                            });
                            app.vue.rows.sort(function(a, b) { //Sorts the locations by increasing distance to input
                                let distanceA = a.distance;
                                let distanceB = b.distance;
                                if (distanceA < distanceB) {
                                    return -1;
                                } else if (distanceA > distanceB) {
                                    return 1;
                                }
                                return 0;
                            });
                        },
                        pointToLayer: availabilityIcon, // Sets icon for every location
                        filter: function(feature, layer) { // Filters out locations that are not within distance
                            if(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([lat,lng])) <= distance) {
                                return true;
                            } else {
                                return false;
                            }
=======
        //Packaging Mapbox Geocoding API request using user zipcode
        let gc_start = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
        let gc_end = ".json?country=US&access_token=";
        let geocoding_request = gc_start.concat(app.vue.zipcode, gc_end, api_key);
        
        //First fetch Geocoding API to obtain data for VaccineSpotter API
        fetch(geocoding_request).then(function (response) {
            if (response.ok) {
                return response.json();
            } else {
                return Promise.reject(response);
            }
        }).then(function (result) {
            app.lati = result.features[0].geometry.coordinates[1]; //Store latitude
            app.long = result.features[0].geometry.coordinates[0]; //Longitude
            app.city = result.features[0].context[0]['text']; //City and State
            app.state = result.features[0].context[2]['short_code'].split('-')[1];
            console.log(result); console.log("LATITUDE:", app.lati);
            console.log("LONGITUDE:", app.long); console.log("CITY:", app.city);
            console.log("STATE:", app.state);
        
            //Packaging VaccineSpotter API request using user U.S.-state 
            let vacc_sites_by_state = "https://www.vaccinespotter.org/api/v0/states/";
            let resp_type = ".json";
            let vaccination_sites_request = vacc_sites_by_state.concat(app.state, resp_type);
            console.log("VACCINESPOTTER API REQ:", vaccination_sites_request);
            //Fetch second API -- Vaccination Sites by State
            return fetch(vaccination_sites_request);
        
        }).then(function (response) {
            if (response.ok) {
                return response.json();
            } else {
                return Promise.reject(response);
            }
        }).then(function (userData) {
            console.log("USERDATA", userData);

            map.flyTo([app.lati, app.long], 13); //Moves to searched location
            
            var distance = app.vue.range.number * 1600; //Converts miles from range input to meters
            console.log("The radius is " + distance + " meters");

            app.vue.geoJson = L.geoJson(userData, //From the json request, we parse information according to our needs and display onto the map
                {
                    onEachFeature: function (feature) { //For every location, we set the appropriate information to rows so html can iterate nicely
                        let distanceToInput = roundToTwo((L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long]))) / 1600);
                        let available = "No";
                        if (feature.properties.appointments_available) {
                            available = "Yes";
>>>>>>> 15dee056e4f6387705ab9011decff1cabc9fd5ce
                        }
                        let theCity = feature.properties.city.charAt(0) + feature.properties.city.substring(1).toLowerCase();
                        let theAddress = toTitleCase(feature.properties.address);
                        let addressSearch = theAddress.split(' ').join('+');
                        addressSearch = "https://www.google.com/maps/place/" + addressSearch + "+" + theCity;
                        app.vue.rows.push({ //Adds location to array
                            provider: feature.properties.provider_brand_name,
                            address: theAddress,
                            addressLink: addressSearch,
                            city: toTitleCase(theCity),
                            zipcode: feature.properties.postal_code,
                            distance: distanceToInput,
                            availability: available,
                        });
                        app.vue.rows.sort(function (a, b) { //Sorts the locations by increasing distance to input
                            let distanceA = a.distance;
                            let distanceB = b.distance;
                            if (distanceA < distanceB) {
                                return -1;
                            } else if (distanceA > distanceB) {
                                return 1;
                            }
                            return 0;
                        });
                        app.vue.page_initialized = true;
                    },
                    pointToLayer: availabilityIcon, // Sets icon for every location
                    filter: function (feature) { // Filters out locations that are not within distance
                        if (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= distance) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }).bindPopup(function (layer) { //Sets popup for every location
                    var distanceToInput = roundToTwo((L.latLng(layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long]))) / 1600);
                    var popup = "<b>" + layer.feature.properties.name + "</b>"
                        + "<h2>" + "Provider: " + layer.feature.properties.provider_brand_name + "</h2>"
                        + "<h2>" + "Address: " + toTitleCase(layer.feature.properties.address) + "</h2>"
                        + "<h2>" + "City: " + toTitleCase(layer.feature.properties.city) + "</h2>"
                        + "<h2>" + "Zip Code: " + layer.feature.properties.postal_code + "</h2>"
                        + "<h2>" + "Distance: " + distanceToInput + " miles</h2>";
                    if (layer.feature.properties.appointments_available == true) {
                        popup += "<h2 class='has-text-success'>Available</h2>"
                            + "<a target='_blank' href='" + layer.feature.properties.url + "'>" + "Book an Appointment" + "</a>";
                    } else {
                        popup += "<h2 class='has-text-danger'>Not Available</h2>";
                    }
                    return popup;
                }).addTo(map);
            app.clear_search();

        }).catch(function (error) {
            console.warn(error);
        });
        
    };

    app.methods = {
        clear_search: app.clear_search,
        search: app.search,
        check_form: app.check_form,
    };

    app.vue = new Vue({
        el : "#vue-target",
        data: app.data,
        methods: app.methods,
    });

    app.init = () => {
    };
    app.init();
};

init(app);

//Creates instance of map and sets default view to UCSC Campus w/ zoom level 13
var map = L.map('mapid').setView([36.9881, -122.0582], 13);

//Initializes the map layer
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Room 12 Prototype Mark II Alpha 0.91 Beta 4.20 Demo 6 Area 51 Operation Made You Look', //Gives credit and copyright attribute to OpenStreetMaps and Leaflet
    maxZoom: 18,
    tileSize: 512,
    zoomOffset: -1,
    id: 'mapbox/streets-v11',
    accessToken: api_key //Use your own API key to get info from OpenStreetMaps
}).addTo(map);

//Starts at UCSC
var marker = L.marker([36.9881, -122.0582]).addTo(map); //Starting location
marker.bindPopup("<b>University of California Santa Cruz</b><br>Home Sweet Home");

function roundToTwo(num) { //returns a float rounded to the hundredths place
    return +(Math.round(num + "e+2")  + "e-2");
}

function availabilityIcon (feature, latlng) { //returns the respective icon according to availability
  let green = L.icon({
    iconUrl: 'icons/green.png',
    shadowUrl: 'icons/shadow.png',
    iconSize:     [25, 41], // width and height of the image in pixels
    shadowSize:   [35, 20], // width, height of optional shadow image
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
    shadowAnchor: [12, 6],  // anchor point of the shadow. should be offset
    popupAnchor:  [0, 0] // point from which the popup should open relative to the iconAnchor
  });
  let red = L.icon({
    iconUrl: 'icons/red.png',
    shadowUrl: 'icons/shadow.png',
    iconSize:     [25, 41],
    shadowSize:   [35, 20],
    iconAnchor:   [12, 12],
    shadowAnchor: [12, 6],
    popupAnchor:  [0, 0]
  });
  if(feature.properties.appointments_available) {
    return L.marker(latlng, { icon: green });
  } else {
    return L.marker(latlng, { icon: red });
  }
}

function toTitleCase(str) { //Changes a string to capitalize every word's first letter and lowercase other
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}