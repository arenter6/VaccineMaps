//TODO Search and Side Menu
//Implement search by location
//Selection Menu (Range, vaccine type, user reviewed, highest rated)
    //Sort by availability and closest to user input
    //Have side table sorted by nearest location and availability (Other options include range and availability)

//TODO MAP
    //Dynamic map scrolling that updates the pins and table near map center


//TODO Corner cases!!
    //Make sure user cannot enter in non-US zipcode or non-US address
        //check using API and validate
    //Make sure user only inputs alpha-numerical input (non-negative)
        //Parse string
    //Make sure range is non negative and zipcode is between 500 and 99500
        //Make either an v-if statement or form validator
    //Bug where if the state is small, will only display that state's locations  <-- Import entire US instead of state, problem -> may cost more time to run

    //Check to see if range is valid (0-100) also add slider (css sass)

//TODO code cleanup
//Change some jQuery to Axios
    //XML parser

//TODO customization
  //Each pin should have a custom icon
  //Green pin for available, Red pin for not available
  //If a site has been reviewed, blue stroke but with availability colored pin
  //If pin is clicked on, call database to get average reviews and table of reviews
  //Implement table that has coordinates from its address
  //Include images (if have time)


//Vue stuff here
let app = {};

let init = (app) => {
    app.data = {
        search_location: null,
        state: "CA", //by Default it is california
        zipcode: null,
        geoJson: null,
        range: 10,
        zipcode_error: false,
        range_error: false,
        //Vaccine types (not likely)
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

      e.preventDefault();
    };



    app.search = function() {
        let request_city = "https://secure.shippingapis.com/ShippingAPI.dll?API=CityStateLookup&XML=<CityStateLookupRequest USERID=\"";
        request_city += user_id + "\"><ZipCode ID='0'><Zip5>";
        request_city += app.vue.zipcode + "</Zip5></ZipCode></CityStateLookupRequest>";

        if (app.vue.geoJson) {
            console.log("Removed the map layer");
            app.vue.geoJson.clearLayers();
        }

        axios.get(request_city).then(function(response) {
            console.log(response);
            var xml = $.parseXML(response.data),
                      $xml = $( xml ),
                      $state = $xml.find('State');
            app.vue.state = $state.text();
            console.log(app.vue.state);
            $.get("https://nominatim.openstreetmap.org/search?format=json&limit=3&q="+app.vue.zipcode+"+"+app.vue.state, function(coord){
                console.log(coord);
                var lat = coord[0]['lat'];
                var lng = coord[0]['lon'];
                map.flyTo([lat, lng], 13);

                var distance = app.vue.range*1600; //Converts miles from range input to meters
                console.log("The radius is " + distance + " meters");
                //may want to use USA instead of state in case of zip codes on edge
                //axios.get("https://www.vaccinespotter.org/api/v0/states/" + app.vue.state + ".json").then(function(response) {
                axios.get("https://www.vaccinespotter.org/api/v0/US.json").then(function(response) {
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
                        var popup = "<b>" + layer.feature.properties.name + "</b>"
                               + "<h2>" + "Provider: " + layer.feature.properties.provider_brand_name + "</h2>"
                               + "<h2>" + "Address: " + layer.feature.properties.address + "</h2>"
                               + "<h2>" + "City: " + layer.feature.properties.city + "</h2>"
                               + "<h2>" + "Zip Code: " + layer.feature.properties.postal_code + "</h2>";
                        //Calculate distance from user input
                        //No way to tell what vaccine each site carries
                        if(layer.feature.properties.appointments_available == true) {
                            popup += "<h2 class='has-text-success'>Available</h2>"
                                  + "<a target='_blank' href='" + layer.feature.properties.url + "'>" + "Book an Appointment" + "</a>";
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
        check_form: app.check_form,
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

var map = L.map('mapid').setView([36.9881, -122.0582], 13);


L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Room 12 Prototype Mark II Alpha 0.91 Beta 4.20 Demo 6 Area 51 Operation Made You Look',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: api_key
}).addTo(map);

var marker = L.marker([36.9881, -122.0582]).addTo(map);
marker.bindPopup("<b>University of California Santa Cruz</b><br>Sorry but it takes a long time to load big states");





