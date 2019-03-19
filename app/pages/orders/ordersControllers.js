app.controller("OrdersListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', 'SettingsService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService, SettingsService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.orderListUrl = ApiService.buildUrl("/customers/me/orders", SettingsService.get());

    $scope.functions = {};

    $scope.functions.toItemCsv = function (order) {
        if (order && order.items) {
            var names = _.pluck(order.items, "name");
            var csv = names.join(", ");
            return csv;
        }
    }

}]);

app.controller("OrdersViewCtrl", ['$scope', '$routeParams', 'ApiService', 'ConfirmService', 'GrowlsService', 'SettingsService', function ($scope, $routeParams, ApiService, ConfirmService, GrowlsService, SettingsService) {

    $scope.order = {};  
    $scope.payment = {};
    $scope.exception = {};
    $scope.count = {};
    $scope.count.shipments = 0;
    $scope.resources = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/orders/" + $routeParams.id, SettingsService.get());
    $scope.resources.shipmentListUrl = $scope.url + "/shipments";
    $scope.resources.refundListUrl = $scope.url + "/refunds";
    $scope.resources.notificationListUrl = $scope.url + "/notifications";

    // Load the order
    var params = { expand: "customer,payment.response_data,payment.payment_method,payment.gateway,payment.refunds,items.product,items.subscription,items.subscription_terms,items.download.file,items.license.license_service,shipments", hide: "items.product.images,items.license.license_service.configuration", formatted: true };
    ApiService.getItem($scope.url, params).then(function (order) {
        $scope.order = order;

        $scope.showShipping = false;

        _.each($scope.order.items, function (item) {
            if (item.license) {
                item.license.renderedHtml = "<strong>" + item.license.label + "</strong><br>" + item.license.html;
                if (item.license.instructions) {
                    $scope.renderedLicenseHtml += "<br><br>" + item.license.instructions;
                }
            }
            if (item.type == "physical") {
                $scope.showShipping = true;
            }
        });


    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

    $scope.downloadPdf = function () {

        ApiService.getItemPdf($scope.url).then(function (data) {

            var file = new Blob([data], { type: "application/pdf" });
            saveAs(file, "Order_" + $scope.order.order_id + ".pdf");

        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    }

}]);



