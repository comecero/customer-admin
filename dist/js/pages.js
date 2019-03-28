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

app.controller("SubscriptionsViewCtrl", ['$scope', '$routeParams', '$location', 'GrowlsService', 'ApiService', 'SettingsService', 'ConfirmService', '$timeout', function ($scope, $routeParams, $location, GrowlsService, ApiService, SettingsService, ConfirmService, $timeout) {

    $scope.exception = {};
    $scope.payment_method = null;
    $scope.invoices = {};
    $scope.model = {};
    $scope.model.subscription = {};
    $scope.resources = {};
    $scope.count = {};
    $scope.count.invoices = 0;

    // Set the url for interacting with this item
    $scope.url = ApiService.buildUrl("/subscriptions/" + $routeParams.id, SettingsService.get())

    $scope.allCurrencies = JSON.parse(localStorage.getItem("payment_currencies"));
    $scope.allowCancel = SettingsService.get().account.allow_customer_subscription_cancel;

    // Prep the billing history
    $scope.resources.invoiceListUrl = $scope.url + "/invoices";

    // Load the subscription
    var expand = "subscription_plan,customer.payment_methods,items.subscription_terms,items.subscription_plan,items.product";
    var expandItem = "subscription.subscription_plan,subscription.customer.payment_methods,subscription.items.subscription_terms,subscription.items.subscription_plan,subscription.items.product";
    ApiService.getItem($scope.url, { expand: expand, formatted: true }, { formatted: true }).then(function (subscription) {
        setPendingChanges(subscription);
        $scope.model.subscription = subscription;

        var currency = _.find(JSON.parse(localStorage.getItem("payment_currencies")), function (cur) {
            return cur.code == subscription.currency;
        });
        $scope.currencies = [currency];

        // If the payment currenceny is not equal to any one of the item reference currencies, set currencies to the value of the payment currency and the referernce currencies so a user can make them match, if desired.
        _.each(subscription.items, function (item) {
            if (item.reference_currency != subscription.currency) {
                var currency = _.find(JSON.parse(localStorage.getItem("payment_currencies")), function (cur) {
                    return cur.code == item.reference_currency;
                });
                if (_.find($scope.currencies, function (c) { return c.code == currency.code }) == null) {
                    $scope.currencies.push(currency);
                }
            }
        });

        $scope.currencies = _.uniq($scope.currencies);

    }, function (error) {
        $scope.exception.error = error;
        window.scrollTo(0, 0);
    });

    $scope.uncancel = function () {

        var data = { cancel_at_current_period_end: false };

        ApiService.set(data, $scope.url + "/uncancel", { expand: expand, formatted: true }).then(function (subscription) {
            setPendingChanges(subscription);
            $scope.model.subscription = subscription;
        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

    $scope.uncancelItem = function (item) {

        ApiService.set(null, item.url + "/uncancel", { expand: expandItem, formatted: true }).then(function (item) {
            setPendingChanges(item.subscription);
            $scope.model.subscription = item.subscription;
        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

    $scope.setEdit = function (item) {

        $scope.edit = true;
        $scope.editing = item.item_id;

        // Add this item to the list
        var convertedItem = { product_id: item.product_id, reference_price: item.reference_price, reference_discount: item.reference_discount, discount_apply_count: item.discount_apply_count, reference_currency: item.reference_currency, quantity: item.quantity, name: item.name, subscription_plan: $scope.model.subscription.subscription_plan, subscription_terms: item.subscription_terms, formatted: item.formatted }
        $scope.change_items = [convertedItem];

        if (!convertedItem.discount_apply_count) {
            $scope.model.apply_unlimited = true;
        } else {
            $scope.model.apply_unlimited = false;
        }

        $scope.selectItem(convertedItem);

        ApiService.getItem(item.url, { expand: "product.subscription_plan,product.subscription_change_products.subscription_plan,product.subscription_term_change_products.subscription_plan,product.subscription_change_products.subscription_terms,product.subscription_term_change_products.subscription_terms", formatted: true, currency: item.reference_currency }).then(function (item) {

            _.each(item.product.subscription_change_products.data, function (p) {
                $scope.change_items.push(convertToItem(p, item, p.subscription_plan, p.subscription_terms));
            });

            _.each(item.product.subscription_term_change_products.data, function (p) {
                $scope.change_items.push(convertToItem(p, item, p.subscription_plan, p.subscription_terms));
            });

        }, function (error) {
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });

    }

    function convertToItem(product, parentItem, subscriptionPlan, subscriptionTerms) {
        return { product_id: product.product_id, reference_price: product.price, reference_discount: 0, discount_apply_count: parentItem.discount_apply_count, reference_currency: parentItem.reference_currency, quantity: parentItem.quantity, name: product.name, subscription_plan: subscriptionPlan, subscription_terms: subscriptionTerms, formatted: { reference_price: product.formatted.price } };
    }

    function getItemForUpdate(newItem) {
        var updateItem = { product_id: newItem.product_id, reference_price: newItem.reference_price, reference_discount: newItem.reference_discount, reference_currency: newItem.reference_currency, quantity: newItem.quantity, discount_apply_count: newItem.discount_apply_count, apply_immediately: newItem.apply_immediately };

        if (!updateItem.reference_price) {
            delete updateItem.reference_price;
        }

        if (!updateItem.reference_discount) {
            delete updateItem.reference_discount;
        }

        if (!updateItem.quantity) {
            updateItem.quantity = 0;
        }

        if ($scope.model.apply_unlimited) {
            updateItem.discount_apply_count = null;
        }

        return updateItem;
    }

    $scope.cancelEdit = function () {
        $scope.edit = false;
        $scope.editing = null;
        $scope.selected = null;
        $scope.preview = null;
    }

    $scope.isEditing = function (item) {
        return $scope.editing == item.item_id;
    }

    $scope.selectItem = function (item) {
        item.apply_immediately = false;
        $scope.selected = item;
        $scope.preview = null;
    }

    $scope.isSelected = function (item) {
        return $scope.selected.product_id == item.product_id;
    }

    $scope.updateItem = function (item) {

        // Make a copy of the item
        var updateItem = getItemForUpdate($scope.selected);
        updateItem.date_effective = $scope.date_effective;
        var params = { expand: expandItem, formatted: true };

        var url = $scope.url + "/items";
        if ($scope.selected.product_id == item.product_id) {
            // An update to the current item.
            url += "/" + item.item_id;
        } else {
            // Replace the current item.
            params.remove_item_id = item.item_id;
        }

        updateItem = cleanUpdateItem(updateItem);

        ApiService.set(updateItem, url, params).then(function (i) {
            item = i;
            GrowlsService.addGrowl({ id: "edit_success_no_link", type: "success" });
            $scope.preview = null;
            $scope.editing = null;

            setPendingChanges(i.subscription);

            $scope.model.subscription = i.subscription;
        },
        function (error) {
            window.scrollTo(0, 0);
            $scope.exception.error = error;
        });

    }

    $scope.previewChanges = function (currentItem) {

        // Reset the current error
        if ($scope.exception && $scope.exception.error) {
            $scope.exception.error = null;
        }

        // Make a copy of the item
        var updateItem = getItemForUpdate($scope.selected);
        var params = { formatted: true };

        var url = $scope.url + "/items";
        if (updateItem.product_id == currentItem.product_id) {
            // An update to the current item.
            url += "/" + currentItem.item_id + "/preview";
        } else {
            // Replace the current item.
            url += "/preview"
            params.remove_item_id = currentItem.item_id;
        }

        updateItem = cleanUpdateItem(updateItem);

        ApiService.set(updateItem, url, params).then(function (p) {
            p.name = $scope.selected.name;
            $scope.preview = p;
            $scope.date_effective = p.date_effective;
        },
        function (error) {
            window.scrollTo(0, 0);
            $scope.exception.error = error;
        });

    }

    $scope.getSubscriptionInfo = function (subscription_plan) {
        var description = subscription_plan.billing_interval_description;
        if (subscription_plan.trial_interval_description) {
            description += " with trial";
        }
        return description;
    }

    $scope.$watch("selected", function (newVal, oldVal) {
        if (newVal != oldVal) {
            // If the selected item changes, reset the preview.
            $scope.preview = null;
        }
    }, true);

    function setPendingChanges(subscription) {

        _.each(subscription.items, function (item) {
            var pendingChanges = [];
            if (item.change_at_current_period_end) {
                var changeItem = item.change_at_current_period_end;
                if (item.item_id != changeItem.item_id) {
                    pendingChanges.push({ name: "Product", from: item.name + " (" + item.item_id + ")", to: changeItem.name + " (" + changeItem.item_id + ")" });
                }

                if (item.reference_price != changeItem.reference_price) {
                    pendingChanges.push({ name: "Price", from: item.formatted.reference_price + " " + item.reference_currency, to: changeItem.formatted.reference_price + " " + changeItem.reference_currency });
                }

                if (item.reference_discount != changeItem.reference_discount) {
                    pendingChanges.push({ name: "Discount", from: item.formatted.reference_discount + " " + item.reference_currency, to: changeItem.formatted.reference_discount + " " + changeItem.reference_currency });
                }

                if (item.reference_currency != changeItem.reference_currency) {
                    pendingChanges.push({ name: "Currency", from: item.reference_currency, to: changeItem.reference_currency });
                }

                if (item.quantity != changeItem.quantity) {
                    pendingChanges.push({ name: "Quantity", from: item.quantity, to: changeItem.quantity });
                }

                if (item.discount_apply_count != changeItem.discount_apply_count) {
                    var from = item.discount_apply_count || "unset";
                    var to = changeItem.discount_apply_count || "unlimited";
                    pendingChanges.push({ name: "Times to apply the discount", from: from, to: to });
                }
            }
            if (pendingChanges.length > 0) {
                item.change_summary = pendingChanges;
            }
        });

    }

    function removeChanges(item) {

        // Make a copy of the item
        var params = { expand: expandItem, formatted: true };

        var url = $scope.url + "/items/" + item.item_id + "/change_at_current_period_end";

        ApiService.remove(url, params).then(function (i) {
            item = i;
            setPendingChanges(i.subscription);
            $scope.model.subscription = i.subscription;
        },
        function (error) {
            window.scrollTo(0, 0);
            $scope.exception.error = error;
        });

    }

    $scope.confirmRemoveChanges = function (item) {
        var confirm = { id: "remove_changes" };
        confirm.onConfirm = function () {
            removeChanges(item);
        }
        ConfirmService.showConfirm($scope, confirm);
    }

    function cleanUpdateItem(item) {
        delete item.reference_discount;
        delete item.discount_apply_count;
        delete item.reference_price;
        delete item.reference_currency;
        delete item.apply_immediately;
        return item;
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