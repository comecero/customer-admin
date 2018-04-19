
//#region Customers

app.controller("CustomersViewCtrl", ['$scope', '$routeParams', '$location', 'GrowlsService', 'ApiService', 'ConfirmService', 'GeographiesService', 'SettingsService', function ($scope, $routeParams, $location, GrowlsService, ApiService, ConfirmService, GeographiesService, SettingsService) {

    $scope.customer = {};
    $scope.billing_address = {};
    $scope.shipping_address = {};
    $scope.resources = {};
    $scope.edit = false;
    $scope.exception = {};
    $scope.credentials = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/customers/me", SettingsService.get());

    // Load the customer
    ApiService.getItem($scope.url).then(function (customer) {

        $scope.customer = customer;
        $scope.credentials.username = customer.username;
        $scope.payment_methods = customer.payment_methods;

    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

    $scope.setCredentials = function () {

        // Clear any previous errors
        $scope.exception.error = null;

        ApiService.set($scope.credentials, $scope.url).then(function (customer) {

            $scope.customer = customer;
            GrowlsService.addGrowl({ id: "credentials_saved", type: "success" });
            $scope.editCredentials = false;

        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    }

}]);

//#endregion Customers



