let app = {};

let init = (app) => {

    app.data = {
        vaccine_type: "",
        rating: "",
        site_address: "",
        date: "",
        city: "",
        state: "",
        feedback: "",

        vaccine_type_error: false,
        rating_error: false,
        date_error: false,
        site_address_error: false,
        city_error: false,
        state_error: false,
    };


    app.validate_form = function() {
        if(app.vue.vaccine_type == "") {
            app.vue.vaccine_type_error = true;
        } else{
            app.vue.vaccine_type_error = false;
        }
        if(Number.isInteger(parseInt(app.vue.rating)) && app.vue.rating >= 0 && app.vue.rating <= 5) {
            app.vue.rating_error = false;
        } else{
            app.vue.rating_error = true;
        }
        if(app.vue.date == "") {
            app.vue.date_error = true;
        } else{
            app.vue.date_error = false;
        }
        if(app.vue.site_address == "") {
            app.vue.site_address_error = true;
        } else{
            app.vue.site_address_error = false;
        }
        if(app.vue.city == "") {
            app.vue.city_error = true;
        } else{
            app.vue.city_error = false;
        }
        if(app.vue.state == "") {
            app.vue.state_error = true;
        } else{
            app.vue.state_error = false;
        }
        if(!app.vue.vaccine_type_error && !app.vue.rating_error && !app.vue.site_address_error  && !app.vue.date_error && !app.vue.city_error && !app.vue.state_error) {
            return true;
        } else {
            return false;
        }
    }

    app.submit_form = function() {
        if(app.validate_form()) {
            let date_array = app.vue.date.split("-");
            let year = date_array[0];
            let month = date_array[1];
            let day = date_array[2];
            var date = month + "/" + day + "/" + year;
            console.log(date);
            axios.post(submit_form_url,
            {
                vaccine_type: app.vue.vaccine_type,
                rating: app.vue.rating,
                site_address: app.vue.site_address,
                date: date,
                city: app.vue.city,
                state: app.vue.state,
                feedback: app.vue.feedback,
            }).then((response) => {
                if(response.status == 200) {
                    window.location = response.data.redirect;
                }
            }).catch((error) => { //Catches errors for the first API call
                console.warn(error);
            });
        } else {
            console.log(app.vue.date);
            console.log("Invalid form");
        }

    };

    app.getToday =  function() {
      var today = new Date();
      var dd = today.getDate();
      var mm = today.getMonth()+1; //January is 0!
      var yyyy = today.getFullYear();

      if(dd<10) {
          dd = '0'+dd
      }

      if(mm<10) {
          mm = '0'+mm
      }

      today = yyyy + '-' + mm + '-' + dd;
      console.log(today);
      app.vue.date = today;
      document.getElementById("none_date").setAttribute("max", today);
    }

    app.methods = {
        submit_form: app.submit_form,
        validate_form: app.validate_form,
        getToday: app.getToday,
    };

    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    app.init = () => {
        app.getToday();
    };

    app.init();
};

init(app);
