app.controller("InvoicesListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.invoiceListUrl = ApiService.buildUrl("/customers/me/invoices");

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
    $scope.params = { expand: "customer.payment_methods,options,payments.payment_method,items.subscription_terms,subscription", formatted: true };

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/invoices/" + $routeParams.id);
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




app.controller("NotificationsListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.notificationListUrl = ApiService.buildUrl("/notifications");

}]);

app.controller("NotificationsViewCtrl", ['$scope', '$routeParams', 'ApiService', 'GrowlsService', '$sce', function ($scope, $routeParams, ApiService, GrowlsService, $sce) {

    $scope.notification = {};
    $scope.exception = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/notifications/" + $routeParams.id);
    $scope.previewUrl = null;
    $scope.showResend = false;

    // Load the notification
    var params = { expand: "customer", hide: "data" };
    ApiService.getItem($scope.url, params).then(function (notification) {
        $scope.notification = notification;
        $scope.previewUrl = $sce.trustAsResourceUrl("/app/pages/notifications/preview/index.html?notification_id=" + notification.notification_id);
        $scope.email = notification.customer.email;
    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

    $scope.resend = function (form) {

        if (form.$invalid) {
            return;
        }

        var body = { destination: $scope.email };
        ApiService.set(body, $scope.url + "/resend", { show: "notification_id" } ).then(function (response) {
            GrowlsService.addGrowl({ id: "notification_resend", email: $scope.email, type: "success" });
            $scope.showResend = false;
        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

}]);

app.controller("NotificationsPreviewCtrl", ['$scope', '$routeParams', 'ApiService', function ($scope, $routeParams, ApiService) {

    $scope.notification = {};
    $scope.exception = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/notifications/" + $routeParams.id)

    // Load the notification
    var params = { show: "body" };
    ApiService.getItem($scope.url, params).then(function (notification) {
        $scope.notification = notification;
    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

}]);




app.controller("OrdersListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.orderListUrl = ApiService.buildUrl("/customers/me/orders");

}]);

app.controller("OrdersViewCtrl", ['$scope', '$routeParams', 'ApiService', 'ConfirmService', 'GrowlsService', function ($scope, $routeParams, ApiService, ConfirmService, GrowlsService) {

    $scope.order = {};  
    $scope.payment = {};
    $scope.exception = {};
    $scope.count = {};
    $scope.count.shipments = 0;
    $scope.resources = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/orders/" + $routeParams.id);
    $scope.resources.shipmentListUrl = $scope.url + "/shipments";
    $scope.resources.refundListUrl = $scope.url + "/refunds";
    $scope.resources.notificationListUrl = $scope.url + "/notifications";

    // Load the order
    var params = { expand: "customer,payment.response_data,payment.payment_method,payment.gateway,payment.refunds,items.product,items.subscription,items.download.file,items.license.license_service,shipments", hide: "items.product.images,items.license.license_service.configuration", formatted: true };
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





//#region Customers

app.controller("CustomersViewCtrl", ['$scope', '$routeParams', '$location', 'GrowlsService', 'ApiService', 'ConfirmService', 'GeographiesService', function ($scope, $routeParams, $location, GrowlsService, ApiService, ConfirmService, GeographiesService) {

    $scope.customer = {};
    $scope.billing_address = {};
    $scope.shipping_address = {};
    $scope.resources = {};
    $scope.edit = false;
    $scope.exception = {};
    $scope.credentials = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/customers/me");

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





//#region Subscriptions

app.controller("SubscriptionsListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.subscriptionListUrl = ApiService.buildUrl("/customers/me/subscriptions");

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
    $scope.url = ApiService.buildUrl("/subscriptions/" + $routeParams.id)

    // Prep the billing history
    $scope.resources.invoiceListUrl = $scope.url + "/invoices";

    // Load the subscription
    ApiService.getItem($scope.url, { expand: "subscription_plan,customer.payment_methods,item.product", hide: "product.images" }).then(function (subscription) {
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




$("document").ready(function () {

    // Get the token
    var token = localStorage.getItem("token");

    // Define the host
    var host = "api.comecero.com";
    if (window.location.hostname.indexOf("admin-staging.") > -1) {
        host = "api-staging.comecero.com";
    }

    // Get the query parameters
    var params = utils.getPageQueryParameters();

    // Define the URL
    var url = "https://" + host + "/api/v1/invoices/" + params["invoice_id"] + "/links";

    // Make a request to get the notification body
    if (params["invoice_id"]) {
        $.ajax
          ({
              type: "POST",
              url: url,
              beforeSend: function (xhr) {
                  xhr.setRequestHeader('Authorization', "Bearer " + token);
              },
              success: function (data) {
                  window.location = data.link_url;
              }
          });
    }

});
$("document").ready(function () {

    // Get the token
    var token = localStorage.getItem("token");

    // Define the host
    var host = "api.comecero.com";
    if (window.location.hostname.indexOf("admin-staging.") > -1) {
        host = "api-staging.comecero.com";
    }

    // Get the query parameters
    var params = utils.getPageQueryParameters();

    // Define the URL
    var url = "https://" + host + "/api/v1/notifications/" + params["notification_id"] + "?show=body";

    // Make a request to get the notification body
    if (params["notification_id"]) {
        $.ajax
          ({
              type: "GET",
              url: url,
              beforeSend: function (xhr) {
                  xhr.setRequestHeader('Authorization', "Bearer " + token);
              },
              success: function (data) {

                  document.open();
                  document.write(data.body);
                  document.close();

              }
          });
    }

});