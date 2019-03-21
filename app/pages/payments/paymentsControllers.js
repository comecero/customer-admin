app.controller("PaymentsViewCtrl", ['$scope', '$routeParams', 'ApiService', 'ConfirmService', 'GrowlsService', 'SettingsService', function ($scope, $routeParams, ApiService, ConfirmService, GrowlsService, SettingsService) {

    $scope.payment = {};
    $scope.exception = {};
    $scope.fee_currency = null;
    $scope.currencyType = "transaction";
    $scope.resources = {};
    $scope.data = { refunds: [] };
    $scope.refundParams = { show: "refund_id,date_created,date_modified,status,success,total,subtotal,currency,shipping,tax" };

    $scope.prefs = {}
    $scope.prefs.loadRefundDetails = false;

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/payments/" + $routeParams.id, SettingsService.get());
    $scope.resources.notificationListUrl = $scope.url + "/notifications";

    // Set the url for pulling the full refund details
    $scope.refundListUrl = $scope.url + "/refunds";

    // Load the payment
    var params = { expand: "customer,payment_method,response_data,gateway,fees,commissions,order,invoice,refunds.items,cart" };
    ApiService.getItem($scope.url, params).then(function (payment) {
        $scope.payment = payment;
    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

}]);