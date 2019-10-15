app.controller("RefundsViewCtrl", ['$scope', '$routeParams', 'ApiService', 'ConfirmService', 'GrowlsService', 'SettingsService', function ($scope, $routeParams, ApiService, ConfirmService, GrowlsService, SettingsService) {

    $scope.refund = {};
    $scope.exception = {};
    $scope.fee_currency = null;
    $scope.items = [];
    $scope.currencyType = "transaction";
    $scope.resources = {};

    $scope.prefs = {}
    $scope.prefs.loadRefundDetails = false;

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/refunds/" + $routeParams.id, SettingsService.get());
    $scope.resources.notificationListUrl = $scope.url + "/notifications";

    // Load the refund
    var params = { expand: "payment,customer,payment_method,gateway,fees,commissions,order,refunds.items" };
    ApiService.getItem($scope.url, params).then(function (refund) {
        $scope.refund = refund;

        if (refund.order != null) {
            $scope.items = refund.order.items;
        }

    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

}]);



