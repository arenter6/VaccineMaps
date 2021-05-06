//TODO!!
//Implement search by location
//Show the nearest locations (default 25 miles)
//Have side table sorted by nearest location and availability (Other options include range and availability)
//Selection Menu
//Sort by availability and closest to user input

//Corner cases!!
    //Make sure user cannot enter in non-US zipcode or non-US adddress
    //Make sure user only inputs alpha-numerical input

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
        range: 25,

        //Vaccine types (not likely)
    };

    app.clear_search = function() {
        app.vue.zipcode = "";
    };

    app.search = function() {
        let request_city = "https://secure.shippingapis.com/ShippingAPI.dll?API=CityStateLookup&XML=<CityStateLookupRequest USERID=\"";
        request_city += user_id + "\"><ZipCode ID='0'><Zip5>";
        request_city += app.vue.zipcode;
        request_city += "</Zip5></ZipCode></CityStateLookupRequest>";
        axios.get(request_city).then(function(response) {
            console.log(response);
            var xml = $.parseXML(response.data),
                      $xml = $( xml ),
                      $state = $xml.find('State');
            app.vue.state = $state.text();
            console.log(app.vue.state);
            $.get("https://nominatim.openstreetmap.org/search?format=json&limit=3&q="+app.vue.zipcode+"+"+app.vue.state, function(coord){
                console.log(coord);
                let lat = coord[0]['lat'];
                let lng = coord[0]['lon'];
                map.flyTo([lat, lng], 13);
                axios.get("https://www.vaccinespotter.org/api/v0/states/" + app.vue.state + ".json").then(function(response) {
                    let data = response.data;
                    console.log("Successfully loaded data");
                    console.log(data)
                    L.geoJson(data, { onEachFeature:
                          function(feature,layer) {
                              var popup = "<b>" + feature.properties.name + "</b>";
                              popup += "<h2>" + "Provider: " + feature.properties.provider_brand_name + "</h2>";
                              popup += "<h2>" + "Address: " + feature.properties.address + "</h2>";
                              popup += "<h2>" + "City: " + feature.properties.city + "</h2>";
                              popup += "<h2>" + "Zip Code: " + feature.properties.postal_code + "</h2>";
                              //Calculate distance from user input
                              //No way to tell what vaccine each site carries
                              if(feature.properties.appointments_available == true) {
                                    popup += "<h2 class='has-text-success'>Available</h2>";
                                    popup += "<a href='" + feature.properties.url + "'>" + "Book an Appointment" + "</a>";
                              } else {
                                    popup += "<h2 class='has-text-danger'>Not Available</h2>";
                              }
                              layer.bindPopup(popup);
                          }
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





