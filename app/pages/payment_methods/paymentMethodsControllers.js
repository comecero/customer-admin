app.controller("PaymentMethodsListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', 'SettingsService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService, SettingsService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.paymentMethodListUrl = ApiService.buildUrl("/customers/me/payment_methods", SettingsService.get());

    $scope.functions = {};
    $scope.functions.getPaymentImageName = function (paymentMethod) {
        if (paymentMethod) {
            if (paymentMethod.type == "credit_card") {
                return (paymentMethod.data.type.toLowerCase() + ".png").replace(" ", "_");
            } else {
                return (paymentMethod.type.toLowerCase() + ".png").replace(" ", "_");
            }
        }
    }

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
            $scope.paymentMethod = paymentMethod;
        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    } else {
        $scope.add = true;
        $scope.update = false;
    }

    $scope.addPaymentMethod = function () {

        if ($scope.form.$invalid) {
            window.scrollTo(0, 0);
            return;
        }

        $scope.paymentMethod.type = 'credit_card';

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

    $scope.getPaymentImageName = function (paymentMethod) {
        if (paymentMethod) {
            if (paymentMethod.type == "credit_card") {
                return (paymentMethod.data.type.toLowerCase() + ".png").replace(" ", "_");
            } else {
                return (paymentMethod.type.toLowerCase() + ".png").replace(" ", "_");
            }
        }
    }

}]);



