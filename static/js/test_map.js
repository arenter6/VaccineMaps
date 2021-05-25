//TODO Search and Side Menu
//Show the nearest locations (default 10 miles) Leaflet uses meters by default so must multiply input by 1600!
//Have side table sorted by nearest location and availability (Other options include range and availability)
//Implement search by address as well!


//TODO MAP optional
    //Dynamic map scrolling that updates the pins and table near map center
    //When click on a marker, it highlights its respective row on the table
        //when click off, unhighlights
    //Check to see if range is valid (0-100) also add slider (css sass)
    //Slider


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
  //Include images (if have time)

//TODO implement stars for rating on map
    //implement half stars for half ratings

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

    //TODO
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

    app.search = function() {

        if (app.vue.geoJson) {
            console.log("Removed the map layer and table");
            app.vue.rows = [];
            app.vue.geoJson.clearLayers();
        }

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
            if(!app.state) {
                if(app.city = "Washington")
                    app.state = "DC";
            }
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

            //TODO sorry but you probably need to fix this to your syntax lmao
            axios.get(load_ratings_url, {params: {"state": app.state}}).then(function(ratingsRequest) {
                let ratingsData = ratingsRequest.data;
                console.log(ratingsData);
                app.vue.geoJson = L.geoJson(userData, //From the json request, we parse information according to our needs and display onto the map
                    {
                        onEachFeature: function (feature, layer) { //For every location, we set the appropriate information to rows so html can iterate nicely
                            let distanceToInput = roundToTwo((L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long]))) / 1600);
                            let available = "No";
                            if (feature.properties.appointments_available) {
                                available = "Yes";
                            }
                            let theCity = feature.properties.city.charAt(0) + feature.properties.city.substring(1).toLowerCase();
                            let theAddress = toTitleCase(feature.properties.address);
                            let addressSearch = theAddress.split(' ').join('+');
                            addressSearch = "https://www.google.com/maps/place/" + addressSearch + "+" + theCity;
                            let rating = 0;
                            //TODO
                            if((feature.properties.address.toLowerCase()) in ratingsData.ratings) {
                                rating = ratingsData.ratings[feature.properties.address.toLowerCase()].average_rating;
                            }
                            layer._leaflet_id = feature.properties.id;
                            app.vue.rows.push({ //Adds location to array
                                id: feature.properties.id,
                                provider: feature.properties.provider_brand_name,
                                address: theAddress,
                                addressLink: addressSearch,
                                city: toTitleCase(theCity),
                                state: app.state,
                                zipcode: feature.properties.postal_code,
                                distance: distanceToInput,
                                rating: rating,
                                availability: available,
                                marker: L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]),
                                lat: feature.geometry.coordinates[1],
                                long: feature.geometry.coordinates[0],
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
                        //Insert ratings here
                        if((layer.feature.properties.address.toLowerCase()) in ratingsData.ratings) {
                            popup += "<h2'>" + "Rating: "
                                  + ratingsData.ratings[layer.feature.properties.address.toLowerCase()].average_rating + " stars</h2>"
                        } else {
                            popup += "<h2 class='has-text-warning'>" + "Rating: Not yet rated</h2>"
                        }
                        if (layer.feature.properties.appointments_available == true) {
                            popup += "<h2 class='has-text-success'>Available</h2>"
                                + "<a target='_blank' href='" + layer.feature.properties.url + "'>" + "Book an Appointment" + "</a>";
                        } else {
                            popup += "<h2 class='has-text-danger'>Not Available</h2>";
                        }

                        return popup;
                    }).addTo(map);
            });



            app.clear_search();

        }).catch(function (error) {
            console.warn(error);
        });
        
    };


    app.openMarkerPopup = function(id){
        /*for (var i in app.vue.rows){
            if (app.vue.rows[i].id == id){
                app.vue.rows[i].marker.openPopup(L.latLng(app.vue.rows[i].lat, app.vue.rows[i].long));
                console.log("Opened the popup: " + id);
            };
        }*/

        if(app.vue.geoJson) {
            /*app.vue.geoJson.eachLayer(function(feature){
                for (var i in app.vue.rows){
                    if (app.vue.rows[i].id == id && feature.feature.properties.id == id){
                        //app.vue.rows[i].marker.openPopup(L.latLng(app.vue.rows[i].lat, app.vue.rows[i].long));
                        feature.openPopup(L.latLng(app.vue.rows[i].lat, app.vue.rows[i].long));
                        feature.openPopup(app.vue.rows[i].marker);
                        console.log("Opened the popup: " + id);
                    };
                }
            });*/
            site = "";
            //TODO I was here
            for (var i in app.vue.rows){
                if (app.vue.rows[i].id == id){
                    site = app.vue.rows[i].id;
                    console.log("Opened the popup: " + id);
                    map._layers[site].fire('click');
                    var coords = map._layers[site]._latlng;
                    map.setView(coords, 12);
                    //map._layers[site].openPopup(L.latLng(app.vue.rows[i].lat, app.vue.rows[i].long));
                    map._layers[site].togglePopup();
                    //map.openPopup(app.vue.rows[i].marker);
                    break;
                };
            }

        } else {
            console.log("Geojson is not yet defined");
        }

    }

    app.methods = {
        clear_search: app.clear_search,
        search: app.search,
        check_form: app.check_form,
        openMarkerPopup: app.openMarkerPopup,
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
    shadowSize:   [50, 30], // width, height of optional shadow image
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
    shadowAnchor: [12, 6],  // anchor point of the shadow. should be offset
    popupAnchor:  [0, 0] // point from which the popup should open relative to the iconAnchor
  });
  let red = L.icon({
    iconUrl: 'icons/red.png',
    shadowUrl: 'icons/shadow.png',
    iconSize:     [25, 41],
    shadowSize:   [50, 30],
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

