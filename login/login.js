var app = angular.module("admin", ['ngRoute', 'ngAnimate', 'ngMessages', 'ui.bootstrap', 'angular-loading-bar', 'gettext', 'tmh.dynamicLocale', 'ngSanitize']);

app.config(['$httpProvider', 'cfpLoadingBarProvider', 'tmhDynamicLocaleProvider', function ($httpProvider, cfpLoadingBarProvider, tmhDynamicLocaleProvider) {

    // Allow CORS
    $httpProvider.defaults.useXDomain = true;

    // Remove Content-Type header
    delete $httpProvider.defaults.headers.post["Content-Type"];

    // Loading bar
    cfpLoadingBarProvider.latencyThreshold = 300;
    cfpLoadingBarProvider.includeSpinner = false;

    // Set the favicon
    var favicon = document.createElement("link");
    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("type", "image/x-icon");

    if (window.__settings.style.favicon_full) {
        favicon.setAttribute("href", window.__settings.style.favicon_full);
    } else {
        favicon.setAttribute("href", "../images/default_favicon.png");
    }

    document.head.appendChild(favicon);

    // Dynamically load locale files
    tmhDynamicLocaleProvider.localeLocationPattern("https://static.comecero.com/libraries/angularjs/1.5.5/i18n/angular-locale_{{locale}}.js");

    $httpProvider.interceptors.push(['$q', '$rootScope', function ($q, $rootScope) {
        return {

            'request': function (config) {
                config.headers["Content-Type"] = "application/json";
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
                return $q.reject(response);
            }
        };
    }]);

}]);

app.run(['$rootScope', '$route', '$q', '$templateCache', '$location', 'ApiService', 'GrowlsService', 'gettextCatalog', 'tmhDynamicLocale', 'SettingsService', 'StorageService', function ($rootScope, $route, $q, $templateCache, $location, ApiService, GrowlsService, gettextCatalog, tmhDynamicLocale, SettingsService, StorageService) {

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

}]);


app.controller("LoginController", ['$scope', 'SettingsService', 'ApiService', function ($scope, SettingsService, ApiService) {

    var settings = SettingsService.get();
    $scope.title = settings.app.page_title || "Account Management";
    $scope.logo = settings.style.logo_medium;
    $scope.company_name = settings.app.company_name || settings.account.company_name;
    $scope.helpUrl = settings.account.support_website || "mailto:" + settings.account.support_email;

    $scope.functions = {};
    $scope.exception = {};
    $scope.credentials = {};
    $scope.accessSent = {};

    var baseUrl = ApiService.buildUrl("/customers", SettingsService.get());

    $scope.functions.login = function () {

        // Reset the error.
        $scope.exception = {};
        $scope.accessSent = {};
        $scope.isLoading = true;

        ApiService.login($scope.credentials, baseUrl + "/login", { expand: "auth", "account_id": settings.account.account_id, "test": settings.app.test }).then(function (data) {
            $scope.isLoading = false;
            $scope.credentials = {};
            utils.deleteCookie("token");
            utils.setCookie("token", data.auth.token, 86400);
            window.location.href = "../";
        }, function (error) {
            $scope.isLoading = false;
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

    $scope.functions.sendAccess = function () {

        // Reset the error.
        $scope.exception = {};
        $scope.accessSent = {};
        $scope.isLoading = true;

        ApiService.set($scope.credentials, baseUrl + "/send_link", { "account_id": settings.account.account_id, "test": settings.app.test, "app_id": settings.app.app_id, "email": $scope.credentials.email }).then(function (data) {
            $scope.isLoading = false;
            $scope.accessSent.message = "Please check your email for instructions on accessing your account.";
        }, function (error) {
            $scope.isLoading = false;
            $scope.exception.error = error;
            window.scrollTo(0, 0);
        });
    }

    $scope.functions.setView = function (view) {

        // Reset the error.
        $scope.exception = {};
        $scope.accessSent = {};

        // Reset the input
        $scope.credentials = {};

        if (view == "access") {
            $scope.showAccess = true;
        } else {
            $scope.showAccess = false;
        }
    }

}]);