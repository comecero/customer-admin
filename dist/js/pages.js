app.controller("GettingStartedCtrl", ['$scope', 'SettingsService', function ($scope, SettingsService) {

    // Establish your scope containers
    var settings = SettingsService.get();
    $scope.helpUrl = settings.account.support_website || "mailto:" + settings.account.support_email;

}]);
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
    $scope.params = { expand: "customer.payment_methods,options,payments.payment_method,items.subscription_terms,subscription", formatted: true };

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




app.controller("NotificationsListCtrl", ['$scope', '$routeParams', '$location', '$q', 'GrowlsService', 'ApiService', function ($scope, $routeParams, $location, $q, GrowlsService, ApiService) {

    // Establish your scope containers
    $scope.exception = {};
    $scope.resources = {};
    $scope.resources.notificationListUrl = ApiService.buildUrl("/notifications");

}]);

app.controller("NotificationsViewCtrl", ['$scope', '$routeParams', 'ApiService', 'GrowlsService', '$sce', 'SettingsService', function ($scope, $routeParams, ApiService, GrowlsService, $sce, SettingsService) {

    $scope.notification = {};
    $scope.exception = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/notifications/" + $routeParams.id, SettingsService.get());
    $scope.previewUrl = null;
    $scope.showResend = false;

    // Load the notification
    var params = { expand: "customer", hide: "data" };
    ApiService.getItem($scope.url, params).then(function (notification) {
        $scope.notification = notification;
        $scope.previewUrl = $sce.trustAsResourceUrl("app/pages/notifications/preview/index.html?notification_id=" + notification.notification_id);
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

app.controller("NotificationsPreviewCtrl", ['$scope', '$routeParams', 'ApiService', 'SettingsService', function ($scope, $routeParams, ApiService, SettingsService) {

    $scope.notification = {};
    $scope.exception = {};

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/notifications/" + $routeParams.id, SettingsService.get())

    // Load the notification
    var params = { show: "body" };
    ApiService.getItem($scope.url, params).then(function (notification) {
        $scope.notification = notification;
    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

}]);




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
    $scope.resources.paymentListUrl = $scope.url + "/payments";
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




$("document").ready(function () {

    function getCookie(name) {
        if (document.cookie.length > 0) {
            c_start = document.cookie.indexOf(name + "=");
            if (c_start != -1) {
                c_start = c_start + name.length + 1;
                c_end = document.cookie.indexOf(";", c_start);
                if (c_end == -1) {
                    c_end = document.cookie.length;
                }
                return unescape(document.cookie.substring(c_start, c_end));
            }
        }
        return "";
    }

    // Get the token
    var token = getCookie("token");

    // Get the query parameters
    var params = utils.getPageQueryParameters();

    // Define the URL
    var url = "/api/v1/invoices/" + params["invoice_id"] + "/links";

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

    function getCookie(name) {
        if (document.cookie.length > 0) {
            c_start = document.cookie.indexOf(name + "=");
            if (c_start != -1) {
                c_start = c_start + name.length + 1;
                c_end = document.cookie.indexOf(";", c_start);
                if (c_end == -1) {
                    c_end = document.cookie.length;
                }
                return unescape(document.cookie.substring(c_start, c_end));
            }
        }
        return "";
    }

    // Get the token
    var token = getCookie("token");

    // Get the query parameters
    var params = utils.getPageQueryParameters();

    // Define the URL
    var url =  "/api/v1/notifications/" + params["notification_id"] + "?show=body";

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