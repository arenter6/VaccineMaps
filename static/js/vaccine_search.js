//Vue stuff here
let app = {};

let init = (app) => {

    app.lati = 0; //Latitude
    app.long = 0; //Longitude
    app.city = ""; //Data that will be obtained from zipcode
    app.state = ""; 
    app.zoomLevel = 0;
    app.user_data = {};
    app.distance = 0;

    app.data = { //This is Vue data
        zipcode: "",
        geoJson: null,
        range: { //Default search radius is 10 miles
            number: 10,
        },
        zipcode_error: false,
        range_error: false,
        map_layer: null,
        rows: [],
        sites: {},
        available_sites: 0,
        zoom: 0,
        center: [0,0],
        current_toggle: -1,
        page_initialized: false,
        invalid_zipcode_error: false,
        invalid_vacc_search: false,
        pfizer_selected: true,
        moderna_selected: true,
        jj_selected: true,
    };

    app.clear_search = function() {
        app.vue.zipcode = "";
        app.vue.invalid_zipcode_error = false;
    };

    app.enumerate = (a) => {
        // This adds an _idx field to each element of the array.
        let k = 0;
        a.map((e) => {
          e._idx = k++;
        });
        return a;
    };

    app.vaccine_types_to_layer = function(app_vacc_types, popup){
        vacc_types_arr = Object.keys(app_vacc_types);
        //If vaccine types arr holds keys
        if (vacc_types_arr.length > 0) {
            popup += "<h3 class='has-text-success-dark'>"; //Start sub-header
            if (vacc_types_arr[0] === 'unknown') { //Unknown vaccine type data
                popup += "Click below for more info on vaccine types";
            } else {
                //Go through array checking for vaccine types
                vacc_types_arr.forEach(function (elem) {
                    if (elem === "pfizer") {
                        //console.log('WE GOT PFIZER', elem);
                        popup += "Pfizer ";
                    } else if (elem === "moderna") {
                        //console.log('WE GOT MODERNA', elem);
                        popup += "Moderna ";
                    } else if (elem === "jj") {
                        //console.log('WE GOT JJ', elem);
                        popup += "JJ ";
                    }
                });
            }
            popup += "</h3>"; //Finish sub-header
        }
        return popup;
    };

    app.search = function () {
        if (app.vue.zipcode != "" && numberOnly(app.vue.zipcode)) {
            app.vue.invalid_zipcode_error = false;
            app.checkGeoJSON();

            let gc_start = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
            let gc_end = ".json?country=US&access_token=";
            let geocoding_request = gc_start.concat(app.vue.zipcode, gc_end, api_key);

            //First, fetch Geocoding API to obtain data for VaccineSpotter API
            fetch(geocoding_request).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    return Promise.reject(response);
                }
            }).then(function (result) {
                console.log(result);
                app.lati = result.features[0].geometry.coordinates[1];
                app.long = result.features[0].geometry.coordinates[0];
                //Store features that hold city and state
                let cityState = result.features[0].context;

                //For each element id, if it matches 'place' and 'region' grab city and state
                cityState.forEach(function (elem) {
                    //Split the id string at .(Dot); i.e. place. and region.
                    let str = elem.id.split('.')[0];
                    if (str === 'place') {
                        app.city = elem.text;
                    } else if (str === 'region') { //And region holds state
                        app.state = elem.short_code.split('-')[1];
                    };
                });
                //Packaging VaccineSpotter API request using user U.S.-state 
                let vacc_sites_by_state = "https://www.vaccinespotter.org/api/v0/states/";
                let resp_type = ".json";
                let vaccination_sites_request = vacc_sites_by_state.concat(app.state, resp_type);
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
                app.user_data = userData;

                //Here we adjust zoom levels based on the mile radius selected for search
                if (app.vue.range.number === 1) {
                    app.zoomLevel = 15;
                } else if (app.vue.range.number === 5 || app.vue.range.number === 10) {
                    app.zoomLevel = 12;
                } else if (app.vue.range.number === 25) {
                    app.zoomLevel = 10;
                } else if (app.vue.range.number === 50) {
                    app.zoomLevel = 9;
                }
                app.vue.center = [app.lati, app.long]; //Sets searched center and zoom for later reference with table
                app.vue.zoom = app.zoomLevel;
                map.flyTo([app.lati, app.long], app.zoomLevel); //Moves to searched location

                var distance = app.vue.range.number * 1600; //Converts miles from range input to meters
                app.distance = distance;

                return axios.get(load_ratings_url, { params: { "state": app.state } });

            }).then(function (ratingsRequest) {
                let ratingsData = ratingsRequest.data;

                app.vue.geoJson = L.geoJson(app.user_data, //From the json request, we parse information according to our needs and display onto the map
                    {
                        onEachFeature: function (feature, layer) { //For every location, we set the appropriate information to rows so html can iterate nicely
                            let distanceToInput = roundToTwo((L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long]))) / 1600);
                            let available = "No";
                            if (feature.properties.appointments_available) {
                                app.vue.available_sites++;
                                available = "Yes";
                            }
                            let theCity = feature.properties.city.charAt(0) + feature.properties.city.substring(1).toLowerCase();
                            let theAddress = toTitleCase(feature.properties.address);
                            let addressSearch = theAddress.split(' ').join('+');
                            addressSearch = "https://www.google.com/maps/place/" + addressSearch + "+" + theCity;
                            let rating = 0;
                            let addressRemovedAbbreviation = feature.properties.address.toLowerCase().split(" ").slice(0, -1).join(" "); //Used in case street abbreviation is not used
                            if (addressRemovedAbbreviation in ratingsData.ratings) {
                                rating = ratingsData.ratings[addressRemovedAbbreviation].average_rating;
                            }
                            app.vue.rows.push({ //Adds location to array with information
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
                                marker: L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]), //Used to open popup
                                lat: feature.geometry.coordinates[1],
                                lng: feature.geometry.coordinates[0],
                                highlight: false, //For displaying table use
                                toggle: false, //For displaying popup usage and restoring map view
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
                            app.enumerate(app.vue.rows);
                            app.vue.page_initialized = true;
                        },
                        pointToLayer: function (feature, latlng) { //returns the respective icon according to availability, sets popups and stores marker for later use
                            let green = L.icon({
                                iconUrl: 'icons/green.png',
                                shadowUrl: 'icons/shadow.png',
                                iconSize: [25, 41], // width and height of the image in pixels
                                shadowSize: [50, 30], // width, height of optional shadow image
                                iconAnchor: [12, 12], // point of the icon which will correspond to marker's location
                                shadowAnchor: [12, 6],  // anchor point of the shadow. should be offset
                                popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
                            });
                            let red = L.icon({
                                iconUrl: 'icons/red.png',
                                shadowUrl: 'icons/shadow.png',
                                iconSize: [25, 41],
                                shadowSize: [50, 30],
                                iconAnchor: [12, 12],
                                shadowAnchor: [12, 6],
                                popupAnchor: [0, 0]
                            });
                            var distanceToInput = roundToTwo((L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long]))) / 1600);
                            var popup = "<b>" + feature.properties.name + "</b>"
                                + "<h2>" + "Provider: " + feature.properties.provider_brand_name + "</h2>"
                                + "<h2>" + "Address: " + toTitleCase(feature.properties.address) + "</h2>"
                                + "<h2>" + "City: " + toTitleCase(feature.properties.city) + "</h2>"
                                + "<h2>" + "Zip Code: " + feature.properties.postal_code + "</h2>"
                                + "<h2>" + "Distance: " + distanceToInput + " miles</h2>";
                            //Insert ratings here
                            let address = feature.properties.address.toLowerCase().split(" ").slice(0, -1).join(" "); //Used in case street abbreviation is not used
                            if (address in ratingsData.ratings) {
                                popup += "<h2'>" + "Rating: " + ratingsData.ratings[address].average_rating + " stars</h2>";
                            } else {
                                popup += "<h2 class='has-text-warning'>" + "Rating: Not yet rated</h2>";
                            }

                            //Since VaccineSpotterAPI is spotty on Costco & Safeway locations; vaccine supply is currently high; redirect users to book appt
                            if (feature.properties.provider_brand_name === 'Costco' || feature.properties.provider_brand_name === 'Safeway') {
                                feature.properties.appointments_available = true;
                                if (feature.properties.appointment_vaccine_types === null) {
                                    console.log('Provider', feature.properties.provider_brand_name);
                                    console.log('@', feature.properties.address);
                                    console.log('REPORTED NULL');
                                    const source = { 'unknown': true };
                                    feature.properties.appointment_vaccine_types = Object.assign(feature.properties.appointment_vaccine_types, source);
                                    console.log('POST ADDING APP_VACC_TYPES', feature.properties.appointment_vaccine_types);
                                }
                            }

                            let apps_available = feature.properties.appointments_available;
                            if (apps_available) { //Appointments are available
                                //Star sub-header indicating availability
                                popup += "<h2 class='has-text-success-dark'><b>Available</b></h2>";
                                //Call vaccine_types_to_layer to see if location has vaccine types data to add to popup
                                let app_vacc_types = feature.properties.appointment_vaccine_types;
                                popup = app.vaccine_types_to_layer(app_vacc_types, popup);
                                //Link for booking appointment at specified location
                                popup += "<a target='_blank' href='" + feature.properties.url + "'>" + "Book an Appointment" + "</a>";

                                app.vue.sites[feature.properties.id] = L.marker(latlng, { icon: green }).addTo(map).bindPopup(popup).addTo(layerGroup);
                                return L.marker(latlng, { icon: green }).addTo(map).bindPopup(popup).addTo(layerGroup);

                            } else { //No appointments available
                                popup += "<h2 class='has-text-danger'>Not Available</h2>";

                                app.vue.sites[feature.properties.id] = L.marker(latlng, { icon: red }).addTo(map).bindPopup(popup).addTo(layerGroup);
                                return L.marker(latlng, { icon: red }).addTo(map).bindPopup(popup).addTo(layerGroup);
                            }
                        }, // Sets icon for every location
                        filter: function (feature) { // Filters out locations that are not within distance

                            //All vaccine type options selected -- Default
                            if ((app.vue.pfizer_selected) && (app.vue.moderna_selected) && (app.vue.jj_selected)) {
                                if (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }

                            var appointment_vacc_types = feature.properties.appointment_vaccine_types;

                            //These are the Object keys we will be looking for after making arr. of keys
                            const unknown_vacc = (element) => element === 'unknown';
                            const pfizer = (element) => element === 'pfizer';
                            const moderna = (element) => element === 'moderna';
                            const jj = (element) => element === 'jj';

                            //Handle single choices first
                            if ((app.vue.pfizer_selected) && !(app.vue.moderna_selected) && !(app.vue.jj_selected)) { //Pfizer alone
                                console.log('ONLY PFIZER SELECTED');
                                //If this location has contents for appointment vaccine types
                                if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types !== null)) {
                                    //Assign array with object keys; i.e. 'unknown', 'pfizer', 'moderna', 'jj'
                                    var app_vacc_types_arr = Object.keys(appointment_vacc_types);
                                    //Return 'pfizer' and 'unknown' within range
                                    if (app_vacc_types_arr.some(pfizer) || app_vacc_types_arr.some(unknown_vacc)) {
                                        return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                    }
                                    //Else if, location contents null
                                } else if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types === null)) {
                                    //Return locations within range
                                    return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                }
                            } else if (!(app.vue.pfizer_selected) && (app.vue.moderna_selected) && !(app.vue.jj_selected)) { //Moderna alone
                                console.log('ONLY MODERNA SELECTED');
                                if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types !== null)) {
                                    var app_vacc_types_arr = Object.keys(appointment_vacc_types);
                                    if (app_vacc_types_arr.some(moderna) || app_vacc_types_arr.some(unknown_vacc)) {
                                        return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                    }
                                } else if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types === null)) {
                                    return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                }
                            } else if (!(app.vue.pfizer_selected) && !(app.vue.moderna_selected) && (app.vue.jj_selected)) { //JJ alone
                                console.log('ONLY JJ SELECTED');
                                if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types !== null)) {
                                    var app_vacc_types_arr = Object.keys(appointment_vacc_types);
                                    if (app_vacc_types_arr.some(jj) || app_vacc_types_arr.some(unknown_vacc)) {
                                        return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                    }
                                } else if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types === null)) {
                                    return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                }
                            }

                            //All options involving Pfizer; i.e. Pfizer (alone), Pfizer & Moderna, and Pfizer & JJ,
                            if ((app.vue.pfizer_selected) && (app.vue.moderna_selected) && !(app.vue.jj_selected)) {
                                console.log('PFIZER & MODERNA SELECTED');
                                if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types !== null)) {
                                    var app_vacc_types_arr = Object.keys(appointment_vacc_types);
                                    if (app_vacc_types_arr.some(pfizer) || app_vacc_types_arr.some(moderna) || app_vacc_types_arr.some(unknown_vacc)) {
                                        return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                    }
                                } else if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types === null)) {
                                    return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                }

                            } else if ((app.vue.pfizer_selected) && !(app.vue.moderna_selected) && (app.vue.jj_selected)) {
                                console.log('PFIZER & JJ SELECTED');
                                if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types !== null)) {
                                    var app_vacc_types_arr = Object.keys(appointment_vacc_types);
                                    if (app_vacc_types_arr.some(pfizer) || app_vacc_types_arr.some(jj) || app_vacc_types_arr.some(unknown_vacc)) {
                                        return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                    }
                                } else if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types === null)) {
                                    return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                }

                            } else if (!(app.vue.pfizer_selected) && (app.vue.moderna_selected) && (app.vue.jj_selected)) {
                                console.log('MODERNA & JJ SELECTED');
                                if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types !== null)) {
                                    var app_vacc_types_arr = Object.keys(appointment_vacc_types);
                                    if (app_vacc_types_arr.some(pfizer) || app_vacc_types_arr.some(jj) || app_vacc_types_arr.some(unknown_vacc)) {
                                        return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                    }
                                } else if ((typeof appointment_vacc_types === 'object') && (appointment_vacc_types === null)) {
                                    return (L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]).distanceTo(L.latLng([app.lati, app.long])) <= app.distance);
                                }
                            }
                        }
                    }).addTo(layerGroup).addTo(map);

                //app.vue.invalid_vacc_search ? (app.vue.available_sites == 0) : (app.vue.available_sites > 0);
                if (app.vue.available_sites == 0) {
                    app.vue.invalid_vacc_search = true;
                } else {
                    app.vue.invalid_vacc_search = false;
                }
                app.clear_search(); //Clears zip code search form
            }).catch(function (error) { //Catches errors for all API calls
                console.warn(error);
                app.vue.invalid_zipcode_error = true;
            });
        } else {
            app.vue.invalid_zipcode_error = true;
            app.checkGeoJSON();
        }

    };

    app.highlight = function(id, hovering) { //Highlights the hovered row in table
        let post = app.vue.rows[id];
        Vue.set(app.vue.rows, id, {
            id: post.id,
            _idx: id,
            provider: post.provider,
            address: post.address,
            addressLink: post.addressLink,
            city: post.city,
            state: post.state,
            zipcode: post.zipcode,
            distance: post.distance,
            rating: post.rating,
            availability: post.availability,
            marker: post.marker,
            highlight: hovering,
            toggle: post.toggle,
            lat: post.lat,
            lng: post.lng,
        });
    };

    app.openMarkerPopup = function(id, idx, toggle){ //Opens popup from row
        if(app.vue.geoJson) {
            if(app.vue.current_toggle >= 0) { //sets the previously opened popup to false
                let post = app.vue.rows[app.vue.current_toggle];
                Vue.set(app.vue.rows, post._idx, {
                    id: post.id,
                    _idx: post._idx,
                    provider: post.provider,
                    address: post.address,
                    addressLink: post.addressLink,
                    city: post.city,
                    state: post.state,
                    zipcode: post.zipcode,
                    distance: post.distance,
                    rating: post.rating,
                    availability: post.availability,
                    marker: post.marker,
                    highlight: post.highlight,
                    toggle: false,
                    lat: post.lat,
                    lng: post.lng,
                });
            }
            app.vue.current_toggle = idx; //sets the current popup
            var post = app.vue.rows[idx];
            if(!toggle){ //If popup not open, then open
                var site = "";
                app.vue.sites[id].openPopup(); //Opens popup
                for (var i in app.vue.rows){ //Searches for site and sets maps view to that location
                    if (app.vue.rows[i].id == id){
                        site = app.vue.rows[i].id;
                        map.flyTo([app.vue.rows[i].lat, app.vue.rows[i].lng], 15);
                        break;
                    }
                }
                Vue.set(app.vue.rows, idx, {
                    id: post.id,
                    _idx: idx,
                    provider: post.provider,
                    address: post.address,
                    addressLink: post.addressLink,
                    city: post.city,
                    state: post.state,
                    zipcode: post.zipcode,
                    distance: post.distance,
                    rating: post.rating,
                    availability: post.availability,
                    marker: post.marker,
                    highlight: post.highlight,
                    toggle: !toggle,
                    lat: post.lat,
                    lng: post.lng,
                });
            } else { //Closes the popup and restores back to original state and zoom
                map.closePopup();
                map.flyTo(app.vue.center, app.vue.zoom);
                Vue.set(app.vue.rows, idx, {
                    id: post.id,
                    _idx: idx,
                    provider: post.provider,
                    address: post.address,
                    addressLink: post.addressLink,
                    city: post.city,
                    state: post.state,
                    zipcode: post.zipcode,
                    distance: post.distance,
                    rating: post.rating,
                    availability: post.availability,
                    marker: post.marker,
                    highlight: post.highlight,
                    toggle: !toggle,
                    lat: post.lat,
                    lng: post.lng,
                });
            }
        } else {
            console.log("Geojson is not yet defined");
        }
    };

    app.checkGeoJSON = function() {
        if (app.vue.geoJson) {
            console.log("Removed the map layer and table");
            app.vue.rows = [];
            app.vue.available_sites = 0;
            app.vue.current_toggle = -1;
            app.vue.geoJson.clearLayers();
            layerGroup.clearLayers();
        } else {
            console.log("GeoJson is not yet defined");
        }
    };

    app.methods = {
        vaccine_types_to_layer: app.vaccine_types_to_layer,
        clear_search: app.clear_search,
        search: app.search,
        openMarkerPopup: app.openMarkerPopup,
        enumerate: app.enumerate,
        highlight: app.highlight,
        checkGeoJSON: app.checkGeoJSON,
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


var mapboxURL = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}';

//Define map styles; light and dark modes
var light = L.tileLayer(mapboxURL, { 
    id: 'mapbox/navigation-day-v1',
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors,' 
                + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>, Data <a href="https://www.vaccinespotter.org/api/">VaccineSpotter</a>',
    maxZoom: 18,
    tileSize: 512,
    zoomOffset: -1,
    accessToken: api_key //Use your own API key to get info from OpenStreetMaps
}), dark = L.tileLayer(mapboxURL, { 
    id: 'mapbox/navigation-night-v1',
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors,' 
                + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>, Data <a href="https://www.vaccinespotter.org/api/">VaccineSpotter</a>',
    maxZoom: 18,
    tileSize: 512,
    zoomOffset: -1,
    accessToken: api_key //Use your own API key to get info from OpenStreetMaps
});

//Object keys define tileLayer options
var baseMaps = {
    "Light": light,
    "Dark": dark
};

//Creates instance of map and sets default view to UCSC Campus w/ zoom level 13
var map = L.map('mapid', {
    zoom: 13,
    //layer: [light, dark],
}).setView([36.9881, -122.0582], 13);

//Give the user ability to swtich betwween two style modes; light and dark
L.control.layers(baseMaps, null, {
    collapsed: false
}).addTo(map);

//Default map is nagivation-day-v1; light
light.addTo(map);

var layerGroup = L.layerGroup().addTo(map);

//Starts at UCSC
var marker = L.marker([36.9881, -122.0582]).addTo(map); //Starting location
marker.bindPopup("<b>University of California Santa Cruz</b><br>Home Sweet Home");

//For Dynamic searching; When the user double-clicks on any area of the map, 
//A reverse geocoding request is done to retrieve zipcode from coordinates obtained from click
map.on('dblclick', function(e) {
    var coord = e.latlng;    
    let lati_str = coord.lat.toString(); //Make coordinates into string for request
    let long_str = coord.lng.toString();

    //Package request again, this time specifying zipcode
    let gc_start = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
    let gc_end = ".json?types=postcode&country=US&access_token=";
    let comma = ",";
    let reverse_geocoding_request = gc_start.concat(long_str, comma, lati_str, gc_end, api_key);
    fetch(reverse_geocoding_request).then(function (response) {
        if (response.ok) {
            return response.json();
        } else {
            return Promise.reject(response);
        }
    }).then(function (result) {
        //Get zipcode from features
        app.vue.zipcode = result.features[0].text;
        //Call search()
        app.search();
    })

});

function roundToTwo(num) { //returns a float rounded to the hundredths place
    return +(Math.round(num + "e+2")  + "e-2");
};

function toTitleCase(str) { //Changes a string to capitalize every word's first letter and lowercase other
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

function numberOnly(zipcode) { //Validates zipcode to only numerical inputs
    var code, i, len;
    for (i = 0, len = zipcode.length; i < len; i++) {
        code = zipcode.charCodeAt(i);
        if (!(code > 47 && code < 58)) { //Number in ascii
            return false;
        }
    }
    return true;
};
