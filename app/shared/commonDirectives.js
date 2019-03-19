app.directive('isValidInteger', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {

            ctrl.$validators.characters = function (modelValue, viewValue) {
                var value = modelValue || viewValue;
                if (attrs.allowEmptyValue == "true" && (value == "" || value == null)) {
                    return true;
                }
                if (utils.isValidInteger(value) == false) {
                    return false;
                }
                if (attrs.lessThanOrEqual) {
                    if (Number(value) > Number(attrs.lessThanOrEqual)) {
                        return false;
                    }
                }
                if (attrs.lessThan) {
                    if (Number(value) >= Number(attrs.lessThan)) {
                        return false;
                    }
                }
                if (attrs.greaterThanOrEqual) {
                    if (Number(value) < Number(attrs.greaterThanOrEqual)) {
                        return false;
                    }
                }
                if (attrs.greaterThan) {
                    if (Number(value) <= Number(attrs.greaterThan)) {
                        return false;
                    }
                }
                return true;
            }
        }
    };
});


app.directive('isValidNumber', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {

            ctrl.$validators.characters = function (modelValue, viewValue) {
                var value = modelValue || viewValue;
                if (attrs.allowEmptyValue == "true" && (value == "" || value == null)) {
                    return true;
                }
                if (utils.isValidNumber(value) == false) {
                    return false;
                }
                if (attrs.lessThanOrEqual) {
                    if (Number(value) > Number(attrs.lessThanOrEqual)) {
                        return false;
                    }
                }
                if (attrs.lessThan) {
                    if (Number(value) >= Number(attrs.lessThan)) {
                        return false;
                    }
                }
                if (attrs.greaterThanOrEqual) {
                    if (Number(value) < Number(attrs.greaterThanOrEqual)) {
                        return false;
                    }
                }
                if (attrs.greaterThan) {
                    if (Number(value) <= Number(attrs.greaterThan)) {
                        return false;
                    }
                }
                return true;
            }
        }
    };
});


app.directive('isValidUrl', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {

            ctrl.$validators.characters = function (modelValue, viewValue) {
                var value = modelValue || viewValue;
                if (attrs.allowEmptyValue == "true" && (value == "" || value == null)) {
                    return true;
                }
                // https://gist.github.com/dperini/729294
                return /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i.test(value);
            }
        }
    };
});


app.directive('isValidEmail', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {

            ctrl.$validators.characters = function (modelValue, viewValue) {
                var value = modelValue || viewValue;
                if (attrs.allowEmptyValue == "true" && (value == "" || value == null)) {
                    return true;
                }
                // http://stackoverflow.com/a/46181/2002383 anystring@anystring.anystring
                return /\S+@\S+\.\S+/.test(value);
            }
        }
    };
});


app.directive('allowEmpty', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {

            ctrl.$validators.characters = function (modelValue, viewValue) {
                var value = modelValue || viewValue;
                if (attrs.allowEmpty == "true") {
                    return true;
                }
                if (utils.isNullOrEmpty(value)) {
                    return false;
                }
                return true;
            }
        }
    };
});


app.directive('maxLength', ['$timeout', function ($timeout) {
    return {
        restrict: 'A',
        scope: {
            item: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            scope.$watch('item.$viewValue', function (value) {
            var msg = "";
            var warning = false;
            var danger = false;

            var currentCount = 0;
            if (scope.item) {
                if (scope.item.$viewValue) {
                    currentCount = scope.item.$viewValue.length;
                }
            }

            if ((Number(attrs.maxLength) - Number(currentCount)) >= 0) {
                if (Number(currentCount) < 10) {
                    msg = attrs.maxLength + " characters maximum";
                    warning = false;
                    danger = false;
                } else if ((Number(attrs.maxLength) - Number(currentCount)) < 20) {
                    msg = (Number(attrs.maxLength) - Number(currentCount)) + " characters remaining";
                    warning = true;
                    danger = false;
                } else {
                    msg = "About " + Math.round((Number(attrs.maxLength) + 4 - Number(currentCount)) / 10) * 10 + " characters remaining";
                    warning = false;
                    danger = false;
                }

                scope.item.$setValidity("maxlength", true);

            } else {
                msg = "Whoops! You've entered too many characters.";
                warning = false;
                danger = true;
                scope.item.$setValidity("maxlength", false);
            }

            // Clear out any previous
            elem.removeClass("text-warning text-danger");

            if (danger == true) {
                elem.addClass("text-danger");
            }

            if (warning == true) {
                elem.addClass("text-warning");
            }

            // Set the message
            elem.text(msg);

        });
        }
    };
}]);


app.directive('login', ['$uibModal', 'authService', 'ApiService', 'SettingsService', 'StorageService', '$sce', '$rootScope', function ($uibModal, authService, ApiService, SettingsService, StorageService, $sce, $rootScope) {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs, ctrl) {

            scope.$on("event:auth-loginRequired", function (event) {

                if (!scope.user) {
                    scope.user = {};
                }

                scope.exception = {};

                // Show the login modal.
                if (scope.openLogin == null) {
                    scope.openLogin = $uibModal.open({
                        size: 'sm',
                        templateUrl: 'app/modals/login.html',
                        backdrop: 'static',
                        keyboard: 'false'
                    });
                }

                var setDisabled = function (element, disabled) {
                    if (disabled) {
                        element.setAttribute("disabled", "disabled");
                    } else {
                        element.removeAttribute("disabled");
                    }
                }

                scope.login = function () {

                    // Disable the signin button.
                    setDisabled(document.getElementById("login"), true);

                    // Attept to log the customer in.
                    var accountSettings = SettingsService.get().account;
                    var params = { account_id: accountSettings.account_id, test: accountSettings.test };
                    var creds = { username: scope.user.username, password: scope.user.password };
                    ApiService.login(creds, ApiService.buildUrl("/customers/login", SettingsService.get()), params).then(function (customer) {

                        // Set the token in storage
                        StorageService.set("token", customer.auth.token);

                        // Remove the credentials from memory
                        scope.user = {};

                        // Tell the http interceptor that the login succeeded so it can re-run the failed HTTP requests.
                        authService.loginConfirmed();

                        // Broadcast the login event so controllers can respond to it as necessary.
                        scope.$broadcast("event:loginSuccess");

                        // Close the login modal.
                        if (scope.openLogin != null) {
                            scope.openLogin.close();
                            delete scope.openLogin;
                        }

                    }, function (error) {
                        scope.modalError = error;
                        window.scrollTo(0, 0);

                        // Enabled the signin button.
                        setDisabled(document.getElementById("login"), false);

                    });

                }

                // Listen for a click / submit of the login details. Send to the API for authorization.

                // On success, add the returned token and user info to the cookie. Close and delete the modal.

                // Broadcast the login event so controllers can respond to it as necessary.
                // scope.$broadcast("event:loginSuccess");

                // Tell the auth service that it can re-run the previous request for which a failed HTTP (403) was returned
                // authService.loginConfirmed();

                // On success, show an error.

                // Only show if a modal is not already displayed
                //if (scope.openLogin == null) {
                //    scope.openLogin = $uibModal.open({
                //        size: 'sm',
                //        templateUrl: '/modals/login.html',
                //        backdrop: 'static',
                //        keyboard: 'false'
                //    });

                //    // Prepare to recieve a message back from the iframe upon successful login.
                //    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
                //    var eventer = window[eventMethod];
                //    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

                //    // Listen to message from child window
                //    eventer(messageEvent, function (e) {
                //        var key = e.message ? "message" : "data";
                //        var data = e[key];

                //        if (data == "loginSuccess") {

                //            // Close and delete the dialoge if open.
                //            if (scope.openLogin != null) {
                //                scope.openLogin.close();
                //                delete scope.openLogin;
                //            }

                //            // Broadcast the login event so controllers can respond to it as necessary.
                //            scope.$broadcast("event:loginSuccess");

                //            // Set the user settings
                //            SettingsService.setUserSettings();

                //            // Tell the http interceptor that the login succeeded so it can re-run the failed HTTP requests.
                //            authService.loginConfirmed();

                //        } else {
                //            // Only in rare cases will this happen - only in a case after a successful login we were unable to properly set the login cookie. Typical login failures are handled within the iFrame.
                //            // As such, we don't specially handle - the login will fail and the next action the user takes will ask them to login again. This could be updated to provide more explicit help.
                //            // Broadcast the login event so controllers can respond to it as necessary.
                //            scope.$broadcast("event:loginFailure");
                //            delete scope.openLogin;
                //        }

                //    }, false);

                //}

            });
        }
    }
}]);


app.directive('selectOnClick', function () {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
            elem.on('click', function () {
                this.select();
            });
        }
    };
});


app.directive('focus', function () {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
            elem[0].focus();
        }
    };
});


app.directive('cancelSubscription', ['ApiService', 'ConfirmService', 'GrowlsService', '$uibModal', function (ApiService, ConfirmService, GrowlsService, $uibModal) {
    return {
        restrict: 'A',
        scope: {
            subscription: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Hide by default
            elem.hide();

            // Watch to see if you should show or hide the button
            scope.$watch('subscription', function () {
                if (scope.subscription) {
                    if ((scope.subscription.status == "active" || scope.subscription.status == "trial") && scope.subscription.cancel_at_current_period_end == false) {
                        elem.show();
                    } else {
                        elem.hide();
                    }
                }
            }, true);

            elem.click(function () {

                // Set defaults
                scope.subscription_cancel = {};
                scope.subscription_cancel.request = {};
                scope.subscription_cancel.request.cancellation_reason = null;
                scope.cancellation_reasons = [];

                var subscriptionModal = $uibModal.open({
                    size: "lg",
                    templateUrl: "app/modals/cancel_subscription.html",
                    scope: scope
                });

                // Handle when the modal is closed or dismissed
                subscriptionModal.result.then(function (result) {
                    // Clear out any error messasges
                    scope.modalError = null;
                }, function () {
                    scope.modalError = null;
                });

                scope.subscription_cancel.ok = function (form) {

                    // Clear any previous errors
                    scope.modalError = null;

                    var confirm = { id: "cancel_subscription" };
                    confirm.onConfirm = function () {
                        execute();
                    }

                    ConfirmService.showConfirm(scope, confirm);

                };

                var execute = function () {

                    // If cancel at period end is false, set the status to cancelled.
                    var request = {
                        cancel_at_current_period_end: true,
                        cancellation_reason: scope.subscription_cancel.request.cancellation_reason
                    }

                    // Cancel the subscription
                    ApiService.set(request, scope.subscription.url + "/cancel", { expand: "subscription_plan,customer,product" })
                    .then(
                    function (subscription) {
                        scope.subscription = subscription;
                        subscriptionModal.dismiss();
                        GrowlsService.addGrowl({ id: "subscription_cancel_success", type: "success" });
                    },
                    function (error) {
                        window.scrollTo(0, 0);
                        scope.modalError = error;
                    });
                }

                scope.subscription_cancel.cancel = function () {
                    subscriptionModal.dismiss();
                };

            });
        }
    };
}]);


app.directive('objectList', ['ApiService', '$location', function (ApiService, $location) {
    return {
        restrict: 'A',
        templateUrl: function(elem, attrs) {
            return attrs.templateUrl
        },
        scope: {
            error: '=?',
            count: '=?',
            refreshOnChange: '=?',
            functions: '=?',
            refresh: '=?',
            meta: '=?',
            params: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Attributes to use this directive:
            // url: The API's url for the list (required).
            // pagination: (possible values: offset or cursor). Indicates if the endpoint returns offset or cursor pagination.
            // limit: The number of results per page (optional).
            // type: The type of object that the list contains. This is used to be able to supply specific limits on what is returned in the payload.
            // templateUrl: The url to the template that this list will be rendered into.
            // embedded: Indicates if the list is embedded into a page as a child section (i.e. order list embedded on the customer page). When embedded == false, userParams changes are handled via querystring parameter, which allows the URL to store list state.
            // search: true / false to determine if you display the search box. Defaults to true.
            // params: If you need to override the default params in your request

            // Shared scope:
            // error: The parent page error object, so errors within the directive can be passed up and displayed.
            // count: Shares the result count back to the parent. Only supplies a value for offset-based paginated lists that return an item count in the payload header.
            // refresh-on-change: If other items on the page do functions that may cause the list to change (such as a processing a refund or shipping an item), place the collection of those items here and when it changes, it will trigger a refresh in the list.
            // functions: If your list needs to call external functions, the functions can be passed in as properties of the functions object
            // meta: An object that can be used to pass external data into the list
            // refresh: A function that an external function can use to manually refresh the list

            // Establish your scope containers
            scope.list = {};
            scope.userParams = {};
            scope.settings = {};
            var default_sort = null;

            // Establish what you need in your response based on the object type. If not configured things will still work but your response payload will be much heavier than necessary.
            var baseParams = scope.params || {};

            if (!scope.params) {

                if (attrs.type == "order") {
                    baseParams.show = "date_created,order_id,fulfilled,total,payment_status,currency,items.name";
                    default_sort = "date_created";
                }
                if (attrs.type == "subscription") {
                    baseParams.show = "subscription_id,reference_price,reference_currency,status,item.name,item.product.product_id,date_created,date_modified,in_grace_period;";
                    baseParams.expand = "subscription_plan,item.product";
                    default_sort = "date_modified";
                }
                if (attrs.type == "payment") {
                    baseParams.show = "payment_id,date_created,date_modified,status,success,total,currency";
                    default_sort = "date_created";
                }
                if (attrs.type == "refund") {
                    baseParams.show = "refund_id,date_created,date_modified,status,success,total,currency";
                    default_sort = "date_created";
                }
                if (attrs.type == "shipment") {
                    baseParams.show = "shipment_id,courier,tracking_url,tracking_number,date_shipped,items.name,items.quantity";
                    default_sort = "date_shipped";
                }
                if (attrs.type == "cart") {
                    baseParams.show = "cart_id,date_created,payment_status,total,date_modified,currency";
                    default_sort = "date_modified";
                }
                if (attrs.type == "invoice") {
                    baseParams.show = "invoice_id,date_created,date_due,payment_status,total,date_modified,currency";
                    default_sort = "date_modified";
                }
                if (attrs.type == "app") {
                    baseParams.show = "name,app_id,date_created,active,deleted,date_modified,images.link_square,installed,install_url,app_installation.launch_url,app_installation.app_installation_id";
                    baseParams.expand = "images,app_installation";
                    default_sort = "date_created";
                }
                if (attrs.type == "app_installation") {
                    baseParams.show = "name,app_installation_id,date_created,image_url,short_description,info_url,launch_url,settings_fields,style_fields,version,is_default_version,updated_version_available,install_url,platform_hosted";
                    baseParams.expand = "images";
                    default_sort = "name";
                    scope.userParams.desc = false;
                }
                if (attrs.type == "notification") {
                    baseParams.show = "notification_id,date_created,type,status";
                    baseParams.limit = 25;
                    default_sort = "date_created";
                }

            }

            // Convert string bools to actual bools
            utils.stringsToBool(attrs);

            // Set pagination variable
            scope.settings.page = attrs.page;

            // Seat search variable
            scope.settings.search = true;
            if (attrs.search == false) {
                scope.settings.search = false;
            }

            var parseSearch = function () {

                // Reset the userParams
                resetParams();

                // Load the querystring into your userParams
                scope.userParams = ($location.search())

                // Convert any string true/false to bool
                utils.stringsToBool(scope.userParams);

                // Set defaults for the remaining userParams
                setDefaultParams();
            }

            var getList = function (scrollTop) {

                // We keep show out of the userParams object to keep them out of the page's visible query string.
                var url = utils.appendParams(attrs.url, baseParams);

                ApiService.getList(url, scope.userParams).then(function (result) {
                    scope.list = result;
                    scope.count = result.total_items;

                    // If instructed, scroll to the top upon completion
                    if (scrollTop == true & attrs.embedded == false) {
                        window.scrollTo(0, 0);
                    }

                    // Set pagination
                    setPagination(scope.list);

                },
                function (error) {
                    scope.error = error;
                });
            }

            var refresh = function (scrollTop) {
                getList(scrollTop);
            }

            scope.refresh = function () {
                refresh();
            }

            var setPagination = function (list) {
                scope.userParams.before_item = list.previous_page_before_item;
                scope.userParams.after_item = list.previous_page_before_item;
                scope.previous_page_offset = list.previous_page_offset;
                scope.next_page_offset = list.next_page_offset;
            }

            var setDefaultParams = function () {
                // This sets the default values for certain parameters, if unpopulated

                if (scope.settings.page == "cursor") {
                    if (scope.userParams.date_type == null) {
                        scope.userParams.date_type = default_sort;
                    }
                } else {
                    if (scope.userParams.sort_by == null) {
                        scope.userParams.sort_by = default_sort;
                    }
                }

                if (scope.userParams.desc == null) {
                    scope.userParams.desc = true;
                }

                if (attrs.limit != null) {
                    scope.userParams.limit = attrs.limit;
                }
            }

            var resetParams = function () {
                scope.userParams = {};
            }

            var resetNavParams = function () {
                scope.userParams.before_item = null;
                scope.userParams.after_item = null;
                scope.previous_page_offset = null;
                scope.next_page_offset = null;
            }

            scope.movePage = function (direction, value) {

                if (scope.settings.page == 'cursor') {
                    if (direction == "+") {
                        scope.userParams.after_item = value;
                        scope.userParams.before_item = null;
                    } else {
                        scope.userParams.after_item = null;
                        scope.userParams.before_item = value;
                    }
                } else {
                    scope.userParams.offset = value;
                }

                // If embedded, don't mess with the parent's query string parameters.
                if (attrs.embedded == false) {
                    $location.search(scope.userParams);
                } else {
                    refresh(false);
                }
            }

            scope.setParam = function (param, value) {

                // Reset all userParams
                resetParams();

                // Set this param
                scope.userParams[param] = value;

                // Set defaults for unpopulated userParams
                setDefaultParams();

                // If embedded, don't mess with the parent's query string parameters.
                if (attrs.embedded == false) {
                    $location.search(scope.userParams);
                } else {
                    refresh(false);
                }

            }

            scope.search = function (q) {

                // Reset navigation userParams, preserve the others.
                resetNavParams();

                // Set this param
                scope.userParams.q = q;

                // Set defaults for unpopulated userParams
                setDefaultParams();

                // If embedded, don't mess with the parent's query string parameters.
                if (attrs.embedded == false) {
                    $location.search(scope.userParams);
                } else {
                    refresh(false);
                }

            }

            scope.sort = function (sort_by, desc) {

                if (scope.settings.page == "cursor") {
                    scope.userParams.date_type = sort_by;

                    // Since we are reversing the order, switch before_item to after_item or vice versa, depending on what's populated.
                    if (scope.userParams.before_item) {
                        scope.userParams.after_item = scope.userParams.before_item;
                        scope.userParams.before_item = null;
                    }

                    if (scope.userParams.after_item) {
                        scope.userParams.before_item = scope.userParams.after_item;
                        scope.userParams.after_item = null;
                    }
                } else {
                    scope.userParams.sort_by = sort_by;
                    scope.userParams.offset = null;
                }

                scope.userParams.desc = desc;

                // If embedded, don't mess with the parent's query string parameters.
                if (attrs.embedded == false) {
                    $location.search(scope.userParams);
                } else {
                    refresh();
                }
            }

            scope.getSortValue = function () {
                if (scope.settings.page == "cursor") {
                    return scope.userParams.date_type;
                } else {
                    return scope.userParams.sort_by;
                }
            }

            // Listen for route updates (which happen when the the querystring changes) and reload. We don't respond when embedded as those changes are not targeted to this list (but to the parent).
            if (attrs.embedded == false) {
                var routeUpdateListener = scope.$on('$routeUpdate', function (e) {
                    parseSearch();
                    getList(true);
                });
            }

            // Kill listeners when scope is destroyed.
            scope.$on("$destroy", function () {
                if (routeUpdateListener) {
                    routeUpdateListener();
                }
            });

            // Load the initial list
            parseSearch();
            setDefaultParams();
            getList(true);

            var lastLength = null;
            scope.$watchCollection('refreshOnChange', function () {

                // If an external source that is displaying this list triggers an action that will cause the values in the list to change (such as a refund processed or a shipment recorded),
                // this function will notice the change and will trigger a list refresh. 

                // We need to allow the collection to stabilize from initial load before we trigger a refresh. The initial changes will take the list from undefined to fully populated with the initial data
                // and we don't want to trigger a refresh on all these initialization mutations.

                if (scope.refreshOnChange != null) {
                    if (Array.isArray(scope.refreshOnChange) && lastLength == null) {
                        // This will only hit the first time the collection is fully loaded due to the conditions above.
                        lastLength = scope.refreshOnChange.length;
                    }
                }

                // This watches for the ongoing changes in the collection and triggers the refresh as needed.
                if (lastLength != null) {
                    if (Array.isArray(scope.refreshOnChange)) {
                        if (lastLength != scope.refreshOnChange.length) {
                            refresh();
                            lastLength = scope.refreshOnChange.length
                        }
                    }
                }

            });

        }
    };
}]);


app.directive('objectEdit', ['ApiService', 'GrowlsService', 'GeographiesService', function (ApiService, GrowlsService, GeographiesService) {
    return {
        restrict: 'E',
        templateUrl: function (elem, attrs) {
            return attrs.templateUrl
        },
        scope: {
            object: '=?',
            error: '=?',
            options: '=?',
            successCallback: '&'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Shared scope:
            // object: The item that contains the object you wish to update (i.e. customer)
            // error: The error object from the parent so that if there is an error response on save it can be displayed by the parent.
            // success-callback: A callback when an update is successfully completed. (optional)
            // options: An object with preferences you want to pass to the view. For example { compressedView: true }. (optional)

            // Attributes:
            // property: If the item that is being updated belongs to a parent object, this is the name of the property that holds the item (for example, if you are updating customer.billing_address, provided "billing_address" so the request payload can be properly built).
            // panel-title: The name you want to dispaly on the panel title bar (optional but not really)
            // require: optional, if you want to make items required. A csv list such as "name,country" (optional, default == require none)
            // hide: fields that you don't want to display. A csv such as "object2,email" (optional, default == show all)
            // allow-edit: A boolean to indicate if you want to allow the object to be edited. If false, the "Edit" button will not display in the panel. (optional, default == true)
            // template-url: The url to the template you want to use for this edit.
            // update-url: The url to make the update to this object

            // Create a container to hold the object you are updating
            scope.item = null;

            // Convert attribute strong bools to actual bools
            utils.stringsToBool(attrs);

            // Create a value to hold the item count of the number of items that are displayed, used by some views to know when to clear a row.
            scope.displayCount = 0;

            scope.edit = false;
            scope.allowEdit = true;
            if (attrs.allowEdit == false) {
                scope.allowEdit = false;
            }

            scope.panelTitle = attrs.panelTitle;

            var property = null;
            if (utils.isNullOrEmpty(attrs.property) == false) {
                property = attrs.property;
            }

            scope.$watch('object', function () {
                scope.item = scope.object;
            });

            var hide = [];
            if (attrs.hide != null) {
                hide = attrs.hide.split(',');
            };

            var require = [];
            if (attrs.require != null) {
                require = attrs.require.split(',');
            };

            var geo = GeographiesService.getGeographies();
            scope.countries = geo.countries;

            scope.showItem = function (item) {
                if (hide.indexOf(item) >= 0) {
                    return false;
                }
                return true;
            };

            scope.allowEmpty = function (item) {
                // You won't require an item, even if requested, if the item is hidden.
                if (require.indexOf(item) >= 0 && hide.indexOf(item) < 0) {
                    return false;
                }
                return true;
            };

            scope.openEdit = function () {
                // Make a copy of the item so on cancel you can revert to the original
                scope.orig = angular.copy(scope.item);
                scope.edit = true;
            }

            scope.closeEdit = function () {
                // Replace the model with the copy
                scope.item = scope.orig;
                scope.edit = false;
            }

            scope.update = function (form) {

                if (form.$invalid) {
                    return;
                }

                // Create a non-scoped variable to hold the object for your update call.
                var request = {};

                // If we are updating the child of the parent object, set the object as a child property.
                if (property) {
                    request[property] = scope.item;
                } else {
                    request = scope.item;
                }

                ApiService.set(request, attrs.updateUrl, { show: property })
                .then(
                function (response) {

                    // Update the scoped item with the new data.
                    if (property) {
                        scope.object[property] = response[property];
                    } else {
                        scope.object = response;
                    }

                    GrowlsService.addGrowl({ id: "edit_success_no_link", type: "success" });
                    scope.edit = false;
                    // Example of how to return a local value to the callback: scope.successCallback({ this: "that" });
                    scope.successCallback();
                },
                function (error) {
                    window.scrollTo(0, 0);
                    scope.error = error;
                });
            }

        }
    };
}]);


app.directive('ledgerBreakdown', [function () {
    return {
        restrict: 'E',
        templateUrl: "app/templates/ledgerBreakdown.html",
        scope: {
            currencyType: '=?',
            transactions: '=?',
            loadDetails: '=?',
            detailsUrl: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Shared scope:
            // currency-type: allows the selected currency to be propogates to other copies of the same ledger on the parent page (so that when you change the currency on one, they all change)
            // transactions: A list of payments or a list of refunds. You can also supply a single payment or single refund and it will be handled correctly. You can't mix and match payments and refunds.
            // load-details: A bool that indicates if the associated details are shown. If supplied (true or false), a link will be supplied that allows the user to toggle viewing the details. If null, no link will be displayed. Should not be used if details-url is provided.
            // details-url: A link that will direct the user to a page to see details of the transaction. If null, no link will be displayed. Should not be used if load-details is provided.

            // Attributes:
            // panel-title: The title of the panel
            // include-status: The transaction status or statuses you want included in the calculation. For example "completed" or "completed,pending" to include completed or completed and pending transactions, respectively.

            // Define a place to hold our transactions array. If an array is provided, we just copy it to this array. If a single transaction is provided, we push it into this array.
            scope.transactionItems = [];

            // Define an object to hold the selected display amounts
            scope.selected = {};

            scope.panelTitle = attrs.panelTitle;

            // Set defaults
            if (scope.currencyType == null) {
                scope.currencyType = "transaction";
            }

            scope.toggleLoadDetails = function () {
                scope.loadDetails = !scope.loadDetails;
            }

            scope.load = function (currency_type) {

                scope.transactionItems = [];

                if (Array.isArray(scope.transactions)) {
                    scope.transactionItems = scope.transactions;
                } else {
                    if (utils.hasProperty(scope.transactions, "object")) {
                        // Make sure that the object has been loaded
                        scope.transactionItems.push(scope.transactions);
                    }
                }

                scope.selected.subtotal = 0;
                scope.selected.shipping = 0;
                scope.selected.tax = 0;
                scope.selected.total = 0;

                scope.currencyType = currency_type;

                if (scope.transactionItems.length > 0) {

                    var prefix = currency_type + "_";
                    if (currency_type == "transaction") {
                        prefix = "";
                    }

                    if (scope.transactionItems[0].object == "refund") {
                        scope.isRefund = true;
                    }

                    scope.transaction_currency = scope.transactionItems[0].currency;
                    scope.settlement_currency = scope.transactionItems[0].settlement_currency;
                    scope.reporting_currency = scope.transactionItems[0].reporting_currency;
                    scope.reporting_alt_currency = scope.transactionItems[0].reporting_alt_currency;

                    scope.selected.currency = scope.transactionItems[0][prefix + "currency"];

                    _.each(scope.transactionItems, function (transaction) {
                        var include = true;

                        if (attrs.includeStatus != null) {
                            if (attrs.includeStatus.indexOf(transaction.status) == -1) {
                                include = false;
                            }
                        }

                        if (include) {
                            scope.selected.subtotal = scope.selected.subtotal + parseFloat(transaction[prefix + "subtotal"]);
                            scope.selected.shipping = scope.selected.shipping + parseFloat(transaction[prefix + "shipping"]);
                            scope.selected.tax = scope.selected.tax + parseFloat(transaction[prefix + "tax"]);
                            scope.selected.total = scope.selected.total + parseFloat(transaction[prefix + "total"]);
                        }
                    });

                    if (scope.transactionItems[0].object == "refund") {
                        scope.selected.subtotal = scope.selected.subtotal * -1;
                        scope.selected.shipping = scope.selected.shipping * -1;
                        scope.selected.tax = scope.selected.tax * -1;
                        scope.selected.total = scope.selected.total * -1;
                    }
                }

            }

            scope.showCurrencies = function () {
                if (scope.transactionItems.length > 0) {
                    if (scope.transactionItems[0].reporting_alt_currency) {
                        return !(utils.areEqual(scope.transactionItems[0].currency, scope.transactionItems[0].settlement_currency, scope.transactionItems[0].reporting_currency, scope.transactionItems[0].reporting_alt_currency));
                    } else {
                        return !(utils.areEqual(scope.transactionItems[0].currency, scope.transactionItems[0].settlement_currency, scope.transactionItems[0].reporting_currency));
                    }
                }
                return false;
            }

            // Watch for data load
            scope.$watchCollection('transactions', function () {
                scope.load(scope.currencyType);
            });

            scope.$watch('currencyType', function () {
                scope.load(scope.currencyType);
            });

        }
    };
}]);


app.directive('ledgerItems', [function () {
    return {
        restrict: 'E',
        templateUrl: "app/templates/ledgerItems.html",
        scope: {
            items: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Shared scope:
            // items: The items to list.

            // Attributes:
            // panel-title: The title of the panel
            // no-items-message: The message to display if there are no items.
            // description-property: The name of the property that holds the description of the item

            scope.panelTitle = attrs.panelTitle;
            scope.total = 0;
            scope.noItemsMessage = attrs.noItemsMessage;

            scope.$watchCollection('items', function () {
                if (scope.items) {
                    if (scope.items.length > 0) {
                        scope.currency = scope.items[0].currency

                        for (i = 0; i < scope.items.length; i++) {
                            scope.items[i].description = scope.items[i][attrs.descriptionProperty];
                            scope.total += scope.items[i].total;
                        }
                    }
                }
            });

        }
    };
}]);


app.directive('paymentMethod', [function () {
    return {
        restrict: 'E',
        templateUrl: "app/templates/paymentMethod.html",
        scope: {
            paymentMethodData: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Shared scope:
            // transaction-method-data: The transaction method data object

            // Attributes:
            // transaction-id: The transaction_id (either payment_id or refund_id) that this transaction is associated with. (optional, if not supplied the field will be hidden)

            scope.panelTitle = attrs.panelTitle;
            scope.transaction_type = attrs.transactionType;

            scope.$watch('paymentMethodData', function () {
                if (scope.paymentMethodData) {
                    scope.transaction_id = attrs.transactionId;
                }
            });

            scope.showItem = function (item) {
                if (hide.indexOf(item) >= 0) {
                    return false;
                }
                return true;
            };

        }
    };
}]);


app.directive('ledgerSale', [function () {
    return {
        restrict: 'E',
        templateUrl: "app/templates/sale.html",
        scope: {
            sale: '=?'
        },
        link: function (scope, elem, attrs, ctrl) {

            // Shared scope:
            // sale: A cart, order or invoice object

            // Set defaults
            scope.prefs = {};
            scope.prefs.currency = "transaction";

        }
    };
}]);


app.directive('showErrors', function () {
    return {
        restrict: 'A',
        require: '^form',
        link: function (scope, elem, attrs, ctrl) {

            // Find the input element, error block and label elements
            var inputEl = elem[0].querySelector("[name]");
            var errorEl = angular.element(elem[0].querySelector(".help-block"));
            var labelEl = angular.element(elem[0].getElementsByTagName("label"));

            // Convert to native angular elements
            var inputNgEl = angular.element(inputEl);
            var errorNgEl = angular.element(errorEl);
            var labelNgEl = angular.element(labelEl);

            // Get the name of the text box
            var inputName = inputNgEl.attr("name");

            if (labelEl != null) {
                if (inputNgEl[0].attributes.required) {
                    labelNgEl.addClass("required");
                }
            }

            // Set a placeholder of "Optional" if the input is not required and no other placeholder is present
            if (!inputNgEl[0].attributes.required && !inputNgEl[0].attributes.conditional && !inputNgEl[0].attributes.placeholder) {
                inputEl.setAttribute('placeholder', "Optional");
            }

            // Define the action upon which we re-validate
            var action = "blur";

            if (inputEl) {
                if (inputEl.type == "checkbox" || inputEl.type == "select" || inputEl.type == "radio") {
                    action = "change";
                }
            }

            // Apply and remove has-error and hidden on blur
            inputNgEl.bind(action, function () {

                // Define how aggressive error messaging is on blur: mild, moderate, aggressive

                if (attrs.showErrors == "moderate" || utils.isNullOrEmpty(attrs.showErrors)) {
                    elem.toggleClass("has-error", ctrl[inputName].$invalid);
                }

                if (attrs.showErrors == "aggressive") {
                    elem.toggleClass("has-error", ctrl[inputName].$invalid);
                    errorNgEl.toggleClass("hidden", !ctrl[inputName].$invalid);
                }

                // We only show on form submit, so on blur we only hide
                if (ctrl[inputName].$invalid == false) {
                    errorNgEl.toggleClass("hidden", true);
                }

            })

            // Listen for the form submit and show any errors (plus error text)
            scope.$on("show-errors-check-validity", function (event, options) {

                // This helps prevent scope confusion in the case of a page that has multiple forms (such as a modal). Give each form a unique name and you won't trigger errors on sibling, parent or children forms.
                if (options.formName != ctrl.$name && options.isolateValidation == true) {
                    return;
                }

                if (ctrl[inputName]) {
                    elem.toggleClass("has-error", ctrl[inputName].$invalid);
                    errorNgEl.toggleClass("hidden", !ctrl[inputName].$invalid);
                }
            });

        }
    }
});


app.directive('validateOnSubmit', function () {
    return {
        restrict: 'A',
        require: '^form',
        link: function (scope, elem, attrs, ctrl) {

            elem.bind("click", function () {

                // Set the attribute isolate-validation on the form to restrict triggering validation on elements that share the same form name as the form that triggered the submit.
                // Useful when you have a form within a modal and you don't want to trigger validation on the page that spawned the form.
                var options = {};
                if (attrs.isolateValidation) {
                    options.isolateValidation = true;
                    options.formName = ctrl.$name;
                }

                // Emit and broadcast so the message goes up and down.
                scope.$emit('show-errors-check-validity', options);
                scope.$broadcast('show-errors-check-validity', options);
            });

        }
    }
});


app.directive('metaToHtml', function () {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs, ctrl) {

            attrs.$observe("metaToHtml", function (newValue) {

                if (utils.isNullOrEmpty(newValue) == false) {
                    var html = utils.jsonToHtmlTable(newValue, true, attrs.panelTitle);
                    elem.html(html);
                }

            });

        }
    };
});


app.directive('address', ['GeographiesService', function (GeographiesService) {
    return {
        restrict: 'AE',
        templateUrl: "app/templates/address_display.html",
        scope: {
            address: '=?',
            edit: '=?'
        },
        link: function (scope, elem, attrs) {

            var geo = GeographiesService.getGeographies();
            scope.countries = geo.countries;

        }
    };
}]);


app.directive('customerEdit', ['ApiService', function (ApiService) {
    return {
        restrict: 'AE',
        templateUrl: "app/templates/customer.html",
        scope: {
            customer: '=?customerEdit',
            cart: '=?',
            invoice: '=?',
            onSave: '=?',
            error: '=?',
        },
        link: function (scope, elem, attrs) {

            // Shared scope
            // customer: The customer object you wish to modify
            // cart: Optional. If the customer is associated with a cart, upon saving any changes to the customer the cart will be refreshed with the latest shipping / sales tax changes.
            // onSave: Optional. A function to call (with the saved customer as a parameter) when a save is completed.
            // invoice: Optional. If the customer is associated with an invoice, upon saving any changes to the customer the invoice will be refreshed with the latest shipping / sales tax changes.
            // error: The error object in the event of an error while saving

            // Attributes
            // commitOnSave: true / false. Indicates if the changes should be commited to the database when the save button is clicked. Default is true.
            // allowEdit: true / false. Indicates if the edit button should be presented.

            var customerCopy = {};
            scope.edit = false;

            if (attrs.allowEdit === "false") {
                scope.allowEdit = false;
            } else {
                scope.allowEdit = true;
            }

            scope.$watch("edit", function (newVal) {
                // If edit is true, make a copy of the customer so you can roll back to it if they cancel the changes later.
                if (newVal) {
                    customerCopy = angular.copy(scope.customer);
                    scope.edit = true;
                } else {
                    customerCopy = {};
                    scope.edit = false;
                }
            });

            scope.cancel = function () {

                // Clear any previous errors
                scope.error = null;

                // Roll back to customerCopy
                scope.customer = customerCopy;
                scope.edit = false;

            }

            scope.save = function (form) {

                // Clear any previous errors
                scope.error = null;

                if (form.$invalid) {
                    return;
                }

                if (attrs.commitOnSave === undefined || attrs.commitOnSave == "true") {

                    // If the object has a URL, then this is an existing customer. Otherwise, it's a new customer.
                    var url = scope.customer.url;
                    var obj = scope.customer;

                    // If an existing (saved) cart or invoice is provided, we'll apply the changes directly to the supplied cart or invoice customer object to make sure the cart or invoice reflect any shipping / tax changes as a result of the customer changes.
                    if (scope.cart && scope.cart.url) {
                        url = scope.cart.url;
                        obj = { customer: scope.customer };
                    }

                    if (scope.invoice && scope.invoice.url) {
                        url = scope.invoice.url;
                        obj = { customer: scope.customer };
                    }

                    ApiService.set(obj, url, { formatted: true, expand: "options" }).then(function (result) {

                        if (scope.cart && scope.cart.url) {
                            scope.cart = result;
                        } else if (scope.invoice && scope.invoice.url) {
                            scope.invoice = result;
                        } else {
                            scope.customer = result;
                        }

                        scope.edit = false;

                        if (scope.onSave) {
                            onSave(result);
                        }

                    }, function (error) {
                        scope.error = error;
                    });

                    // If onSave is supplied, fire
                    if (scope.onSave) {
                        scope.onSave(customer);
                    }

                    return;

                }

                // Just close the edit.
                scope.edit = false;

            }

        }
    };
}]);
