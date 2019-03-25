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
    if (window.__settings.style.favicon_full) {
        var favicon = document.createElement("link");
        favicon.setAttribute("rel", "icon");
        favicon.setAttribute("type", "image/x-icon");
        favicon.setAttribute("href", window.__settings.style.favicon_full);
        document.head.appendChild(favicon);
    }

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


app.controller("GettingStartedController", ['$scope', 'SettingsService', 'ApiService', function ($scope, SettingsService, ApiService) {

    var settings = SettingsService.get();

    // Get the app url
    $scope.app_url = window.location.href.split('?')[0].replace("getting-started/", "login");

}]);