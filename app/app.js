var app = angular.module("admin", ['ngRoute', 'ngAnimate', 'ngMessages', 'ui.bootstrap', 'angular-loading-bar', 'http-auth-interceptor', 'gettext', 'tmh.dynamicLocale', 'colorpicker.module', 'ngSanitize']);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', '$provide', 'cfpLoadingBarProvider', 'tmhDynamicLocaleProvider', '$sceDelegateProvider', function ($httpProvider, $routeProvider, $locationProvider, $provide, cfpLoadingBarProvider, tmhDynamicLocaleProvider, $sceDelegateProvider) {

    // Allow CORS
    $httpProvider.defaults.useXDomain = true;

    // Remove Content-Type header
    delete $httpProvider.defaults.headers.post["Content-Type"];

    // Loading bar
    cfpLoadingBarProvider.latencyThreshold = 300;
    cfpLoadingBarProvider.includeSpinner = false;

    // Set the favicon
    if (window.__settings.app.favicon_full) {
        var favicon = document.createElement("link");
        favicon.setAttribute("rel", "icon");
        favicon.setAttribute("type", "image/x-icon");
        favicon.setAttribute("href", window.__settings.app.favicon_full);
        document.head.appendChild(favicon);
    }

    // Dynamically load locale files
    tmhDynamicLocaleProvider.localeLocationPattern("https://static.comecero.com/libraries/angularjs/1.5.5/i18n/angular-locale_{{locale}}.js");

    // Routes

    // Getting Started
    $routeProvider.when("/", { templateUrl: "app/pages/getting_started/index.html", reloadOnSearch: false });

    // Shipments
    $routeProvider.when("/shipments", { templateUrl: "app/pages/shipments/list.html", reloadOnSearch: false });
    $routeProvider.when("/shipments/:id", { templateUrl: "app/pages/shipments/view.html", reloadOnSearch: false });

    // Orders
    $routeProvider.when("/orders", { templateUrl: "app/pages/orders/list.html", reloadOnSearch: false });
    $routeProvider.when("/orders/:id", { templateUrl: "app/pages/orders/view.html", reloadOnSearch: false });

    // Refunds
    $routeProvider.when("/refunds", { templateUrl: "app/pages/refunds/list.html", reloadOnSearch: false });
    $routeProvider.when("/refunds/:id", { templateUrl: "app/pages/refunds/view.html", reloadOnSearch: true });

    // Subscriptions
    $routeProvider.when("/subscriptions", { templateUrl: "app/pages/subscriptions/list.html", reloadOnSearch: false });
    $routeProvider.when("/subscriptions/:id", { templateUrl: "app/pages/subscriptions/view.html", reloadOnSearch: true });

    // Carts
    $routeProvider.when("/carts", { templateUrl: "app/pages/carts/list.html", reloadOnSearch: false });
    $routeProvider.when("/carts/:id", { templateUrl: "app/pages/carts/view.html", reloadOnSearch: true });

    // Invoices
    $routeProvider.when("/invoices", { templateUrl: "app/pages/invoices/list.html", reloadOnSearch: false });
    $routeProvider.when("/invoices/add", { templateUrl: "app/pages/invoices/set.html", reloadOnSearch: true });
    $routeProvider.when("/invoices/:id", { templateUrl: "app/pages/invoices/set.html", reloadOnSearch: true });

    // Payment Methods
    $routeProvider.when("/payment_methods", { templateUrl: "app/pages/payment_methods/list.html", reloadOnSearch: false });
    $routeProvider.when("/payment_methods/add", { templateUrl: "app/pages/payment_methods/set.html", reloadOnSearch: true });
    $routeProvider.when("/payment_methods/:id/edit", { templateUrl: "app/pages/payment_methods/set.html", reloadOnSearch: true });

    // Notifications
    $routeProvider.when("/notifications", { templateUrl: "app/pages/notifications/list.html", reloadOnSearch: false });
    $routeProvider.when("/notifications/:id", { templateUrl: "app/pages/notifications/view.html", reloadOnSearch: true });
    $routeProvider.when("/notifications/:id/preview", { templateUrl: "app/pages/notifications/preview.html" });

    // Profile
    $routeProvider.when("/profile", { templateUrl: "app/pages/profile/view.html", reloadOnSearch: true })

    // Routes End

    $httpProvider.interceptors.push(['$q', '$rootScope', function ($q, $rootScope) {
        return {

            'request': function (config) {

                // If a call to the apiService endpoint, append the Authorization token
                config.headers = config.headers || {};

                // Append the current bearer if not already in the request. This is useful on replays of requests that occured after a login timeout.
                if (config.isApi == true) {

                    var token = localStorage.getItem("token");
                    if (!token) {
                        token = utils.getCookie("token");
                        localStorage.setItem("token", token);
                    }

                    if (token) {
                        config.headers.Authorization = "Bearer " + token;
                    }
                }

                if (!config.headers["Content-Type"] && !config.isMultipart) {
                    config.headers["Content-Type"] = "application/json";
                }

                return config;
            },

            'response': function (response) {
                return (response);
            },

            'responseError': function (response) {
                if (angular.isObject(response.data) == false || !response.data.error) {
                    // Unhandled error, build a response that can be handled downstream.
                    response.data = {};
                    response.data.error = {};
                    response.data.error.message = "An unknown error occurred. Please try your request again. If the problem persists, please contact support."
                    return ($q.reject(response));
                }

                if (response.data.error.status === 403) {
                    response.data.error.message = "You do not have permission to perform the requested action. Please contact an account administrator for assistance.";
                    return ($q.reject(response));
                }

                if (response.data.error.status === 401) {
                    // Bad login or token, delete it from storage
                    localStorage.removeItem("token");
                    utils.deleteCookie("token");
                    response.data.error.message = "Your credentials are not valid. Please sign in again.";
                    return ($q.reject(response));
                }

                return $q.reject(response);

            }
        };
    }]);

}]);

app.run(['$rootScope', '$route', '$q', '$templateCache', '$location', 'ApiService', 'GrowlsService', 'gettextCatalog', 'tmhDynamicLocale', 'SettingsService', function ($rootScope, $route, $q, $templateCache, $location, ApiService, GrowlsService, gettextCatalog, tmhDynamicLocale, SettingsService) {

    // Define default language
    var language = "en";

    // The default language does not need to be loaded (English - it's embedded in the HTML).
    if (localStorage.getItem("language") != null) {
        // Load the language file.
        language = localStorage.getItem("language");
    }

    // Set the language, don't need to for English since it's embedded in the HTML.
    if (language != "en") {
        gettextCatalog.loadRemote("/languages/" + language + "/" + language + ".json");
        gettextCatalog.setCurrentLanguage(language);
    }

    // Pull in the locale settings.
    tmhDynamicLocale.set(utils.getLocale(language));

    // Logout function
    $rootScope.logout = function () {

        // Delete all tokens in local storage
        var defer = $q.defer();
        var promises = [];

        if (localStorage.getItem("token")) {
            promises.push(ApiService.remove(ApiService.buildUrl("/auths/me", SettingsService.get()), null, true, localStorage.getItem("token")));
        }

        if (promises.length > 0) {
            $q.all(promises).then(function () {
                complete();
            }, function (error) {
                // You received a response that one of the tokens is no longer valid when you attempted to delete it. It previously expired. Doesn't matter.
                complete();
            });
        } else {
            complete();
        }

        var complete = function () {
            localStorage.clear();
            // TO_DO define destination
            window.location.href = "https://example.com";
        }

    }

}]);

// Controllers on the index page
app.controller("IndexController", ['$scope', 'SettingsService', function ($scope, SettingsService) {

    var settings = SettingsService.get();
    $scope.title = settings.app.page_title || "Account Management";
    $scope.logo = settings.style.logo_medium;
    $scope.company_name = settings.app.company_name || settings.account.company_name;
    $scope.helpUrl = settings.account.support_website || "mailto:" + settings.account.support_email;

}]);


