// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};



// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {
    
    // This is the Vue data.
    app.data = {
        data_url: "",
        fileName: "",
        show_histogram: false,
        show_stats: false,
    };

    app.enumerate = (a) => {
        // This adds an _idx field to each element of the array.
        let k = 0;
        a.map((e) => { e._idx = k++; });
        return a;
    };

    app.set_histogram_status = function (status) {
        app.vue.show_histogram = status;
    };

    app.set_histogram_status = function (status) {
        app.vue.show_histogram = status;
    };

    app.set_data_url = function (new_url) {
        app.vue.data_url = new_url;
    };

    app.get_data_url = function () {
        return app.vue.data_url;
    };
    // This contains all the methods.
    app.methods = {
        set_data_url: app.set_data_url,
        get_data_url: app.get_data_url,
        set_histogram_status: app.set_histogram_status,
        
    };

    
    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        // Put here any initialization code.
        // Typically this is a server GET call to load the data.
        axios.get(get_data_url)
        .then(function (response) 
        {
        //   console.log(response.data.data);
          data_url = response.data.data_url;
        });
    };
    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
