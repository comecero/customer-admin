app.controller("InvoicesListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', 'SettingsService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService, SettingsService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.invoiceListUrl = ApiService.buildUrl("/customers/me/invoices", SettingsService.get());

}]);

app.controller("InvoicesSetCtrl", ['$scope', '$routeParams', '$location', 'ApiService', 'SettingsService', 'ConfirmService', 'GrowlsService', function ($scope, $routeParams, $location, ApiService, SettingsService, ConfirmService, GrowlsService) {

    $scope.invoice = {};
    $scope.payment = {};
    $scope.exception = {};
    $scope.count = {};
    $scope.count.payments = 0;
    $scope.count.refunds = 0;
    $scope.resources = {};
    $scope.currencies = SettingsService.get().account.currencies;
    $scope.params = { expand: "customer.payment_methods,options,payments.payment_method,items.subscription_terms,subscription,order", formatted: true };

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/invoices/" + $routeParams.id, SettingsService.get());
    $scope.resources.paymentListUrl = $scope.url + "/payments";
    $scope.resources.refundListUrl = $scope.url + "/refunds";

    // Load the invoice
    ApiService.getItem($scope.url, $scope.params).then(function (invoice) {

        $scope.invoice = invoice;

        // If one of the payments was successful, pluck it.
        $scope.successful_payment = _.findWhere($scope.invoice.payments.data, { success: true });

    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

    $scope.send = function () {

        ApiService.set(null, $scope.url + "/send").then(function (invoice) {
            GrowlsService.addGrowl({ id: "invoice_sent", type: "success", email: $scope.invoice.customer.email });
        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    }

    $scope.downloadPdf = function () {

        ApiService.getItemPdf($scope.url).then(function (data) {

            var file = new Blob([data], { type: "application/pdf" });
            saveAs(file, "Invoice_" + $scope.invoice.invoice_id + ".pdf");

        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    }

    $scope.changeCurrency = function () {

        var payload = { currency: $scope.invoice.currency };

        return ApiService.set(payload, $scope.url, $scope.params).then(function (invoice) {
            $scope.invoice = invoice;
        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

}]);



