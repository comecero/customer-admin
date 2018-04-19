app.controller("PaymentMethodsListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', 'SettingsService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService, SettingsService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.paymentMethodListUrl = ApiService.buildUrl("/customers/me/payment_methods", SettingsService.get());

}]);

app.controller("PaymentMethodsSetCtrl", ['$scope', '$routeParams', '$location', 'ApiService', 'SettingsService', 'ConfirmService', 'GrowlsService', 'GeographiesService', function ($scope, $routeParams, $location, ApiService, SettingsService, ConfirmService, GrowlsService, GeographiesService) {

    $scope.paymentMethod = { data: { billing_address: {} } };
    $scope.countries = {};
    $scope.exception = {};
    $scope.update = false;
    $scope.add = true;
    $scope.params = '';
    $scope.geo = GeographiesService;
    //Load the countries
    $scope.countries = $scope.geo.getGeographies().countries;
    $scope.us_states = $scope.geo.getGeographies().us_states;
    $scope.ca_provinces = $scope.geo.getGeographies().ca_provinces;
    $scope.au_states = $scope.geo.getGeographies().au_states;

    // Re-sort
    $scope.countries = _.sortBy($scope.countries, "name");

    if ($routeParams.id) {
        // Set the url for interacting with this item
        $scope.url = ApiService.buildUrl("/customers/me/payment_methods/" + $routeParams.id, SettingsService.get());
        $scope.add = false;
        $scope.update = true;

        // Load the paymentMethod
        ApiService.getItem($scope.url, $scope.params).then(function (paymentMethod) {

            if (paymentMethod.data && paymentMethod.data.billing_address) {

                var countryObj = _.find($scope.countries, function (country) {
                    return country.code == paymentMethod.data.billing_address.country;
                });

                $scope.onCountrySelect(countryObj);
                var stateObj = _.find($scope.states, function (state) {
                    return state.code == paymentMethod.data.billing_address.state_prov;
                });

                paymentMethod.data.billing_address.country = countryObj;
                paymentMethod.data.billing_address.state_prov = stateObj;
            }

            $scope.paymentMethod = paymentMethod;

        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    } else {
        $scope.add = true;
        $scope.update = false;
    }

    $scope.onCountrySelect = function (item, model, label, event) {

        if (!item) {
            return;
        }

        if (item.code === 'US') {
            $scope.states = $scope.us_states;
        } else if (item.code === 'CA') {
            $scope.states = $scope.ca_provinces;
        } else if (item.code === 'AU') {
            $scope.states = $scope.au_states;
        } else {
            $scope.paymentMethod.data.billing_address.state_prov = '';
            $scope.states = null;
        }
    };

    $scope.addPaymentMethod = function () {

        if ($scope.form.$invalid) {
            window.scrollTo(0, 0);
            return;
        }

        $scope.paymentMethod.type = 'credit_card';

        if ($scope.paymentMethod.data.billing_address.country)
            $scope.paymentMethod.data.billing_address.country = $scope.paymentMethod.data.billing_address.country.code;

        if ($scope.paymentMethod.data.billing_address.state_prov)
            $scope.paymentMethod.data.billing_address.state_prov = $scope.paymentMethod.data.billing_address.state_prov.code;

        ApiService.set($scope.paymentMethod, ApiService.buildUrl("/customers/me/payment_methods", SettingsService.get())).then(
      function (paymentMethod) {
          GrowlsService.addGrowl({ id: "add_success", name: paymentMethod.data.label || data.type, type: "success", payment_method_id: paymentMethod.payment_method_id, url: "#/payment_methods/" + paymentMethod.payment_method_id + "/edit" });
          utils.redirect($location, "/payment_methods");
      },
      function (error) {
          $scope.exception.error = error;
          window.scrollTo(0, 0);
      });
    };

    $scope.updatePaymentMethod = function () {

        $scope.exception.error = null;

        if ($scope.form.$invalid) {
            window.scrollTo(0, 0);
            return;
        }

        if ($scope.paymentMethod.type == 'credit_card') {
            if ($scope.paymentMethod.data.billing_address.country)
                $scope.paymentMethod.data.billing_address.country = $scope.paymentMethod.data.billing_address.country.code;
            if ($scope.paymentMethod.data.billing_address.state_prov)
                $scope.paymentMethod.data.billing_address.state_prov = $scope.paymentMethod.data.billing_address.state_prov.code;
        }

        ApiService.set($scope.paymentMethod, $scope.url).then(function (paymentMethod) {
            GrowlsService.addGrowl({ id: "edit_success", name: paymentMethod.data.label || paymentMethod.type, type: "success", payment_method_id: paymentMethod.payment_method_id, url: "#/payment_methods/" + paymentMethod.payment_method_id + "/edit" });
           utils.redirect($location, "/payment_methods");
       },
       function (error) {
           window.scrollTo(0, 0);
           $scope.exception.error = error;
       });
    };

    $scope.confirmCancel = function () {
        var confirm = { id: "changes_lost" };
        confirm.onConfirm = function () {
            utils.redirect($location, "/payment_methods");
        }
        ConfirmService.showConfirm($scope, confirm);
    };

    $scope.confirmDelete = function () {
        var confirm = { id: "delete" };
        confirm.onConfirm = function () {
            $scope.removePaymentMethod();
        }
        ConfirmService.showConfirm($scope, confirm);
    };

    $scope.removePaymentMethod = function () {
        ApiService.remove($scope.paymentMethod.url).then(
       function (paymentMethod) {
           GrowlsService.addGrowl({ id: "delete_success", name: $scope.paymentMethod.data.label || $scope.paymentMethod.type, type: "success" });
           utils.redirect($location, "/payment_methods");
       },
       function (error) {
           window.scrollTo(0, 0);
           $scope.exception.error = error;
       });
    };

}]);



