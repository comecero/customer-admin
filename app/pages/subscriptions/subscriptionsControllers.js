
//#region Subscriptions

app.controller("SubscriptionsListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', 'SettingsService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService, SettingsService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.subscriptionListUrl = ApiService.buildUrl("/customers/me/subscriptions", SettingsService.get());

}]);

app.controller("SubscriptionsViewCtrl", ['$scope', '$routeParams', '$location', 'GrowlsService', 'ApiService', 'ConfirmService', 'SettingsService', function ($scope, $routeParams, $location, GrowlsService, ApiService, ConfirmService, SettingsService) {

    $scope.exception = {};
    $scope.payment_method = null;
    $scope.invoices = {};
    $scope.model = {};
    $scope.model.subscription = {};
    $scope.resources = {};
    $scope.count = {};
    $scope.count.invoices = 0;

    $scope.allowCancel = SettingsService.get().account.allow_customer_subscription_cancel;

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/subscriptions/" + $routeParams.id, SettingsService.get())

    // Prep the billing history
    $scope.resources.invoiceListUrl = $scope.url + "/invoices";

    // Load the subscription
    ApiService.getItem($scope.url, { expand: "items.subscription_terms,customer.payment_methods", hide: "product.images", formatted: true }).then(function (subscription) {
        $scope.model.subscription = subscription;
    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

    $scope.uncancel = function () {

        ApiService.set(null, $scope.url + "/uncancel", { expand: "subscription_plan,customer.cards,product", hide: "product.images" }).then(function (subscription) {
            $scope.model.subscription = subscription;

        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

}]);

//#endregion Subscriptions



