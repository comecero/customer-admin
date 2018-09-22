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
                    response.data.error.message = "Your credentials are not valid. Please sign in again.";
                    return ($q.reject(response));
                }

                return $q.reject(response);

            }
        };
    }]);

}]);

app.run(['$rootScope', '$route', '$q', '$templateCache', '$location', 'ApiService', 'GrowlsService', 'gettextCatalog', 'tmhDynamicLocale', 'SettingsService', function ($rootScope, $route, $q, $templateCache, $location, ApiService, GrowlsService, gettextCatalog, tmhDynamicLocale, SettingsService) {

    // Define the API and auth hosts
    var apiHost = "api.comecero.com";
    $rootScope.apiHost = apiHost;

    var authHost = "signin.comecero.com"; // Just the default, uncommon that this would be actually used.
    if (localStorage.getItem("alias") != null) {
        var authHost = localStorage.getItem("alias") + ".auth.comecero.com";

        if (window.location.hostname.indexOf("admin-staging.") > -1) {
            authHost = localStorage.getItem("alias") + ".auth-staging.comecero.com";
        }

    }
    $rootScope.authHost = authHost;

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
    $scope.logo = settings.app.logo_medium;
    $scope.company_name = settings.app.company_name || settings.account.company_name;
    $scope.helpUrl = settings.account.support_website || "mailto:" + settings.account.support_email;

}]);



var utils = (function () {

    // These are general, home-grown javascript functions for common functions used throughout the application.

    function setCookie(name, value, minutes) {
        if (minutes) {
            var date = new Date();
            date.setTime(date.getTime() + (minutes * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    }

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

    function getPageHashParameters() {

        return getHashParameters(window.location.href);

    }

    function getHashParameters(url) {

        var hashParameters = {};

        if (url.indexOf("#") == -1) {
            return hashParameters;
        }

        var e,
            a = /\+/g,  // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
            q = url.substring(url.indexOf("#") + 1);

        while (e = r.exec(q))
            hashParameters[d(e[1])] = d(e[2]);

        return hashParameters;
    }

    function getPageQueryParameters() {

        return getQueryParameters(window.location.href);

    }

    function getQueryParameters(url) {

        if (url.indexOf("?") == -1) {
            return {};
        }

        q = url.substring(url.indexOf("?") + 1);

        // Strip off any hash parameters
        if (q.indexOf("#") > 0) {
            q = q.substring(0, q.indexOf("#"));
        }

        return parseQueryParameters(q);
    }

    function parseQueryParameters(query) {

        var queryParameters = {};

        if (isNullOrEmpty(query)) {
            return queryParameters;
        }

        var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&;=]+)=?([^&;]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); }
        var queryParameters = {};

        while (e = r.exec(query))
            queryParameters[d(e[1])] = d(e[2]);

        return queryParameters;

    }

    function appendParams(url, params) {

        if (params.length == 0) {
            return url;
        }

        url += "?";

        _.each(params, function (item, index) {
            url += index + "=" + item + "&";
        });

        // remove the trailing ampersand
        url = url.substring(0, (url.length - 1));

        // append the query string and return
        return url;

    }

    function left(str, n) {
        if (n <= 0)
            return "";
        else if (n > String(str).length)
            return str;
        else
            return String(str).substring(0, n);
    }

    function right(str, n) {
        if (n <= 0)
            return "";
        else if (n > String(str).length)
            return str;
        else {
            var iLen = String(str).length;
            return String(str).substring(iLen, iLen - n);
        }
    }

    function isValidNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    function isValidInteger(value) {

        if (isValidNumber(value) == false) {
            return false;
        }
        
        value = parseFloat(value);

        return value === (parseInt(value) | 0);
    }

    function getRandom() {
        return Math.floor((Math.random() * 10000000) + 1);
    }

    function cleanPrice(price) {
        // Strip everything except numbers and decimals

        if (typeof price === 'undefined' || price == null) {
            return "";
        }

        var cleanedPrice = price.toString().replace(/[^0-9\.\s]/g, '').trim();

        if (isNaN(cleanedPrice) == true || cleanedPrice.trim() == "") {
            // The value is not reasonably close enough for it to be a valid price. Just return the original input.
            return price;
        } else {
            // Truncate at two decimal places.
            return parseFloat(cleanedPrice).toFixed(2);
        }
    }

    function removeEmptyPrices(prices) {
        return _.filter(prices, function (price) { return price.price != "" || price.currency != ""; });
    }

    function hasPermission(resource, method) {

        if (method == null) {
            method = read;
        }

        var permissions = JSON.parse(localStorage.getItem("permissions"));

        var r = permissions[resource];

        if (r != null) {
            var m = r[method];

            if (m != null) {
                return Boolean(m);
            }
        }

        return false;

    }

    function inTestMode() {
        return stringToBool(localStorage.getItem("test"));
    }

    function getLocale(language) {

        // Array of supported locales
        var locales = [];
        locales.push("af-na", "af-za", "af", "ar-ae", "ar-bh", "ar-dj", "ar-dz", "ar-eg", "ar-eh", "ar-er", "ar-il", "ar-iq", "ar-jo", "ar-km", "ar-kw", "ar-lb", "ar-ly", "ar-ma", "ar-mr", "ar-om", "ar-ps", "ar-qa", "ar-sa", "ar-sd", "ar-so", "ar-ss", "ar-sy", "ar-td", "ar-tn", "ar-ye", "ar", "az-cyrl-az", "az-cyrl", "az-latn-az", "az-latn", "az", "bg-bg", "bg", "bo-cn", "bo-in", "bo", "cs-cz", "cs", "da-dk", "da-gl", "da", "dav-ke", "dav", "de-at", "de-be", "de-ch", "de-de", "de-li", "de-lu", "de", "el-cy", "el-gr", "el", "en-ag", "en-ai", "en-as", "en-au", "en-bb", "en-be", "en-bm", "en-bs", "en-bw", "en-bz", "en-ca", "en-cc", "en-ck", "en-cm", "en-cx", "en-dg", "en-dm", "en-dsrt-us", "en-dsrt", "en-er", "en-fj", "en-fk", "en-fm", "en-gb", "en-gd", "en-gg", "en-gh", "en-gi", "en-gm", "en-gu", "en-gy", "en-hk", "en-ie", "en-im", "en-in", "en-io", "en-iso", "en-je", "en-jm", "en-ke", "en-ki", "en-kn", "en-ky", "en-lc", "en-lr", "en-ls", "en-mg", "en-mh", "en-mo", "en-mp", "en-ms", "en-mt", "en-mu", "en-mw", "en-na", "en-nf", "en-ng", "en-nr", "en-nu", "en-nz", "en-pg", "en-ph", "en-pk", "en-pn", "en-pr", "en-pw", "en-rw", "en-sb", "en-sc", "en-sd", "en-sg", "en-sh", "en-sl", "en-ss", "en-sx", "en-sz", "en-tc", "en-tk", "en-to", "en-tt", "en-tv", "en-tz", "en-ug", "en-um", "en-us", "en-vc", "en-vg", "en-vi", "en-vu", "en-ws", "en-za", "en-zm", "en-zw", "en", "es-ar", "es-bo", "es-cl", "es-co", "es-cr", "es-cu", "es-do", "es-ea", "es-ec", "es-es", "es-gq", "es-gt", "es-hn", "es-ic", "es-mx", "es-ni", "es-pa", "es-pe", "es-ph", "es-pr", "es-py", "es-sv", "es-us", "es-uy", "es-ve", "es", "et-ee", "et", "eu-es", "eu", "fa-af", "fa-ir", "fa", "fi-fi", "fi", "fil-ph", "fil", "fr-be", "fr-bf", "fr-bi", "fr-bj", "fr-bl", "fr-ca", "fr-cd", "fr-cf", "fr-cg", "fr-ch", "fr-ci", "fr-cm", "fr-dj", "fr-dz", "fr-fr", "fr-ga", "fr-gf", "fr-gn", "fr-gp", "fr-gq", "fr-ht", "fr-km", "fr-lu", "fr-ma", "fr-mc", "fr-mf", "fr-mg", "fr-ml", "fr-mq", "fr-mr", "fr-mu", "fr-nc", "fr-ne", "fr-pf", "fr-pm", "fr-re", "fr-rw", "fr-sc", "fr-sn", "fr-sy", "fr-td", "fr-tg", "fr-tn", "fr-vu", "fr-wf", "fr-yt", "fr", "hi-in", "hi", "hr-ba", "hr-hr", "hr", "hu-hu", "hu", "hy-am", "hy", "is-is", "is", "it-ch", "it-it", "it-sm", "it", "ja-jp", "ja", "ka-ge", "ka", "kab-dz", "kab", "kam-ke", "kam", "kk-cyrl-kz", "kk-cyrl", "kk", "kkj-cm", "kkj", "kl-gl", "kl", "kln-ke", "kln", "km-kh", "km", "ko-kp", "ko-kr", "ko", "kok-in", "kok", "lo-la", "lo", "lt-lt", "lt", "mg-mg", "mg", "mgh-mz", "mgh", "mgo-cm", "mgo", "mk-mk", "mk", "mn-cyrl-mn", "mn-cyrl", "mn", "ms-bn", "ms-latn-bn", "ms-latn-my", "ms-latn-sg", "ms-latn", "ms-my", "ms", "mt-mt", "mt", "ne-in", "ne-np", "ne", "nl-aw", "nl-be", "nl-bq", "nl-cw", "nl-nl", "nl-sr", "nl-sx", "nl", "no-no", "no", "pl-pl", "pl", "pt-ao", "pt-br", "pt-cv", "pt-gw", "pt-mo", "pt-mz", "pt-pt", "pt-st", "pt-tl", "pt", "ro-md", "ro-ro", "ro", "rof-tz", "rof", "ru-by", "ru-kg", "ru-kz", "ru-md", "ru-ru", "ru-ua", "ru", "shi-latn-ma", "shi-latn", "shi-tfng-ma", "shi-tfng", "shi", "sk-sk", "sk", "sl-si", "sl", "sq-al", "sq-mk", "sq-xk", "sq", "sr-cyrl-ba", "sr-cyrl-me", "sr-cyrl-rs", "sr-cyrl-xk", "sr-cyrl", "sr-latn-ba", "sr-latn-me", "sr-latn-rs", "sr-latn-xk", "sr-latn", "sr", "sv-ax", "sv-fi", "sv-se", "sv", "th-th", "th", "tl", "to-to", "to", "tr-cy", "tr-tr", "tr", "uk-ua", "uk", "uz-arab-af", "uz-arab", "uz-cyrl-uz", "uz-cyrl", "uz-latn-uz", "uz-latn", "uz", "vi-vn", "vi", "zh-cn", "zh-hans-cn", "zh-hans-hk", "zh-hans-mo", "zh-hans-sg", "zh-hans", "zh-hant-hk", "zh-hant-mo", "zh-hant-tw", "zh-hant", "zh-hk", "zh-tw", "zh");

        // If their locale exists in the locale list, use it. Otherwise, use the locale from their selected language.
        if (locales.indexOf(localStorage.getItem("locale")) >= 0) {
            return localStorage.getItem("locale");
        } else {
            return language;
        }

    }

    function addDays(date, days) {
        return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    }

    function daysDiff(first, second) {
        return (second - first) / (1000 * 60 * 60 * 24);
    }

    function stringToArray(string) {

        var result = [];

        // Convert licenses from a string to array using newline as the delimiter
        if (string != null) {
            var lines = (string).split(/\n/);
            for (var i = 0; i < lines.length; i++) {
                if ((lines[i]).trim().length > 0) {
                    result.push((lines[i]).trim());
                }
            }
        }

        return result;
    }

    function arrayToString(array) {

        var result = "";
        _.each(array, function (element, index) {
            result += element + "\n"
        });

        return result;

    }

    function renameProperty(collection, property, rename) {

        _.each(collection, function (item) {
            item[rename] = item[property];
            var item2 = item;
            delete item[property];
        });

    }

    function ucaseFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function getColor(count) {

        // Returns a color in the position specified by count. If count is larger than the array then finds the nth position based on the supplied value.
        count = count + 1;
        var position = count;
        position = count / 20;
        position = (position % 1) * 20;

        if (position == 0) {
            position = 20;
        }

        // Return the color in the identified position
        var colors = ["#71c73e", "#77b7c5", "#d54848", "#6c42e5", "#e8e64e", "#dd56e6", "#ecad3f", "#618b9d", "#b68b68", "#36a766", "#3156be", "#00b3ff", "#646464", "#a946e8", "#9d9d9d", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4"];

        return colors[position - 1];

    }

    function getRelatedColor(hex, lum) {

        // validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;

        // convert to decimal and change luminosity
        var rgb = "#", c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }

        return rgb;
    }

    function hasProperty(obj, prop) {
        if (obj != null) {
            // http://stackoverflow.com/a/136411/2002383
            var proto = obj.__proto__ || obj.constructor.prototype;
            return (prop in obj) &&
                (!(prop in proto) || proto[prop] !== obj[prop]);
        }
        return false;
    }

    function calculateFxAmount(price, fx_rate) {
        // Round exactly two places
        return Math.round((price * fx_rate) * 100) / 100
    }

    function sumProperties(collection, prop) {
        var sum = 0;

        _.each(collection, function (item) {
            if (hasProperty(item, prop)) {
                sum += item[prop];
            }
        });

        return sum;
    }

    function roundCurrency(value) {

        if (isNaN(value)) {
            return null;
        }

        return Math.round(value * 100) / 100;
    }

    function areEqual() {
        var len = arguments.length;
        for (var i = 1; i < len; i++) {
            if (arguments[i] == null || arguments[i] != arguments[i - 1])
                return false;
        }
        return true;
    }

    function redirect(location, goto) {
        // This allows a redirect to a specified location or to the "on_complete" location if provided, which is typically the "getting started" location when guiding a user through the platform.
        if (location.search().on_complete) {
            location.path(location.search().on_complete);
        } else {
            location.path(goto);
        }
        // Clear hash and query string
        location.search("");
        location.hash("");
        window.scrollTo(0, 0);
    }

    function isNullOrEmpty(string) {
        if (string == null || string == undefined) {
            return true;
        }

        if (string == "") {
            return true;
        }

        if (string.replace(/ /g, '') == null) {
            return true;
        }

        return false;

    }

    function emptyToNull(value) {

        // If a value is whitespace or zero length, change to null.
        if (isNullOrEmpty(value)) {
            return null;
        };

        return value;
    }

    function pushArray(pushInto, push) {
        for (i = 0; i < push.length; i++) {
            pushInto.push(push[i]);
        }
    }

    function replaceAll(value, find, replace) {

        if (replace === undefined) {
            return value.toString();
        }

        return value.replace(new RegExp('[' + find + ']', 'g'), replace);
    };

    function getChildrenElements(n, skipMe, type) {
        // Get children elements from an HTML element
        var r = [];
        for (; n; n = n.nextSibling)
            if (n.nodeType == 1 && n != skipMe)
                if (type) {
                    if (type.toUpperCase() == n.nodeName.toUpperCase()) {
                        r.push(n);
                    }
                } else {
                    r.push(n);
                }
        return r;
    };

    function getSiblingElements(n, type) {
        // Get sibling elements from an HTML element, excluding self.
        return getChildrenElements(n.parentNode.firstChild, n, type);
    }

    function jsonToCsvDownload(data, filename) {

        // If data is not an object then JSON.parse will parse the JSON string in an Object
        var arrData = typeof data != 'object' ? JSON.parse(data) : data;

        var csv = "";

        // Store column indexes you want to skip (i.e. meta data appended to arrays by Angular)
        var excludeColumns = ["formatted"];

        // Generate the header row.
        var row = "";

        // Extract the label from first index of on array
        for (var index in arrData[0]) {

            // Now convert each value to string and comma-seprated
            if (index.substring(0, 1) != "$" && (excludeColumns.indexOf(index) == -1)) {
                row += index + ',';
            } else {
                excludeColumns.push(index);
            }
        }

        row = row.slice(0, -1);

        // Append label row with line break
        csv += row + '\r\n';

        // First loop is to extract each row
        for (var i = 0; i < arrData.length; i++) {

            var row = "";

            // Second loop will extract each column and convert it to a comma-seprated string
            for (var index in arrData[i]) {
                if (excludeColumns.indexOf(index) == -1) {
                    row += '"' + arrData[i][index] + '",';
                }
            }

            row.slice(0, row.length - 1);

            // Add a line break after each row
            csv += row + '\r\n';
        }

        // Initialize file format you want csv or xls
        var uri = 'data:text/csv;charset=utf-8,' + escape(csv);

        // Generate a link
        var link = document.createElement("a");
        link.href = uri;

        // Set the visibility hidden
        link.style = "visibility:hidden";
        link.download = filename + ".csv";

        // Append the anchor tag, "click" it and then remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    }

    function jsonToHtmlTable(json, parent, headerTitle)
    {

        if (parent == null) {
            parent = true;
        }

        var html = "";
        var count = 0;

        if (parent) {
            html += '<table class="table panel table-bordered">';
        } else {
            html += '<table class="table table-bordered" style="margin-bottom: 0">';
        }

        if (headerTitle) {
            html += '<thead class="panel-heading"><tr><th colspan="2">' + headerTitle + '</th></tr></thead>';
        }

        if (isJson(json)) {
            var jobject = JSON.parse(json);

            for (var element in jobject) {

                if (jobject.hasOwnProperty(element)) {

                    if (Array.isArray(jobject[element])) {
                        html += '<tr>';
                        html += '<td colspan="2" style="background-color: #fafafa">' + element + '</td>';
                        html += '</tr>';

                        for (var item in jobject[element]) {
                            if (jobject.hasOwnProperty(element)) {
                                html += '<tr>';
                                html += '<td colspan="2">' + jsonToHtmlTable(JSON.stringify(jobject[element][item]), false) + '</td>';
                                html += '</tr>';
                            }
                        }
                        continue;
                    }

                    if (typeof jobject[element] === 'object' && jobject[element] !== null) {
                        html += '<tr>';
                        html += '<td colspan="2" style="background-color: #fafafa">' + element + '</td>';
                        html += '</tr>';

                        html += '<tr>';
                        html += '<td colspan="2">' + jsonToHtmlTable(JSON.stringify(jobject[element]), false) + '</td>';
                        html += '</tr>';
                        continue;
                    }

                    html += '<tr>';
                    html += '<td>' + element + '</td>';
                    html += '<td>' + jobject[element] + '</td>';
                    html += '</tr>';

                    count++;

                }

            }

            html += '</table>';

        }
        else {
            // Return the json in the event it didn't parse.
            html += '<tr>';
            html += '<td>' + json + '</td>';
            html += '</tr>';
            html += '</table>';
            return html;
        }

        return html;
    }

    function isJson(item) {
        item = typeof item !== "string"
            ? JSON.stringify(item)
            : item;

        try {
            item = JSON.parse(item);
        } catch (e) {
            return false;
        }

        if (typeof item === "object" && item !== null) {
            return true;
        }

        return false;
    }

    // This goes through all properties in an object and if any of the values are string "true" or "false" it converts them to bool true or false. Used when values come in via url "search" parameter.
    function stringsToBool(object) {
        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                if (object[property] === "false") {
                    object[property] = false;
                }
                if (object[property] === "true") {
                    object[property] = true;
                }
            }
        }
    }

    function stringToBool(string) {
        return (string == "true");
    }

    function getCurrentIsoDate(atStartOfDay) {

        var date = new Date();

        function pad(number) {
            var r = String(number);
            if (r.length === 1) {
                r = '0' + r;
            }
            return r;
        }

        var hours = "00";
        var minutes = "00";
        var seconds = "00"

        if (!atStartOfDay) {
            hours = date.getUTCHours();
            minutes = date.getUTCMinutes();
            seconds = date.getUTCSeconds();
        }

        return date.getUTCFullYear()
        + '-' + pad(date.getUTCMonth() + 1)
        + '-' + pad(date.getUTCDate())
        + 'T' + pad(hours)
        + ':' + pad(minutes)
        + ':' + pad(seconds)
        + 'Z';
    };

    return {
        setCookie: setCookie,
        getCookie: getCookie,
        getPageHashParameters: getPageHashParameters,
        getHashParameters: getHashParameters,
        getPageQueryParameters: getPageQueryParameters,
        getQueryParameters: getQueryParameters,
        appendParams: appendParams,
        left: left,
        right: right,
        isValidNumber: isValidNumber,
        isValidInteger: isValidInteger,
        getRandom: getRandom,
        cleanPrice: cleanPrice,
        hasPermission: hasPermission,
        getLocale: getLocale,
        removeEmptyPrices: removeEmptyPrices,
        addDays: addDays,
        daysDiff: daysDiff,
        stringToArray: stringToArray,
        arrayToString: arrayToString,
        renameProperty: renameProperty,
        ucaseFirstLetter: ucaseFirstLetter,
        getColor: getColor,
        getRelatedColor: getRelatedColor,
        stringsToBool: stringsToBool,
        stringToBool: stringToBool,
        hasProperty: hasProperty,
        calculateFxAmount: calculateFxAmount,
        areEqual: areEqual,
        sumProperties: sumProperties,
        roundCurrency: roundCurrency,
        redirect: redirect,
        isNullOrEmpty: isNullOrEmpty,
        pushArray: pushArray,
        inTestMode: inTestMode,
        emptyToNull: emptyToNull,
        parseQueryParameters: parseQueryParameters,
        replaceAll: replaceAll,
        getChildrenElements: getChildrenElements,
        getSiblingElements: getSiblingElements,
        jsonToCsvDownload: jsonToCsvDownload,
        jsonToHtmlTable: jsonToHtmlTable,
        getCurrentIsoDate: getCurrentIsoDate
    };

})();

// The following code needs to run after app.js and after utilities.js are loaded but before any directive, controller, etc. are run. This bootstraps the app at run time with the initial settings and configurations.

app.run(['$rootScope', '$http', 'SettingsService', 'StorageService', 'LanguageService', 'ApiService', function ($rootScope, $http, SettingsService, StorageService, LanguageService, ApiService) {

    // Get the settings
    var settings = SettingsService.get();

    // Enable CORS when running in development environments.
    if (settings.config.development) {
        $http.defaults.useXDomain = true;
    }

    // Establish the app language
    LanguageService.establishLanguage();

}]);
$.Admin = {};

/* --------------------
 * - Admin Options -
 * --------------------
 * Modify these options to suit your implementation
 */
$.Admin.options = {
    //Add slimscroll to navbar menus
    //This requires you to load the slimscroll plugin
    //in every page before app.js
    navbarMenuSlimscroll: true,
    navbarMenuSlimscrollWidth: "3px", //The width of the scroll bar
    navbarMenuHeight: "200px", //The height of the inner menu
    //General animation speed for JS animated elements such as box collapse/expand and
    //sidebar treeview slide up/down. This options accepts an integer as milliseconds,
    //'fast', 'normal', or 'slow'
    animationSpeed: 300,
    //Sidebar push menu toggle button selector
    sidebarToggleSelector: "[data-toggle='offcanvas']",
    //Activate sidebar push menu
    sidebarPushMenu: true,
    //Activate sidebar slimscroll if the fixed layout is set (requires SlimScroll Plugin)
    sidebarSlimScroll: true,
    //Enable sidebar expand on hover effect for sidebar mini
    //This option is forced to true if both the fixed layout and sidebar mini
    //are used together
    sidebarExpandOnHover: false,
    //BoxRefresh Plugin
    enableBoxRefresh: true,
    BSTooltipSelector: "[data-toggle='tooltip']",
    //Enable Fast Click. Fastclick.js creates a more
    //native touch experience with touch devices. If you
    //choose to enable the plugin, make sure you load the script
    //before Admin's app.js
    enableFastclick: true,
    //Control Sidebar Options
    enableControlSidebar: true,
    controlSidebarOptions: {
        //Which button should trigger the open/close event
        toggleBtnSelector: "[data-toggle='control-sidebar']",
        //The sidebar selector
        selector: ".control-sidebar",
        //Enable slide over content
        slide: true
    },
    //Box Widget Plugin. Enable this plugin
    //to allow boxes to be collapsed and/or removed
    enableBoxWidget: true,
    //Box Widget plugin options
    boxWidgetOptions: {
        boxWidgetIcons: {
            //Collapse icon
            collapse: 'fa-minus',
            //Open icon
            open: 'fa-plus',
            //Remove icon
            remove: 'fa-times'
        },
        boxWidgetSelectors: {
            //Remove button selector
            remove: '[data-widget="remove"]',
            //Collapse button selector
            collapse: '[data-widget="collapse"]'
        }
    },
    //Direct Chat plugin options
    directChat: {
        //Enable direct chat by default
        enable: true,
        //The button to open and close the chat contacts pane
        contactToggleSelector: '[data-widget="chat-pane-toggle"]'
    },
    //Define the set of colors to use globally around the website
    colors: {
        lightBlue: "#3c8dbc",
        red: "#f56954",
        green: "#00a65a",
        aqua: "#00c0ef",
        yellow: "#f39c12",
        blue: "#0073b7",
        navy: "#001F3F",
        teal: "#39CCCC",
        olive: "#3D9970",
        lime: "#01FF70",
        orange: "#FF851B",
        fuchsia: "#F012BE",
        purple: "#8E24AA",
        maroon: "#D81B60",
        black: "#222222",
        gray: "#d2d6de"
    },
    //The standard screen sizes that bootstrap uses.
    //If you change these in the variables.less file, change
    //them here too.
    screenSizes: {
        xs: 480,
        sm: 768,
        md: 992,
        lg: 1200
    }
};

/* ------------------
 * - Implementation -
 * ------------------
 * The next block of code implements Admin's
 * functions and plugins as specified by the
 * options above.
 */
$(function () {
    "use strict";

    //Fix for IE page transitions
    $("body").removeClass("hold-transition");

    //Extend options if external options exist
    if (typeof AdminOptions !== "undefined") {
        $.extend(true,
                $.Admin.options,
                AdminOptions);
    }

    //Easy access to options
    var o = $.Admin.options;

    //Set up the object
    _init();

    //Activate the layout maker
    $.Admin.layout.activate();

    //Enable sidebar tree view controls
    $.Admin.tree('.sidebar');

    //Enable control sidebar
    if (o.enableControlSidebar) {
        $.Admin.controlSidebar.activate();
    }

    //Add slimscroll to navbar dropdown
    if (o.navbarMenuSlimscroll && typeof $.fn.slimscroll != 'undefined') {
        $(".navbar .menu").slimscroll({
            height: o.navbarMenuHeight,
            alwaysVisible: false,
            size: o.navbarMenuSlimscrollWidth
        }).css("width", "100%");
    }

    //Activate sidebar push menu
    if (o.sidebarPushMenu) {
        $.Admin.pushMenu.activate(o.sidebarToggleSelector);
    }

    //Activate box widget
    if (o.enableBoxWidget) {
        $.Admin.boxWidget.activate();
    }

    //Activate direct chat widget
    if (o.directChat.enable) {
        $(document).on('click', o.directChat.contactToggleSelector, function () {
            var box = $(this).parents('.direct-chat').first();
            box.toggleClass('direct-chat-contacts-open');
        });
    }

    /*
     * INITIALIZE BUTTON TOGGLE
     * ------------------------
     */
    $('.btn-group[data-toggle="btn-toggle"]').each(function () {
        var group = $(this);
        $(this).find(".btn").on('click', function (e) {
            group.find(".btn.active").removeClass("active");
            $(this).addClass("active");
            e.preventDefault();
        });

    });
});

/* ----------------------------------
 * - Initialize the Admin Object -
 * ----------------------------------
 * All Admin functions are implemented below.
 */
function _init() {
    'use strict';
    /* Layout
     * ======
     * Fixes the layout height in case min-height fails.
     *
     * @type Object
     * @usage $.Admin.layout.activate()
     *        $.Admin.layout.fix()
     *        $.Admin.layout.fixSidebar()
     */
    $.Admin.layout = {
        activate: function () {
            var _this = this;
            _this.fix();
            _this.fixSidebar();
            $(window, ".wrapper").resize(function () {
                _this.fix();
                _this.fixSidebar();
            });
        },
        fix: function () {
            //Get window height and the wrapper height
            var neg = $('.main-header').outerHeight() + $('.main-footer').outerHeight();
            var window_height = $(window).height();
            var sidebar_height = $(".sidebar").height();
            //Set the min-height of the content and sidebar based on the
            //the height of the document.
            if ($("body").hasClass("fixed")) {
                $(".content-wrapper, .right-side").css('min-height', window_height - $('.main-footer').outerHeight());
            } else {
                var postSetWidth;
                if (window_height >= sidebar_height) {
                    $(".content-wrapper, .right-side").css('min-height', window_height - neg);
                    postSetWidth = window_height - neg;
                } else {
                    $(".content-wrapper, .right-side").css('min-height', sidebar_height);
                    postSetWidth = sidebar_height;
                }

                //Fix for the control sidebar height
                var controlSidebar = $($.Admin.options.controlSidebarOptions.selector);
                if (typeof controlSidebar !== "undefined") {
                    if (controlSidebar.height() > postSetWidth)
                        $(".content-wrapper, .right-side").css('min-height', controlSidebar.height());
                }

            }
        },
        fixSidebar: function () {
            //Make sure the body tag has the .fixed class
            if (!$("body").hasClass("fixed")) {
                if (typeof $.fn.slimScroll != 'undefined') {
                    $(".sidebar").slimScroll({ destroy: true }).height("auto");
                }
                return;
            } else if (typeof $.fn.slimScroll == 'undefined' && window.console) {
                window.console.error("Error: the fixed layout requires the slimscroll plugin!");
            }
            //Enable slimscroll for fixed layout
            if ($.Admin.options.sidebarSlimScroll) {
                if (typeof $.fn.slimScroll != 'undefined') {
                    //Destroy if it exists
                    $(".sidebar").slimScroll({ destroy: true }).height("auto");
                    //Add slimscroll
                    $(".sidebar").slimscroll({
                        height: ($(window).height() - $(".main-header").height()) + "px",
                        color: "rgba(0,0,0,0.2)",
                        size: "3px"
                    });
                }
            }
        }
    };

    /* PushMenu()
     * ==========
     * Adds the push menu functionality to the sidebar.
     *
     * @type Function
     * @usage: $.Admin.pushMenu("[data-toggle='offcanvas']")
     */
    $.Admin.pushMenu = {
        activate: function (toggleBtn) {
            //Get the screen sizes
            var screenSizes = $.Admin.options.screenSizes;

            //Enable sidebar toggle
            $(toggleBtn).on('click', function (e) {
                e.preventDefault();

                //Enable sidebar push menu
                if ($(window).outerWidth() + 15 > (screenSizes.sm - 1)) {
                    if ($("body").hasClass('sidebar-collapse')) {
                        $("body").removeClass('sidebar-collapse').trigger('expanded.pushMenu');
                    } else {
                        $("body").addClass('sidebar-collapse').trigger('collapsed.pushMenu');
                    }
                }
                    //Handle sidebar push menu for small screens
                else {
                    if ($("body").hasClass('sidebar-open')) {
                        $("body").removeClass('sidebar-open').removeClass('sidebar-collapse').trigger('collapsed.pushMenu');
                    } else {
                        $("body").addClass('sidebar-open').trigger('expanded.pushMenu');
                    }
                }
            });

            $(".content-wrapper").click(function () {
                //Enable hide menu when clicking on the content-wrapper on small screens
                if ($(window).width() <= (screenSizes.sm - 1) && $("body").hasClass("sidebar-open")) {
                    $("body").removeClass('sidebar-open');
                }
            });

            // Close the sidebar on menu item click on small screens.
            $(".sidebar-menu a[href]").on("click", function () {
                if ($(window).width() <= (screenSizes.sm - 1) && $("body").hasClass("sidebar-open")) {
                    $("body").removeClass('sidebar-open');
                }
            });

            //Enable expand on hover for sidebar mini
            if ($.Admin.options.sidebarExpandOnHover
                    || ($('body').hasClass('fixed')
                            && $('body').hasClass('sidebar-mini'))) {
                this.expandOnHover();
            }
        },
        expandOnHover: function () {
            var _this = this;
            var screenWidth = $.Admin.options.screenSizes.sm - 1;
            //Expand sidebar on hover
            $('.main-sidebar').hover(function () {
                if ($('body').hasClass('sidebar-mini')
                        && $("body").hasClass('sidebar-collapse')
                        && $(window).width() > screenWidth) {
                    _this.expand();
                }
            }, function () {
                if ($('body').hasClass('sidebar-mini')
                        && $('body').hasClass('sidebar-expanded-on-hover')
                        && $(window).width() > screenWidth) {
                    _this.collapse();
                }
            });
        },
        expand: function () {
            $("body").removeClass('sidebar-collapse').addClass('sidebar-expanded-on-hover');
        },
        collapse: function () {
            if ($('body').hasClass('sidebar-expanded-on-hover')) {
                $('body').removeClass('sidebar-expanded-on-hover').addClass('sidebar-collapse');
            }
        }

    };

    /* Tree()
     * ======
     * Converts the sidebar into a multilevel
     * tree view menu.
     *
     * @type Function
     * @Usage: $.Admin.tree('.sidebar')
     */
    $.Admin.tree = function (menu) {
        var _this = this;
        var animationSpeed = $.Admin.options.animationSpeed;
        $(document).on('click', menu + ' li a', function (e) {
            //Get the clicked link and the next element
            var $this = $(this);
            var checkElement = $this.next();

            //Check if the next element is a menu and is visible
            if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
                //Close the menu
                checkElement.slideUp(animationSpeed, function () {
                    checkElement.removeClass('menu-open');
                    //Fix the layout in case the sidebar stretches over the height of the window
                    //_this.layout.fix();
                });
                checkElement.parent("li").removeClass("active");
            }
                //If the menu is not visible
            else if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
                //Get the parent menu
                var parent = $this.parents('ul').first();
                //Close all open menus within the parent
                var ul = parent.find('ul:visible').slideUp(animationSpeed);
                //Remove the menu-open class from the parent
                ul.removeClass('menu-open');
                //Get the parent li
                var parent_li = $this.parent("li");

                //Open the target menu and add the menu-open class
                checkElement.slideDown(animationSpeed, function () {
                    //Add the class active to the parent li
                    checkElement.addClass('menu-open');
                    parent.find('li.active').removeClass('active');
                    parent_li.addClass('active');
                    //Fix the layout in case the sidebar stretches over the height of the window
                    _this.layout.fix();
                });
            }
            //if this isn't a link, prevent the page from being redirected
            if (checkElement.is('.treeview-menu')) {
                e.preventDefault();
            }
        });
    };

    /* ControlSidebar
     * ==============
     * Adds functionality to the right sidebar
     *
     * @type Object
     * @usage $.Admin.controlSidebar.activate(options)
     */
    $.Admin.controlSidebar = {
        //instantiate the object
        activate: function () {
            //Get the object
            var _this = this;
            //Update options
            var o = $.Admin.options.controlSidebarOptions;
            //Get the sidebar
            var sidebar = $(o.selector);
            //The toggle button
            var btn = $(o.toggleBtnSelector);

            //Listen to the click event
            btn.on('click', function (e) {
                e.preventDefault();
                //If the sidebar is not open
                if (!sidebar.hasClass('control-sidebar-open')
                        && !$('body').hasClass('control-sidebar-open')) {
                    //Open the sidebar
                    _this.open(sidebar, o.slide);
                } else {
                    _this.close(sidebar, o.slide);
                }
            });

            //If the body has a boxed layout, fix the sidebar bg position
            var bg = $(".control-sidebar-bg");
            _this._fix(bg);

            //If the body has a fixed layout, make the control sidebar fixed
            if ($('body').hasClass('fixed')) {
                _this._fixForFixed(sidebar);
            } else {
                //If the content height is less than the sidebar's height, force max height
                if ($('.content-wrapper, .right-side').height() < sidebar.height()) {
                    _this._fixForContent(sidebar);
                }
            }
        },
        //Open the control sidebar
        open: function (sidebar, slide) {
            //Slide over content
            if (slide) {
                sidebar.addClass('control-sidebar-open');
            } else {
                //Push the content by adding the open class to the body instead
                //of the sidebar itself
                $('body').addClass('control-sidebar-open');
            }
        },
        //Close the control sidebar
        close: function (sidebar, slide) {
            if (slide) {
                sidebar.removeClass('control-sidebar-open');
            } else {
                $('body').removeClass('control-sidebar-open');
            }
        },
        _fix: function (sidebar) {
            var _this = this;
            if ($("body").hasClass('layout-boxed')) {
                sidebar.css('position', 'absolute');
                sidebar.height($(".wrapper").height());
                $(window).resize(function () {
                    _this._fix(sidebar);
                });
            } else {
                sidebar.css({
                    'position': 'fixed',
                    'height': 'auto'
                });
            }
        },
        _fixForFixed: function (sidebar) {
            sidebar.css({
                'position': 'fixed',
                'max-height': '100%',
                'overflow': 'auto',
                'padding-bottom': '50px'
            });
        },
        _fixForContent: function (sidebar) {
            $(".content-wrapper, .right-side").css('min-height', sidebar.height());
        }
    };

    /* BoxWidget
     * =========
     * BoxWidget is a plugin to handle collapsing and
     * removing boxes from the screen.
     *
     * @type Object
     * @usage $.Admin.boxWidget.activate()
     *        Set all your options in the main $.Admin.options object
     */
    $.Admin.boxWidget = {
        selectors: $.Admin.options.boxWidgetOptions.boxWidgetSelectors,
        icons: $.Admin.options.boxWidgetOptions.boxWidgetIcons,
        animationSpeed: $.Admin.options.animationSpeed,
        activate: function (_box) {
            var _this = this;
            if (!_box) {
                _box = document; // activate all boxes per default
            }
            //Listen for collapse event triggers
            $(_box).on('click', _this.selectors.collapse, function (e) {
                e.preventDefault();
                _this.collapse($(this));
            });

            //Listen for remove event triggers
            $(_box).on('click', _this.selectors.remove, function (e) {
                e.preventDefault();
                _this.remove($(this));
            });
        },
        collapse: function (element) {
            var _this = this;
            //Find the box parent
            var box = element.parents(".box").first();
            //Find the body and the footer
            var box_content = box.find("> .box-body, > .box-footer, > form  >.box-body, > form > .box-footer");
            if (!box.hasClass("collapsed-box")) {
                //Convert minus into plus
                element.children(":first")
                        .removeClass(_this.icons.collapse)
                        .addClass(_this.icons.open);
                //Hide the content
                box_content.slideUp(_this.animationSpeed, function () {
                    box.addClass("collapsed-box");
                });
            } else {
                //Convert plus into minus
                element.children(":first")
                        .removeClass(_this.icons.open)
                        .addClass(_this.icons.collapse);
                //Show the content
                box_content.slideDown(_this.animationSpeed, function () {
                    box.removeClass("collapsed-box");
                });
            }
        },
        remove: function (element) {
            //Find the box parent
            var box = element.parents(".box").first();
            box.slideUp(this.animationSpeed);
        }
    };
}

/* ------------------
 * - Custom Plugins -
 * ------------------
 * All custom plugins are defined below.
 */

/*
 * BOX REFRESH BUTTON
 * ------------------
 * This is a custom plugin to use with the component BOX. It allows you to add
 * a refresh button to the box. It converts the box's state to a loading state.
 *
 * @type plugin
 * @usage $("#box-widget").boxRefresh( options );
 */
(function ($) {

    "use strict";

    $.fn.boxRefresh = function (options) {

        // Render options
        var settings = $.extend({
            //Refresh button selector
            trigger: ".refresh-btn",
            //File source to be loaded (e.g: ajax/src.php)
            source: "",
            //Callbacks
            onLoadStart: function (box) {
                return box;
            }, //Right after the button has been clicked
            onLoadDone: function (box) {
                return box;
            } //When the source has been loaded

        }, options);

        //The overlay
        var overlay = $('<div class="overlay"><div class="fa fa-refresh fa-spin"></div></div>');

        return this.each(function () {
            //if a source is specified
            if (settings.source === "") {
                if (window.console) {
                    window.console.log("Please specify a source first - boxRefresh()");
                }
                return;
            }
            //the box
            var box = $(this);
            //the button
            var rBtn = box.find(settings.trigger).first();

            //On trigger click
            rBtn.on('click', function (e) {
                e.preventDefault();
                //Add loading overlay
                start(box);

                //Perform ajax call
                box.find(".box-body").load(settings.source, function () {
                    done(box);
                });
            });
        });

        function start(box) {
            //Add overlay and loading img
            box.append(overlay);

            settings.onLoadStart.call(box);
        }

        function done(box) {
            //Remove overlay and loading img
            box.find(overlay).remove();

            settings.onLoadDone.call(box);
        }

    };

})(jQuery);

/*
 * EXPLICIT BOX ACTIVATION
 * -----------------------
 * This is a custom plugin to use with the component BOX. It allows you to activate
 * a box inserted in the DOM after the app.js was loaded.
 *
 * @type plugin
 * @usage $("#box-widget").activateBox();
 */
(function ($) {

    'use strict';

    $.fn.activateBox = function () {
        $.Admin.boxWidget.activate(this);
    };

})(jQuery);

/*
 * TODO LIST CUSTOM PLUGIN
 * -----------------------
 * This plugin depends on iCheck plugin for checkbox and radio inputs
 *
 * @type plugin
 * @usage $("#todo-widget").todolist( options );
 */
(function ($) {

    'use strict';

    $.fn.todolist = function (options) {
        // Render options
        var settings = $.extend({
            //When the user checks the input
            onCheck: function (ele) {
                return ele;
            },
            //When the user unchecks the input
            onUncheck: function (ele) {
                return ele;
            }
        }, options);

        return this.each(function () {

            if (typeof $.fn.iCheck != 'undefined') {
                $('input', this).on('ifChecked', function () {
                    var ele = $(this).parents("li").first();
                    ele.toggleClass("done");
                    settings.onCheck.call(ele);
                });

                $('input', this).on('ifUnchecked', function () {
                    var ele = $(this).parents("li").first();
                    ele.toggleClass("done");
                    settings.onUncheck.call(ele);
                });
            } else {
                $('input', this).on('change', function () {
                    var ele = $(this).parents("li").first();
                    ele.toggleClass("done");
                    if ($('input', ele).is(":checked")) {
                        settings.onCheck.call(ele);
                    } else {
                        settings.onUncheck.call(ele);
                    }
                });
            }
        });
    };
}(jQuery));

(function () {
    var getBarWidth;

    // This function attempts to make the jQuery sparkline graphs responsive.

    // This function is included in places where jQuery and sparkline are not, catch the error and return if not present.
    if (!$.fn.sparkline) {
        return;
    }

    getBarWidth = function ($el, count, space) {
        var s, w;
        w = $el.outerWidth();
        s = parseInt(space) * (count - 1);
        return Math.floor((w - s) / count);
    };

    $.fn.pixelSparkline = function () {
        var bars_space, f_args, is_bars, vals_count;
        f_args = arguments;
        is_bars = false;
        vals_count = 0;
        bars_space = '2px';
        if (f_args[0] instanceof Array && f_args[1] instanceof Object && f_args[1].type === 'bar' && f_args[1].width === '100%') {
            is_bars = true;
            vals_count = f_args[0].length;
            if (f_args[1].barSpacing) {
                bars_space = f_args[1].barSpacing;
            }
            f_args[1].barWidth = getBarWidth($(this), vals_count, bars_space);
        }
        $.fn.sparkline.apply(this, f_args);
        return $(window).on('pa.resize', (function (_this) {
            return function () {
                if (is_bars) {
                    f_args[1].barWidth = getBarWidth($(_this), vals_count, bars_space);
                }
                return $.fn.sparkline.apply(_this, f_args);
            };
        })(this));
    };

}).call(this);

if ('addEventListener' in document) {
    document.addEventListener('DOMContentLoaded', function () {
        if (FastClick != 'undefined') {
            FastClick.attach(document.body);
        }
    }, false);
}
app.service("ApiService", ['$http', '$q', '$rootScope', function ($http, $q, $rootScope) {

    // Return public API.
    return ({
        login: login,
        set: set,
        getItem: getItem,
        getList: getList,
        remove: remove,
        buildUrl: buildUrl,
        getItemPdf: getItemPdf
    });

    function login(data, url, parameters) {

        if (data == null) {
            data = undefined;
        }

        // Remove any existing token in storage
        localStorage.removeItem("token");
        utils.setCookie("token", "", -60);

        var headers = {};
        headers["Content-Type"] = "application/json";

        var request = $http({
            ignoreLoadingBar: true,
            method: "post",
            data: angular.toJson(data),
            url: url + "?timezone=UTC",
            params: parameters,
            timeout: 15000,
            isApi: true,
            ignoreAuthModule: true,
            headers: headers
        });

        return (request.then(onSuccess, onError));

    }

    function set(data, url, parameters, showLoading) {

        if (showLoading == null) {
            showLoading = true;
        }

        if (data == null) {
            data = undefined;
        }

        var headers = {};
        headers["Content-Type"] = "application/json";

        var request = $http({
            ignoreLoadingBar: !showLoading,
            method: "post",
            data: angular.toJson(data),
            url: url + "?timezone=UTC",
            params: parameters,
            timeout: 90000,
            isApi: true,
            headers: headers
        });

        return (request.then(onSuccess, onError));

    }

    function getItem(url, parameters, showLoading, timeout) {

        if (showLoading == null) {
            showLoading = true;
        }

        var headers = {};

        if (!timeout) {
            timeout = 15000;
        }

        var request = $http({
            ignoreLoadingBar: !showLoading,
            method: "get",
            url: url,
            params: parameters,
            timeout: timeout,
            isApi: true,
            headers: headers
        });

        if (parameters) {
            if (!parameters["timezone"]) {
                request.url += "?timezone=UTC"
            }
        } else {
            request.url += "?timezone=UTC"
        }

        return (request.then(onSuccess, onError));

    }

    function getItemPdf(url, parameters, showLoading, timeout) {

        if (showLoading == null) {
            showLoading = true;
        }

        var headers = {};

        if (!timeout) {
            timeout = 25000;
        }

        headers.Accept = "application/pdf";

        var request = $http({
            ignoreLoadingBar: !showLoading,
            method: "get",
            url: url,
            params: parameters,
            timeout: timeout,
            isApi: true,
            headers: headers,
            responseType: "arraybuffer"
        });

        if (parameters) {
            if (!parameters["timezone"]) {
                request.url += "?timezone=UTC"
            }
        } else {
            request.url += "?timezone=UTC"
        }

        return (request.then(onSuccess, onError));

    }
    
    function getList(url, parameters, showLoading) {

        if (showLoading == null) {
            showLoading = true;
        }

        var headers = {};

        // Parse the query parameters in the url
        var queryParameters = utils.getQueryParameters(url);

        if (queryParameters["timezone"] == null) {
            queryParameters["timezone"] = "UTC";
        }

        if (queryParameters["limit"] == null) {
            queryParameters["limit"] = 50;
        }

        // Remove any query parameters that are explicitly provided in parameters
        _.each(parameters, function (item, index) {
            if (queryParameters[index] != null) {
                delete queryParameters[index];
            }
        });

        // Remove the current query string
        if (url.indexOf("?") > 0) {
            url = url.substring(0, url.indexOf("?"))
        }

        // Append the parameters
        url = utils.appendParams(url, queryParameters);

        var request = $http({
            ignoreLoadingBar: !showLoading,
            method: "get",
            url: url,
            params: parameters,
            timeout: 25000,
            isApi: true,
            headers: headers
        });

        return (request.then(onSuccess, onError));

    }

    function remove(url, parameters, showLoading, tokenOverride) {

        if (showLoading == null) {
            showLoading = true;
        }

        var headers = {};
        // Used on logout when you are injecting a token to be deleted that may not be the currently established token in localStorage
        if (tokenOverride) {
            token = "Bearer " + tokenOverride;
        }

        var request = $http({
            ignoreLoadingBar: !showLoading,
            method: "delete",
            url: url + "?timezone=UTC",
            params: parameters,
            timeout: 15000,
            isApi: true,
            headers: headers
        });

        return (request.then(onSuccess, onError));

    }

    function buildUrl(endpoint, settings) {

        // If the url is fully qualified, just return it.
        if (endpoint.substring(0, 7) == "http://" || endpoint.substring(0, 8) == "https://") {
            return endpoint;
        } else {
            // The api prefix will contain the fully qualified URL if you are running in development mode. The prefix is defined during the app's bootstrap.
            return settings.config.apiPrefix + endpoint;
        }

    }

    function onError(response) {

        var error = {};

        // Most calls will return a formatted error message unless something unexpected happens. Pass the error object through if present, or create one that has the same properties if not.
        if (response.data.error) {

            if (response.data.error.status == 403) {
                error.code = "error";
                error.message = "It appears that you don't have permissions to access page or function you have requested. If you feel this is incorrect, please contact an account administrator.";
                error.status = response.status;
                return ($q.reject(error));
            }

            return ($q.reject(response.data.error));

        } else {
            error.code = "error";
            error.message = response.statusText;
            error.status = response.status;
            return ($q.reject(error));
        }
    }

    function onSuccess(response) {
        return (response.data);
    }

}]);

app.controller("GrowlsCtrl", ['$scope', '$timeout', function ($scope, $timeout) {

    $scope.growls = [];

    $scope.$on('event:growl', function (event, message) {
        $scope.growls.push(message);

        if (message.duration > 0) {
            $timeout(function () {
                $scope.growls = _.without($scope.growls, _.findWhere($scope.growls, { id: message.id }));
            }, (message.duration * 1000), true);
        }

    });

    $scope.clearGrowl = function (id) {
        $scope.growls = _.without($scope.growls, _.findWhere($scope.growls, { id: id }));
    }

}]);

app.controller("LangCtrl", ['$scope', 'gettextCatalog', 'ApiService', 'tmhDynamicLocale', 'SettingsService', function ($scope, gettextCatalog, ApiService, tmhDynamicLocale, SettingsService) {
    $scope.switchLanguage = function (language) {

        // The default language does not need to be loaded (English - it's embedded in the HTML).
        if (language != "en") {
            gettextCatalog.loadRemote("/languages/" + language + "/" + language + ".json");
        }

        gettextCatalog.setCurrentLanguage(language);
        localStorage.setItem("language", language)

        // Pull in the locale settings.
        tmhDynamicLocale.set(utils.getLocale(localStorage.getItem("language")));

        // Save the user's preference.
        ApiService.set({ language: language }, ApiService.buildUrl("/customers/me", SettingsService.get()));
    };
}]);
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
                    baseParams.show = "date_created,order_id,fulfilled,total,payment_status,currency";
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

app.factory('appCache', ['$cacheFactory', function ($cacheFactory) {
    return $cacheFactory('appCache');
}]);
app.filter('bytesToMB', function () {
    return function (item) {
        return (item / 1000000).toFixed(2) + " MB";
    };
});

app.filter('humanBool', function () {
    return function (bool) {
        if (bool != null) {
            if (bool == true) {
                return "yes";
            }
            return "no";
        }
    };
});

app.filter('money', function () {
    return function (amount, currency) {

        // This will error in browsers that don't support it. You need to shim before use.
        // Shim: https://github.com/andyearnshaw/Intl.js
        // http://stackoverflow.com/a/16233919/2002383

        var locale = localStorage.getItem("locale");
        if (locale == null) {
            locale = "en-us";
        }

        var formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
        });

        return formatter.format(amount);
    };
});

app.filter('truncate', function () {
    return function (text, length) {

        var end = "...";

        if (text == null) {
            return;
        }

        if (text.length <= length || text.length - end.length <= length) {
            return text;
        }
        else {
            return String(text).substring(0, length - end.length).trim() + end;
        }

    };
});

app.filter('countryCodeToName', ['GeographiesService', function (GeographiesService) {
    return function (code) {

        if (code == null) {
            return null;
        }

        var geo = GeographiesService.getGeographies();
        var country = _.findWhere(geo.countries, { code: code });
        return country.name;
    }
}]);

app.filter('truncateUrl', function () {
    return function (url, length) {

        var middle = "...";

        if (url == null) {
            return;
        }

        if (url.length <= length || url.length - middle.length <= length) {
            return url;
        }
        else {
            return String(url).substring(0, length) + middle + utils.right(url, 10);
        }

    };
});

app.filter('removeUnderscore', function () {
    return function (str) {
        if (str != null) {
            return str.split("_").join(" ");
        }
    }
});

app.filter('percentage', ['$filter', function ($filter) {
    return function (input, decimals) {
        return $filter('number')(input * 100, decimals) + '%';
    };
}]);
app.service("GrowlsService", ['$rootScope', function ($rootScope) {

    // Return public API.
    return ({
        addGrowl: addGrowl,
    });

    function addGrowl(growl) {

        // Create an ID
        var ref = utils.getRandom()

        // Define the type
        var type = "success";
        if (growl.type != null) {
            type = growl.type;
        }

        var duration = 5;

        switch (type) {
            case "success":
                duration = 5;
                break;
            case "info":
                duration = 5;
                break;
            case "warning":
                duration = 10;
                break;
            case "danger":
                duration = -1; // Until user dismisses it
                break;
        }

        // Override if a duration has been provided
        if (utils.isValidNumber(growl.duration)) {
            duration = growl.duration;
        }

        // We don't want to hold timeout events in memory forever, so set a reasonable maximum. If you want to go beyond this, set to -1 and it will stay until the user dismisses it.
        if (duration > 120) {
            duration = 120;
        }

        // Append the derived properties
        growl.ref = ref;
        growl.duration = duration;
        growl.type = type;

        $rootScope.$broadcast('event:growl', growl);

    }
}
]);


app.service("SettingsService", ['$rootScope', "$q", "ApiService", function ($rootScope, $q, ApiService) {

    // Return public API.
    return ({
        get: get
    });

    function get() {

        // The embedded settings/app.js and settings/account.js set the values within the __settings global variable.

        // Get account settings
        var getAccountSettings = function () {

            var accountSettings = {};

            if (window.__settings) {
                if (window.__settings.account) {
                    accountSettings = window.__settings.account;
                }
            }

            // If accountSettings doesn't have the property "date_utc", inject the current client-side date.
            // The purpose is to provide the current server date to the app when running in the hosted environment. It is not designed to give precise time (because the settings file may be cached for minutes) 
            // Therefore, it always returns a date with the time at midnight, but will provide a reliable date "seed" in the application for things like credit card expiration date lists and copyright dates. Useful when you don't want to rely on a client-side clock.
            if (!accountSettings.date_utc) {
                // No value provided in the settings file, which is likely in development environments. Inject the client-side date so the app doesn't have to consider null values.
                accountSettings.date_utc = utils.getCurrentIsoDate(true);
            }

            // Split the date into parts for easy access
            var date = new Date(accountSettings.date_utc);
            accountSettings.year = date.getFullYear();
            accountSettings.month = date.getMonth();
            accountSettings.date = date.getDate();

            return accountSettings;
        }

        // Get app settings
        var getAppSettings = function () {

            var appSettings = {};

            if (window.__settings) {
                if (window.__settings.app) {
                    appSettings = window.__settings.app;
                }
            }

            return appSettings;
        }

        // Build and return the settings object
        var settings = { account: getAccountSettings(), app: getAppSettings(), config: {} };

        // Define the api prefix
        settings.config.apiPrefix = "/api/v1";

        settings.config.development = false;

        // For convenience, if you place a development flag in either one of the settings stubs (during local development), the app will be marked as running in development mode.
        if (settings.account.development || settings.app.development) {

            settings.config.development = true;

            // Make the apiPrefix a fully qualified url since requests in development mode don't have access to the reverse proxy.
            var apiHost = settings.account.api_host || settings.app.api_host || "api.comecero.com";
            settings.config.apiPrefix = ("https://" + apiHost) + settings.config.apiPrefix;
        }

        return settings;

    }

}]);


app.service("ConfirmService", ['$uibModal', function ($uibModal) {

    // Return public API.
    return ({
        showConfirm: showConfirm,
    });

    function showConfirm($scope, confirm) {

        $scope.confirm = confirm;

        openConfirm = $uibModal.open({
            templateUrl: 'app/modals/confirm.html',
            scope: $scope
        });

        confirm.ok = function () {
            openConfirm.close();
            confirm.onConfirm();
        };

        confirm.cancel = function () {
            openConfirm.close();
        };

    }

}
]);


app.service("GeographiesService", [function () {

    // Return public API.
    return ({
        getGeographies: getGeographies,
        isEuCountry: isEuCountry
    });

    function getGeographies(insertblanks) {
        var geo = {};

        geo.countries = [{ name: 'Afghanistan', code: 'AF' }, { name: 'Albania', code: 'AL' }, { name: 'Algeria', code: 'DZ' }, { name: 'American Samoa', code: 'AS' }, { name: 'Andorra', code: 'AD' }, { name: 'Angola', code: 'AO' }, { name: 'Anguilla', code: 'AI' }, { name: 'Antarctica', code: 'AQ' }, { name: 'Antigua and Barbuda', code: 'AG' }, { name: 'Argentina', code: 'AR' }, { name: 'Armenia', code: 'AM' }, { name: 'Aruba', code: 'AW' }, { name: 'Australia', code: 'AU' }, { name: 'Austria', code: 'AT' }, { name: 'Azerbaijan', code: 'AZ' }, { name: 'Bahamas', code: 'BS' }, { name: 'Bahrain', code: 'BH' }, { name: 'Bangladesh', code: 'BD' }, { name: 'Barbados', code: 'BB' }, { name: 'Belarus', code: 'BY' }, { name: 'Belgium', code: 'BE' }, { name: 'Belize', code: 'BZ' }, { name: 'Benin', code: 'BJ' }, { name: 'Bermuda', code: 'BM' }, { name: 'Bhutan', code: 'BT' }, { name: 'Bolivia, Plurinational State of', code: 'BO' }, { name: 'Bonaire, Sint Eustatius and Saba', code: 'BQ' }, { name: 'Bosnia and Herzegovina', code: 'BA' }, { name: 'Botswana', code: 'BW' }, { name: 'Bouvet Island', code: 'BV' }, { name: 'Brazil', code: 'BR' }, { name: 'British Indian Ocean Territory', code: 'IO' }, { name: 'Brunei Darussalam', code: 'BN' }, { name: 'Bulgaria', code: 'BG' }, { name: 'Burkina Faso', code: 'BF' }, { name: 'Burundi', code: 'BI' }, { name: 'Cambodia', code: 'KH' }, { name: 'Cameroon', code: 'CM' }, { name: 'Canada', code: 'CA' }, { name: 'Cape Verde', code: 'CV' }, { name: 'Cayman Islands', code: 'KY' }, { name: 'Central African Republic', code: 'CF' }, { name: 'Chad', code: 'TD' }, { name: 'Chile', code: 'CL' }, { name: 'China', code: 'CN' }, { name: 'Christmas Island', code: 'CX' }, { name: 'Cocos (Keeling) Islands', code: 'CC' }, { name: 'Colombia', code: 'CO' }, { name: 'Comoros', code: 'KM' }, { name: 'Congo', code: 'CG' }, { name: 'Congo, the Democratic Republic of the', code: 'CD' }, { name: 'Cook Islands', code: 'CK' }, { name: 'Costa Rica', code: 'CR' }, { name: 'Cote d Ivoire', code: 'CI' }, { name: 'Croatia', code: 'HR' }, { name: 'Cuba', code: 'CU' }, { name: 'Curacao', code: 'CW' }, { name: 'Cyprus', code: 'CY' }, { name: 'Czech Republic', code: 'CZ' }, { name: 'Denmark', code: 'DK' }, { name: 'Djibouti', code: 'DJ' }, { name: 'Dominica', code: 'DM' }, { name: 'Dominican Republic', code: 'DO' }, { name: 'Ecuador', code: 'EC' }, { name: 'Egypt', code: 'EG' }, { name: 'El Salvador', code: 'SV' }, { name: 'Equatorial Guinea', code: 'GQ' }, { name: 'Eritrea', code: 'ER' }, { name: 'Estonia', code: 'EE' }, { name: 'Ethiopia', code: 'ET' }, { name: 'Falkland Islands', code: 'AX' }, { name: 'Falkland Islands (Malvinas)', code: 'FK' }, { name: 'Faroe Islands', code: 'FO' }, { name: 'Fiji', code: 'FJ' }, { name: 'Finland', code: 'FI' }, { name: 'France', code: 'FR' }, { name: 'French Guiana', code: 'GF' }, { name: 'French Polynesia', code: 'PF' }, { name: 'French Southern Territories', code: 'TF' }, { name: 'Gabon', code: 'GA' }, { name: 'Gambia', code: 'GM' }, { name: 'Georgia', code: 'GE' }, { name: 'Germany', code: 'DE' }, { name: 'Ghana', code: 'GH' }, { name: 'Gibraltar', code: 'GI' }, { name: 'Greece', code: 'GR' }, { name: 'Greenland', code: 'GL' }, { name: 'Grenada', code: 'GD' }, { name: 'Guadeloupe', code: 'GP' }, { name: 'Guam', code: 'GU' }, { name: 'Guatemala', code: 'GT' }, { name: 'Guernsey', code: 'GG' }, { name: 'Guinea', code: 'GN' }, { name: 'Guine Bissau', code: 'GW' }, { name: 'Guyana', code: 'GY' }, { name: 'Haiti', code: 'HT' }, { name: 'Heard Island and McDonald Islands', code: 'HM' }, { name: 'Holy See (Vatican City State)', code: 'VA' }, { name: 'Honduras', code: 'HN' }, { name: 'Hong Kong', code: 'HK' }, { name: 'Hungary', code: 'HU' }, { name: 'Iceland', code: 'IS' }, { name: 'India', code: 'IN' }, { name: 'Indonesia', code: 'ID' }, { name: 'Iran', code: 'IR' }, { name: 'Iraq', code: 'IQ' }, { name: 'Ireland', code: 'IE' }, { name: 'Isle of Man', code: 'IM' }, { name: 'Israel', code: 'IL' }, { name: 'Italy', code: 'IT' }, { name: 'Jamaica', code: 'JM' }, { name: 'Japan', code: 'JP' }, { name: 'Jersey', code: 'JE' }, { name: 'Jordan', code: 'JO' }, { name: 'Kazakhstan', code: 'KZ' }, { name: 'Kenya', code: 'KE' }, { name: 'Kiribati', code: 'KI' }, { name: 'Korea', code: 'KR' }, { name: 'Kuwait', code: 'KW' }, { name: 'Kyrgyzstan', code: 'KG' }, { name: 'Lao Peoples Democratic Republic', code: 'LA' }, { name: 'Latvia', code: 'LV' }, { name: 'Lebanon', code: 'LB' }, { name: 'Lesotho', code: 'LS' }, { name: 'Liberia', code: 'LR' }, { name: 'Libya', code: 'LY' }, { name: 'Liechtenstein', code: 'LI' }, { name: 'Lithuania', code: 'LT' }, { name: 'Luxembourg', code: 'LU' }, { name: 'Macao', code: 'MO' }, { name: 'Macedonia', code: 'MK' }, { name: 'Madagascar', code: 'MG' }, { name: 'Malawi', code: 'MW' }, { name: 'Malaysia', code: 'MY' }, { name: 'Maldives', code: 'MV' }, { name: 'Mali', code: 'ML' }, { name: 'Malta', code: 'MT' }, { name: 'Marshall Islands', code: 'MH' }, { name: 'Martinique', code: 'MQ' }, { name: 'Mauritania', code: 'MR' }, { name: 'Mauritius', code: 'MU' }, { name: 'Mayotte', code: 'YT' }, { name: 'Mexico', code: 'MX' }, { name: 'Micronesia', code: 'FM' }, { name: 'Moldova', code: 'MD' }, { name: 'Monaco', code: 'MC' }, { name: 'Mongolia', code: 'MN' }, { name: 'Montenegro', code: 'ME' }, { name: 'Montserrat', code: 'MS' }, { name: 'Morocco', code: 'MA' }, { name: 'Mozambique', code: 'MZ' }, { name: 'Myanmar', code: 'MM' }, { name: 'Namibia', code: 'NA' }, { name: 'Nauru', code: 'NR' }, { name: 'Nepal', code: 'NP' }, { name: 'Netherlands', code: 'NL' }, { name: 'New Caledonia', code: 'NC' }, { name: 'New Zealand', code: 'NZ' }, { name: 'Nicaragua', code: 'NI' }, { name: 'Niger', code: 'NE' }, { name: 'Nigeria', code: 'NG' }, { name: 'Niue', code: 'NU' }, { name: 'Norfolk Island', code: 'NF' }, { name: 'Northern Mariana Islands', code: 'MP' }, { name: 'Norway', code: 'NO' }, { name: 'Oman', code: 'OM' }, { name: 'Pakistan', code: 'PK' }, { name: 'Palau', code: 'PW' }, { name: 'Panama', code: 'PA' }, { name: 'Papua New Guinea', code: 'PG' }, { name: 'Paraguay', code: 'PY' }, { name: 'Peru', code: 'PE' }, { name: 'Philippines', code: 'PH' }, { name: 'Pitcairn', code: 'PN' }, { name: 'Poland', code: 'PL' }, { name: 'Portugal', code: 'PT' }, { name: 'Puerto Rico', code: 'PR' }, { name: 'Qatar', code: 'QA' }, { name: 'Reunion', code: 'RE' }, { name: 'Romania', code: 'RO' }, { name: 'Russian Federation', code: 'RU' }, { name: 'Rwanda', code: 'RW' }, { name: 'Saint Barthélemy', code: 'BL' }, { name: 'Saint Helena', code: 'SH' }, { name: 'Saint Kitts and Nevis', code: 'KN' }, { name: 'Saint Lucia', code: 'LC' }, { name: 'Saint Martin French', code: 'MF' }, { name: 'Saint Pierre and Miquelon', code: 'PM' }, { name: 'Saint Vincent and the Grenadines', code: 'VC' }, { name: 'Samoa', code: 'WS' }, { name: 'San Marino', code: 'SM' }, { name: 'Sao Tome and Principe', code: 'ST' }, { name: 'Saudi Arabia', code: 'SA' }, { name: 'Senegal', code: 'SN' }, { name: 'Serbia', code: 'RS' }, { name: 'Seychelles', code: 'SC' }, { name: 'Sierra Leone', code: 'SL' }, { name: 'Singapore', code: 'SG' }, { name: 'Sint Maarten Dutch', code: 'SX' }, { name: 'Slovakia', code: 'SK' }, { name: 'Slovenia', code: 'SI' }, { name: 'Solomon Islands', code: 'SB' }, { name: 'Somalia', code: 'SO' }, { name: 'South Africa', code: 'ZA' }, { name: 'South Georgia and the South Sandwich Islands', code: 'GS' }, { name: 'South Sudan', code: 'SS' }, { name: 'Spain', code: 'ES' }, { name: 'Sri Lanka', code: 'LK' }, { name: 'Sudan', code: 'SD' }, { name: 'Suriname', code: 'SR' }, { name: 'Svalbard and Jan Mayen', code: 'SJ' }, { name: 'Swaziland', code: 'SZ' }, { name: 'Sweden', code: 'SE' }, { name: 'Switzerland', code: 'CH' }, { name: 'Syrian Arab Republic', code: 'SY' }, { name: 'Taiwan', code: 'TW' }, { name: 'Tajikistan', code: 'TJ' }, { name: 'Tanzania', code: 'TZ' }, { name: 'Thailand', code: 'TH' }, { name: 'Timor Leste', code: 'TL' }, { name: 'Togo', code: 'TG' }, { name: 'Tokelau', code: 'TK' }, { name: 'Tonga', code: 'TO' }, { name: 'Trinidad and Tobago', code: 'TT' }, { name: 'Tunisia', code: 'TN' }, { name: 'Turkey', code: 'TR' }, { name: 'Turkmenistan', code: 'TM' }, { name: 'Turks and Caicos Islands', code: 'TC' }, { name: 'Tuvalu', code: 'TV' }, { name: 'Uganda', code: 'UG' }, { name: 'Ukraine', code: 'UA' }, { name: 'United Arab Emirates', code: 'AE' }, { name: 'United Kingdom', code: 'GB' }, { name: 'United States', code: 'US' }, { name: 'United States Minor Outlying Islands', code: 'UM' }, { name: 'Uruguay', code: 'UY' }, { name: 'Uzbekistan', code: 'UZ' }, { name: 'Vanuatu', code: 'VU' }, { name: 'Venezuela', code: 'VE' }, { name: 'Viet Nam', code: 'VN' }, { name: 'Virgin Islands British', code: 'VG' }, { name: 'Virgin Islands U.S.', code: 'VI' }, { name: 'Wallis and Futuna', code: 'WF' }, { name: 'Western Sahara', code: 'EH' }, { name: 'Yemen', code: 'YE' }, { name: 'Zambia', code: 'ZM' }, { name: 'Zimbabwe', code: 'ZW' }];
        geo.us_states = [{ name: "Alabama", code: "AL" }, { name: "Alaska", code: "AK" }, { name: "American Samoa", code: "AS" }, { name: "Arizona", code: "AZ" }, { name: "Arkansas", code: "AR" }, { name: "California", code: "CA" }, { name: "Colorado", code: "CO" }, { name: "Connecticut", code: "CT" }, { name: "Delaware", code: "DE" }, { name: "District Of Columbia", code: "DC" }, { name: "Federated States Of Micronesia", code: "FM" }, { name: "Florida", code: "FL" }, { name: "Georgia", code: "GA" }, { name: "Guam", code: "GU" }, { name: "Hawaii", code: "HI" }, { name: "Idaho", code: "ID" }, { name: "Illinois", code: "IL" }, { name: "Indiana", code: "IN" }, { name: "Iowa", code: "IA" }, { name: "Kansas", code: "KS" }, { name: "Kentucky", code: "KY" }, { name: "Louisiana", code: "LA" }, { name: "Maine", code: "ME" }, { name: "Marshall Islands", code: "MH" }, { name: "Maryland", code: "MD" }, { name: "Massachusetts", code: "MA" }, { name: "Michigan", code: "MI" }, { name: "Minnesota", code: "MN" }, { name: "Mississippi", code: "MS" }, { name: "Missouri", code: "MO" }, { name: "Montana", code: "MT" }, { name: "Nebraska", code: "NE" }, { name: "Nevada", code: "NV" }, { name: "New Hampshire", code: "NH" }, { name: "New Jersey", code: "NJ" }, { name: "New Mexico", code: "NM" }, { name: "New York", code: "NY" }, { name: "North Carolina", code: "NC" }, { name: "North Dakota", code: "ND" }, { name: "Northern Mariana Islands", code: "MP" }, { name: "Ohio", code: "OH" }, { name: "Oklahoma", code: "OK" }, { name: "Oregon", code: "OR" }, { name: "Palau", code: "PW" }, { name: "Pennsylvania", code: "PA" }, { name: "Puerto Rico", code: "PR" }, { name: "Rhode Island", code: "RI" }, { name: "South Carolina", code: "SC" }, { name: "South Dakota", code: "SD" }, { name: "Tennessee", code: "TN" }, { name: "Texas", code: "TX" }, { name: "Utah", code: "UT" }, { name: "Vermont", code: "VT" }, { name: "Virgin Islands", code: "VI" }, { name: "Virginia", code: "VA" }, { name: "Washington", code: "WA" }, { name: "West Virginia", code: "WV" }, { name: "Wisconsin", code: "WI" }, { name: "Wyoming", code: "WY" }, { name: "U.S. Armed Forces Americas", code: "AA" }, { name: "U.S. Armed Forces Europe", code: "AE" }, { name: "U.S. Armed Forces Pacific", code: "AP" }];
        geo.ca_provinces = [{ code: "AB", name: "Alberta" }, { code: "BC", name: "British Columbia" }, { code: "LB", name: "Labrador" }, { code: "MB", name: "Manitoba" }, { code: "NB", name: "New Brunswick" }, { code: "NF", name: "Newfoundland" }, { code: "NS", name: "Nova Scotia" }, { code: "NU", name: "Nunavut" }, { code: "NW", name: "Northwest Territories" }, { code: "ON", name: "Ontario" }, { code: "PE", name: "Prince Edward Island" }, { code: "QC", name: "Quebec" }, { code: "SK", name: "Saskatchewen" }, { code: "YU", name: "Yukon" }];
        geo.au_states = [{ code: "NT", name: "Northern Territory" }, { code: "QLD", name: "Queensland" }, { code: "SA", name: "South Australia" }, { code: "TAS", name: "Tasmania" }, { code: "VIC", name: "Victoria" }, { code: "WA", name: "Western Australia" }];
        geo.eu_countries = [{ 'name': 'Austria', 'code': 'AT' }, { 'name': 'Belgium', 'code': 'BE' }, { 'name': 'Bulgaria', 'code': 'BG' }, { 'name': 'Croatia', 'code': 'HR' }, { 'name': 'Cyprus', 'code': 'CY' }, { 'name': 'Czech Republic', 'code': 'CZ' }, { 'name': 'Denmark', 'code': 'DK' }, { 'name': 'Estonia', 'code': 'EE' }, { 'name': 'Finland', 'code': 'FI' }, { 'name': 'France', 'code': 'FR' }, { 'name': 'Germany', 'code': 'DE' }, { 'name': 'Greece', 'code': 'GR' }, { 'name': 'Hungary', 'code': 'HU' }, { 'name': 'Ireland', 'code': 'IE' }, { 'name': 'Italy', 'code': 'IT' }, { 'name': 'Latvia', 'code': 'LV' }, { 'name': 'Lithuania', 'code': 'LT' }, { 'name': 'Luxembourg', 'code': 'LU' }, { 'name': 'Malta', 'code': 'MT' }, { 'name': 'Netherlands', 'code': 'NL' }, { 'name': 'Poland', 'code': 'PL' }, { 'name': 'Portugal', 'code': 'PT' }, { 'name': 'Romania', 'code': 'RO' }, { 'name': 'Slovakia', 'code': 'SK' }, { 'name': 'Slovenia', 'code': 'SI' }, { 'name': 'Spain', 'code': 'ES' }, { 'name': 'Sweden', 'code': 'SE' }, { 'name': 'United Kingdom', 'code': 'GB' }];

        if (insertblanks != false) {
            geo.countries.unshift({ name: '', code: '' });
            geo.us_states.unshift({ name: '', code: '' });
            geo.ca_provinces.unshift({ name: '', code: '' })
            geo.au_states.unshift({ name: '', code: '' });
        }

        return geo;
    }

    function isEuCountry(country) {
        if (_.find(getGeographies(false).eu_countries, { code: country }) != null) {
            return true;
        }
        return false;
    }

}
]);


app.service("CouriersService", [function () {

    // Return public API.
    return ({
        getCouriers: getCouriers,
    });

    function getCouriers() {
        var couriers = [{ value: null, name: "Optional" }, { value: "UPS", name: "UPS" }, { value: "FedEx", name: "FedEx" }, { value: "USPS", name: "United States Postal Service" }, { value: "DHLUSA", name: "DHL USA" }, { value: "DHLEcommerce", name: "DHL eCommerce" }, { value: "OnTrac", name: "OnTrac" }, { value: "ICCWorldwide", name: "ICC Worldwide" }, { value: "LaserShip", name: "LaserShip" }, { value: "CanadaPost", name: "Canada Post" }, { value: "AustraliaPost", name: "Australia Post" }, { value: "RoyalMail", name: "Royal Mail" }, { value: "", name: "Other" }];
        return couriers;
    }

}
]);


app.service("CurrenciesService", [function () {

    // Return public API.
    return ({
        getCurrencies: getCurrencies,
    });

    function getCurrencies() {

        var currencies = [{ "code": "AED", "name": "UAE Dirham" }, { "code": "AFN", "name": "Afghani" }, { "code": "ALL", "name": "Lek" }, { "code": "AMD", "name": "Armenian Dram" }, { "code": "ANG", "name": "Netherlands Antillean Guilder" }, { "code": "AOA", "name": "Kwanza" }, { "code": "ARS", "name": "Argentine Peso" }, { "code": "AUD", "name": "Australian Dollar" }, { "code": "AWG", "name": "Aruban Florin" }, { "code": "AZN", "name": "Azerbaijanian Manat" }, { "code": "BAM", "name": "Convertible Mark" }, { "code": "BBD", "name": "Barbados Dollar" }, { "code": "BDT", "name": "Taka" }, { "code": "BGN", "name": "Bulgarian Lev" }, { "code": "BHD", "name": "Bahraini Dinar" }, { "code": "BIF", "name": "Burundi Franc" }, { "code": "BMD", "name": "Bermudian Dollar" }, { "code": "BND", "name": "Brunei Dollar" }, { "code": "BOB", "name": "Boliviano" }, { "code": "BRL", "name": "Brazilian Real" }, { "code": "BSD", "name": "Bahamian Dollar" }, { "code": "BWP", "name": "Pula" }, { "code": "BYR", "name": "Belarussian Ruble" }, { "code": "BZD", "name": "Belize Dollar" }, { "code": "CAD", "name": "Canadian Dollar" }, { "code": "CDF", "name": "Congolese Franc" }, { "code": "CHF", "name": "Swiss Franc" }, { "code": "CLP", "name": "Chilean Peso" }, { "code": "CNY", "name": "Yuan Renminbi" }, { "code": "COP", "name": "Colombian Peso" }, { "code": "CRC", "name": "Costa Rican Colon" }, { "code": "CVE", "name": "Cape Verde Escudo" }, { "code": "CZK", "name": "Czech Koruna" }, { "code": "DJF", "name": "Djibouti Franc" }, { "code": "DKK", "name": "Danish Krone" }, { "code": "DOP", "name": "Dominican Peso" }, { "code": "DZD", "name": "Algerian Dinar" }, { "code": "EGP", "name": "Egyptian Pound" }, { "code": "ERN", "name": "Nakfa" }, { "code": "ETB", "name": "Ethiopian Birr" }, { "code": "EUR", "name": "Euro" }, { "code": "FJD", "name": "Fiji Dollar" }, { "code": "FKP", "name": "Falkland Islands Pound" }, { "code": "GBP", "name": "Pound Sterling" }, { "code": "GEL", "name": "Lari" }, { "code": "GHS", "name": "Ghana Cedi" }, { "code": "GIP", "name": "Gibraltar Pound" }, { "code": "GMD", "name": "Dalasi" }, { "code": "GNF", "name": "Guinea Franc" }, { "code": "GTQ", "name": "Quetzal" }, { "code": "GYD", "name": "Guyana Dollar" }, { "code": "HKD", "name": "Hong Kong Dollar" }, { "code": "HNL", "name": "Lempira" }, { "code": "HRK", "name": "Croatian Kuna" }, { "code": "HTG", "name": "Gourde" }, { "code": "HUF", "name": "Forint" }, { "code": "IDR", "name": "Rupiah" }, { "code": "ILS", "name": "New Israeli Sheqel" }, { "code": "INR", "name": "Indian Rupee" }, { "code": "IQD", "name": "Iraqi Dinar" }, { "code": "ISK", "name": "Iceland Krona" }, { "code": "JMD", "name": "Jamaican Dollar" }, { "code": "JOD", "name": "Jordanian Dinar" }, { "code": "JPY", "name": "Yen" }, { "code": "KES", "name": "Kenyan Shilling" }, { "code": "KGS", "name": "Som" }, { "code": "KHR", "name": "Riel" }, { "code": "KMF", "name": "Comoro Franc" }, { "code": "KRW", "name": "Won" }, { "code": "KWD", "name": "Kuwaiti Dinar" }, { "code": "KYD", "name": "Cayman Islands Dollar" }, { "code": "KZT", "name": "Tenge" }, { "code": "LAK", "name": "Kip" }, { "code": "LBP", "name": "Lebanese Pound" }, { "code": "LKR", "name": "Sri Lanka Rupee" }, { "code": "LRD", "name": "Liberian Dollar" }, { "code": "LTL", "name": "Lithuanian Litas" }, { "code": "LVL", "name": "Latvian lats" }, { "code": "MAD", "name": "Moroccan Dirham" }, { "code": "MDL", "name": "Moldovan Leu" }, { "code": "MGA", "name": "Malagasy Ariary" }, { "code": "MKD", "name": "Denar" }, { "code": "MMK", "name": "Kyat" }, { "code": "MNT", "name": "Tugrik" }, { "code": "MOP", "name": "Pataca" }, { "code": "MRO", "name": "Ouguiya" }, { "code": "MUR", "name": "Mauritius Rupee" }, { "code": "MVR", "name": "Rufiyaa" }, { "code": "MWK", "name": "Kwacha" }, { "code": "MXN", "name": "Mexican Peso" }, { "code": "MYR", "name": "Malaysian Ringgit" }, { "code": "MZN", "name": "Mozambique Metical" }, { "code": "NGN", "name": "Naira" }, { "code": "NIO", "name": "Cordoba Oro" }, { "code": "NOK", "name": "Norwegian Krone" }, { "code": "NPR", "name": "Nepalese Rupee" }, { "code": "NZD", "name": "New Zealand Dollar" }, { "code": "OMR", "name": "Rial Omani" }, { "code": "PEN", "name": "Nuevo Sol" }, { "code": "PGK", "name": "Kina" }, { "code": "PHP", "name": "Philippine Peso" }, { "code": "PKR", "name": "Pakistan Rupee" }, { "code": "PLN", "name": "Zloty" }, { "code": "PYG", "name": "Guarani" }, { "code": "QAR", "name": "Qatari Rial" }, { "code": "RON", "name": "New Romanian Leu" }, { "code": "RSD", "name": "Serbian Dinar" }, { "code": "RUB", "name": "Russian Ruble" }, { "code": "RWF", "name": "Rwanda Franc" }, { "code": "SAR", "name": "Saudi Riyal" }, { "code": "SBD", "name": "Solomon Islands Dollar" }, { "code": "SCR", "name": "Seychelles Rupee" }, { "code": "SEK", "name": "Swedish Krona" }, { "code": "SGD", "name": "Singapore Dollar" }, { "code": "SHP", "name": "Saint Helena Pound" }, { "code": "SLL", "name": "Leone" }, { "code": "SOS", "name": "Somali Shilling" }, { "code": "SRD", "name": "Surinam Dollar" }, { "code": "STD", "name": "Dobra" }, { "code": "SZL", "name": "Lilangeni" }, { "code": "THB", "name": "Baht" }, { "code": "TJS", "name": "Somoni" }, { "code": "TMT", "name": "Turkmenistan New Manat" }, { "code": "TND", "name": "Tunisian Dinar" }, { "code": "TOP", "name": "Pa?anga" }, { "code": "TRY", "name": "Turkish Lira" }, { "code": "TTD", "name": "Trinidad and Tobago Dollar" }, { "code": "TWD", "name": "New Taiwan Dollar" }, { "code": "TZS", "name": "Tanzanian Shilling" }, { "code": "UAH", "name": "Hryvnia" }, { "code": "UGX", "name": "Uganda Shilling" }, { "code": "USD", "name": "US Dollar" }, { "code": "UYU", "name": "Peso Uruguayo" }, { "code": "UZS", "name": "Uzbekistan Sum" }, { "code": "VEF", "name": "Bolivar" }, { "code": "VND", "name": "Dong" }, { "code": "VUV", "name": "Vatu" }, { "code": "WST", "name": "Tala" }, { "code": "XAF", "name": "CFA Franc BEAC" }, { "code": "XCD", "name": "East Caribbean Dollar" }, { "code": "XOF", "name": "CFA Franc BCEAO" }, { "code": "XPF", "name": "CFP Franc" }, { "code": "YER", "name": "Yemeni Rial" }, { "code": "ZAR", "name": "Rand" }, { "code": "ZMW", "name": "Zambian kwacha" }, { "code": "ZWL", "name": "Zimbabwe Dollar" }];

        return currencies;
    }

}
]);


app.service("StorageService", ['appCache', function (appCache) {

    // Return public API.
    return ({
        get: get,
        set: set,
        remove: remove,
    });

    function get(key) {

        var value = appCache.get(key);

        if (value == null) {
            // Look to to localstorage for a backup
            value = localStorage.getItem(key);
        }

        return value;

    }

    function set(key, value) {

        appCache.put(key, value)

        // Backup to localstorage
        localStorage.setItem(key, value);

    }

    function remove(key) {

        appCache.remove(key);

        // Remove the associated localstorage
        localStorage.removeItem(key);

    }

}]);


app.service("LanguageService", ['$q', '$rootScope', 'SettingsService', 'StorageService', 'gettextCatalog', 'ApiService', function ($q, $rootScope, SettingsService, StorageService, gettextCatalog, ApiService) {

    // Angular gettext https://angular-gettext.rocketeer.be/ Used to provide application translations. Translation files are located in the languages folder.

    // Return public API.
    return ({
        getSelectedLanguage: getSelectedLanguage,
        getLanguages: getLanguages,
        setLanguage: setLanguage,
        establishLanguage: establishLanguage
    });

    function getLanguages() {

        // The supported languages are defined in rootScope. This allows the setting to be changed by apps that use kit don't want to modify kit's source.
        if ($rootScope.languages) {
            return $rootScope.languages;
        } else {
            // Return the default language
            return [{ code: "en", name: "English" }];
        }

    }

    function getSelectedLanguage() {

        var languages = getLanguages();
        var language = StorageService.get("language");

        // Only return if the value is valid.
        var language = _.findWhere(languages, { code: language });
        if (language) {
            return language;
        }

        // Return empty.
        return { name: null, code: null };

    }

    function isSupportedLanguage(language) {

        var languages = getLanguages();
        return !(_.findWhere(languages, { code: language }) == null);

    }

    function setLanguage(language) {

        // Only attempt to set the language if the supplied value is valid.
        if (isSupportedLanguage(language) == false) {
            return;
        }

        if (language != null) {
            StorageService.set("language", language);
            gettextCatalog.setCurrentLanguage(language);

            // Emit the change
            $rootScope.$emit("languageChanged", language);

            // English does not need to be loaded since it's embedded in the HTML.
            if (language != "en") {
                // Load the language configuration file.
                gettextCatalog.loadRemote("languages/" + language + "/" + language + ".json");
            }
        }

    }

    function getUserLanguage() {

        var deferred = $q.defer();

        // Check if languages are provided. If not, just return english and don't bother fetching the user's language from the server.
        if (!$rootScope.languages) {
            deferred.resolve("en")
            return deferred.promise;
        }

        // If a language is already set and it's valid, just return that language.
        var language = getSelectedLanguage();

        if (language.code) {

            // We already have a language set, return it.
            deferred.resolve(language.code);

        } else {

            // Determine the user's language from the server, which is the most reliable way to get browser language settings into JavaScript.
            var settings = SettingsService.get();
            ApiService.getItem("/browser_info", null, true).then(function (response) {

                // The value returned in language will either be a valid two-character language code or null.
                deferred.resolve(response.data.language);

            }, function (error) {
                // We always resolve the promise, just with null in the case of error.
                deferred.resolve(null);
            });

        }

        return deferred.promise;

    }

    function establishLanguage() {

        // This called when the app is intially bootstrapped and sets the language according to the user's preference, auto-detected language or default language.
        getUserLanguage().then(function (language) {

            // If null, set the default
            if (language == null) {
                language = "en";
            }

            // Set the language
            setLanguage(language);

        });

    }

}]);
angular.module('gettext', []);

angular.module('gettext').constant('gettext', function (str) {
    /*
     * Does nothing, simply returns the input string.
     *
     * This function serves as a marker for `grunt-angular-gettext` to know that
     * this string should be extracted for translations.
     */
    return str;
});

angular.module('gettext').factory('gettextCatalog', ["gettextPlurals", "$http", "$cacheFactory", "$interpolate", "$rootScope", function (gettextPlurals, $http, $cacheFactory, $interpolate, $rootScope) {
    var catalog;
    var noContext = '$$noContext';

    // IE8 returns UPPER CASE tags, even though the source is lower case.
    // This can causes the (key) string in the DOM to have a different case to
    // the string in the `po` files.
    // IE9, IE10 and IE11 reorders the attributes of tags.
    var test = '<span id="test" title="test" class="tested">test</span>';
    var isHTMLModified = (angular.element('<span>' + test + '</span>').html() !== test);

    var prefixDebug = function (string) {
        if (catalog.debug && catalog.currentLanguage !== catalog.baseLanguage) {
            return catalog.debugPrefix + string;
        } else {
            return string;
        }
    };

    var addTranslatedMarkers = function (string) {
        if (catalog.showTranslatedMarkers) {
            return catalog.translatedMarkerPrefix + string + catalog.translatedMarkerSuffix;
        } else {
            return string;
        }
    };

    function broadcastUpdated() {
        $rootScope.$broadcast('gettextLanguageChanged');
    }

    catalog = {
        debug: false,
        debugPrefix: '[MISSING]: ',
        showTranslatedMarkers: false,
        translatedMarkerPrefix: '[',
        translatedMarkerSuffix: ']',
        strings: {},
        baseLanguage: 'en',
        currentLanguage: 'en',
        cache: $cacheFactory('strings'),

        setCurrentLanguage: function (lang) {
            this.currentLanguage = lang;
            broadcastUpdated();
        },

        getCurrentLanguage: function () {
            return this.currentLanguage;
        },

        setStrings: function (language, strings) {
            if (!this.strings[language]) {
                this.strings[language] = {};
            }

            for (var key in strings) {
                var val = strings[key];

                if (isHTMLModified) {
                    // Use the DOM engine to render any HTML in the key (#131).
                    key = angular.element('<span>' + key + '</span>').html();
                }

                if (angular.isString(val) || angular.isArray(val)) {
                    // No context, wrap it in $$noContext.
                    var obj = {};
                    obj[noContext] = val;
                    val = obj;
                }

                // Expand single strings for each context.
                for (var context in val) {
                    var str = val[context];
                    val[context] = angular.isArray(str) ? str : [str];
                }
                this.strings[language][key] = val;
            }

            broadcastUpdated();
        },

        getStringForm: function (string, n, context) {
            var stringTable = this.strings[this.currentLanguage] || {};
            var contexts = stringTable[string] || {};
            var plurals = contexts[context || noContext] || [];
            return plurals[n];
        },

        getString: function (string, scope, context) {
            string = this.getStringForm(string, 0, context) || prefixDebug(string);
            string = scope ? $interpolate(string)(scope) : string;
            return addTranslatedMarkers(string);
        },

        getPlural: function (n, string, stringPlural, scope, context) {
            var form = gettextPlurals(this.currentLanguage, n);
            string = this.getStringForm(string, form, context) || prefixDebug(n === 1 ? string : stringPlural);
            if (scope) {
                scope.$count = n;
                string = $interpolate(string)(scope);
            }
            return addTranslatedMarkers(string);
        },

        loadRemote: function (url) {
            return $http({
                method: 'GET',
                url: url,
                cache: catalog.cache
            }).then(function (response) {
                var data = response.data;
                for (var lang in data) {
                    catalog.setStrings(lang, data[lang]);
                }
                return response;
            });
        }
    };

    return catalog;
}]);

angular.module('gettext').directive('translate', ["gettextCatalog", "$parse", "$animate", "$compile", "$window", function (gettextCatalog, $parse, $animate, $compile, $window) {
    // Trim polyfill for old browsers (instead of jQuery)
    // Based on AngularJS-v1.2.2 (angular.js#620)
    var trim = (function () {
        if (!String.prototype.trim) {
            return function (value) {
                return (typeof value === 'string') ? value.replace(/^\s*/, '').replace(/\s*$/, '') : value;
            };
        }
        return function (value) {
            return (typeof value === 'string') ? value.trim() : value;
        };
    })();

    function assert(condition, missing, found) {
        if (!condition) {
            throw new Error('You should add a ' + missing + ' attribute whenever you add a ' + found + ' attribute.');
        }
    }

    var msie = parseInt((/msie (\d+)/.exec(angular.lowercase($window.navigator.userAgent)) || [])[1], 10);

    return {
        restrict: 'AE',
        terminal: true,
        compile: function compile(element, attrs) {
            // Validate attributes
            assert(!attrs.translatePlural || attrs.translateN, 'translate-n', 'translate-plural');
            assert(!attrs.translateN || attrs.translatePlural, 'translate-plural', 'translate-n');

            var msgid = trim(element.html());
            var translatePlural = attrs.translatePlural;
            var translateContext = attrs.translateContext;

            if (msie <= 8) {
                // Workaround fix relating to angular adding a comment node to
                // anchors. angular/angular.js/#1949 / angular/angular.js/#2013
                if (msgid.slice(-13) === '<!--IE fix-->') {
                    msgid = msgid.slice(0, -13);
                }
            }

            return {
                post: function (scope, element, attrs) {
                    var countFn = $parse(attrs.translateN);
                    var pluralScope = null;
                    var linking = true;

                    function update() {
                        // Fetch correct translated string.
                        var translated;
                        if (translatePlural) {
                            scope = pluralScope || (pluralScope = scope.$new());
                            scope.$count = countFn(scope);
                            translated = gettextCatalog.getPlural(scope.$count, msgid, translatePlural, null, translateContext);
                        } else {
                            translated = gettextCatalog.getString(msgid,  null, translateContext);
                        }

                        var oldContents = element.contents();

                        if (oldContents.length === 0){
                            return;
                        }

                        // Avoid redundant swaps
                        if (translated === trim(oldContents.html())){
                            // Take care of unlinked content
                            if (linking){
                                $compile(oldContents)(scope);
                            }
                            return;
                        }

                        // Swap in the translation
                        var newWrapper = angular.element('<span>' + translated + '</span>');
                        $compile(newWrapper.contents())(scope);
                        var newContents = newWrapper.contents();

                        $animate.enter(newContents, element);
                        $animate.leave(oldContents);
                    }

                    if (attrs.translateN) {
                        scope.$watch(attrs.translateN, update);
                    }

                    scope.$on('gettextLanguageChanged', update);

                    update();
                    linking = false;
                }
            };
        }
    };
}]);

angular.module('gettext').filter('translate', ["gettextCatalog", function (gettextCatalog) {
    function filter(input, context) {
        return gettextCatalog.getString(input, null, context);
    }
    filter.$stateful = true;
    return filter;
}]);

// Do not edit this file, it is autogenerated using genplurals.py!
angular.module("gettext").factory("gettextPlurals", function () {
    return function (langCode, n) {
        switch (langCode) {
            case "ay":  // Aymará
            case "bo":  // Tibetan
            case "cgg": // Chiga
            case "dz":  // Dzongkha
            case "fa":  // Persian
            case "id":  // Indonesian
            case "ja":  // Japanese
            case "jbo": // Lojban
            case "ka":  // Georgian
            case "kk":  // Kazakh
            case "km":  // Khmer
            case "ko":  // Korean
            case "ky":  // Kyrgyz
            case "lo":  // Lao
            case "ms":  // Malay
            case "my":  // Burmese
            case "sah": // Yakut
            case "su":  // Sundanese
            case "th":  // Thai
            case "tt":  // Tatar
            case "ug":  // Uyghur
            case "vi":  // Vietnamese
            case "wo":  // Wolof
            case "zh":  // Chinese
                // 1 form
                return 0;
            case "is":  // Icelandic
                // 2 forms
                return (n%10!=1 || n%100==11) ? 1 : 0;
            case "jv":  // Javanese
                // 2 forms
                return n!=0 ? 1 : 0;
            case "mk":  // Macedonian
                // 2 forms
                return n==1 || n%10==1 ? 0 : 1;
            case "ach": // Acholi
            case "ak":  // Akan
            case "am":  // Amharic
            case "arn": // Mapudungun
            case "br":  // Breton
            case "fil": // Filipino
            case "fr":  // French
            case "gun": // Gun
            case "ln":  // Lingala
            case "mfe": // Mauritian Creole
            case "mg":  // Malagasy
            case "mi":  // Maori
            case "oc":  // Occitan
            case "pt_BR":  // Brazilian Portuguese
            case "tg":  // Tajik
            case "ti":  // Tigrinya
            case "tr":  // Turkish
            case "uz":  // Uzbek
            case "wa":  // Walloon
            case "zh":  // Chinese
                // 2 forms
                return n>1 ? 1 : 0;
            case "lv":  // Latvian
                // 3 forms
                return (n%10==1 && n%100!=11 ? 0 : n != 0 ? 1 : 2);
            case "lt":  // Lithuanian
                // 3 forms
                return (n%10==1 && n%100!=11 ? 0 : n%10>=2 && (n%100<10 || n%100>=20) ? 1 : 2);
            case "be":  // Belarusian
            case "bs":  // Bosnian
            case "hr":  // Croatian
            case "ru":  // Russian
            case "sr":  // Serbian
            case "uk":  // Ukrainian
                // 3 forms
                return (n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);
            case "mnk": // Mandinka
                // 3 forms
                return (n==0 ? 0 : n==1 ? 1 : 2);
            case "ro":  // Romanian
                // 3 forms
                return (n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2);
            case "pl":  // Polish
                // 3 forms
                return (n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);
            case "cs":  // Czech
            case "sk":  // Slovak
                // 3 forms
                return (n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2;
            case "sl":  // Slovenian
                // 4 forms
                return (n%100==1 ? 1 : n%100==2 ? 2 : n%100==3 || n%100==4 ? 3 : 0);
            case "mt":  // Maltese
                // 4 forms
                return (n==1 ? 0 : n==0 || ( n%100>1 && n%100<11) ? 1 : (n%100>10 && n%100<20 ) ? 2 : 3);
            case "gd":  // Scottish Gaelic
                // 4 forms
                return (n==1 || n==11) ? 0 : (n==2 || n==12) ? 1 : (n > 2 && n < 20) ? 2 : 3;
            case "cy":  // Welsh
                // 4 forms
                return (n==1) ? 0 : (n==2) ? 1 : (n != 8 && n != 11) ? 2 : 3;
            case "kw":  // Cornish
                // 4 forms
                return (n==1) ? 0 : (n==2) ? 1 : (n == 3) ? 2 : 3;
            case "ga":  // Irish
                // 5 forms
                return n==1 ? 0 : n==2 ? 1 : n<7 ? 2 : n<11 ? 3 : 4;
            case "ar":  // Arabic
                // 6 forms
                return (n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5);
            default: // Everything else
                return n != 1 ? 1 : 0;
        }
    }
});

angular.module("colorpicker.module",[]).factory("Helper",function(){"use strict";return{closestSlider:function(e){var o=e.matches||e.webkitMatchesSelector||e.mozMatchesSelector||e.msMatchesSelector;return o.bind(e)("I")?e.parentNode:e},getOffset:function(e,o){for(var t=0,r=0,n=0,i=0;e&&!isNaN(e.offsetLeft)&&!isNaN(e.offsetTop);)t+=e.offsetLeft,r+=e.offsetTop,o||"BODY"!==e.tagName?(n+=e.scrollLeft,i+=e.scrollTop):(n+=document.documentElement.scrollLeft||e.scrollLeft,i+=document.documentElement.scrollTop||e.scrollTop),e=e.offsetParent;return{top:r,left:t,scrollX:n,scrollY:i}},stringParsers:[{re:/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,parse:function(e){return[e[1],e[2],e[3],e[4]]}},{re:/rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,parse:function(e){return[2.55*e[1],2.55*e[2],2.55*e[3],e[4]]}},{re:/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,parse:function(e){return[parseInt(e[1],16),parseInt(e[2],16),parseInt(e[3],16)]}},{re:/#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/,parse:function(e){return[parseInt(e[1]+e[1],16),parseInt(e[2]+e[2],16),parseInt(e[3]+e[3],16)]}}]}}).factory("Color",["Helper",function(e){"use strict";return{value:{h:1,s:1,b:1,a:1},rgb:function(){var e=this.toRGB();return"rgb("+e.r+","+e.g+","+e.b+")"},rgba:function(){var e=this.toRGB();return"rgba("+e.r+","+e.g+","+e.b+","+e.a+")"},hex:function(){return this.toHex()},RGBtoHSB:function(e,o,t,r){e/=255,o/=255,t/=255;var n,i,l,c;return l=Math.max(e,o,t),c=l-Math.min(e,o,t),n=0===c?null:l===e?(o-t)/c:l===o?(t-e)/c+2:(e-o)/c+4,n=(n+360)%6*60/360,i=0===c?0:c/l,{h:n||1,s:i,b:l,a:r||1}},setColor:function(o){o=o.toLowerCase();for(var t in e.stringParsers)if(e.stringParsers.hasOwnProperty(t)){var r=e.stringParsers[t],n=r.re.exec(o),i=n&&r.parse(n);if(i)return this.value=this.RGBtoHSB.apply(null,i),!1}},setHue:function(e){this.value.h=1-e},setSaturation:function(e){this.value.s=e},setLightness:function(e){this.value.b=1-e},setAlpha:function(e){this.value.a=parseInt(100*(1-e),10)/100},toRGB:function(e,o,t,r){e||(e=this.value.h,o=this.value.s,t=this.value.b),e*=360;var n,i,l,c,s;return e=e%360/60,s=t*o,c=s*(1-Math.abs(e%2-1)),n=i=l=t-s,e=~~e,n+=[s,c,0,0,c,s][e],i+=[c,s,s,c,0,0][e],l+=[0,0,c,s,s,c][e],{r:Math.round(255*n),g:Math.round(255*i),b:Math.round(255*l),a:r||this.value.a}},toHex:function(e,o,t,r){var n=this.toRGB(e,o,t,r);return"#"+(1<<24|parseInt(n.r,10)<<16|parseInt(n.g,10)<<8|parseInt(n.b,10)).toString(16).substr(1)}}}]).factory("Slider",["Helper",function(e){"use strict";var o={maxLeft:0,maxTop:0,callLeft:null,callTop:null,knob:{top:0,left:0}},t={};return{getSlider:function(){return o},getLeftPosition:function(e){return Math.max(0,Math.min(o.maxLeft,o.left+((e.pageX||t.left)-t.left)))},getTopPosition:function(e){return Math.max(0,Math.min(o.maxTop,o.top+((e.pageY||t.top)-t.top)))},setSlider:function(r,n){var i=e.closestSlider(r.target),l=e.getOffset(i,n),c=i.getBoundingClientRect(),s=r.clientX-c.left,a=r.clientY-c.top;o.knob=i.children[0].style,o.left=r.pageX-l.left-window.pageXOffset+l.scrollX,o.top=r.pageY-l.top-window.pageYOffset+l.scrollY,t={left:r.pageX-(s-o.left),top:r.pageY-(a-o.top)}},setSaturation:function(e,t){o={maxLeft:100,maxTop:100,callLeft:"setSaturation",callTop:"setLightness"},this.setSlider(e,t)},setHue:function(e,t){o={maxLeft:0,maxTop:100,callLeft:!1,callTop:"setHue"},this.setSlider(e,t)},setAlpha:function(e,t){o={maxLeft:0,maxTop:100,callLeft:!1,callTop:"setAlpha"},this.setSlider(e,t)},setKnob:function(e,t){o.knob.top=e+"px",o.knob.left=t+"px"}}}]).directive("colorpicker",["$document","$compile","Color","Slider","Helper",function(e,o,t,r,n){"use strict";return{require:"?ngModel",restrict:"A",link:function(i,l,c,s){var a,u=c.colorpicker?c.colorpicker:"hex",p=angular.isDefined(c.colorpickerPosition)?c.colorpickerPosition:"bottom",f=angular.isDefined(c.colorpickerInline)?c.colorpickerInline:!1,d=angular.isDefined(c.colorpickerFixedPosition)?c.colorpickerFixedPosition:!1,h=angular.isDefined(c.colorpickerParent)?l.parent():angular.element(document.body),k=angular.isDefined(c.colorpickerWithInput)?c.colorpickerWithInput:!1,g=k?'<input type="text" name="colorpicker-input">':"",v=f?"":'<button type="button" class="close close-colorpicker">&times;</button>',m='<div class="colorpicker dropdown"><div class="dropdown-menu"><colorpicker-saturation><i></i></colorpicker-saturation><colorpicker-hue><i></i></colorpicker-hue><colorpicker-alpha><i></i></colorpicker-alpha><colorpicker-preview></colorpicker-preview>'+g+v+"</div></div>",b=angular.element(m),x=t,w=b.find("colorpicker-hue"),S=b.find("colorpicker-saturation"),I=b.find("colorpicker-preview"),L=b.find("i");if(o(b)(i),k){var C=b.find("input");C.on("mousedown",function(e){e.stopPropagation()}).on("keyup",function(e){var o=this.value;l.val(o),s&&i.$apply(s.$setViewValue(o)),e.stopPropagation(),e.preventDefault()}),l.on("keyup",function(){C.val(l.val())})}var P=function(){e.on("mousemove",T),e.on("mouseup",H)};"rgba"===u&&(b.addClass("alpha"),a=b.find("colorpicker-alpha"),a.on("click",function(e){r.setAlpha(e,d),T(e)}).on("mousedown",function(e){r.setAlpha(e,d),P()}).on("mouseup",function(e){B("colorpicker-selected-alpha")})),w.on("click",function(e){r.setHue(e,d),T(e)}).on("mousedown",function(e){r.setHue(e,d),P()}).on("mouseup",function(e){B("colorpicker-selected-hue")}),S.on("click",function(e){r.setSaturation(e,d),T(e),angular.isDefined(c.colorpickerCloseOnSelect)&&D()}).on("mousedown",function(e){r.setSaturation(e,d),P()}).on("mouseup",function(e){B("colorpicker-selected-saturation")}),d&&b.addClass("colorpicker-fixed-position"),b.addClass("colorpicker-position-"+p),"true"===f&&b.addClass("colorpicker-inline"),h.append(b),s&&(s.$render=function(){l.val(s.$viewValue)},i.$watch(c.ngModel,function(e){M(),k&&C.val(e)})),l.on("$destroy",function(){b.remove()});var $=function(){try{I.css("backgroundColor",x[u]())}catch(e){I.css("backgroundColor",x.toHex())}S.css("backgroundColor",x.toHex(x.value.h,1,1,1)),"rgba"===u&&(a.css.backgroundColor=x.toHex())},T=function(e){var o=r.getLeftPosition(e),t=r.getTopPosition(e),n=r.getSlider();r.setKnob(t,o),n.callLeft&&x[n.callLeft].call(x,o/100),n.callTop&&x[n.callTop].call(x,t/100),$();var c=x[u]();return l.val(c),s&&i.$apply(s.$setViewValue(c)),k&&C.val(c),!1},H=function(){B("colorpicker-selected"),e.off("mousemove",T),e.off("mouseup",H)},M=function(){x.setColor(l.val()),L.eq(0).css({left:100*x.value.s+"px",top:100-100*x.value.b+"px"}),L.eq(1).css("top",100*(1-x.value.h)+"px"),L.eq(2).css("top",100*(1-x.value.a)+"px"),$()},y=function(){var e,o=n.getOffset(l[0]);return angular.isDefined(c.colorpickerParent)&&(o.left=0,o.top=0),"top"===p?e={top:o.top-147,left:o.left}:"right"===p?e={top:o.top,left:o.left+126}:"bottom"===p?e={top:o.top+l[0].offsetHeight+2,left:o.left}:"left"===p&&(e={top:o.top,left:o.left-150}),{top:e.top+"px",left:e.left+"px"}},O=function(){D()},A=function(){b.hasClass("colorpicker-visible")||(M(),b.addClass("colorpicker-visible").css(y()),B("colorpicker-shown"),f===!1&&e.on("mousedown",O),c.colorpickerIsOpen&&(i[c.colorpickerIsOpen]=!0,i.$$phase||i.$digest()))};f===!1?l.on("click",A):A(),b.on("mousedown",function(e){e.stopPropagation(),e.preventDefault()});var B=function(e){s&&i.$emit(e,{name:c.ngModel,value:s.$modelValue})},D=function(){b.hasClass("colorpicker-visible")&&(b.removeClass("colorpicker-visible"),B("colorpicker-closed"),e.off("mousedown",O),c.colorpickerIsOpen&&(i[c.colorpickerIsOpen]=!1,i.$$phase||i.$digest()))};b.find("button").on("click",function(){D()}),c.colorpickerIsOpen&&i.$watch(c.colorpickerIsOpen,function(e){e===!0?A():e===!1&&D()})}}}]);
/*!
 * Chart.js
 * http://chartjs.org/
 * Version: {{ version }}
 *
 * Copyright 2015 Nick Downie
 * Released under the MIT license
 * https://github.com/nnnick/Chart.js/blob/master/LICENSE.md
 */


(function(){

	"use strict";

	//Declare root variable - window in the browser, global on the server
	var root = this,
		previous = root.Chart;

	//Occupy the global variable of Chart, and create a simple base class
	var Chart = function(context){
		var chart = this;
		this.canvas = context.canvas;

		this.ctx = context;

		//Variables global to the chart
		var width = this.width = context.canvas.width;
		var height = this.height = context.canvas.height;
		this.aspectRatio = this.width / this.height;
		//High pixel density displays - multiply the size of the canvas height/width by the device pixel ratio, then scale.
		helpers.retinaScale(this);

		return this;
	};
	//Globally expose the defaults to allow for user updating/changing
	Chart.defaults = {
		global: {
			// Boolean - Whether to animate the chart
			animation: true,

			// Number - Number of animation steps
			animationSteps: 60,

			// String - Animation easing effect
			animationEasing: "easeOutQuart",

			// Boolean - If we should show the scale at all
			showScale: true,

			// Boolean - If we want to override with a hard coded scale
			scaleOverride: false,

			// ** Required if scaleOverride is true **
			// Number - The number of steps in a hard coded scale
			scaleSteps: null,
			// Number - The value jump in the hard coded scale
			scaleStepWidth: null,
			// Number - The scale starting value
			scaleStartValue: null,

			// String - Colour of the scale line
			scaleLineColor: "rgba(0,0,0,.1)",

			// Number - Pixel width of the scale line
			scaleLineWidth: 1,

			// Boolean - Whether to show labels on the scale
			scaleShowLabels: true,

			// Interpolated JS string - can access value
			scaleLabel: "<%=value%>",

			// Boolean - Whether the scale should stick to integers, and not show any floats even if drawing space is there
			scaleIntegersOnly: true,

			// Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
			scaleBeginAtZero: false,

			// String - Scale label font declaration for the scale label
			scaleFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",

			// Number - Scale label font size in pixels
			scaleFontSize: 12,

			// String - Scale label font weight style
			scaleFontStyle: "normal",

			// String - Scale label font colour
			scaleFontColor: "#666",

			// Boolean - whether or not the chart should be responsive and resize when the browser does.
			responsive: false,

			// Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
			maintainAspectRatio: true,

			// Boolean - Determines whether to draw tooltips on the canvas or not - attaches events to touchmove & mousemove
			showTooltips: true,

			// Boolean - Determines whether to draw built-in tooltip or call custom tooltip function
			customTooltips: false,

			// Array - Array of string names to attach tooltip events
			tooltipEvents: ["mousemove", "touchstart", "touchmove", "mouseout"],

			// String - Tooltip background colour
			tooltipFillColor: "rgba(0,0,0,0.8)",

			// String - Tooltip label font declaration for the scale label
			tooltipFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",

			// Number - Tooltip label font size in pixels
			tooltipFontSize: 14,

			// String - Tooltip font weight style
			tooltipFontStyle: "normal",

			// String - Tooltip label font colour
			tooltipFontColor: "#fff",

			// String - Tooltip title font declaration for the scale label
			tooltipTitleFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",

			// Number - Tooltip title font size in pixels
			tooltipTitleFontSize: 14,

			// String - Tooltip title font weight style
			tooltipTitleFontStyle: "bold",

			// String - Tooltip title font colour
			tooltipTitleFontColor: "#fff",

			// Number - pixel width of padding around tooltip text
			tooltipYPadding: 6,

			// Number - pixel width of padding around tooltip text
			tooltipXPadding: 6,

			// Number - Size of the caret on the tooltip
			tooltipCaretSize: 8,

			// Number - Pixel radius of the tooltip border
			tooltipCornerRadius: 6,

			// Number - Pixel offset from point x to tooltip edge
			tooltipXOffset: 10,

			// String - Template string for single tooltips
			tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%= value %>",

			// String - Template string for single tooltips
			multiTooltipTemplate: "<%= value %>",

			// String - Colour behind the legend colour block
			multiTooltipKeyBackground: '#fff',

			// Function - Will fire on animation progression.
			onAnimationProgress: function(){},

			// Function - Will fire on animation completion.
			onAnimationComplete: function(){}

		}
	};

	//Create a dictionary of chart types, to allow for extension of existing types
	Chart.types = {};

	//Global Chart helpers object for utility methods and classes
	var helpers = Chart.helpers = {};

		//-- Basic js utility methods
	var each = helpers.each = function(loopable,callback,self){
			var additionalArgs = Array.prototype.slice.call(arguments, 3);
			// Check to see if null or undefined firstly.
			if (loopable){
				if (loopable.length === +loopable.length){
					var i;
					for (i=0; i<loopable.length; i++){
						callback.apply(self,[loopable[i], i].concat(additionalArgs));
					}
				}
				else{
					for (var item in loopable){
						callback.apply(self,[loopable[item],item].concat(additionalArgs));
					}
				}
			}
		},
		clone = helpers.clone = function(obj){
			var objClone = {};
			each(obj,function(value,key){
				if (obj.hasOwnProperty(key)) objClone[key] = value;
			});
			return objClone;
		},
		extend = helpers.extend = function(base){
			each(Array.prototype.slice.call(arguments,1), function(extensionObject) {
				each(extensionObject,function(value,key){
					if (extensionObject.hasOwnProperty(key)) base[key] = value;
				});
			});
			return base;
		},
		merge = helpers.merge = function(base,master){
			//Merge properties in left object over to a shallow clone of object right.
			var args = Array.prototype.slice.call(arguments,0);
			args.unshift({});
			return extend.apply(null, args);
		},
		indexOf = helpers.indexOf = function(arrayToSearch, item){
			if (Array.prototype.indexOf) {
				return arrayToSearch.indexOf(item);
			}
			else{
				for (var i = 0; i < arrayToSearch.length; i++) {
					if (arrayToSearch[i] === item) return i;
				}
				return -1;
			}
		},
		where = helpers.where = function(collection, filterCallback){
			var filtered = [];

			helpers.each(collection, function(item){
				if (filterCallback(item)){
					filtered.push(item);
				}
			});

			return filtered;
		},
		findNextWhere = helpers.findNextWhere = function(arrayToSearch, filterCallback, startIndex){
			// Default to start of the array
			if (!startIndex){
				startIndex = -1;
			}
			for (var i = startIndex + 1; i < arrayToSearch.length; i++) {
				var currentItem = arrayToSearch[i];
				if (filterCallback(currentItem)){
					return currentItem;
				}
			}
		},
		findPreviousWhere = helpers.findPreviousWhere = function(arrayToSearch, filterCallback, startIndex){
			// Default to end of the array
			if (!startIndex){
				startIndex = arrayToSearch.length;
			}
			for (var i = startIndex - 1; i >= 0; i--) {
				var currentItem = arrayToSearch[i];
				if (filterCallback(currentItem)){
					return currentItem;
				}
			}
		},
		inherits = helpers.inherits = function(extensions){
			//Basic javascript inheritance based on the model created in Backbone.js
			var parent = this;
			var ChartElement = (extensions && extensions.hasOwnProperty("constructor")) ? extensions.constructor : function(){ return parent.apply(this, arguments); };

			var Surrogate = function(){ this.constructor = ChartElement;};
			Surrogate.prototype = parent.prototype;
			ChartElement.prototype = new Surrogate();

			ChartElement.extend = inherits;

			if (extensions) extend(ChartElement.prototype, extensions);

			ChartElement.__super__ = parent.prototype;

			return ChartElement;
		},
		noop = helpers.noop = function(){},
		uid = helpers.uid = (function(){
			var id=0;
			return function(){
				return "chart-" + id++;
			};
		})(),
		warn = helpers.warn = function(str){
			//Method for warning of errors
			if (window.console && typeof window.console.warn == "function") console.warn(str);
		},
		amd = helpers.amd = (typeof define == 'function' && define.amd),
		//-- Math methods
		isNumber = helpers.isNumber = function(n){
			return !isNaN(parseFloat(n)) && isFinite(n);
		},
		max = helpers.max = function(array){
			return Math.max.apply( Math, array );
		},
		min = helpers.min = function(array){
			return Math.min.apply( Math, array );
		},
		cap = helpers.cap = function(valueToCap,maxValue,minValue){
			if(isNumber(maxValue)) {
				if( valueToCap > maxValue ) {
					return maxValue;
				}
			}
			else if(isNumber(minValue)){
				if ( valueToCap < minValue ){
					return minValue;
				}
			}
			return valueToCap;
		},
		getDecimalPlaces = helpers.getDecimalPlaces = function(num){
			if (num%1!==0 && isNumber(num)){
				return num.toString().split(".")[1].length;
			}
			else {
				return 0;
			}
		},
		toRadians = helpers.radians = function(degrees){
			return degrees * (Math.PI/180);
		},
		// Gets the angle from vertical upright to the point about a centre.
		getAngleFromPoint = helpers.getAngleFromPoint = function(centrePoint, anglePoint){
			var distanceFromXCenter = anglePoint.x - centrePoint.x,
				distanceFromYCenter = anglePoint.y - centrePoint.y,
				radialDistanceFromCenter = Math.sqrt( distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter);


			var angle = Math.PI * 2 + Math.atan2(distanceFromYCenter, distanceFromXCenter);

			//If the segment is in the top left quadrant, we need to add another rotation to the angle
			if (distanceFromXCenter < 0 && distanceFromYCenter < 0){
				angle += Math.PI*2;
			}

			return {
				angle: angle,
				distance: radialDistanceFromCenter
			};
		},
		aliasPixel = helpers.aliasPixel = function(pixelWidth){
			return (pixelWidth % 2 === 0) ? 0 : 0.5;
		},
		splineCurve = helpers.splineCurve = function(FirstPoint,MiddlePoint,AfterPoint,t){
			//Props to Rob Spencer at scaled innovation for his post on splining between points
			//http://scaledinnovation.com/analytics/splines/aboutSplines.html
			var d01=Math.sqrt(Math.pow(MiddlePoint.x-FirstPoint.x,2)+Math.pow(MiddlePoint.y-FirstPoint.y,2)),
				d12=Math.sqrt(Math.pow(AfterPoint.x-MiddlePoint.x,2)+Math.pow(AfterPoint.y-MiddlePoint.y,2)),
				fa=t*d01/(d01+d12),// scaling factor for triangle Ta
				fb=t*d12/(d01+d12);
			return {
				inner : {
					x : MiddlePoint.x-fa*(AfterPoint.x-FirstPoint.x),
					y : MiddlePoint.y-fa*(AfterPoint.y-FirstPoint.y)
				},
				outer : {
					x: MiddlePoint.x+fb*(AfterPoint.x-FirstPoint.x),
					y : MiddlePoint.y+fb*(AfterPoint.y-FirstPoint.y)
				}
			};
		},
		calculateOrderOfMagnitude = helpers.calculateOrderOfMagnitude = function(val){
			return Math.floor(Math.log(val) / Math.LN10);
		},
		calculateScaleRange = helpers.calculateScaleRange = function(valuesArray, drawingSize, textSize, startFromZero, integersOnly){

			//Set a minimum step of two - a point at the top of the graph, and a point at the base
			var minSteps = 2,
				maxSteps = Math.floor(drawingSize/(textSize * 1.5)),
				skipFitting = (minSteps >= maxSteps);

			var maxValue = max(valuesArray),
				minValue = min(valuesArray);

			// We need some degree of seperation here to calculate the scales if all the values are the same
			// Adding/minusing 0.5 will give us a range of 1.
			if (maxValue === minValue){
				maxValue += 0.5;
				// So we don't end up with a graph with a negative start value if we've said always start from zero
				if (minValue >= 0.5 && !startFromZero){
					minValue -= 0.5;
				}
				else{
					// Make up a whole number above the values
					maxValue += 0.5;
				}
			}

			var	valueRange = Math.abs(maxValue - minValue),
				rangeOrderOfMagnitude = calculateOrderOfMagnitude(valueRange),
				graphMax = Math.ceil(maxValue / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude),
				graphMin = (startFromZero) ? 0 : Math.floor(minValue / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude),
				graphRange = graphMax - graphMin,
				stepValue = Math.pow(10, rangeOrderOfMagnitude),
				numberOfSteps = Math.round(graphRange / stepValue);

			//If we have more space on the graph we'll use it to give more definition to the data
			while((numberOfSteps > maxSteps || (numberOfSteps * 2) < maxSteps) && !skipFitting) {
				if(numberOfSteps > maxSteps){
					stepValue *=2;
					numberOfSteps = Math.round(graphRange/stepValue);
					// Don't ever deal with a decimal number of steps - cancel fitting and just use the minimum number of steps.
					if (numberOfSteps % 1 !== 0){
						skipFitting = true;
					}
				}
				//We can fit in double the amount of scale points on the scale
				else{
					//If user has declared ints only, and the step value isn't a decimal
					if (integersOnly && rangeOrderOfMagnitude >= 0){
						//If the user has said integers only, we need to check that making the scale more granular wouldn't make it a float
						if(stepValue/2 % 1 === 0){
							stepValue /=2;
							numberOfSteps = Math.round(graphRange/stepValue);
						}
						//If it would make it a float break out of the loop
						else{
							break;
						}
					}
					//If the scale doesn't have to be an int, make the scale more granular anyway.
					else{
						stepValue /=2;
						numberOfSteps = Math.round(graphRange/stepValue);
					}

				}
			}

			if (skipFitting){
				numberOfSteps = minSteps;
				stepValue = graphRange / numberOfSteps;
			}

			return {
				steps : numberOfSteps,
				stepValue : stepValue,
				min : graphMin,
				max	: graphMin + (numberOfSteps * stepValue)
			};

		},
		/* jshint ignore:start */
		// Blows up jshint errors based on the new Function constructor
		//Templating methods
		//Javascript micro templating by John Resig - source at http://ejohn.org/blog/javascript-micro-templating/
		template = helpers.template = function(templateString, valuesObject){

			// If templateString is function rather than string-template - call the function for valuesObject

			if(templateString instanceof Function){
			 	return templateString(valuesObject);
		 	}

			var cache = {};
			function tmpl(str, data){
				// Figure out if we're getting a template, or if we need to
				// load the template - and be sure to cache the result.
				var fn = !/\W/.test(str) ?
				cache[str] = cache[str] :

				// Generate a reusable function that will serve as a template
				// generator (and which will be cached).
				new Function("obj",
					"var p=[],print=function(){p.push.apply(p,arguments);};" +

					// Introduce the data as local variables using with(){}
					"with(obj){p.push('" +

					// Convert the template into pure JavaScript
					str
						.replace(/[\r\t\n]/g, " ")
						.split("<%").join("\t")
						.replace(/((^|%>)[^\t]*)'/g, "$1\r")
						.replace(/\t=(.*?)%>/g, "',$1,'")
						.split("\t").join("');")
						.split("%>").join("p.push('")
						.split("\r").join("\\'") +
					"');}return p.join('');"
				);

				// Provide some basic currying to the user
				return data ? fn( data ) : fn;
			}
			return tmpl(templateString,valuesObject);
		},
		/* jshint ignore:end */
		generateLabels = helpers.generateLabels = function(templateString,numberOfSteps,graphMin,stepValue){
			var labelsArray = new Array(numberOfSteps);
			if (labelTemplateString){
				each(labelsArray,function(val,index){
					labelsArray[index] = template(templateString,{value: (graphMin + (stepValue*(index+1)))});
				});
			}
			return labelsArray;
		},
		//--Animation methods
		//Easing functions adapted from Robert Penner's easing equations
		//http://www.robertpenner.com/easing/
		easingEffects = helpers.easingEffects = {
			linear: function (t) {
				return t;
			},
			easeInQuad: function (t) {
				return t * t;
			},
			easeOutQuad: function (t) {
				return -1 * t * (t - 2);
			},
			easeInOutQuad: function (t) {
				if ((t /= 1 / 2) < 1) return 1 / 2 * t * t;
				return -1 / 2 * ((--t) * (t - 2) - 1);
			},
			easeInCubic: function (t) {
				return t * t * t;
			},
			easeOutCubic: function (t) {
				return 1 * ((t = t / 1 - 1) * t * t + 1);
			},
			easeInOutCubic: function (t) {
				if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t;
				return 1 / 2 * ((t -= 2) * t * t + 2);
			},
			easeInQuart: function (t) {
				return t * t * t * t;
			},
			easeOutQuart: function (t) {
				return -1 * ((t = t / 1 - 1) * t * t * t - 1);
			},
			easeInOutQuart: function (t) {
				if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t * t;
				return -1 / 2 * ((t -= 2) * t * t * t - 2);
			},
			easeInQuint: function (t) {
				return 1 * (t /= 1) * t * t * t * t;
			},
			easeOutQuint: function (t) {
				return 1 * ((t = t / 1 - 1) * t * t * t * t + 1);
			},
			easeInOutQuint: function (t) {
				if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t * t * t;
				return 1 / 2 * ((t -= 2) * t * t * t * t + 2);
			},
			easeInSine: function (t) {
				return -1 * Math.cos(t / 1 * (Math.PI / 2)) + 1;
			},
			easeOutSine: function (t) {
				return 1 * Math.sin(t / 1 * (Math.PI / 2));
			},
			easeInOutSine: function (t) {
				return -1 / 2 * (Math.cos(Math.PI * t / 1) - 1);
			},
			easeInExpo: function (t) {
				return (t === 0) ? 1 : 1 * Math.pow(2, 10 * (t / 1 - 1));
			},
			easeOutExpo: function (t) {
				return (t === 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
			},
			easeInOutExpo: function (t) {
				if (t === 0) return 0;
				if (t === 1) return 1;
				if ((t /= 1 / 2) < 1) return 1 / 2 * Math.pow(2, 10 * (t - 1));
				return 1 / 2 * (-Math.pow(2, -10 * --t) + 2);
			},
			easeInCirc: function (t) {
				if (t >= 1) return t;
				return -1 * (Math.sqrt(1 - (t /= 1) * t) - 1);
			},
			easeOutCirc: function (t) {
				return 1 * Math.sqrt(1 - (t = t / 1 - 1) * t);
			},
			easeInOutCirc: function (t) {
				if ((t /= 1 / 2) < 1) return -1 / 2 * (Math.sqrt(1 - t * t) - 1);
				return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
			},
			easeInElastic: function (t) {
				var s = 1.70158;
				var p = 0;
				var a = 1;
				if (t === 0) return 0;
				if ((t /= 1) == 1) return 1;
				if (!p) p = 1 * 0.3;
				if (a < Math.abs(1)) {
					a = 1;
					s = p / 4;
				} else s = p / (2 * Math.PI) * Math.asin(1 / a);
				return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
			},
			easeOutElastic: function (t) {
				var s = 1.70158;
				var p = 0;
				var a = 1;
				if (t === 0) return 0;
				if ((t /= 1) == 1) return 1;
				if (!p) p = 1 * 0.3;
				if (a < Math.abs(1)) {
					a = 1;
					s = p / 4;
				} else s = p / (2 * Math.PI) * Math.asin(1 / a);
				return a * Math.pow(2, -10 * t) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) + 1;
			},
			easeInOutElastic: function (t) {
				var s = 1.70158;
				var p = 0;
				var a = 1;
				if (t === 0) return 0;
				if ((t /= 1 / 2) == 2) return 1;
				if (!p) p = 1 * (0.3 * 1.5);
				if (a < Math.abs(1)) {
					a = 1;
					s = p / 4;
				} else s = p / (2 * Math.PI) * Math.asin(1 / a);
				if (t < 1) return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
				return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) * 0.5 + 1;
			},
			easeInBack: function (t) {
				var s = 1.70158;
				return 1 * (t /= 1) * t * ((s + 1) * t - s);
			},
			easeOutBack: function (t) {
				var s = 1.70158;
				return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
			},
			easeInOutBack: function (t) {
				var s = 1.70158;
				if ((t /= 1 / 2) < 1) return 1 / 2 * (t * t * (((s *= (1.525)) + 1) * t - s));
				return 1 / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
			},
			easeInBounce: function (t) {
				return 1 - easingEffects.easeOutBounce(1 - t);
			},
			easeOutBounce: function (t) {
				if ((t /= 1) < (1 / 2.75)) {
					return 1 * (7.5625 * t * t);
				} else if (t < (2 / 2.75)) {
					return 1 * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75);
				} else if (t < (2.5 / 2.75)) {
					return 1 * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375);
				} else {
					return 1 * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375);
				}
			},
			easeInOutBounce: function (t) {
				if (t < 1 / 2) return easingEffects.easeInBounce(t * 2) * 0.5;
				return easingEffects.easeOutBounce(t * 2 - 1) * 0.5 + 1 * 0.5;
			}
		},
		//Request animation polyfill - http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
		requestAnimFrame = helpers.requestAnimFrame = (function(){
			return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function(callback) {
					return window.setTimeout(callback, 1000 / 60);
				};
		})(),
		cancelAnimFrame = helpers.cancelAnimFrame = (function(){
			return window.cancelAnimationFrame ||
				window.webkitCancelAnimationFrame ||
				window.mozCancelAnimationFrame ||
				window.oCancelAnimationFrame ||
				window.msCancelAnimationFrame ||
				function(callback) {
					return window.clearTimeout(callback, 1000 / 60);
				};
		})(),
		animationLoop = helpers.animationLoop = function(callback,totalSteps,easingString,onProgress,onComplete,chartInstance){

			var currentStep = 0,
				easingFunction = easingEffects[easingString] || easingEffects.linear;

			var animationFrame = function(){
				currentStep++;
				var stepDecimal = currentStep/totalSteps;
				var easeDecimal = easingFunction(stepDecimal);

				callback.call(chartInstance,easeDecimal,stepDecimal, currentStep);
				onProgress.call(chartInstance,easeDecimal,stepDecimal);
				if (currentStep < totalSteps){
					chartInstance.animationFrame = requestAnimFrame(animationFrame);
				} else{
					onComplete.apply(chartInstance);
				}
			};
			requestAnimFrame(animationFrame);
		},
		//-- DOM methods
		getRelativePosition = helpers.getRelativePosition = function(evt){
			var mouseX, mouseY;
			var e = evt.originalEvent || evt,
				canvas = evt.currentTarget || evt.srcElement,
				boundingRect = canvas.getBoundingClientRect();

			if (e.touches){
				mouseX = e.touches[0].clientX - boundingRect.left;
				mouseY = e.touches[0].clientY - boundingRect.top;

			}
			else{
				mouseX = e.clientX - boundingRect.left;
				mouseY = e.clientY - boundingRect.top;
			}

			return {
				x : mouseX,
				y : mouseY
			};

		},
		addEvent = helpers.addEvent = function(node,eventType,method){
			if (node.addEventListener){
				node.addEventListener(eventType,method);
			} else if (node.attachEvent){
				node.attachEvent("on"+eventType, method);
			} else {
				node["on"+eventType] = method;
			}
		},
		removeEvent = helpers.removeEvent = function(node, eventType, handler){
			if (node.removeEventListener){
				node.removeEventListener(eventType, handler, false);
			} else if (node.detachEvent){
				node.detachEvent("on"+eventType,handler);
			} else{
				node["on" + eventType] = noop;
			}
		},
		bindEvents = helpers.bindEvents = function(chartInstance, arrayOfEvents, handler){
			// Create the events object if it's not already present
			if (!chartInstance.events) chartInstance.events = {};

			each(arrayOfEvents,function(eventName){
				chartInstance.events[eventName] = function(){
					handler.apply(chartInstance, arguments);
				};
				addEvent(chartInstance.chart.canvas,eventName,chartInstance.events[eventName]);
			});
		},
		unbindEvents = helpers.unbindEvents = function (chartInstance, arrayOfEvents) {
			each(arrayOfEvents, function(handler,eventName){
				removeEvent(chartInstance.chart.canvas, eventName, handler);
			});
		},
		getMaximumWidth = helpers.getMaximumWidth = function(domNode){
			var container = domNode.parentNode;
			// TODO = check cross browser stuff with this.
			return container.clientWidth;
		},
		getMaximumHeight = helpers.getMaximumHeight = function(domNode){
			var container = domNode.parentNode;
			// TODO = check cross browser stuff with this.
			return container.clientHeight;
		},
		getMaximumSize = helpers.getMaximumSize = helpers.getMaximumWidth, // legacy support
		retinaScale = helpers.retinaScale = function(chart){
			var ctx = chart.ctx,
				width = chart.canvas.width,
				height = chart.canvas.height;

			if (window.devicePixelRatio) {
				ctx.canvas.style.width = width + "px";
				ctx.canvas.style.height = height + "px";
				ctx.canvas.height = height * window.devicePixelRatio;
				ctx.canvas.width = width * window.devicePixelRatio;
				ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
			}
		},
		//-- Canvas methods
		clear = helpers.clear = function(chart){
			chart.ctx.clearRect(0,0,chart.width,chart.height);
		},
		fontString = helpers.fontString = function(pixelSize,fontStyle,fontFamily){
			return fontStyle + " " + pixelSize+"px " + fontFamily;
		},
		longestText = helpers.longestText = function(ctx,font,arrayOfStrings){
			ctx.font = font;
			var longest = 0;
			each(arrayOfStrings,function(string){
				var textWidth = ctx.measureText(string).width;
				longest = (textWidth > longest) ? textWidth : longest;
			});
			return longest;
		},
		drawRoundedRectangle = helpers.drawRoundedRectangle = function(ctx,x,y,width,height,radius){
			ctx.beginPath();
			ctx.moveTo(x + radius, y);
			ctx.lineTo(x + width - radius, y);
			ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
			ctx.lineTo(x + width, y + height - radius);
			ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
			ctx.lineTo(x + radius, y + height);
			ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
			ctx.lineTo(x, y + radius);
			ctx.quadraticCurveTo(x, y, x + radius, y);
			ctx.closePath();
		};


	//Store a reference to each instance - allowing us to globally resize chart instances on window resize.
	//Destroy method on the chart will remove the instance of the chart from this reference.
	Chart.instances = {};

	Chart.Type = function(data,options,chart){
		this.options = options;
		this.chart = chart;
		this.id = uid();
		//Add the chart instance to the global namespace
		Chart.instances[this.id] = this;

		// Initialize is always called when a chart type is created
		// By default it is a no op, but it should be extended
		if (options.responsive){
			this.resize();
		}
		this.initialize.call(this,data);
	};

	//Core methods that'll be a part of every chart type
	extend(Chart.Type.prototype,{
		initialize : function(){return this;},
		clear : function(){
			clear(this.chart);
			return this;
		},
		stop : function(){
			// Stops any current animation loop occuring
			helpers.cancelAnimFrame.call(root, this.animationFrame);
			return this;
		},
		resize : function(callback){
			this.stop();
			var canvas = this.chart.canvas,
				newWidth = getMaximumWidth(this.chart.canvas),
				newHeight = this.options.maintainAspectRatio ? newWidth / this.chart.aspectRatio : getMaximumHeight(this.chart.canvas);

			canvas.width = this.chart.width = newWidth;
			canvas.height = this.chart.height = newHeight;

			retinaScale(this.chart);

			if (typeof callback === "function"){
				callback.apply(this, Array.prototype.slice.call(arguments, 1));
			}
			return this;
		},
		reflow : noop,
		render : function(reflow){
			if (reflow){
				this.reflow();
			}
			if (this.options.animation && !reflow){
				helpers.animationLoop(
					this.draw,
					this.options.animationSteps,
					this.options.animationEasing,
					this.options.onAnimationProgress,
					this.options.onAnimationComplete,
					this
				);
			}
			else{
				this.draw();
				this.options.onAnimationComplete.call(this);
			}
			return this;
		},
		generateLegend : function(){
			return template(this.options.legendTemplate,this);
		},
		destroy : function(){
			this.clear();
			unbindEvents(this, this.events);
			var canvas = this.chart.canvas;

			// Reset canvas height/width attributes starts a fresh with the canvas context
			canvas.width = this.chart.width;
			canvas.height = this.chart.height;

			// < IE9 doesn't support removeProperty
			if (canvas.style.removeProperty) {
				canvas.style.removeProperty('width');
				canvas.style.removeProperty('height');
			} else {
				canvas.style.removeAttribute('width');
				canvas.style.removeAttribute('height');
			}

			delete Chart.instances[this.id];
		},
		showTooltip : function(ChartElements, forceRedraw){
			// Only redraw the chart if we've actually changed what we're hovering on.
			if (typeof this.activeElements === 'undefined') this.activeElements = [];

			var isChanged = (function(Elements){
				var changed = false;

				if (Elements.length !== this.activeElements.length){
					changed = true;
					return changed;
				}

				each(Elements, function(element, index){
					if (element !== this.activeElements[index]){
						changed = true;
					}
				}, this);
				return changed;
			}).call(this, ChartElements);

			if (!isChanged && !forceRedraw){
				return;
			}
			else{
				this.activeElements = ChartElements;
			}
			this.draw();
			if(this.options.customTooltips){
				this.options.customTooltips(false);
			}
			if (ChartElements.length > 0){
				// If we have multiple datasets, show a MultiTooltip for all of the data points at that index
				if (this.datasets && this.datasets.length > 1) {
					var dataArray,
						dataIndex;

					for (var i = this.datasets.length - 1; i >= 0; i--) {
						dataArray = this.datasets[i].points || this.datasets[i].bars || this.datasets[i].segments;
						dataIndex = indexOf(dataArray, ChartElements[0]);
						if (dataIndex !== -1){
							break;
						}
					}
					var tooltipLabels = [],
						tooltipColors = [],
						medianPosition = (function(index) {

							// Get all the points at that particular index
							var Elements = [],
								dataCollection,
								xPositions = [],
								yPositions = [],
								xMax,
								yMax,
								xMin,
								yMin;
							helpers.each(this.datasets, function(dataset){
								dataCollection = dataset.points || dataset.bars || dataset.segments;
								if (dataCollection[dataIndex] && dataCollection[dataIndex].hasValue()){
									Elements.push(dataCollection[dataIndex]);
								}
							});

							helpers.each(Elements, function(element) {
								xPositions.push(element.x);
								yPositions.push(element.y);


								//Include any colour information about the element
								tooltipLabels.push(helpers.template(this.options.multiTooltipTemplate, element));
								tooltipColors.push({
									fill: element._saved.fillColor || element.fillColor,
									stroke: element._saved.strokeColor || element.strokeColor
								});

							}, this);

							yMin = min(yPositions);
							yMax = max(yPositions);

							xMin = min(xPositions);
							xMax = max(xPositions);

							return {
								x: (xMin > this.chart.width/2) ? xMin : xMax,
								y: (yMin + yMax)/2
							};
						}).call(this, dataIndex);

					new Chart.MultiTooltip({
						x: medianPosition.x,
						y: medianPosition.y,
						xPadding: this.options.tooltipXPadding,
						yPadding: this.options.tooltipYPadding,
						xOffset: this.options.tooltipXOffset,
						fillColor: this.options.tooltipFillColor,
						textColor: this.options.tooltipFontColor,
						fontFamily: this.options.tooltipFontFamily,
						fontStyle: this.options.tooltipFontStyle,
						fontSize: this.options.tooltipFontSize,
						titleTextColor: this.options.tooltipTitleFontColor,
						titleFontFamily: this.options.tooltipTitleFontFamily,
						titleFontStyle: this.options.tooltipTitleFontStyle,
						titleFontSize: this.options.tooltipTitleFontSize,
						cornerRadius: this.options.tooltipCornerRadius,
						labels: tooltipLabels,
						legendColors: tooltipColors,
						legendColorBackground : this.options.multiTooltipKeyBackground,
						title: ChartElements[0].label,
						chart: this.chart,
						ctx: this.chart.ctx,
						custom: this.options.customTooltips
					}).draw();

				} else {
					each(ChartElements, function(Element) {
						var tooltipPosition = Element.tooltipPosition();
						new Chart.Tooltip({
							x: Math.round(tooltipPosition.x),
							y: Math.round(tooltipPosition.y),
							xPadding: this.options.tooltipXPadding,
							yPadding: this.options.tooltipYPadding,
							fillColor: this.options.tooltipFillColor,
							textColor: this.options.tooltipFontColor,
							fontFamily: this.options.tooltipFontFamily,
							fontStyle: this.options.tooltipFontStyle,
							fontSize: this.options.tooltipFontSize,
							caretHeight: this.options.tooltipCaretSize,
							cornerRadius: this.options.tooltipCornerRadius,
							text: template(this.options.tooltipTemplate, Element),
							chart: this.chart,
							custom: this.options.customTooltips
						}).draw();
					}, this);
				}
			}
			return this;
		},
		toBase64Image : function(){
			return this.chart.canvas.toDataURL.apply(this.chart.canvas, arguments);
		}
	});

	Chart.Type.extend = function(extensions){

		var parent = this;

		var ChartType = function(){
			return parent.apply(this,arguments);
		};

		//Copy the prototype object of the this class
		ChartType.prototype = clone(parent.prototype);
		//Now overwrite some of the properties in the base class with the new extensions
		extend(ChartType.prototype, extensions);

		ChartType.extend = Chart.Type.extend;

		if (extensions.name || parent.prototype.name){

			var chartName = extensions.name || parent.prototype.name;
			//Assign any potential default values of the new chart type

			//If none are defined, we'll use a clone of the chart type this is being extended from.
			//I.e. if we extend a line chart, we'll use the defaults from the line chart if our new chart
			//doesn't define some defaults of their own.

			var baseDefaults = (Chart.defaults[parent.prototype.name]) ? clone(Chart.defaults[parent.prototype.name]) : {};

			Chart.defaults[chartName] = extend(baseDefaults,extensions.defaults);

			Chart.types[chartName] = ChartType;

			//Register this new chart type in the Chart prototype
			Chart.prototype[chartName] = function(data,options){
				var config = merge(Chart.defaults.global, Chart.defaults[chartName], options || {});
				return new ChartType(data,config,this);
			};
		} else{
			warn("Name not provided for this chart, so it hasn't been registered");
		}
		return parent;
	};

	Chart.Element = function(configuration){
		extend(this,configuration);
		this.initialize.apply(this,arguments);
		this.save();
	};
	extend(Chart.Element.prototype,{
		initialize : function(){},
		restore : function(props){
			if (!props){
				extend(this,this._saved);
			} else {
				each(props,function(key){
					this[key] = this._saved[key];
				},this);
			}
			return this;
		},
		save : function(){
			this._saved = clone(this);
			delete this._saved._saved;
			return this;
		},
		update : function(newProps){
			each(newProps,function(value,key){
				this._saved[key] = this[key];
				this[key] = value;
			},this);
			return this;
		},
		transition : function(props,ease){
			each(props,function(value,key){
				this[key] = ((value - this._saved[key]) * ease) + this._saved[key];
			},this);
			return this;
		},
		tooltipPosition : function(){
			return {
				x : this.x,
				y : this.y
			};
		},
		hasValue: function(){
			return isNumber(this.value);
		}
	});

	Chart.Element.extend = inherits;


	Chart.Point = Chart.Element.extend({
		display: true,
		inRange: function(chartX,chartY){
			var hitDetectionRange = this.hitDetectionRadius + this.radius;
			return ((Math.pow(chartX-this.x, 2)+Math.pow(chartY-this.y, 2)) < Math.pow(hitDetectionRange,2));
		},
		draw : function(){
			if (this.display){
				var ctx = this.ctx;
				ctx.beginPath();

				ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
				ctx.closePath();

				ctx.strokeStyle = this.strokeColor;
				ctx.lineWidth = this.strokeWidth;

				ctx.fillStyle = this.fillColor;

				ctx.fill();
				ctx.stroke();
			}


			//Quick debug for bezier curve splining
			//Highlights control points and the line between them.
			//Handy for dev - stripped in the min version.

			// ctx.save();
			// ctx.fillStyle = "black";
			// ctx.strokeStyle = "black"
			// ctx.beginPath();
			// ctx.arc(this.controlPoints.inner.x,this.controlPoints.inner.y, 2, 0, Math.PI*2);
			// ctx.fill();

			// ctx.beginPath();
			// ctx.arc(this.controlPoints.outer.x,this.controlPoints.outer.y, 2, 0, Math.PI*2);
			// ctx.fill();

			// ctx.moveTo(this.controlPoints.inner.x,this.controlPoints.inner.y);
			// ctx.lineTo(this.x, this.y);
			// ctx.lineTo(this.controlPoints.outer.x,this.controlPoints.outer.y);
			// ctx.stroke();

			// ctx.restore();



		}
	});

	Chart.Arc = Chart.Element.extend({
		inRange : function(chartX,chartY){

			var pointRelativePosition = helpers.getAngleFromPoint(this, {
				x: chartX,
				y: chartY
			});

			//Check if within the range of the open/close angle
			var betweenAngles = (pointRelativePosition.angle >= this.startAngle && pointRelativePosition.angle <= this.endAngle),
				withinRadius = (pointRelativePosition.distance >= this.innerRadius && pointRelativePosition.distance <= this.outerRadius);

			return (betweenAngles && withinRadius);
			//Ensure within the outside of the arc centre, but inside arc outer
		},
		tooltipPosition : function(){
			var centreAngle = this.startAngle + ((this.endAngle - this.startAngle) / 2),
				rangeFromCentre = (this.outerRadius - this.innerRadius) / 2 + this.innerRadius;
			return {
				x : this.x + (Math.cos(centreAngle) * rangeFromCentre),
				y : this.y + (Math.sin(centreAngle) * rangeFromCentre)
			};
		},
		draw : function(animationPercent){

			var easingDecimal = animationPercent || 1;

			var ctx = this.ctx;

			ctx.beginPath();

			ctx.arc(this.x, this.y, this.outerRadius, this.startAngle, this.endAngle);

			ctx.arc(this.x, this.y, this.innerRadius, this.endAngle, this.startAngle, true);

			ctx.closePath();
			ctx.strokeStyle = this.strokeColor;
			ctx.lineWidth = this.strokeWidth;

			ctx.fillStyle = this.fillColor;

			ctx.fill();
			ctx.lineJoin = 'bevel';

			if (this.showStroke){
				ctx.stroke();
			}
		}
	});

	Chart.Rectangle = Chart.Element.extend({
		draw : function(){
			var ctx = this.ctx,
				halfWidth = this.width/2,
				leftX = this.x - halfWidth,
				rightX = this.x + halfWidth,
				top = this.base - (this.base - this.y),
				halfStroke = this.strokeWidth / 2;

			// Canvas doesn't allow us to stroke inside the width so we can
			// adjust the sizes to fit if we're setting a stroke on the line
			if (this.showStroke){
				leftX += halfStroke;
				rightX -= halfStroke;
				top += halfStroke;
			}

			ctx.beginPath();

			ctx.fillStyle = this.fillColor;
			ctx.strokeStyle = this.strokeColor;
			ctx.lineWidth = this.strokeWidth;

			// It'd be nice to keep this class totally generic to any rectangle
			// and simply specify which border to miss out.
			ctx.moveTo(leftX, this.base);
			ctx.lineTo(leftX, top);
			ctx.lineTo(rightX, top);
			ctx.lineTo(rightX, this.base);
			ctx.fill();
			if (this.showStroke){
				ctx.stroke();
			}
		},
		height : function(){
			return this.base - this.y;
		},
		inRange : function(chartX,chartY){
			return (chartX >= this.x - this.width/2 && chartX <= this.x + this.width/2) && (chartY >= this.y && chartY <= this.base);
		}
	});

	Chart.Tooltip = Chart.Element.extend({
		draw : function(){

			var ctx = this.chart.ctx;

			ctx.font = fontString(this.fontSize,this.fontStyle,this.fontFamily);

			this.xAlign = "center";
			this.yAlign = "above";

			//Distance between the actual element.y position and the start of the tooltip caret
			var caretPadding = this.caretPadding = 2;

			var tooltipWidth = ctx.measureText(this.text).width + 2*this.xPadding,
				tooltipRectHeight = this.fontSize + 2*this.yPadding,
				tooltipHeight = tooltipRectHeight + this.caretHeight + caretPadding;

			if (this.x + tooltipWidth/2 >this.chart.width){
				this.xAlign = "left";
			} else if (this.x - tooltipWidth/2 < 0){
				this.xAlign = "right";
			}

			if (this.y - tooltipHeight < 0){
				this.yAlign = "below";
			}


			var tooltipX = this.x - tooltipWidth/2,
				tooltipY = this.y - tooltipHeight;

			ctx.fillStyle = this.fillColor;

			// Custom Tooltips
			if(this.custom){
				this.custom(this);
			}
			else{
				switch(this.yAlign)
				{
				case "above":
					//Draw a caret above the x/y
					ctx.beginPath();
					ctx.moveTo(this.x,this.y - caretPadding);
					ctx.lineTo(this.x + this.caretHeight, this.y - (caretPadding + this.caretHeight));
					ctx.lineTo(this.x - this.caretHeight, this.y - (caretPadding + this.caretHeight));
					ctx.closePath();
					ctx.fill();
					break;
				case "below":
					tooltipY = this.y + caretPadding + this.caretHeight;
					//Draw a caret below the x/y
					ctx.beginPath();
					ctx.moveTo(this.x, this.y + caretPadding);
					ctx.lineTo(this.x + this.caretHeight, this.y + caretPadding + this.caretHeight);
					ctx.lineTo(this.x - this.caretHeight, this.y + caretPadding + this.caretHeight);
					ctx.closePath();
					ctx.fill();
					break;
				}

				switch(this.xAlign)
				{
				case "left":
					tooltipX = this.x - tooltipWidth + (this.cornerRadius + this.caretHeight);
					break;
				case "right":
					tooltipX = this.x - (this.cornerRadius + this.caretHeight);
					break;
				}

				drawRoundedRectangle(ctx,tooltipX,tooltipY,tooltipWidth,tooltipRectHeight,this.cornerRadius);

				ctx.fill();

				ctx.fillStyle = this.textColor;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(this.text, tooltipX + tooltipWidth/2, tooltipY + tooltipRectHeight/2);
			}
		}
	});

	Chart.MultiTooltip = Chart.Element.extend({
		initialize : function(){
			this.font = fontString(this.fontSize,this.fontStyle,this.fontFamily);

			this.titleFont = fontString(this.titleFontSize,this.titleFontStyle,this.titleFontFamily);

			this.height = (this.labels.length * this.fontSize) + ((this.labels.length-1) * (this.fontSize/2)) + (this.yPadding*2) + this.titleFontSize *1.5;

			this.ctx.font = this.titleFont;

			var titleWidth = this.ctx.measureText(this.title).width,
				//Label has a legend square as well so account for this.
				labelWidth = longestText(this.ctx,this.font,this.labels) + this.fontSize + 3,
				longestTextWidth = max([labelWidth,titleWidth]);

			this.width = longestTextWidth + (this.xPadding*2);


			var halfHeight = this.height/2;

			//Check to ensure the height will fit on the canvas
			//The three is to buffer form the very
			if (this.y - halfHeight < 0 ){
				this.y = halfHeight;
			} else if (this.y + halfHeight > this.chart.height){
				this.y = this.chart.height - halfHeight;
			}

			//Decide whether to align left or right based on position on canvas
			if (this.x > this.chart.width/2){
				this.x -= this.xOffset + this.width;
			} else {
				this.x += this.xOffset;
			}


		},
		getLineHeight : function(index){
			var baseLineHeight = this.y - (this.height/2) + this.yPadding,
				afterTitleIndex = index-1;

			//If the index is zero, we're getting the title
			if (index === 0){
				return baseLineHeight + this.titleFontSize/2;
			} else{
				return baseLineHeight + ((this.fontSize*1.5*afterTitleIndex) + this.fontSize/2) + this.titleFontSize * 1.5;
			}

		},
		draw : function(){
			// Custom Tooltips
			if(this.custom){
				this.custom(this);
			}
			else{
				drawRoundedRectangle(this.ctx,this.x,this.y - this.height/2,this.width,this.height,this.cornerRadius);
				var ctx = this.ctx;
				ctx.fillStyle = this.fillColor;
				ctx.fill();
				ctx.closePath();

				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.fillStyle = this.titleTextColor;
				ctx.font = this.titleFont;

				ctx.fillText(this.title,this.x + this.xPadding, this.getLineHeight(0));

				ctx.font = this.font;
				helpers.each(this.labels,function(label,index){
					ctx.fillStyle = this.textColor;
					ctx.fillText(label,this.x + this.xPadding + this.fontSize + 3, this.getLineHeight(index + 1));

					//A bit gnarly, but clearing this rectangle breaks when using explorercanvas (clears whole canvas)
					//ctx.clearRect(this.x + this.xPadding, this.getLineHeight(index + 1) - this.fontSize/2, this.fontSize, this.fontSize);
					//Instead we'll make a white filled block to put the legendColour palette over.

					ctx.fillStyle = this.legendColorBackground;
					ctx.fillRect(this.x + this.xPadding, this.getLineHeight(index + 1) - this.fontSize/2, this.fontSize, this.fontSize);

					ctx.fillStyle = this.legendColors[index].fill;
					ctx.fillRect(this.x + this.xPadding, this.getLineHeight(index + 1) - this.fontSize/2, this.fontSize, this.fontSize);


				},this);
			}
		}
	});

	Chart.Scale = Chart.Element.extend({
		initialize : function(){
			this.fit();
		},
		buildYLabels : function(){
			this.yLabels = [];

			var stepDecimalPlaces = getDecimalPlaces(this.stepValue);

			for (var i=0; i<=this.steps; i++){
				this.yLabels.push(template(this.templateString,{value:(this.min + (i * this.stepValue)).toFixed(stepDecimalPlaces)}));
			}
			this.yLabelWidth = (this.display && this.showLabels) ? longestText(this.ctx,this.font,this.yLabels) : 0;
		},
		addXLabel : function(label){
			this.xLabels.push(label);
			this.valuesCount++;
			this.fit();
		},
		removeXLabel : function(){
			this.xLabels.shift();
			this.valuesCount--;
			this.fit();
		},
		// Fitting loop to rotate x Labels and figure out what fits there, and also calculate how many Y steps to use
		fit: function(){
			// First we need the width of the yLabels, assuming the xLabels aren't rotated

			// To do that we need the base line at the top and base of the chart, assuming there is no x label rotation
			this.startPoint = (this.display) ? this.fontSize : 0;
			this.endPoint = (this.display) ? this.height - (this.fontSize * 1.5) - 5 : this.height; // -5 to pad labels

			// Apply padding settings to the start and end point.
			this.startPoint += this.padding;
			this.endPoint -= this.padding;

			// Cache the starting height, so can determine if we need to recalculate the scale yAxis
			var cachedHeight = this.endPoint - this.startPoint,
				cachedYLabelWidth;

			// Build the current yLabels so we have an idea of what size they'll be to start
			/*
			 *	This sets what is returned from calculateScaleRange as static properties of this class:
			 *
				this.steps;
				this.stepValue;
				this.min;
				this.max;
			 *
			 */
			this.calculateYRange(cachedHeight);

			// With these properties set we can now build the array of yLabels
			// and also the width of the largest yLabel
			this.buildYLabels();

			this.calculateXLabelRotation();

			while((cachedHeight > this.endPoint - this.startPoint)){
				cachedHeight = this.endPoint - this.startPoint;
				cachedYLabelWidth = this.yLabelWidth;

				this.calculateYRange(cachedHeight);
				this.buildYLabels();

				// Only go through the xLabel loop again if the yLabel width has changed
				if (cachedYLabelWidth < this.yLabelWidth){
					this.calculateXLabelRotation();
				}
			}

		},
		calculateXLabelRotation : function(){
			//Get the width of each grid by calculating the difference
			//between x offsets between 0 and 1.

			this.ctx.font = this.font;

			var firstWidth = this.ctx.measureText(this.xLabels[0]).width,
				lastWidth = this.ctx.measureText(this.xLabels[this.xLabels.length - 1]).width,
				firstRotated,
				lastRotated;


			this.xScalePaddingRight = lastWidth/2 + 3;
			this.xScalePaddingLeft = (firstWidth/2 > this.yLabelWidth + 10) ? firstWidth/2 : this.yLabelWidth + 10;

			this.xLabelRotation = 0;
			if (this.display){
				var originalLabelWidth = longestText(this.ctx,this.font,this.xLabels),
					cosRotation,
					firstRotatedWidth;
				this.xLabelWidth = originalLabelWidth;
				//Allow 3 pixels x2 padding either side for label readability
				var xGridWidth = Math.floor(this.calculateX(1) - this.calculateX(0)) - 6;

				//Max label rotate should be 90 - also act as a loop counter
				while ((this.xLabelWidth > xGridWidth && this.xLabelRotation === 0) || (this.xLabelWidth > xGridWidth && this.xLabelRotation <= 90 && this.xLabelRotation > 0)){
					cosRotation = Math.cos(toRadians(this.xLabelRotation));

					firstRotated = cosRotation * firstWidth;
					lastRotated = cosRotation * lastWidth;

					// We're right aligning the text now.
					if (firstRotated + this.fontSize / 2 > this.yLabelWidth + 8){
						this.xScalePaddingLeft = firstRotated + this.fontSize / 2;
					}
					this.xScalePaddingRight = this.fontSize/2;


					this.xLabelRotation++;
					this.xLabelWidth = cosRotation * originalLabelWidth;

				}
				if (this.xLabelRotation > 0){
					this.endPoint -= Math.sin(toRadians(this.xLabelRotation))*originalLabelWidth + 3;
				}
			}
			else{
				this.xLabelWidth = 0;
				this.xScalePaddingRight = this.padding;
				this.xScalePaddingLeft = this.padding;
			}

		},
		// Needs to be overidden in each Chart type
		// Otherwise we need to pass all the data into the scale class
		calculateYRange: noop,
		drawingArea: function(){
			return this.startPoint - this.endPoint;
		},
		calculateY : function(value){
			var scalingFactor = this.drawingArea() / (this.min - this.max);
			return this.endPoint - (scalingFactor * (value - this.min));
		},
		calculateX : function(index){
			var isRotated = (this.xLabelRotation > 0),
				// innerWidth = (this.offsetGridLines) ? this.width - offsetLeft - this.padding : this.width - (offsetLeft + halfLabelWidth * 2) - this.padding,
				innerWidth = this.width - (this.xScalePaddingLeft + this.xScalePaddingRight),
				valueWidth = innerWidth/(this.valuesCount - ((this.offsetGridLines) ? 0 : 1)),
				valueOffset = (valueWidth * index) + this.xScalePaddingLeft;

			if (this.offsetGridLines){
				valueOffset += (valueWidth/2);
			}

			return Math.round(valueOffset);
		},
		update : function(newProps){
			helpers.extend(this, newProps);
			this.fit();
		},
		draw : function(){
			var ctx = this.ctx,
				yLabelGap = (this.endPoint - this.startPoint) / this.steps,
				xStart = Math.round(this.xScalePaddingLeft);
			if (this.display){
				ctx.fillStyle = this.textColor;
				ctx.font = this.font;
				each(this.yLabels,function(labelString,index){
					var yLabelCenter = this.endPoint - (yLabelGap * index),
						linePositionY = Math.round(yLabelCenter),
						drawHorizontalLine = this.showHorizontalLines;

					ctx.textAlign = "right";
					ctx.textBaseline = "middle";
					if (this.showLabels){
						ctx.fillText(labelString,xStart - 10,yLabelCenter);
					}

					// This is X axis, so draw it
					if (index === 0 && !drawHorizontalLine){
						drawHorizontalLine = true;
					}

					if (drawHorizontalLine){
						ctx.beginPath();
					}

					if (index > 0){
						// This is a grid line in the centre, so drop that
						ctx.lineWidth = this.gridLineWidth;
						ctx.strokeStyle = this.gridLineColor;
					} else {
						// This is the first line on the scale
						ctx.lineWidth = this.lineWidth;
						ctx.strokeStyle = this.lineColor;
					}

					linePositionY += helpers.aliasPixel(ctx.lineWidth);

					if(drawHorizontalLine){
						ctx.moveTo(xStart, linePositionY);
						ctx.lineTo(this.width, linePositionY);
						ctx.stroke();
						ctx.closePath();
					}

					ctx.lineWidth = this.lineWidth;
					ctx.strokeStyle = this.lineColor;
					ctx.beginPath();
					ctx.moveTo(xStart - 5, linePositionY);
					ctx.lineTo(xStart, linePositionY);
					ctx.stroke();
					ctx.closePath();

				},this);

				each(this.xLabels,function(label,index){
					var xPos = this.calculateX(index) + aliasPixel(this.lineWidth),
						// Check to see if line/bar here and decide where to place the line
						linePos = this.calculateX(index - (this.offsetGridLines ? 0.5 : 0)) + aliasPixel(this.lineWidth),
						isRotated = (this.xLabelRotation > 0),
						drawVerticalLine = this.showVerticalLines;

					// This is Y axis, so draw it
					if (index === 0 && !drawVerticalLine){
						drawVerticalLine = true;
					}

					if (drawVerticalLine){
						ctx.beginPath();
					}

					if (index > 0){
						// This is a grid line in the centre, so drop that
						ctx.lineWidth = this.gridLineWidth;
						ctx.strokeStyle = this.gridLineColor;
					} else {
						// This is the first line on the scale
						ctx.lineWidth = this.lineWidth;
						ctx.strokeStyle = this.lineColor;
					}

					if (drawVerticalLine){
						ctx.moveTo(linePos,this.endPoint);
						ctx.lineTo(linePos,this.startPoint - 3);
						ctx.stroke();
						ctx.closePath();
					}


					ctx.lineWidth = this.lineWidth;
					ctx.strokeStyle = this.lineColor;


					// Small lines at the bottom of the base grid line
					ctx.beginPath();
					ctx.moveTo(linePos,this.endPoint);
					ctx.lineTo(linePos,this.endPoint + 5);
					ctx.stroke();
					ctx.closePath();

					ctx.save();
					ctx.translate(xPos,(isRotated) ? this.endPoint + 12 : this.endPoint + 8);
					ctx.rotate(toRadians(this.xLabelRotation)*-1);
					ctx.font = this.font;
					ctx.textAlign = (isRotated) ? "right" : "center";
					ctx.textBaseline = (isRotated) ? "middle" : "top";
					ctx.fillText(label, 0, 0);
					ctx.restore();
				},this);

			}
		}

	});

	Chart.RadialScale = Chart.Element.extend({
		initialize: function(){
			this.size = min([this.height, this.width]);
			this.drawingArea = (this.display) ? (this.size/2) - (this.fontSize/2 + this.backdropPaddingY) : (this.size/2);
		},
		calculateCenterOffset: function(value){
			// Take into account half font size + the yPadding of the top value
			var scalingFactor = this.drawingArea / (this.max - this.min);

			return (value - this.min) * scalingFactor;
		},
		update : function(){
			if (!this.lineArc){
				this.setScaleSize();
			} else {
				this.drawingArea = (this.display) ? (this.size/2) - (this.fontSize/2 + this.backdropPaddingY) : (this.size/2);
			}
			this.buildYLabels();
		},
		buildYLabels: function(){
			this.yLabels = [];

			var stepDecimalPlaces = getDecimalPlaces(this.stepValue);

			for (var i=0; i<=this.steps; i++){
				this.yLabels.push(template(this.templateString,{value:(this.min + (i * this.stepValue)).toFixed(stepDecimalPlaces)}));
			}
		},
		getCircumference : function(){
			return ((Math.PI*2) / this.valuesCount);
		},
		setScaleSize: function(){
			/*
			 * Right, this is really confusing and there is a lot of maths going on here
			 * The gist of the problem is here: https://gist.github.com/nnnick/696cc9c55f4b0beb8fe9
			 *
			 * Reaction: https://dl.dropboxusercontent.com/u/34601363/toomuchscience.gif
			 *
			 * Solution:
			 *
			 * We assume the radius of the polygon is half the size of the canvas at first
			 * at each index we check if the text overlaps.
			 *
			 * Where it does, we store that angle and that index.
			 *
			 * After finding the largest index and angle we calculate how much we need to remove
			 * from the shape radius to move the point inwards by that x.
			 *
			 * We average the left and right distances to get the maximum shape radius that can fit in the box
			 * along with labels.
			 *
			 * Once we have that, we can find the centre point for the chart, by taking the x text protrusion
			 * on each side, removing that from the size, halving it and adding the left x protrusion width.
			 *
			 * This will mean we have a shape fitted to the canvas, as large as it can be with the labels
			 * and position it in the most space efficient manner
			 *
			 * https://dl.dropboxusercontent.com/u/34601363/yeahscience.gif
			 */


			// Get maximum radius of the polygon. Either half the height (minus the text width) or half the width.
			// Use this to calculate the offset + change. - Make sure L/R protrusion is at least 0 to stop issues with centre points
			var largestPossibleRadius = min([(this.height/2 - this.pointLabelFontSize - 5), this.width/2]),
				pointPosition,
				i,
				textWidth,
				halfTextWidth,
				furthestRight = this.width,
				furthestRightIndex,
				furthestRightAngle,
				furthestLeft = 0,
				furthestLeftIndex,
				furthestLeftAngle,
				xProtrusionLeft,
				xProtrusionRight,
				radiusReductionRight,
				radiusReductionLeft,
				maxWidthRadius;
			this.ctx.font = fontString(this.pointLabelFontSize,this.pointLabelFontStyle,this.pointLabelFontFamily);
			for (i=0;i<this.valuesCount;i++){
				// 5px to space the text slightly out - similar to what we do in the draw function.
				pointPosition = this.getPointPosition(i, largestPossibleRadius);
				textWidth = this.ctx.measureText(template(this.templateString, { value: this.labels[i] })).width + 5;
				if (i === 0 || i === this.valuesCount/2){
					// If we're at index zero, or exactly the middle, we're at exactly the top/bottom
					// of the radar chart, so text will be aligned centrally, so we'll half it and compare
					// w/left and right text sizes
					halfTextWidth = textWidth/2;
					if (pointPosition.x + halfTextWidth > furthestRight) {
						furthestRight = pointPosition.x + halfTextWidth;
						furthestRightIndex = i;
					}
					if (pointPosition.x - halfTextWidth < furthestLeft) {
						furthestLeft = pointPosition.x - halfTextWidth;
						furthestLeftIndex = i;
					}
				}
				else if (i < this.valuesCount/2) {
					// Less than half the values means we'll left align the text
					if (pointPosition.x + textWidth > furthestRight) {
						furthestRight = pointPosition.x + textWidth;
						furthestRightIndex = i;
					}
				}
				else if (i > this.valuesCount/2){
					// More than half the values means we'll right align the text
					if (pointPosition.x - textWidth < furthestLeft) {
						furthestLeft = pointPosition.x - textWidth;
						furthestLeftIndex = i;
					}
				}
			}

			xProtrusionLeft = furthestLeft;

			xProtrusionRight = Math.ceil(furthestRight - this.width);

			furthestRightAngle = this.getIndexAngle(furthestRightIndex);

			furthestLeftAngle = this.getIndexAngle(furthestLeftIndex);

			radiusReductionRight = xProtrusionRight / Math.sin(furthestRightAngle + Math.PI/2);

			radiusReductionLeft = xProtrusionLeft / Math.sin(furthestLeftAngle + Math.PI/2);

			// Ensure we actually need to reduce the size of the chart
			radiusReductionRight = (isNumber(radiusReductionRight)) ? radiusReductionRight : 0;
			radiusReductionLeft = (isNumber(radiusReductionLeft)) ? radiusReductionLeft : 0;

			this.drawingArea = largestPossibleRadius - (radiusReductionLeft + radiusReductionRight)/2;

			//this.drawingArea = min([maxWidthRadius, (this.height - (2 * (this.pointLabelFontSize + 5)))/2])
			this.setCenterPoint(radiusReductionLeft, radiusReductionRight);

		},
		setCenterPoint: function(leftMovement, rightMovement){

			var maxRight = this.width - rightMovement - this.drawingArea,
				maxLeft = leftMovement + this.drawingArea;

			this.xCenter = (maxLeft + maxRight)/2;
			// Always vertically in the centre as the text height doesn't change
			this.yCenter = (this.height/2);
		},

		getIndexAngle : function(index){
			var angleMultiplier = (Math.PI * 2) / this.valuesCount;
			// Start from the top instead of right, so remove a quarter of the circle

			return index * angleMultiplier - (Math.PI/2);
		},
		getPointPosition : function(index, distanceFromCenter){
			var thisAngle = this.getIndexAngle(index);
			return {
				x : (Math.cos(thisAngle) * distanceFromCenter) + this.xCenter,
				y : (Math.sin(thisAngle) * distanceFromCenter) + this.yCenter
			};
		},
		draw: function(){
			if (this.display){
				var ctx = this.ctx;
				each(this.yLabels, function(label, index){
					// Don't draw a centre value
					if (index > 0){
						var yCenterOffset = index * (this.drawingArea/this.steps),
							yHeight = this.yCenter - yCenterOffset,
							pointPosition;

						// Draw circular lines around the scale
						if (this.lineWidth > 0){
							ctx.strokeStyle = this.lineColor;
							ctx.lineWidth = this.lineWidth;

							if(this.lineArc){
								ctx.beginPath();
								ctx.arc(this.xCenter, this.yCenter, yCenterOffset, 0, Math.PI*2);
								ctx.closePath();
								ctx.stroke();
							} else{
								ctx.beginPath();
								for (var i=0;i<this.valuesCount;i++)
								{
									pointPosition = this.getPointPosition(i, this.calculateCenterOffset(this.min + (index * this.stepValue)));
									if (i === 0){
										ctx.moveTo(pointPosition.x, pointPosition.y);
									} else {
										ctx.lineTo(pointPosition.x, pointPosition.y);
									}
								}
								ctx.closePath();
								ctx.stroke();
							}
						}
						if(this.showLabels){
							ctx.font = fontString(this.fontSize,this.fontStyle,this.fontFamily);
							if (this.showLabelBackdrop){
								var labelWidth = ctx.measureText(label).width;
								ctx.fillStyle = this.backdropColor;
								ctx.fillRect(
									this.xCenter - labelWidth/2 - this.backdropPaddingX,
									yHeight - this.fontSize/2 - this.backdropPaddingY,
									labelWidth + this.backdropPaddingX*2,
									this.fontSize + this.backdropPaddingY*2
								);
							}
							ctx.textAlign = 'center';
							ctx.textBaseline = "middle";
							ctx.fillStyle = this.fontColor;
							ctx.fillText(label, this.xCenter, yHeight);
						}
					}
				}, this);

				if (!this.lineArc){
					ctx.lineWidth = this.angleLineWidth;
					ctx.strokeStyle = this.angleLineColor;
					for (var i = this.valuesCount - 1; i >= 0; i--) {
						if (this.angleLineWidth > 0){
							var outerPosition = this.getPointPosition(i, this.calculateCenterOffset(this.max));
							ctx.beginPath();
							ctx.moveTo(this.xCenter, this.yCenter);
							ctx.lineTo(outerPosition.x, outerPosition.y);
							ctx.stroke();
							ctx.closePath();
						}
						// Extra 3px out for some label spacing
						var pointLabelPosition = this.getPointPosition(i, this.calculateCenterOffset(this.max) + 5);
						ctx.font = fontString(this.pointLabelFontSize,this.pointLabelFontStyle,this.pointLabelFontFamily);
						ctx.fillStyle = this.pointLabelFontColor;

						var labelsCount = this.labels.length,
							halfLabelsCount = this.labels.length/2,
							quarterLabelsCount = halfLabelsCount/2,
							upperHalf = (i < quarterLabelsCount || i > labelsCount - quarterLabelsCount),
							exactQuarter = (i === quarterLabelsCount || i === labelsCount - quarterLabelsCount);
						if (i === 0){
							ctx.textAlign = 'center';
						} else if(i === halfLabelsCount){
							ctx.textAlign = 'center';
						} else if (i < halfLabelsCount){
							ctx.textAlign = 'left';
						} else {
							ctx.textAlign = 'right';
						}

						// Set the correct text baseline based on outer positioning
						if (exactQuarter){
							ctx.textBaseline = 'middle';
						} else if (upperHalf){
							ctx.textBaseline = 'bottom';
						} else {
							ctx.textBaseline = 'top';
						}

						ctx.fillText(this.labels[i], pointLabelPosition.x, pointLabelPosition.y);
					}
				}
			}
		}
	});

	// Attach global event to resize each chart instance when the browser resizes
	helpers.addEvent(window, "resize", (function(){
		// Basic debounce of resize function so it doesn't hurt performance when resizing browser.
		var timeout;
		return function(){
			clearTimeout(timeout);
			timeout = setTimeout(function(){
				each(Chart.instances,function(instance){
					// If the responsive flag is set in the chart instance config
					// Cascade the resize event down to the chart.
					if (instance.options.responsive){
						instance.resize(instance.render, true);
					}
				});
			}, 50);
		};
	})());


	if (amd) {
		define(function(){
			return Chart;
		});
	} else if (typeof module === 'object' && module.exports) {
		module.exports = Chart;
	}

	root.Chart = Chart;

	Chart.noConflict = function(){
		root.Chart = previous;
		return Chart;
	};

}).call(this);

(function(){
	"use strict";

	var root = this,
		Chart = root.Chart,
		//Cache a local reference to Chart.helpers
		helpers = Chart.helpers;

	var defaultConfig = {
		//Boolean - Whether we should show a stroke on each segment
		segmentShowStroke : true,

		//String - The colour of each segment stroke
		segmentStrokeColor : "#fff",

		//Number - The width of each segment stroke
		segmentStrokeWidth : 2,

		//The percentage of the chart that we cut out of the middle.
		percentageInnerCutout : 50,

		//Number - Amount of animation steps
		animationSteps : 100,

		//String - Animation easing effect
		animationEasing : "easeOutBounce",

		//Boolean - Whether we animate the rotation of the Doughnut
		animateRotate : true,

		//Boolean - Whether we animate scaling the Doughnut from the centre
		animateScale : false,

		//String - A legend template
		legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>"

	};


	Chart.Type.extend({
		//Passing in a name registers this chart in the Chart namespace
		name: "Doughnut",
		//Providing a defaults will also register the deafults in the chart namespace
		defaults : defaultConfig,
		//Initialize is fired when the chart is initialized - Data is passed in as a parameter
		//Config is automatically merged by the core of Chart.js, and is available at this.options
		initialize:  function(data){

			//Declare segments as a static property to prevent inheriting across the Chart type prototype
			this.segments = [];
			this.outerRadius = (helpers.min([this.chart.width,this.chart.height]) -	this.options.segmentStrokeWidth/2)/2;

			this.SegmentArc = Chart.Arc.extend({
				ctx : this.chart.ctx,
				x : this.chart.width/2,
				y : this.chart.height/2
			});

			//Set up tooltip events on the chart
			if (this.options.showTooltips){
				helpers.bindEvents(this, this.options.tooltipEvents, function(evt){
					var activeSegments = (evt.type !== 'mouseout') ? this.getSegmentsAtEvent(evt) : [];

					helpers.each(this.segments,function(segment){
						segment.restore(["fillColor"]);
					});
					helpers.each(activeSegments,function(activeSegment){
						activeSegment.fillColor = activeSegment.highlightColor;
					});
					this.showTooltip(activeSegments);
				});
			}
			this.calculateTotal(data);

			helpers.each(data,function(datapoint, index){
				this.addData(datapoint, index, true);
			},this);

			this.render();
		},
		getSegmentsAtEvent : function(e){
			var segmentsArray = [];

			var location = helpers.getRelativePosition(e);

			helpers.each(this.segments,function(segment){
				if (segment.inRange(location.x,location.y)) segmentsArray.push(segment);
			},this);
			return segmentsArray;
		},
		addData : function(segment, atIndex, silent){
			var index = atIndex || this.segments.length;
			this.segments.splice(index, 0, new this.SegmentArc({
				value : segment.value,
				outerRadius : (this.options.animateScale) ? 0 : this.outerRadius,
				innerRadius : (this.options.animateScale) ? 0 : (this.outerRadius/100) * this.options.percentageInnerCutout,
				fillColor : segment.color,
				highlightColor : segment.highlight || segment.color,
				showStroke : this.options.segmentShowStroke,
				strokeWidth : this.options.segmentStrokeWidth,
				strokeColor : this.options.segmentStrokeColor,
				startAngle : Math.PI * 1.5,
				circumference : (this.options.animateRotate) ? 0 : this.calculateCircumference(segment.value),
				label : segment.label
			}));
			if (!silent){
				this.reflow();
				this.update();
			}
		},
		calculateCircumference : function(value){
			return (Math.PI*2)*(value / this.total);
		},
		calculateTotal : function(data){
			this.total = 0;
			helpers.each(data,function(segment){
				this.total += segment.value;
			},this);
		},
		update : function(){
			this.calculateTotal(this.segments);

			// Reset any highlight colours before updating.
			helpers.each(this.activeElements, function(activeElement){
				activeElement.restore(['fillColor']);
			});

			helpers.each(this.segments,function(segment){
				segment.save();
			});
			this.render();
		},

		removeData: function(atIndex){
			var indexToDelete = (helpers.isNumber(atIndex)) ? atIndex : this.segments.length-1;
			this.segments.splice(indexToDelete, 1);
			this.reflow();
			this.update();
		},

		reflow : function(){
			helpers.extend(this.SegmentArc.prototype,{
				x : this.chart.width/2,
				y : this.chart.height/2
			});
			this.outerRadius = (helpers.min([this.chart.width,this.chart.height]) -	this.options.segmentStrokeWidth/2)/2;
			helpers.each(this.segments, function(segment){
				segment.update({
					outerRadius : this.outerRadius,
					innerRadius : (this.outerRadius/100) * this.options.percentageInnerCutout
				});
			}, this);
		},
		draw : function(easeDecimal){
			var animDecimal = (easeDecimal) ? easeDecimal : 1;
			this.clear();
			helpers.each(this.segments,function(segment,index){
				segment.transition({
					circumference : this.calculateCircumference(segment.value),
					outerRadius : this.outerRadius,
					innerRadius : (this.outerRadius/100) * this.options.percentageInnerCutout
				},animDecimal);

				segment.endAngle = segment.startAngle + segment.circumference;

				segment.draw();
				if (index === 0){
					segment.startAngle = Math.PI * 1.5;
				}
				//Check to see if it's the last segment, if not get the next and update the start angle
				if (index < this.segments.length-1){
					this.segments[index+1].startAngle = segment.endAngle;
				}
			},this);

		}
	});

	Chart.types.Doughnut.extend({
		name : "Pie",
		defaults : helpers.merge(defaultConfig,{percentageInnerCutout : 0})
	});

}).call(this);

/*
 *
 * More info at [www.dropzonejs.com](http://www.dropzonejs.com)
 *
 * Copyright (c) 2012, Matias Meno VERSION 4.0.0 January 24 2015
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

(function () {
    var Dropzone, Emitter, camelize, contentLoaded, detectVerticalSquash, drawImageIOSFix, noop, without,
      __slice = [].slice,
      __hasProp = {}.hasOwnProperty,
      __extends = function (child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

    noop = function () { };

    Emitter = (function () {
        function Emitter() { }

        Emitter.prototype.addEventListener = Emitter.prototype.on;

        Emitter.prototype.on = function (event, fn) {
            this._callbacks = this._callbacks || {};
            if (!this._callbacks[event]) {
                this._callbacks[event] = [];
            }
            this._callbacks[event].push(fn);
            return this;
        };

        Emitter.prototype.emit = function () {
            var args, callback, callbacks, event, _i, _len;
            event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            this._callbacks = this._callbacks || {};
            callbacks = this._callbacks[event];
            if (callbacks) {
                for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
                    callback = callbacks[_i];
                    callback.apply(this, args);
                }
            }
            return this;
        };

        Emitter.prototype.removeListener = Emitter.prototype.off;

        Emitter.prototype.removeAllListeners = Emitter.prototype.off;

        Emitter.prototype.removeEventListener = Emitter.prototype.off;

        Emitter.prototype.off = function (event, fn) {
            var callback, callbacks, i, _i, _len;
            if (!this._callbacks || arguments.length === 0) {
                this._callbacks = {};
                return this;
            }
            callbacks = this._callbacks[event];
            if (!callbacks) {
                return this;
            }
            if (arguments.length === 1) {
                delete this._callbacks[event];
                return this;
            }
            for (i = _i = 0, _len = callbacks.length; _i < _len; i = ++_i) {
                callback = callbacks[i];
                if (callback === fn) {
                    callbacks.splice(i, 1);
                    break;
                }
            }
            return this;
        };

        return Emitter;

    })();

    Dropzone = (function (_super) {
        var extend, resolveOption;

        __extends(Dropzone, _super);

        Dropzone.prototype.Emitter = Emitter;


        /*
        This is a list of all available events you can register on a dropzone object.
        
        You can register an event handler like this:
        
            dropzone.on("dragEnter", function() { });
         */

        Dropzone.prototype.events = ["drop", "dragstart", "dragend", "dragenter", "dragover", "dragleave", "addedfile", "removedfile", "thumbnail", "error", "errormultiple", "processing", "processingmultiple", "uploadprogress", "totaluploadprogress", "sending", "sendingmultiple", "success", "successmultiple", "canceled", "canceledmultiple", "complete", "completemultiple", "reset", "maxfilesexceeded", "maxfilesreached", "queuecomplete"];

        Dropzone.prototype.defaultOptions = {
            url: null,
            method: "post",
            withCredentials: false,
            parallelUploads: 2,
            uploadMultiple: false,
            maxFilesize: 256,
            paramName: "file",
            createImageThumbnails: true,
            maxThumbnailFilesize: 10,
            thumbnailWidth: 120,
            thumbnailHeight: 120,
            filesizeBase: 1000,
            maxFiles: null,
            filesizeBase: 1000,
            params: {},
            clickable: true,
            ignoreHiddenFiles: true,
            acceptedFiles: null,
            acceptedMimeTypes: null,
            autoProcessQueue: true,
            autoQueue: true,
            addRemoveLinks: false,
            previewsContainer: null,
            capture: null,
            dictDefaultMessage: "Drop files here to upload",
            dictFallbackMessage: "Your browser does not support drag'n'drop file uploads.",
            dictFallbackText: "Please use the fallback form below to upload your files like in the olden days.",
            dictFileTooBig: "File is too big ({{filesize}}MiB). Max filesize: {{maxFilesize}}MiB.",
            dictInvalidFileType: "You can't upload files of this type.",
            dictResponseError: "Server responded with {{statusCode}} code.",
            dictCancelUpload: "Cancel upload",
            dictCancelUploadConfirmation: "Are you sure you want to cancel this upload?",
            dictRemoveFile: "Remove file",
            dictRemoveFileConfirmation: null,
            dictMaxFilesExceeded: "You can not upload any more files.",
            accept: function (file, done) {
                return done();
            },
            init: function () {
                return noop;
            },
            forceFallback: false,
            fallback: function () {
                var child, messageElement, span, _i, _len, _ref;
                this.element.className = "" + this.element.className + " dz-browser-not-supported";
                _ref = this.element.getElementsByTagName("div");
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    child = _ref[_i];
                    if (/(^| )dz-message($| )/.test(child.className)) {
                        messageElement = child;
                        child.className = "dz-message";
                        continue;
                    }
                }
                if (!messageElement) {
                    messageElement = Dropzone.createElement("<div class=\"dz-message\"><span></span></div>");
                    this.element.appendChild(messageElement);
                }
                span = messageElement.getElementsByTagName("span")[0];
                if (span) {
                    span.textContent = this.options.dictFallbackMessage;
                }
                return this.element.appendChild(this.getFallbackForm());
            },
            resize: function (file) {
                var info, srcRatio, trgRatio;
                info = {
                    srcX: 0,
                    srcY: 0,
                    srcWidth: file.width,
                    srcHeight: file.height
                };
                srcRatio = file.width / file.height;
                info.optWidth = this.options.thumbnailWidth;
                info.optHeight = this.options.thumbnailHeight;
                if ((info.optWidth == null) && (info.optHeight == null)) {
                    info.optWidth = info.srcWidth;
                    info.optHeight = info.srcHeight;
                } else if (info.optWidth == null) {
                    info.optWidth = srcRatio * info.optHeight;
                } else if (info.optHeight == null) {
                    info.optHeight = (1 / srcRatio) * info.optWidth;
                }
                trgRatio = info.optWidth / info.optHeight;
                if (file.height < info.optHeight || file.width < info.optWidth) {
                    info.trgHeight = info.srcHeight;
                    info.trgWidth = info.srcWidth;
                } else {
                    if (srcRatio > trgRatio) {
                        info.srcHeight = file.height;
                        info.srcWidth = info.srcHeight * trgRatio;
                    } else {
                        info.srcWidth = file.width;
                        info.srcHeight = info.srcWidth / trgRatio;
                    }
                }
                info.srcX = (file.width - info.srcWidth) / 2;
                info.srcY = (file.height - info.srcHeight) / 2;
                return info;
            },

            /*
            Those functions register themselves to the events on init and handle all
            the user interface specific stuff. Overwriting them won't break the upload
            but can break the way it's displayed.
            You can overwrite them if you don't like the default behavior. If you just
            want to add an additional event handler, register it on the dropzone object
            and don't overwrite those options.
             */
            drop: function (e) {
                return this.element.classList.remove("dz-drag-hover");
            },
            dragstart: noop,
            dragend: function (e) {
                return this.element.classList.remove("dz-drag-hover");
            },
            dragenter: function (e) {
                return this.element.classList.add("dz-drag-hover");
            },
            dragover: function (e) {
                return this.element.classList.add("dz-drag-hover");
            },
            dragleave: function (e) {
                return this.element.classList.remove("dz-drag-hover");
            },
            paste: noop,
            reset: function () {
                return this.element.classList.remove("dz-started");
            },
            addedfile: function (file) {
                var node, removeFileEvent, removeLink, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
                if (this.element === this.previewsContainer) {
                    this.element.classList.add("dz-started");
                }
                if (this.previewsContainer) {
                    file.previewElement = Dropzone.createElement(this.options.previewTemplate.trim());
                    file.previewTemplate = file.previewElement;
                    this.previewsContainer.appendChild(file.previewElement);
                    _ref = file.previewElement.querySelectorAll("[data-dz-name]");
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        node = _ref[_i];
                        node.textContent = file.name;
                    }
                    _ref1 = file.previewElement.querySelectorAll("[data-dz-size]");
                    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                        node = _ref1[_j];
                        node.innerHTML = this.filesize(file.size);
                    }
                    if (this.options.addRemoveLinks) {
                        file._removeLink = Dropzone.createElement("<a class=\"dz-remove\" href=\"javascript:undefined;\" data-dz-remove>" + this.options.dictRemoveFile + "</a>");
                        file.previewElement.appendChild(file._removeLink);
                    }
                    removeFileEvent = (function (_this) {
                        return function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (file.status === Dropzone.UPLOADING) {
                                return Dropzone.confirm(_this.options.dictCancelUploadConfirmation, function () {
                                    return _this.removeFile(file);
                                });
                            } else {
                                if (_this.options.dictRemoveFileConfirmation) {
                                    return Dropzone.confirm(_this.options.dictRemoveFileConfirmation, function () {
                                        return _this.removeFile(file);
                                    });
                                } else {
                                    return _this.removeFile(file);
                                }
                            }
                        };
                    })(this);
                    _ref2 = file.previewElement.querySelectorAll("[data-dz-remove]");
                    _results = [];
                    for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                        removeLink = _ref2[_k];
                        _results.push(removeLink.addEventListener("click", removeFileEvent));
                    }
                    return _results;
                }
            },
            removedfile: function (file) {
                var _ref;
                if (file.previewElement) {
                    if ((_ref = file.previewElement) != null) {
                        _ref.parentNode.removeChild(file.previewElement);
                    }
                }
                return this._updateMaxFilesReachedClass();
            },
            thumbnail: function (file, dataUrl) {
                var thumbnailElement, _i, _len, _ref;
                if (file.previewElement) {
                    file.previewElement.classList.remove("dz-file-preview");
                    _ref = file.previewElement.querySelectorAll("[data-dz-thumbnail]");
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        thumbnailElement = _ref[_i];
                        thumbnailElement.alt = file.name;
                        thumbnailElement.src = dataUrl;
                    }
                    return setTimeout(((function (_this) {
                        return function () {
                            return file.previewElement.classList.add("dz-image-preview");
                        };
                    })(this)), 1);
                }
            },
            error: function (file, message) {
                var node, _i, _len, _ref, _results;
                if (file.previewElement) {
                    file.previewElement.classList.add("dz-error");
                    if (typeof message !== "String" && message.error) {
                        message = message.error;
                    }
                    _ref = file.previewElement.querySelectorAll("[data-dz-errormessage]");
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        node = _ref[_i];
                        _results.push(node.textContent = message);
                    }
                    return _results;
                }
            },
            errormultiple: noop,
            processing: function (file) {
                if (file.previewElement) {
                    file.previewElement.classList.add("dz-processing");
                    if (file._removeLink) {
                        return file._removeLink.textContent = this.options.dictCancelUpload;
                    }
                }
            },
            processingmultiple: noop,
            uploadprogress: function (file, progress, bytesSent) {
                var node, _i, _len, _ref, _results;
                if (file.previewElement) {
                    _ref = file.previewElement.querySelectorAll("[data-dz-uploadprogress]");
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        node = _ref[_i];
                        if (node.nodeName === 'PROGRESS') {
                            _results.push(node.value = progress);
                        } else {
                            _results.push(node.style.width = "" + progress + "%");
                        }
                    }
                    return _results;
                }
            },
            totaluploadprogress: noop,
            sending: noop,
            sendingmultiple: noop,
            success: function (file) {
                if (file.previewElement) {
                    return file.previewElement.classList.add("dz-success");
                }
            },
            successmultiple: noop,
            canceled: function (file) {
                return this.emit("error", file, "Upload canceled.");
            },
            canceledmultiple: noop,
            complete: function (file) {
                if (file._removeLink) {
                    file._removeLink.textContent = this.options.dictRemoveFile;
                }
                if (file.previewElement) {
                    return file.previewElement.classList.add("dz-complete");
                }
            },
            completemultiple: noop,
            maxfilesexceeded: noop,
            maxfilesreached: noop,
            queuecomplete: noop,
            previewTemplate: "<div class=\"dz-preview dz-file-preview\">\n  <div class=\"dz-image\"><img data-dz-thumbnail /></div>\n  <div class=\"dz-details\">\n    <div class=\"dz-size\"><span data-dz-size></span></div>\n    <div class=\"dz-filename\"><span data-dz-name></span></div>\n  </div>\n  <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n  <div class=\"dz-error-message\"><span data-dz-errormessage></span></div>\n  <div class=\"dz-success-mark\">\n    <svg width=\"54px\" height=\"54px\" viewBox=\"0 0 54 54\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:sketch=\"http://www.bohemiancoding.com/sketch/ns\">\n      <title>Check</title>\n      <defs></defs>\n      <g id=\"Page-1\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\" sketch:type=\"MSPage\">\n        <path d=\"M23.5,31.8431458 L17.5852419,25.9283877 C16.0248253,24.3679711 13.4910294,24.366835 11.9289322,25.9289322 C10.3700136,27.4878508 10.3665912,30.0234455 11.9283877,31.5852419 L20.4147581,40.0716123 C20.5133999,40.1702541 20.6159315,40.2626649 20.7218615,40.3488435 C22.2835669,41.8725651 24.794234,41.8626202 26.3461564,40.3106978 L43.3106978,23.3461564 C44.8771021,21.7797521 44.8758057,19.2483887 43.3137085,17.6862915 C41.7547899,16.1273729 39.2176035,16.1255422 37.6538436,17.6893022 L23.5,31.8431458 Z M27,53 C41.3594035,53 53,41.3594035 53,27 C53,12.6405965 41.3594035,1 27,1 C12.6405965,1 1,12.6405965 1,27 C1,41.3594035 12.6405965,53 27,53 Z\" id=\"Oval-2\" stroke-opacity=\"0.198794158\" stroke=\"#747474\" fill-opacity=\"0.816519475\" fill=\"#FFFFFF\" sketch:type=\"MSShapeGroup\"></path>\n      </g>\n    </svg>\n  </div>\n  <div class=\"dz-error-mark\">\n    <svg width=\"54px\" height=\"54px\" viewBox=\"0 0 54 54\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:sketch=\"http://www.bohemiancoding.com/sketch/ns\">\n      <title>Error</title>\n      <defs></defs>\n      <g id=\"Page-1\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\" sketch:type=\"MSPage\">\n        <g id=\"Check-+-Oval-2\" sketch:type=\"MSLayerGroup\" stroke=\"#747474\" stroke-opacity=\"0.198794158\" fill=\"#FFFFFF\" fill-opacity=\"0.816519475\">\n          <path d=\"M32.6568542,29 L38.3106978,23.3461564 C39.8771021,21.7797521 39.8758057,19.2483887 38.3137085,17.6862915 C36.7547899,16.1273729 34.2176035,16.1255422 32.6538436,17.6893022 L27,23.3431458 L21.3461564,17.6893022 C19.7823965,16.1255422 17.2452101,16.1273729 15.6862915,17.6862915 C14.1241943,19.2483887 14.1228979,21.7797521 15.6893022,23.3461564 L21.3431458,29 L15.6893022,34.6538436 C14.1228979,36.2202479 14.1241943,38.7516113 15.6862915,40.3137085 C17.2452101,41.8726271 19.7823965,41.8744578 21.3461564,40.3106978 L27,34.6568542 L32.6538436,40.3106978 C34.2176035,41.8744578 36.7547899,41.8726271 38.3137085,40.3137085 C39.8758057,38.7516113 39.8771021,36.2202479 38.3106978,34.6538436 L32.6568542,29 Z M27,53 C41.3594035,53 53,41.3594035 53,27 C53,12.6405965 41.3594035,1 27,1 C12.6405965,1 1,12.6405965 1,27 C1,41.3594035 12.6405965,53 27,53 Z\" id=\"Oval-2\" sketch:type=\"MSShapeGroup\"></path>\n        </g>\n      </g>\n    </svg>\n  </div>\n</div>"
        };

        extend = function () {
            var key, object, objects, target, val, _i, _len;
            target = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            for (_i = 0, _len = objects.length; _i < _len; _i++) {
                object = objects[_i];
                for (key in object) {
                    val = object[key];
                    target[key] = val;
                }
            }
            return target;
        };

        function Dropzone(element, options) {
            var elementOptions, fallback, _ref;
            this.element = element;
            this.version = Dropzone.version;
            this.defaultOptions.previewTemplate = this.defaultOptions.previewTemplate.replace(/\n*/g, "");
            this.clickableElements = [];
            this.listeners = [];
            this.files = [];
            if (typeof this.element === "string") {
                this.element = document.querySelector(this.element);
            }
            if (!(this.element && (this.element.nodeType != null))) {
                throw new Error("Invalid dropzone element.");
            }
            if (this.element.dropzone) {
                throw new Error("Dropzone already attached.");
            }
            Dropzone.instances.push(this);
            this.element.dropzone = this;
            elementOptions = (_ref = Dropzone.optionsForElement(this.element)) != null ? _ref : {};
            this.options = extend({}, this.defaultOptions, elementOptions, options != null ? options : {});
            if (this.options.forceFallback || !Dropzone.isBrowserSupported()) {
                return this.options.fallback.call(this);
            }
            if (this.options.url == null) {
                this.options.url = this.element.getAttribute("action");
            }
            if (!this.options.url) {
                throw new Error("No URL provided.");
            }
            if (this.options.acceptedFiles && this.options.acceptedMimeTypes) {
                throw new Error("You can't provide both 'acceptedFiles' and 'acceptedMimeTypes'. 'acceptedMimeTypes' is deprecated.");
            }
            if (this.options.acceptedMimeTypes) {
                this.options.acceptedFiles = this.options.acceptedMimeTypes;
                delete this.options.acceptedMimeTypes;
            }
            this.options.method = this.options.method.toUpperCase();
            if ((fallback = this.getExistingFallback()) && fallback.parentNode) {
                fallback.parentNode.removeChild(fallback);
            }
            if (this.options.previewsContainer !== false) {
                if (this.options.previewsContainer) {
                    this.previewsContainer = Dropzone.getElement(this.options.previewsContainer, "previewsContainer");
                } else {
                    this.previewsContainer = this.element;
                }
            }
            if (this.options.clickable) {
                if (this.options.clickable === true) {
                    this.clickableElements = [this.element];
                } else {
                    this.clickableElements = Dropzone.getElements(this.options.clickable, "clickable");
                }
            }
            this.init();
        }

        Dropzone.prototype.getAcceptedFiles = function () {
            var file, _i, _len, _ref, _results;
            _ref = this.files;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                file = _ref[_i];
                if (file.accepted) {
                    _results.push(file);
                }
            }
            return _results;
        };

        Dropzone.prototype.getRejectedFiles = function () {
            var file, _i, _len, _ref, _results;
            _ref = this.files;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                file = _ref[_i];
                if (!file.accepted) {
                    _results.push(file);
                }
            }
            return _results;
        };

        Dropzone.prototype.getFilesWithStatus = function (status) {
            var file, _i, _len, _ref, _results;
            _ref = this.files;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                file = _ref[_i];
                if (file.status === status) {
                    _results.push(file);
                }
            }
            return _results;
        };

        Dropzone.prototype.getQueuedFiles = function () {
            return this.getFilesWithStatus(Dropzone.QUEUED);
        };

        Dropzone.prototype.getUploadingFiles = function () {
            return this.getFilesWithStatus(Dropzone.UPLOADING);
        };

        Dropzone.prototype.getActiveFiles = function () {
            var file, _i, _len, _ref, _results;
            _ref = this.files;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                file = _ref[_i];
                if (file.status === Dropzone.UPLOADING || file.status === Dropzone.QUEUED) {
                    _results.push(file);
                }
            }
            return _results;
        };

        Dropzone.prototype.init = function () {
            var eventName, noPropagation, setupHiddenFileInput, _i, _len, _ref, _ref1;
            if (this.element.tagName === "form") {
                this.element.setAttribute("enctype", "multipart/form-data");
            }
            if (this.element.classList.contains("dropzone") && !this.element.querySelector(".dz-message")) {
                this.element.appendChild(Dropzone.createElement("<div class=\"dz-default dz-message\"><span>" + this.options.dictDefaultMessage + "</span></div>"));
            }
            if (this.clickableElements.length) {
                setupHiddenFileInput = (function (_this) {
                    return function () {
                        if (_this.hiddenFileInput) {
                            document.body.removeChild(_this.hiddenFileInput);
                        }
                        _this.hiddenFileInput = document.createElement("input");
                        _this.hiddenFileInput.setAttribute("type", "file");
                        if ((_this.options.maxFiles == null) || _this.options.maxFiles > 1) {
                            _this.hiddenFileInput.setAttribute("multiple", "multiple");
                        }
                        _this.hiddenFileInput.className = "dz-hidden-input";
                        if (_this.options.acceptedFiles != null) {
                            _this.hiddenFileInput.setAttribute("accept", _this.options.acceptedFiles);
                        }
                        if (_this.options.capture != null) {
                            _this.hiddenFileInput.setAttribute("capture", _this.options.capture);
                        }
                        _this.hiddenFileInput.style.visibility = "hidden";
                        _this.hiddenFileInput.style.position = "absolute";
                        _this.hiddenFileInput.style.top = "0";
                        _this.hiddenFileInput.style.left = "0";
                        _this.hiddenFileInput.style.height = "0";
                        _this.hiddenFileInput.style.width = "0";
                        document.body.appendChild(_this.hiddenFileInput);
                        return _this.hiddenFileInput.addEventListener("change", function () {
                            var file, files, _i, _len;
                            files = _this.hiddenFileInput.files;
                            if (files.length) {
                                for (_i = 0, _len = files.length; _i < _len; _i++) {
                                    file = files[_i];
                                    _this.addFile(file);
                                }
                            }
                            return setupHiddenFileInput();
                        });
                    };
                })(this);
                setupHiddenFileInput();
            }
            this.URL = (_ref = window.URL) != null ? _ref : window.webkitURL;
            _ref1 = this.events;
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                eventName = _ref1[_i];
                this.on(eventName, this.options[eventName]);
            }
            this.on("uploadprogress", (function (_this) {
                return function () {
                    return _this.updateTotalUploadProgress();
                };
            })(this));
            this.on("removedfile", (function (_this) {
                return function () {
                    return _this.updateTotalUploadProgress();
                };
            })(this));
            this.on("canceled", (function (_this) {
                return function (file) {
                    return _this.emit("complete", file);
                };
            })(this));
            this.on("complete", (function (_this) {
                return function (file) {
                    if (_this.getUploadingFiles().length === 0 && _this.getQueuedFiles().length === 0) {
                        return setTimeout((function () {
                            return _this.emit("queuecomplete");
                        }), 0);
                    }
                };
            })(this));
            noPropagation = function (e) {
                e.stopPropagation();
                if (e.preventDefault) {
                    return e.preventDefault();
                } else {
                    return e.returnValue = false;
                }
            };
            this.listeners = [
              {
                  element: this.element,
                  events: {
                      "dragstart": (function (_this) {
                          return function (e) {
                              return _this.emit("dragstart", e);
                          };
                      })(this),
                      "dragenter": (function (_this) {
                          return function (e) {
                              noPropagation(e);
                              return _this.emit("dragenter", e);
                          };
                      })(this),
                      "dragover": (function (_this) {
                          return function (e) {
                              var efct;
                              try {
                                  efct = e.dataTransfer.effectAllowed;
                              } catch (_error) { }
                              e.dataTransfer.dropEffect = 'move' === efct || 'linkMove' === efct ? 'move' : 'copy';
                              noPropagation(e);
                              return _this.emit("dragover", e);
                          };
                      })(this),
                      "dragleave": (function (_this) {
                          return function (e) {
                              return _this.emit("dragleave", e);
                          };
                      })(this),
                      "drop": (function (_this) {
                          return function (e) {
                              noPropagation(e);
                              return _this.drop(e);
                          };
                      })(this),
                      "dragend": (function (_this) {
                          return function (e) {
                              return _this.emit("dragend", e);
                          };
                      })(this)
                  }
              }
            ];
            this.clickableElements.forEach((function (_this) {
                return function (clickableElement) {
                    return _this.listeners.push({
                        element: clickableElement,
                        events: {
                            "click": function (evt) {
                                if ((clickableElement !== _this.element) || (evt.target === _this.element || Dropzone.elementInside(evt.target, _this.element.querySelector(".dz-message")))) {
                                    return _this.hiddenFileInput.click();
                                }
                            }
                        }
                    });
                };
            })(this));
            this.enable();
            return this.options.init.call(this);
        };

        Dropzone.prototype.destroy = function () {
            var _ref;
            this.disable();
            this.removeAllFiles(true);
            if ((_ref = this.hiddenFileInput) != null ? _ref.parentNode : void 0) {
                this.hiddenFileInput.parentNode.removeChild(this.hiddenFileInput);
                this.hiddenFileInput = null;
            }
            delete this.element.dropzone;
            return Dropzone.instances.splice(Dropzone.instances.indexOf(this), 1);
        };

        Dropzone.prototype.updateTotalUploadProgress = function () {
            var activeFiles, file, totalBytes, totalBytesSent, totalUploadProgress, _i, _len, _ref;
            totalBytesSent = 0;
            totalBytes = 0;
            activeFiles = this.getActiveFiles();
            if (activeFiles.length) {
                _ref = this.getActiveFiles();
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    file = _ref[_i];
                    totalBytesSent += file.upload.bytesSent;
                    totalBytes += file.upload.total;
                }
                totalUploadProgress = 100 * totalBytesSent / totalBytes;
            } else {
                totalUploadProgress = 100;
            }
            return this.emit("totaluploadprogress", totalUploadProgress, totalBytes, totalBytesSent);
        };

        Dropzone.prototype._getParamName = function (n) {
            if (typeof this.options.paramName === "function") {
                return this.options.paramName(n);
            } else {
                return "" + this.options.paramName + (this.options.uploadMultiple ? "[" + n + "]" : "");
            }
        };

        Dropzone.prototype.getFallbackForm = function () {
            var existingFallback, fields, fieldsString, form;
            if (existingFallback = this.getExistingFallback()) {
                return existingFallback;
            }
            fieldsString = "<div class=\"dz-fallback\">";
            if (this.options.dictFallbackText) {
                fieldsString += "<p>" + this.options.dictFallbackText + "</p>";
            }
            fieldsString += "<input type=\"file\" name=\"" + (this._getParamName(0)) + "\" " + (this.options.uploadMultiple ? 'multiple="multiple"' : void 0) + " /><input type=\"submit\" value=\"Upload!\"></div>";
            fields = Dropzone.createElement(fieldsString);
            if (this.element.tagName !== "FORM") {
                form = Dropzone.createElement("<form action=\"" + this.options.url + "\" enctype=\"multipart/form-data\" method=\"" + this.options.method + "\"></form>");
                form.appendChild(fields);
            } else {
                this.element.setAttribute("enctype", "multipart/form-data");
                this.element.setAttribute("method", this.options.method);
            }
            return form != null ? form : fields;
        };

        Dropzone.prototype.getExistingFallback = function () {
            var fallback, getFallback, tagName, _i, _len, _ref;
            getFallback = function (elements) {
                var el, _i, _len;
                for (_i = 0, _len = elements.length; _i < _len; _i++) {
                    el = elements[_i];
                    if (/(^| )fallback($| )/.test(el.className)) {
                        return el;
                    }
                }
            };
            _ref = ["div", "form"];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                tagName = _ref[_i];
                if (fallback = getFallback(this.element.getElementsByTagName(tagName))) {
                    return fallback;
                }
            }
        };

        Dropzone.prototype.setupEventListeners = function () {
            var elementListeners, event, listener, _i, _len, _ref, _results;
            _ref = this.listeners;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                elementListeners = _ref[_i];
                _results.push((function () {
                    var _ref1, _results1;
                    _ref1 = elementListeners.events;
                    _results1 = [];
                    for (event in _ref1) {
                        listener = _ref1[event];
                        _results1.push(elementListeners.element.addEventListener(event, listener, false));
                    }
                    return _results1;
                })());
            }
            return _results;
        };

        Dropzone.prototype.removeEventListeners = function () {
            var elementListeners, event, listener, _i, _len, _ref, _results;
            _ref = this.listeners;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                elementListeners = _ref[_i];
                _results.push((function () {
                    var _ref1, _results1;
                    _ref1 = elementListeners.events;
                    _results1 = [];
                    for (event in _ref1) {
                        listener = _ref1[event];
                        _results1.push(elementListeners.element.removeEventListener(event, listener, false));
                    }
                    return _results1;
                })());
            }
            return _results;
        };

        Dropzone.prototype.disable = function () {
            var file, _i, _len, _ref, _results;
            this.clickableElements.forEach(function (element) {
                return element.classList.remove("dz-clickable");
            });
            this.removeEventListeners();
            _ref = this.files;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                file = _ref[_i];
                _results.push(this.cancelUpload(file));
            }
            return _results;
        };

        Dropzone.prototype.enable = function () {
            this.clickableElements.forEach(function (element) {
                return element.classList.add("dz-clickable");
            });
            return this.setupEventListeners();
        };

        Dropzone.prototype.filesize = function (size) {
            var cutoff, i, selectedSize, selectedUnit, unit, units, _i, _len;
            units = ['TB', 'GB', 'MB', 'KB', 'b'];
            selectedSize = selectedUnit = null;
            for (i = _i = 0, _len = units.length; _i < _len; i = ++_i) {
                unit = units[i];
                cutoff = Math.pow(this.options.filesizeBase, 4 - i) / 10;
                if (size >= cutoff) {
                    selectedSize = size / Math.pow(this.options.filesizeBase, 4 - i);
                    selectedUnit = unit;
                    break;
                }
            }
            selectedSize = Math.round(10 * selectedSize) / 10;
            return "<strong>" + selectedSize + "</strong> " + selectedUnit;
        };

        Dropzone.prototype._updateMaxFilesReachedClass = function () {
            if ((this.options.maxFiles != null) && this.getAcceptedFiles().length >= this.options.maxFiles) {
                if (this.getAcceptedFiles().length === this.options.maxFiles) {
                    this.emit('maxfilesreached', this.files);
                }
                return this.element.classList.add("dz-max-files-reached");
            } else {
                return this.element.classList.remove("dz-max-files-reached");
            }
        };

        Dropzone.prototype.drop = function (e) {
            var files, items;
            if (!e.dataTransfer) {
                return;
            }
            this.emit("drop", e);
            files = e.dataTransfer.files;
            if (files.length) {
                items = e.dataTransfer.items;
                if (items && items.length && (items[0].webkitGetAsEntry != null)) {
                    this._addFilesFromItems(items);
                } else {
                    this.handleFiles(files);
                }
            }
        };

        Dropzone.prototype.paste = function (e) {
            var items, _ref;
            if ((e != null ? (_ref = e.clipboardData) != null ? _ref.items : void 0 : void 0) == null) {
                return;
            }
            this.emit("paste", e);
            items = e.clipboardData.items;
            if (items.length) {
                return this._addFilesFromItems(items);
            }
        };

        Dropzone.prototype.handleFiles = function (files) {
            var file, _i, _len, _results;
            _results = [];
            for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                _results.push(this.addFile(file));
            }
            return _results;
        };

        Dropzone.prototype._addFilesFromItems = function (items) {
            var entry, item, _i, _len, _results;
            _results = [];
            for (_i = 0, _len = items.length; _i < _len; _i++) {
                item = items[_i];
                if ((item.webkitGetAsEntry != null) && (entry = item.webkitGetAsEntry())) {
                    if (entry.isFile) {
                        _results.push(this.addFile(item.getAsFile()));
                    } else if (entry.isDirectory) {
                        _results.push(this._addFilesFromDirectory(entry, entry.name));
                    } else {
                        _results.push(void 0);
                    }
                } else if (item.getAsFile != null) {
                    if ((item.kind == null) || item.kind === "file") {
                        _results.push(this.addFile(item.getAsFile()));
                    } else {
                        _results.push(void 0);
                    }
                } else {
                    _results.push(void 0);
                }
            }
            return _results;
        };

        Dropzone.prototype._addFilesFromDirectory = function (directory, path) {
            var dirReader, entriesReader;
            dirReader = directory.createReader();
            entriesReader = (function (_this) {
                return function (entries) {
                    var entry, _i, _len;
                    for (_i = 0, _len = entries.length; _i < _len; _i++) {
                        entry = entries[_i];
                        if (entry.isFile) {
                            entry.file(function (file) {
                                if (_this.options.ignoreHiddenFiles && file.name.substring(0, 1) === '.') {
                                    return;
                                }
                                file.fullPath = "" + path + "/" + file.name;
                                return _this.addFile(file);
                            });
                        } else if (entry.isDirectory) {
                            _this._addFilesFromDirectory(entry, "" + path + "/" + entry.name);
                        }
                    }
                };
            })(this);
            return dirReader.readEntries(entriesReader, function (error) {
                return typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log(error) : void 0 : void 0;
            });
        };

        Dropzone.prototype.accept = function (file, done) {
            if (file.size > this.options.maxFilesize * 1024 * 1024) {
                return done(this.options.dictFileTooBig.replace("{{filesize}}", Math.round(file.size / 1024 / 10.24) / 100).replace("{{maxFilesize}}", this.options.maxFilesize));
            } else if (!Dropzone.isValidFile(file, this.options.acceptedFiles)) {
                return done(this.options.dictInvalidFileType);
            } else if ((this.options.maxFiles != null) && this.getAcceptedFiles().length >= this.options.maxFiles) {
                done(this.options.dictMaxFilesExceeded.replace("{{maxFiles}}", this.options.maxFiles));
                return this.emit("maxfilesexceeded", file);
            } else {
                return this.options.accept.call(this, file, done);
            }
        };

        Dropzone.prototype.addFile = function (file) {
            file.upload = {
                progress: 0,
                total: file.size,
                bytesSent: 0
            };
            this.files.push(file);
            file.status = Dropzone.ADDED;
            this.emit("addedfile", file);
            this._enqueueThumbnail(file);
            return this.accept(file, (function (_this) {
                return function (error) {
                    if (error) {
                        file.accepted = false;
                        _this._errorProcessing([file], error);
                    } else {
                        file.accepted = true;
                        if (_this.options.autoQueue) {
                            _this.enqueueFile(file);
                        }
                    }
                    return _this._updateMaxFilesReachedClass();
                };
            })(this));
        };

        Dropzone.prototype.enqueueFiles = function (files) {
            var file, _i, _len;
            for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                this.enqueueFile(file);
            }
            return null;
        };

        Dropzone.prototype.enqueueFile = function (file) {
            if (file.status === Dropzone.ADDED && file.accepted === true) {
                file.status = Dropzone.QUEUED;
                if (this.options.autoProcessQueue) {
                    return setTimeout(((function (_this) {
                        return function () {
                            return _this.processQueue();
                        };
                    })(this)), 0);
                }
            } else {
                throw new Error("This file can't be queued because it has already been processed or was rejected.");
            }
        };

        Dropzone.prototype._thumbnailQueue = [];

        Dropzone.prototype._processingThumbnail = false;

        Dropzone.prototype._enqueueThumbnail = function (file) {
            if (this.options.createImageThumbnails && file.type.match(/image.*/) && file.size <= this.options.maxThumbnailFilesize * 1024 * 1024) {
                this._thumbnailQueue.push(file);
                return setTimeout(((function (_this) {
                    return function () {
                        return _this._processThumbnailQueue();
                    };
                })(this)), 0);
            }
        };

        Dropzone.prototype._processThumbnailQueue = function () {
            if (this._processingThumbnail || this._thumbnailQueue.length === 0) {
                return;
            }
            this._processingThumbnail = true;
            return this.createThumbnail(this._thumbnailQueue.shift(), (function (_this) {
                return function () {
                    _this._processingThumbnail = false;
                    return _this._processThumbnailQueue();
                };
            })(this));
        };

        Dropzone.prototype.removeFile = function (file) {
            if (file.status === Dropzone.UPLOADING) {
                this.cancelUpload(file);
            }
            this.files = without(this.files, file);
            this.emit("removedfile", file);
            if (this.files.length === 0) {
                return this.emit("reset");
            }
        };

        Dropzone.prototype.removeAllFiles = function (cancelIfNecessary) {
            var file, _i, _len, _ref;
            if (cancelIfNecessary == null) {
                cancelIfNecessary = false;
            }
            _ref = this.files.slice();
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                file = _ref[_i];
                if (file.status !== Dropzone.UPLOADING || cancelIfNecessary) {
                    this.removeFile(file);
                }
            }
            return null;
        };

        Dropzone.prototype.createThumbnail = function (file, callback) {
            var fileReader;
            fileReader = new FileReader;
            fileReader.onload = (function (_this) {
                return function () {
                    var img;
                    if (file.type === "image/svg+xml") {
                        _this.emit("thumbnail", file, fileReader.result);
                        if (callback != null) {
                            callback();
                        }
                        return;
                    }
                    img = document.createElement("img");
                    img.onload = function () {
                        var canvas, ctx, resizeInfo, thumbnail, _ref, _ref1, _ref2, _ref3;
                        file.width = img.width;
                        file.height = img.height;
                        resizeInfo = _this.options.resize.call(_this, file);
                        if (resizeInfo.trgWidth == null) {
                            resizeInfo.trgWidth = resizeInfo.optWidth;
                        }
                        if (resizeInfo.trgHeight == null) {
                            resizeInfo.trgHeight = resizeInfo.optHeight;
                        }
                        canvas = document.createElement("canvas");
                        ctx = canvas.getContext("2d");
                        canvas.width = resizeInfo.trgWidth;
                        canvas.height = resizeInfo.trgHeight;
                        drawImageIOSFix(ctx, img, (_ref = resizeInfo.srcX) != null ? _ref : 0, (_ref1 = resizeInfo.srcY) != null ? _ref1 : 0, resizeInfo.srcWidth, resizeInfo.srcHeight, (_ref2 = resizeInfo.trgX) != null ? _ref2 : 0, (_ref3 = resizeInfo.trgY) != null ? _ref3 : 0, resizeInfo.trgWidth, resizeInfo.trgHeight);
                        thumbnail = canvas.toDataURL("image/png");
                        _this.emit("thumbnail", file, thumbnail);
                        if (callback != null) {
                            return callback();
                        }
                    };
                    img.onerror = callback;
                    return img.src = fileReader.result;
                };
            })(this);
            return fileReader.readAsDataURL(file);
        };

        Dropzone.prototype.processQueue = function () {
            var i, parallelUploads, processingLength, queuedFiles;
            parallelUploads = this.options.parallelUploads;
            processingLength = this.getUploadingFiles().length;
            i = processingLength;
            if (processingLength >= parallelUploads) {
                return;
            }
            queuedFiles = this.getQueuedFiles();
            if (!(queuedFiles.length > 0)) {
                return;
            }
            if (this.options.uploadMultiple) {
                return this.processFiles(queuedFiles.slice(0, parallelUploads - processingLength));
            } else {
                while (i < parallelUploads) {
                    if (!queuedFiles.length) {
                        return;
                    }
                    this.processFile(queuedFiles.shift());
                    i++;
                }
            }
        };

        Dropzone.prototype.processFile = function (file) {
            return this.processFiles([file]);
        };

        Dropzone.prototype.processFiles = function (files) {
            var file, _i, _len;
            for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                file.processing = true;
                file.status = Dropzone.UPLOADING;
                this.emit("processing", file);
            }
            if (this.options.uploadMultiple) {
                this.emit("processingmultiple", files);
            }
            return this.uploadFiles(files);
        };

        Dropzone.prototype._getFilesWithXhr = function (xhr) {
            var file, files;
            return files = (function () {
                var _i, _len, _ref, _results;
                _ref = this.files;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    file = _ref[_i];
                    if (file.xhr === xhr) {
                        _results.push(file);
                    }
                }
                return _results;
            }).call(this);
        };

        Dropzone.prototype.cancelUpload = function (file) {
            var groupedFile, groupedFiles, _i, _j, _len, _len1, _ref;
            if (file.status === Dropzone.UPLOADING) {
                groupedFiles = this._getFilesWithXhr(file.xhr);
                for (_i = 0, _len = groupedFiles.length; _i < _len; _i++) {
                    groupedFile = groupedFiles[_i];
                    groupedFile.status = Dropzone.CANCELED;
                }
                file.xhr.abort();
                for (_j = 0, _len1 = groupedFiles.length; _j < _len1; _j++) {
                    groupedFile = groupedFiles[_j];
                    this.emit("canceled", groupedFile);
                }
                if (this.options.uploadMultiple) {
                    this.emit("canceledmultiple", groupedFiles);
                }
            } else if ((_ref = file.status) === Dropzone.ADDED || _ref === Dropzone.QUEUED) {
                file.status = Dropzone.CANCELED;
                this.emit("canceled", file);
                if (this.options.uploadMultiple) {
                    this.emit("canceledmultiple", [file]);
                }
            }
            if (this.options.autoProcessQueue) {
                return this.processQueue();
            }
        };

        resolveOption = function () {
            var args, option;
            option = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            if (typeof option === 'function') {
                return option.apply(this, args);
            }
            return option;
        };

        Dropzone.prototype.uploadFile = function (file) {
            return this.uploadFiles([file]);
        };

        Dropzone.prototype.uploadFiles = function (files) {
            var file, formData, handleError, headerName, headerValue, headers, i, input, inputName, inputType, key, method, option, progressObj, response, updateProgress, url, value, xhr, _i, _j, _k, _l, _len, _len1, _len2, _len3, _m, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
            xhr = new XMLHttpRequest();
            for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                file.xhr = xhr;
            }
            method = resolveOption(this.options.method, files);
            url = resolveOption(this.options.url, files);
            xhr.open(method, url, true);
            xhr.withCredentials = !!this.options.withCredentials;
            response = null;
            handleError = (function (_this) {
                return function () {
                    var _j, _len1, _results;
                    _results = [];
                    for (_j = 0, _len1 = files.length; _j < _len1; _j++) {
                        file = files[_j];
                        _results.push(_this._errorProcessing(files, response || _this.options.dictResponseError.replace("{{statusCode}}", xhr.status), xhr));
                    }
                    return _results;
                };
            })(this);
            updateProgress = (function (_this) {
                return function (e) {
                    var allFilesFinished, progress, _j, _k, _l, _len1, _len2, _len3, _results;
                    if (e != null) {
                        progress = 100 * e.loaded / e.total;
                        for (_j = 0, _len1 = files.length; _j < _len1; _j++) {
                            file = files[_j];
                            file.upload = {
                                progress: progress,
                                total: e.total,
                                bytesSent: e.loaded
                            };
                        }
                    } else {
                        allFilesFinished = true;
                        progress = 100;
                        for (_k = 0, _len2 = files.length; _k < _len2; _k++) {
                            file = files[_k];
                            if (!(file.upload.progress === 100 && file.upload.bytesSent === file.upload.total)) {
                                allFilesFinished = false;
                            }
                            file.upload.progress = progress;
                            file.upload.bytesSent = file.upload.total;
                        }
                        if (allFilesFinished) {
                            return;
                        }
                    }
                    _results = [];
                    for (_l = 0, _len3 = files.length; _l < _len3; _l++) {
                        file = files[_l];
                        _results.push(_this.emit("uploadprogress", file, progress, file.upload.bytesSent));
                    }
                    return _results;
                };
            })(this);
            xhr.onload = (function (_this) {
                return function (e) {
                    var _ref;
                    if (files[0] && files[0].status === Dropzone.CANCELED) {
                        return;
                    }
                    if (xhr.readyState !== 4) {
                        return;
                    }
                    response = xhr.responseText;
                    if (xhr.getResponseHeader("content-type") && ~xhr.getResponseHeader("content-type").indexOf("application/json")) {
                        try {
                            response = JSON.parse(response);
                        } catch (_error) {
                            e = _error;
                            response = "Invalid JSON response from server.";
                        }
                    }
                    updateProgress();
                    if (!((200 <= (_ref = xhr.status) && _ref < 300))) {
                        return handleError();
                    } else {
                        return _this._finished(files, response, e);
                    }
                };
            })(this);
            xhr.onerror = (function (_this) {
                return function () {
                    if (files[0].status === Dropzone.CANCELED) {
                        return;
                    }
                    return handleError();
                };
            })(this);
            progressObj = (_ref = xhr.upload) != null ? _ref : xhr;
            progressObj.onprogress = updateProgress;
            headers = {
                "Accept": "application/json",
                "Cache-Control": "no-cache",
                "X-Requested-With": "XMLHttpRequest"
            };
            if (this.options.headers) {
                extend(headers, this.options.headers);
            }
            for (headerName in headers) {
                headerValue = headers[headerName];
                xhr.setRequestHeader(headerName, headerValue);
            }
            formData = new FormData();
            if (this.options.params) {
                _ref1 = this.options.params;
                for (key in _ref1) {
                    value = _ref1[key];
                    formData.append(key, value);
                }
            }
            for (_j = 0, _len1 = files.length; _j < _len1; _j++) {
                file = files[_j];
                this.emit("sending", file, xhr, formData);
            }
            if (this.options.uploadMultiple) {
                this.emit("sendingmultiple", files, xhr, formData);
            }
            if (this.element.tagName === "FORM") {
                _ref2 = this.element.querySelectorAll("input, textarea, select, button");
                for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                    input = _ref2[_k];
                    inputName = input.getAttribute("name");
                    inputType = input.getAttribute("type");
                    if (input.tagName === "SELECT" && input.hasAttribute("multiple")) {
                        _ref3 = input.options;
                        for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
                            option = _ref3[_l];
                            if (option.selected) {
                                formData.append(inputName, option.value);
                            }
                        }
                    } else if (!inputType || ((_ref4 = inputType.toLowerCase()) !== "checkbox" && _ref4 !== "radio") || input.checked) {
                        formData.append(inputName, input.value);
                    }
                }
            }
            for (i = _m = 0, _ref5 = files.length - 1; 0 <= _ref5 ? _m <= _ref5 : _m >= _ref5; i = 0 <= _ref5 ? ++_m : --_m) {
                if (typeof files[i] != "undefined") {
                    formData.append(this._getParamName(i), files[i], files[i].name);
                } else {
                    formData.append(this._getParamName(i), files[i], "");
                }
            }
            return xhr.send(formData);
        };

        Dropzone.prototype._finished = function (files, responseText, e) {
            var file, _i, _len;
            for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                file.status = Dropzone.SUCCESS;
                this.emit("success", file, responseText, e);
                this.emit("complete", file);
            }
            if (this.options.uploadMultiple) {
                this.emit("successmultiple", files, responseText, e);
                this.emit("completemultiple", files);
            }
            if (this.options.autoProcessQueue) {
                return this.processQueue();
            }
        };

        Dropzone.prototype._errorProcessing = function (files, message, xhr) {
            var file, _i, _len;
            for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                file.status = Dropzone.ERROR;
                this.emit("error", file, message, xhr);
                this.emit("complete", file);
            }
            if (this.options.uploadMultiple) {
                this.emit("errormultiple", files, message, xhr);
                this.emit("completemultiple", files);
            }
            if (this.options.autoProcessQueue) {
                return this.processQueue();
            }
        };

        return Dropzone;

    })(Emitter);

    Dropzone.version = "4.0.0";

    Dropzone.options = {};

    Dropzone.optionsForElement = function (element) {
        if (element.getAttribute("id")) {
            return Dropzone.options[camelize(element.getAttribute("id"))];
        } else {
            return void 0;
        }
    };

    Dropzone.instances = [];

    Dropzone.forElement = function (element) {
        if (typeof element === "string") {
            element = document.querySelector(element);
        }
        if ((element != null ? element.dropzone : void 0) == null) {
            throw new Error("No Dropzone found for given element. This is probably because you're trying to access it before Dropzone had the time to initialize. Use the `init` option to setup any additional observers on your Dropzone.");
        }
        return element.dropzone;
    };

    Dropzone.autoDiscover = true;

    Dropzone.discover = function () {
        var checkElements, dropzone, dropzones, _i, _len, _results;
        if (document.querySelectorAll) {
            dropzones = document.querySelectorAll(".dropzone");
        } else {
            dropzones = [];
            checkElements = function (elements) {
                var el, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = elements.length; _i < _len; _i++) {
                    el = elements[_i];
                    if (/(^| )dropzone($| )/.test(el.className)) {
                        _results.push(dropzones.push(el));
                    } else {
                        _results.push(void 0);
                    }
                }
                return _results;
            };
            checkElements(document.getElementsByTagName("div"));
            checkElements(document.getElementsByTagName("form"));
        }
        _results = [];
        for (_i = 0, _len = dropzones.length; _i < _len; _i++) {
            dropzone = dropzones[_i];
            if (Dropzone.optionsForElement(dropzone) !== false) {
                _results.push(new Dropzone(dropzone));
            } else {
                _results.push(void 0);
            }
        }
        return _results;
    };

    Dropzone.blacklistedBrowsers = [/opera.*Macintosh.*version\/12/i];

    Dropzone.isBrowserSupported = function () {
        var capableBrowser, regex, _i, _len, _ref;
        capableBrowser = true;
        if (window.File && window.FileReader && window.FileList && window.Blob && window.FormData && document.querySelector) {
            if (!("classList" in document.createElement("a"))) {
                capableBrowser = false;
            } else {
                _ref = Dropzone.blacklistedBrowsers;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    regex = _ref[_i];
                    if (regex.test(navigator.userAgent)) {
                        capableBrowser = false;
                        continue;
                    }
                }
            }
        } else {
            capableBrowser = false;
        }
        return capableBrowser;
    };

    without = function (list, rejectedItem) {
        var item, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = list.length; _i < _len; _i++) {
            item = list[_i];
            if (item !== rejectedItem) {
                _results.push(item);
            }
        }
        return _results;
    };

    camelize = function (str) {
        return str.replace(/[\-_](\w)/g, function (match) {
            return match.charAt(1).toUpperCase();
        });
    };

    Dropzone.createElement = function (string) {
        var div;
        div = document.createElement("div");
        div.innerHTML = string;
        return div.childNodes[0];
    };

    Dropzone.elementInside = function (element, container) {
        if (element === container) {
            return true;
        }
        while (element = element.parentNode) {
            if (element === container) {
                return true;
            }
        }
        return false;
    };

    Dropzone.getElement = function (el, name) {
        var element;
        if (typeof el === "string") {
            element = document.querySelector(el);
        } else if (el.nodeType != null) {
            element = el;
        }
        if (element == null) {
            throw new Error("Invalid `" + name + "` option provided. Please provide a CSS selector or a plain HTML element.");
        }
        return element;
    };

    Dropzone.getElements = function (els, name) {
        var e, el, elements, _i, _j, _len, _len1, _ref;
        if (els instanceof Array) {
            elements = [];
            try {
                for (_i = 0, _len = els.length; _i < _len; _i++) {
                    el = els[_i];
                    elements.push(this.getElement(el, name));
                }
            } catch (_error) {
                e = _error;
                elements = null;
            }
        } else if (typeof els === "string") {
            elements = [];
            _ref = document.querySelectorAll(els);
            for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                el = _ref[_j];
                elements.push(el);
            }
        } else if (els.nodeType != null) {
            elements = [els];
        }
        if (!((elements != null) && elements.length)) {
            throw new Error("Invalid `" + name + "` option provided. Please provide a CSS selector, a plain HTML element or a list of those.");
        }
        return elements;
    };

    Dropzone.confirm = function (question, accepted, rejected) {
        if (window.confirm(question)) {
            return accepted();
        } else if (rejected != null) {
            return rejected();
        }
    };

    Dropzone.isValidFile = function (file, acceptedFiles) {
        var baseMimeType, mimeType, validType, _i, _len;
        if (!acceptedFiles) {
            return true;
        }
        acceptedFiles = acceptedFiles.split(",");
        mimeType = file.type;
        baseMimeType = mimeType.replace(/\/.*$/, "");
        for (_i = 0, _len = acceptedFiles.length; _i < _len; _i++) {
            validType = acceptedFiles[_i];
            validType = validType.trim();
            if (validType.charAt(0) === ".") {
                if (file.name.toLowerCase().indexOf(validType.toLowerCase(), file.name.length - validType.length) !== -1) {
                    return true;
                }
            } else if (/\/\*$/.test(validType)) {
                if (baseMimeType === validType.replace(/\/.*$/, "")) {
                    return true;
                }
            } else {
                if (mimeType === validType) {
                    return true;
                }
            }
        }
        return false;
    };

    if (typeof jQuery !== "undefined" && jQuery !== null) {
        jQuery.fn.dropzone = function (options) {
            return this.each(function () {
                return new Dropzone(this, options);
            });
        };
    }

    if (typeof module !== "undefined" && module !== null) {
        module.exports = Dropzone;
    } else {
        window.Dropzone = Dropzone;
    }

    Dropzone.ADDED = "added";

    Dropzone.QUEUED = "queued";

    Dropzone.ACCEPTED = Dropzone.QUEUED;

    Dropzone.UPLOADING = "uploading";

    Dropzone.PROCESSING = Dropzone.UPLOADING;

    Dropzone.CANCELED = "canceled";

    Dropzone.ERROR = "error";

    Dropzone.SUCCESS = "success";


    /*
    
    Bugfix for iOS 6 and 7
    Source: http://stackoverflow.com/questions/11929099/html5-canvas-drawimage-ratio-bug-ios
    based on the work of https://github.com/stomita/ios-imagefile-megapixel
     */

    detectVerticalSquash = function (img) {
        var alpha, canvas, ctx, data, ey, ih, iw, py, ratio, sy;
        iw = img.naturalWidth;
        ih = img.naturalHeight;
        canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = ih;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        data = ctx.getImageData(0, 0, 1, ih).data;
        sy = 0;
        ey = ih;
        py = ih;
        while (py > sy) {
            alpha = data[(py - 1) * 4 + 3];
            if (alpha === 0) {
                ey = py;
            } else {
                sy = py;
            }
            py = (ey + sy) >> 1;
        }
        ratio = py / ih;
        if (ratio === 0) {
            return 1;
        } else {
            return ratio;
        }
    };

    drawImageIOSFix = function (ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
        var vertSquashRatio;
        vertSquashRatio = detectVerticalSquash(img);
        return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
    };


    /*
     * contentloaded.js
     *
     * Author: Diego Perini (diego.perini at gmail.com)
     * Summary: cross-browser wrapper for DOMContentLoaded
     * Updated: 20101020
     * License: MIT
     * Version: 1.2
     *
     * URL:
     * http://javascript.nwbox.com/ContentLoaded/
     * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
     */

    contentLoaded = function (win, fn) {
        var add, doc, done, init, poll, pre, rem, root, top;
        done = false;
        top = true;
        doc = win.document;
        root = doc.documentElement;
        add = (doc.addEventListener ? "addEventListener" : "attachEvent");
        rem = (doc.addEventListener ? "removeEventListener" : "detachEvent");
        pre = (doc.addEventListener ? "" : "on");
        init = function (e) {
            if (e.type === "readystatechange" && doc.readyState !== "complete") {
                return;
            }
            (e.type === "load" ? win : doc)[rem](pre + e.type, init, false);
            if (!done && (done = true)) {
                return fn.call(win, e.type || e);
            }
        };
        poll = function () {
            var e;
            try {
                root.doScroll("left");
            } catch (_error) {
                e = _error;
                setTimeout(poll, 50);
                return;
            }
            return init("poll");
        };
        if (doc.readyState !== "complete") {
            if (doc.createEventObject && root.doScroll) {
                try {
                    top = !win.frameElement;
                } catch (_error) { }
                if (top) {
                    poll();
                }
            }
            doc[add](pre + "DOMContentLoaded", init, false);
            doc[add](pre + "readystatechange", init, false);
            return win[add](pre + "load", init, false);
        }
    };

    Dropzone._autoDiscoverFunction = function () {
        if (Dropzone.autoDiscover) {
            return Dropzone.discover();
        }
    };

    contentLoaded(window, Dropzone._autoDiscoverFunction);

}).call(this);

;(function () {
	'use strict';

	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */

	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/


	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;

		options = options || {};

		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;


		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;


		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;


		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;


		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;


		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;


		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;


		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;

		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;

		/**
		 * The maximum time for a tap
		 *
		 * @type number
		 */
		this.tapTimeout = options.tapTimeout || 700;

		if (FastClick.notNeeded(layer)) {
			return;
		}

		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}


		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}

		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}

		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);

		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};

			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}

		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {

			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}

	/**
	* Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
	*
	* @type boolean
	*/
	var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


	/**
	 * iOS 6.0-7.* requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {

		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}

			break;
		case 'input':

			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}

			break;
		case 'label':
		case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
		case 'video':
			return true;
		}

		return (/\bneedsclick\b/).test(target.className);
	};


	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};


	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;

		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}

		touch = event.changedTouches[0];

		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};

	FastClick.prototype.determineEventType = function(targetElement) {

		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}

		return 'click';
	};


	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;

		// Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};


	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;

		scrollParent = targetElement.fastClickScrollParent;

		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}

				parentElement = parentElement.parentElement;
			} while (parentElement);
		}

		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};


	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}

		return eventTarget;
	};


	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;

		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}

		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];

		if (deviceIsIOS) {

			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}

			if (!deviceIsIOS4) {

				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}

				this.lastTouchIdentifier = touch.identifier;

				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}

		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;

		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}

		return true;
	};


	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}

		return false;
	};


	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}

		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}

		return true;
	};


	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};


	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

		if (!this.trackingClick) {
			return true;
		}

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true;
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;

		this.lastClickTime = event.timeStamp;

		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;

		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];

			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}

		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}

				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}

			this.focus(targetElement);
			this.sendClick(targetElement, event);

			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}

			return false;
		}

		if (deviceIsIOS && !deviceIsIOS4) {

			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}

		return false;
	};


	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};


	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}

		if (event.forwardedTouchEvent) {
			return true;
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {

				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}

			// Cancel the event
			event.stopPropagation();
			event.preventDefault();

			return false;
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};


	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;

		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}

		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}

		permitted = this.onMouse(event);

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}

		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};


	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;

		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}

		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};


	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
		var firefoxVersion;

		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}

		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (chromeVersion) {

			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}

			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}

		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}

		// IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		// Firefox version - zero for other browsers
		firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (firefoxVersion >= 27) {
			// Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

			metaViewport = document.querySelector('meta[name=viewport]');
			if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
				return true;
			}
		}

		// IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
		// http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
		if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		return false;
	};


	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};


	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

		// AMD. Register as an anonymous module.
		define(function() {
			return FastClick;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick;
	} else {
		window.FastClick = FastClick;
	}
}());

/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.0
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if (force && is_safari && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var base64Data = reader.result;
							view.location.href = "data:attachment/file" + base64Data.slice(base64Data.search(/[,;]/));
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define([], function() {
    return saveAs;
  });
}

/*global angular:true, browser:true */

/**
 * @license HTTP Auth Interceptor Module for AngularJS
 * (c) 2012 Witold Szczerba
 * License: MIT
 */
(function () {
    'use strict';

    angular.module('http-auth-interceptor', ['http-auth-interceptor-buffer'])

    .factory('authService', ['$rootScope', 'httpBuffer', function ($rootScope, httpBuffer) {
        return {
            /**
             * Call this function to indicate that authentication was successfull and trigger a
             * retry of all deferred requests.
             * @param data an optional argument to pass on to $broadcast which may be useful for
             * example if you need to pass through details of the user that was logged in
             */
            loginConfirmed: function (data, configUpdater) {
                var updater = configUpdater || function (config) { return config; };
                $rootScope.$broadcast('event:auth-loginConfirmed', data);
                httpBuffer.retryAll(updater);
            },

            /**
             * Call this function to indicate that authentication should not proceed.
             * All deferred requests will be abandoned or rejected (if reason is provided).
             * @param data an optional argument to pass on to $broadcast.
             * @param reason if provided, the requests are rejected; abandoned otherwise.
             */
            loginCancelled: function (data, reason) {
                httpBuffer.rejectAll(reason);
                $rootScope.$broadcast('event:auth-loginCancelled', data);
            }
        };
    }])

    /**
     * $http interceptor.
     * On 401 response (without 'ignoreAuthModule' option) stores the request
     * and broadcasts 'event:angular-auth-loginRequired'.
     */
    .config(['$httpProvider', function ($httpProvider) {
        $httpProvider.interceptors.push(['$rootScope', '$q', 'httpBuffer', function ($rootScope, $q, httpBuffer) {
            return {
                responseError: function (rejection) {
                    if (rejection.status === 401 && !rejection.config.ignoreAuthModule) {
                        var deferred = $q.defer();
                        httpBuffer.append(rejection.config, deferred);
                        $rootScope.$broadcast('event:auth-loginRequired', rejection);
                        return deferred.promise;
                    }
                    // otherwise, default behaviour
                    return $q.reject(rejection);
                }
            };
        }]);
    }]);

    /**
     * Private module, a utility, required internally by 'http-auth-interceptor'.
     */
    angular.module('http-auth-interceptor-buffer', [])

    .factory('httpBuffer', ['$injector', function ($injector) {
        /** Holds all the requests, so they can be re-requested in future. */
        var buffer = [];

        /** Service initialized later because of circular dependency problem. */
        var $http;

        function retryHttpRequest(config, deferred) {
            function successCallback(response) {
                deferred.resolve(response);
            }
            function errorCallback(response) {
                deferred.reject(response);
            }
            $http = $http || $injector.get('$http');
            $http(config).then(successCallback, errorCallback);
        }

        return {
            /**
             * Appends HTTP request configuration object with deferred response attached to buffer.
             */
            append: function (config, deferred) {
                buffer.push({
                    config: config,
                    deferred: deferred
                });
            },

            /**
             * Abandon or reject (if reason provided) all the buffered requests.
             */
            rejectAll: function (reason) {
                if (reason) {
                    for (var i = 0; i < buffer.length; ++i) {
                        buffer[i].deferred.reject(reason);
                    }
                }
                buffer = [];
            },

            /**
             * Retries all the buffered requests clears the buffer.
             */
            retryAll: function (updater) {
                for (var i = 0; i < buffer.length; ++i) {
                    retryHttpRequest(updater(buffer[i].config), buffer[i].deferred);
                }
                buffer = [];
            }
        };
    }]);
})();

/**
*
* jquery.sparkline.js
*
* v2.1.2
* (c) Splunk, Inc
* Contact: Gareth Watts (gareth@splunk.com)
* http://omnipotent.net/jquery.sparkline/
*
* Generates inline sparkline charts from data supplied either to the method
* or inline in HTML
*
* Compatible with Internet Explorer 6.0+ and modern browsers equipped with the canvas tag
* (Firefox 2.0+, Safari, Opera, etc)
*
* License: New BSD License
*
* Copyright (c) 2012, Splunk Inc.
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without modification,
* are permitted provided that the following conditions are met:
*
*     * Redistributions of source code must retain the above copyright notice,
*       this list of conditions and the following disclaimer.
*     * Redistributions in binary form must reproduce the above copyright notice,
*       this list of conditions and the following disclaimer in the documentation
*       and/or other materials provided with the distribution.
*     * Neither the name of Splunk Inc nor the names of its contributors may
*       be used to endorse or promote products derived from this software without
*       specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
* EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
* OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
* SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
* SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
* OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
* HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
* OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
* SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*
*
* Usage:
*  $(selector).sparkline(values, options)
*
* If values is undefined or set to 'html' then the data values are read from the specified tag:
*   <p>Sparkline: <span class="sparkline">1,4,6,6,8,5,3,5</span></p>
*   $('.sparkline').sparkline();
* There must be no spaces in the enclosed data set
*
* Otherwise values must be an array of numbers or null values
*    <p>Sparkline: <span id="sparkline1">This text replaced if the browser is compatible</span></p>
*    $('#sparkline1').sparkline([1,4,6,6,8,5,3,5])
*    $('#sparkline2').sparkline([1,4,6,null,null,5,3,5])
*
* Values can also be specified in an HTML comment, or as a values attribute:
*    <p>Sparkline: <span class="sparkline"><!--1,4,6,6,8,5,3,5 --></span></p>
*    <p>Sparkline: <span class="sparkline" values="1,4,6,6,8,5,3,5"></span></p>
*    $('.sparkline').sparkline();
*
* For line charts, x values can also be specified:
*   <p>Sparkline: <span class="sparkline">1:1,2.7:4,3.4:6,5:6,6:8,8.7:5,9:3,10:5</span></p>
*    $('#sparkline1').sparkline([ [1,1], [2.7,4], [3.4,6], [5,6], [6,8], [8.7,5], [9,3], [10,5] ])
*
* By default, options should be passed in as teh second argument to the sparkline function:
*   $('.sparkline').sparkline([1,2,3,4], {type: 'bar'})
*
* Options can also be set by passing them on the tag itself.  This feature is disabled by default though
* as there's a slight performance overhead:
*   $('.sparkline').sparkline([1,2,3,4], {enableTagOptions: true})
*   <p>Sparkline: <span class="sparkline" sparkType="bar" sparkBarColor="red">loading</span></p>
* Prefix all options supplied as tag attribute with "spark" (configurable by setting tagOptionPrefix)
*
* Supported options:
*   lineColor - Color of the line used for the chart
*   fillColor - Color used to fill in the chart - Set to '' or false for a transparent chart
*   width - Width of the chart - Defaults to 3 times the number of values in pixels
*   height - Height of the chart - Defaults to the height of the containing element
*   chartRangeMin - Specify the minimum value to use for the Y range of the chart - Defaults to the minimum value supplied
*   chartRangeMax - Specify the maximum value to use for the Y range of the chart - Defaults to the maximum value supplied
*   chartRangeClip - Clip out of range values to the max/min specified by chartRangeMin and chartRangeMax
*   chartRangeMinX - Specify the minimum value to use for the X range of the chart - Defaults to the minimum value supplied
*   chartRangeMaxX - Specify the maximum value to use for the X range of the chart - Defaults to the maximum value supplied
*   composite - If true then don't erase any existing chart attached to the tag, but draw
*           another chart over the top - Note that width and height are ignored if an
*           existing chart is detected.
*   tagValuesAttribute - Name of tag attribute to check for data values - Defaults to 'values'
*   enableTagOptions - Whether to check tags for sparkline options
*   tagOptionPrefix - Prefix used for options supplied as tag attributes - Defaults to 'spark'
*   disableHiddenCheck - If set to true, then the plugin will assume that charts will never be drawn into a
*           hidden dom element, avoding a browser reflow
*   disableInteraction - If set to true then all mouseover/click interaction behaviour will be disabled,
*       making the plugin perform much like it did in 1.x
*   disableTooltips - If set to true then tooltips will be disabled - Defaults to false (tooltips enabled)
*   disableHighlight - If set to true then highlighting of selected chart elements on mouseover will be disabled
*       defaults to false (highlights enabled)
*   highlightLighten - Factor to lighten/darken highlighted chart values by - Defaults to 1.4 for a 40% increase
*   tooltipContainer - Specify which DOM element the tooltip should be rendered into - defaults to document.body
*   tooltipClassname - Optional CSS classname to apply to tooltips - If not specified then a default style will be applied
*   tooltipOffsetX - How many pixels away from the mouse pointer to render the tooltip on the X axis
*   tooltipOffsetY - How many pixels away from the mouse pointer to render the tooltip on the r axis
*   tooltipFormatter  - Optional callback that allows you to override the HTML displayed in the tooltip
*       callback is given arguments of (sparkline, options, fields)
*   tooltipChartTitle - If specified then the tooltip uses the string specified by this setting as a title
*   tooltipFormat - A format string or SPFormat object  (or an array thereof for multiple entries)
*       to control the format of the tooltip
*   tooltipPrefix - A string to prepend to each field displayed in a tooltip
*   tooltipSuffix - A string to append to each field displayed in a tooltip
*   tooltipSkipNull - If true then null values will not have a tooltip displayed (defaults to true)
*   tooltipValueLookups - An object or range map to map field values to tooltip strings
*       (eg. to map -1 to "Lost", 0 to "Draw", and 1 to "Win")
*   numberFormatter - Optional callback for formatting numbers in tooltips
*   numberDigitGroupSep - Character to use for group separator in numbers "1,234" - Defaults to ","
*   numberDecimalMark - Character to use for the decimal point when formatting numbers - Defaults to "."
*   numberDigitGroupCount - Number of digits between group separator - Defaults to 3
*
* There are 7 types of sparkline, selected by supplying a "type" option of 'line' (default),
* 'bar', 'tristate', 'bullet', 'discrete', 'pie' or 'box'
*    line - Line chart.  Options:
*       spotColor - Set to '' to not end each line in a circular spot
*       minSpotColor - If set, color of spot at minimum value
*       maxSpotColor - If set, color of spot at maximum value
*       spotRadius - Radius in pixels
*       lineWidth - Width of line in pixels
*       normalRangeMin
*       normalRangeMax - If set draws a filled horizontal bar between these two values marking the "normal"
*                      or expected range of values
*       normalRangeColor - Color to use for the above bar
*       drawNormalOnTop - Draw the normal range above the chart fill color if true
*       defaultPixelsPerValue - Defaults to 3 pixels of width for each value in the chart
*       highlightSpotColor - The color to use for drawing a highlight spot on mouseover - Set to null to disable
*       highlightLineColor - The color to use for drawing a highlight line on mouseover - Set to null to disable
*       valueSpots - Specify which points to draw spots on, and in which color.  Accepts a range map
*
*   bar - Bar chart.  Options:
*       barColor - Color of bars for postive values
*       negBarColor - Color of bars for negative values
*       zeroColor - Color of bars with zero values
*       nullColor - Color of bars with null values - Defaults to omitting the bar entirely
*       barWidth - Width of bars in pixels
*       colorMap - Optional mappnig of values to colors to override the *BarColor values above
*                  can be an Array of values to control the color of individual bars or a range map
*                  to specify colors for individual ranges of values
*       barSpacing - Gap between bars in pixels
*       zeroAxis - Centers the y-axis around zero if true
*
*   tristate - Charts values of win (>0), lose (<0) or draw (=0)
*       posBarColor - Color of win values
*       negBarColor - Color of lose values
*       zeroBarColor - Color of draw values
*       barWidth - Width of bars in pixels
*       barSpacing - Gap between bars in pixels
*       colorMap - Optional mappnig of values to colors to override the *BarColor values above
*                  can be an Array of values to control the color of individual bars or a range map
*                  to specify colors for individual ranges of values
*
*   discrete - Options:
*       lineHeight - Height of each line in pixels - Defaults to 30% of the graph height
*       thesholdValue - Values less than this value will be drawn using thresholdColor instead of lineColor
*       thresholdColor
*
*   bullet - Values for bullet graphs msut be in the order: target, performance, range1, range2, range3, ...
*       options:
*       targetColor - The color of the vertical target marker
*       targetWidth - The width of the target marker in pixels
*       performanceColor - The color of the performance measure horizontal bar
*       rangeColors - Colors to use for each qualitative range background color
*
*   pie - Pie chart. Options:
*       sliceColors - An array of colors to use for pie slices
*       offset - Angle in degrees to offset the first slice - Try -90 or +90
*       borderWidth - Width of border to draw around the pie chart, in pixels - Defaults to 0 (no border)
*       borderColor - Color to use for the pie chart border - Defaults to #000
*
*   box - Box plot. Options:
*       raw - Set to true to supply pre-computed plot points as values
*             values should be: low_outlier, low_whisker, q1, median, q3, high_whisker, high_outlier
*             When set to false you can supply any number of values and the box plot will
*             be computed for you.  Default is false.
*       showOutliers - Set to true (default) to display outliers as circles
*       outlierIQR - Interquartile range used to determine outliers.  Default 1.5
*       boxLineColor - Outline color of the box
*       boxFillColor - Fill color for the box
*       whiskerColor - Line color used for whiskers
*       outlierLineColor - Outline color of outlier circles
*       outlierFillColor - Fill color of the outlier circles
*       spotRadius - Radius of outlier circles
*       medianColor - Line color of the median line
*       target - Draw a target cross hair at the supplied value (default undefined)
*
*
*
*   Examples:
*   $('#sparkline1').sparkline(myvalues, { lineColor: '#f00', fillColor: false });
*   $('.barsparks').sparkline('html', { type:'bar', height:'40px', barWidth:5 });
*   $('#tristate').sparkline([1,1,-1,1,0,0,-1], { type:'tristate' }):
*   $('#discrete').sparkline([1,3,4,5,5,3,4,5], { type:'discrete' });
*   $('#bullet').sparkline([10,12,12,9,7], { type:'bullet' });
*   $('#pie').sparkline([1,1,2], { type:'pie' });
*/

/*jslint regexp: true, browser: true, jquery: true, white: true, nomen: false, plusplus: false, maxerr: 500, indent: 4 */

(function (document, Math, undefined) { // performance/minified-size optimization
    (function (factory) {
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (jQuery && !jQuery.fn.sparkline) {
            factory(jQuery);
        }
    }
    (function ($) {
        'use strict';

        var UNSET_OPTION = {},
            getDefaults, createClass, SPFormat, clipval, quartile, normalizeValue, normalizeValues,
            remove, isNumber, all, sum, addCSS, ensureArray, formatNumber, RangeMap,
            MouseHandler, Tooltip, barHighlightMixin,
            line, bar, tristate, discrete, bullet, pie, box, defaultStyles, initStyles,
            VShape, VCanvas_base, VCanvas_canvas, VCanvas_vml, pending, shapeCount = 0;

        /**
         * Default configuration settings
         */
        getDefaults = function () {
            return {
                // Settings common to most/all chart types
                common: {
                    type: 'line',
                    lineColor: '#00f',
                    fillColor: '#cdf',
                    defaultPixelsPerValue: 3,
                    width: 'auto',
                    height: 'auto',
                    composite: false,
                    tagValuesAttribute: 'values',
                    tagOptionsPrefix: 'spark',
                    enableTagOptions: false,
                    enableHighlight: true,
                    highlightLighten: 1.4,
                    tooltipSkipNull: true,
                    tooltipPrefix: '',
                    tooltipSuffix: '',
                    disableHiddenCheck: false,
                    numberFormatter: false,
                    numberDigitGroupCount: 3,
                    numberDigitGroupSep: ',',
                    numberDecimalMark: '.',
                    disableTooltips: false,
                    disableInteraction: false
                },
                // Defaults for line charts
                line: {
                    spotColor: '#f80',
                    highlightSpotColor: '#5f5',
                    highlightLineColor: '#f22',
                    spotRadius: 1.5,
                    minSpotColor: '#f80',
                    maxSpotColor: '#f80',
                    lineWidth: 1,
                    normalRangeMin: undefined,
                    normalRangeMax: undefined,
                    normalRangeColor: '#ccc',
                    drawNormalOnTop: false,
                    chartRangeMin: undefined,
                    chartRangeMax: undefined,
                    chartRangeMinX: undefined,
                    chartRangeMaxX: undefined,
                    tooltipFormat: new SPFormat('<span style="color: {{color}}">&#9679;</span> {{prefix}}{{y}}{{suffix}}')
                },
                // Defaults for bar charts
                bar: {
                    barColor: '#3366cc',
                    negBarColor: '#f44',
                    stackedBarColor: ['#3366cc', '#dc3912', '#ff9900', '#109618', '#66aa00',
                        '#dd4477', '#0099c6', '#990099'],
                    zeroColor: undefined,
                    nullColor: undefined,
                    zeroAxis: true,
                    barWidth: 4,
                    barSpacing: 1,
                    chartRangeMax: undefined,
                    chartRangeMin: undefined,
                    chartRangeClip: false,
                    colorMap: undefined,
                    tooltipFormat: new SPFormat('<span style="color: {{color}}">&#9679;</span> {{prefix}}{{value}}{{suffix}}')
                },
                // Defaults for tristate charts
                tristate: {
                    barWidth: 4,
                    barSpacing: 1,
                    posBarColor: '#6f6',
                    negBarColor: '#f44',
                    zeroBarColor: '#999',
                    colorMap: {},
                    tooltipFormat: new SPFormat('<span style="color: {{color}}">&#9679;</span> {{value:map}}'),
                    tooltipValueLookups: { map: { '-1': 'Loss', '0': 'Draw', '1': 'Win' } }
                },
                // Defaults for discrete charts
                discrete: {
                    lineHeight: 'auto',
                    thresholdColor: undefined,
                    thresholdValue: 0,
                    chartRangeMax: undefined,
                    chartRangeMin: undefined,
                    chartRangeClip: false,
                    tooltipFormat: new SPFormat('{{prefix}}{{value}}{{suffix}}')
                },
                // Defaults for bullet charts
                bullet: {
                    targetColor: '#f33',
                    targetWidth: 3, // width of the target bar in pixels
                    performanceColor: '#33f',
                    rangeColors: ['#d3dafe', '#a8b6ff', '#7f94ff'],
                    base: undefined, // set this to a number to change the base start number
                    tooltipFormat: new SPFormat('{{fieldkey:fields}} - {{value}}'),
                    tooltipValueLookups: { fields: { r: 'Range', p: 'Performance', t: 'Target' } }
                },
                // Defaults for pie charts
                pie: {
                    offset: 0,
                    sliceColors: ['#3366cc', '#dc3912', '#ff9900', '#109618', '#66aa00',
                        '#dd4477', '#0099c6', '#990099'],
                    borderWidth: 0,
                    borderColor: '#000',
                    tooltipFormat: new SPFormat('<span style="color: {{color}}">&#9679;</span> {{value}} ({{percent.1}}%)')
                },
                // Defaults for box plots
                box: {
                    raw: false,
                    boxLineColor: '#000',
                    boxFillColor: '#cdf',
                    whiskerColor: '#000',
                    outlierLineColor: '#333',
                    outlierFillColor: '#fff',
                    medianColor: '#f00',
                    showOutliers: true,
                    outlierIQR: 1.5,
                    spotRadius: 1.5,
                    target: undefined,
                    targetColor: '#4a2',
                    chartRangeMax: undefined,
                    chartRangeMin: undefined,
                    tooltipFormat: new SPFormat('{{field:fields}}: {{value}}'),
                    tooltipFormatFieldlistKey: 'field',
                    tooltipValueLookups: {
                        fields: {
                            lq: 'Lower Quartile', med: 'Median',
                            uq: 'Upper Quartile', lo: 'Left Outlier', ro: 'Right Outlier',
                            lw: 'Left Whisker', rw: 'Right Whisker'
                        }
                    }
                }
            };
        };

        // You can have tooltips use a css class other than jqstooltip by specifying tooltipClassname
        defaultStyles = '.jqstooltip { ' +
                'position: absolute;' +
                'left: 0px;' +
                'top: 0px;' +
                'visibility: hidden;' +
                'background: rgb(0, 0, 0) transparent;' +
                'background-color: rgba(0,0,0,0.6);' +
                'filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=#99000000, endColorstr=#99000000);' +
                '-ms-filter: "progid:DXImageTransform.Microsoft.gradient(startColorstr=#99000000, endColorstr=#99000000)";' +
                'color: white;' +
                'font: 10px arial, san serif;' +
                'text-align: left;' +
                'white-space: nowrap;' +
                'padding: 5px;' +
                'border: 1px solid white;' +
                'z-index: 10000;' +
                '}' +
                '.jqsfield { ' +
                'color: white;' +
                'font: 10px arial, san serif;' +
                'text-align: left;' +
                '}';

        /**
         * Utilities
         */

        createClass = function (/* [baseclass, [mixin, ...]], definition */) {
            var Class, args;
            Class = function () {
                this.init.apply(this, arguments);
            };
            if (arguments.length > 1) {
                if (arguments[0]) {
                    Class.prototype = $.extend(new arguments[0](), arguments[arguments.length - 1]);
                    Class._super = arguments[0].prototype;
                } else {
                    Class.prototype = arguments[arguments.length - 1];
                }
                if (arguments.length > 2) {
                    args = Array.prototype.slice.call(arguments, 1, -1);
                    args.unshift(Class.prototype);
                    $.extend.apply($, args);
                }
            } else {
                Class.prototype = arguments[0];
            }
            Class.prototype.cls = Class;
            return Class;
        };

        /**
         * Wraps a format string for tooltips
         * {{x}}
         * {{x.2}
         * {{x:months}}
         */
        $.SPFormatClass = SPFormat = createClass({
            fre: /\{\{([\w.]+?)(:(.+?))?\}\}/g,
            precre: /(\w+)\.(\d+)/,

            init: function (format, fclass) {
                this.format = format;
                this.fclass = fclass;
            },

            render: function (fieldset, lookups, options) {
                var self = this,
                    fields = fieldset,
                    match, token, lookupkey, fieldvalue, prec;
                return this.format.replace(this.fre, function () {
                    var lookup;
                    token = arguments[1];
                    lookupkey = arguments[3];
                    match = self.precre.exec(token);
                    if (match) {
                        prec = match[2];
                        token = match[1];
                    } else {
                        prec = false;
                    }
                    fieldvalue = fields[token];
                    if (fieldvalue === undefined) {
                        return '';
                    }
                    if (lookupkey && lookups && lookups[lookupkey]) {
                        lookup = lookups[lookupkey];
                        if (lookup.get) { // RangeMap
                            return lookups[lookupkey].get(fieldvalue) || fieldvalue;
                        } else {
                            return lookups[lookupkey][fieldvalue] || fieldvalue;
                        }
                    }
                    if (isNumber(fieldvalue)) {
                        if (options.get('numberFormatter')) {
                            fieldvalue = options.get('numberFormatter')(fieldvalue);
                        } else {
                            fieldvalue = formatNumber(fieldvalue, prec,
                                options.get('numberDigitGroupCount'),
                                options.get('numberDigitGroupSep'),
                                options.get('numberDecimalMark'));
                        }
                    }
                    return fieldvalue;
                });
            }
        });

        // convience method to avoid needing the new operator
        $.spformat = function (format, fclass) {
            return new SPFormat(format, fclass);
        };

        clipval = function (val, min, max) {
            if (val < min) {
                return min;
            }
            if (val > max) {
                return max;
            }
            return val;
        };

        quartile = function (values, q) {
            var vl;
            if (q === 2) {
                vl = Math.floor(values.length / 2);
                return values.length % 2 ? values[vl] : (values[vl - 1] + values[vl]) / 2;
            } else {
                if (values.length % 2) { // odd
                    vl = (values.length * q + q) / 4;
                    return vl % 1 ? (values[Math.floor(vl)] + values[Math.floor(vl) - 1]) / 2 : values[vl - 1];
                } else { //even
                    vl = (values.length * q + 2) / 4;
                    return vl % 1 ? (values[Math.floor(vl)] + values[Math.floor(vl) - 1]) / 2 : values[vl - 1];

                }
            }
        };

        normalizeValue = function (val) {
            var nf;
            switch (val) {
                case 'undefined':
                    val = undefined;
                    break;
                case 'null':
                    val = null;
                    break;
                case 'true':
                    val = true;
                    break;
                case 'false':
                    val = false;
                    break;
                default:
                    nf = parseFloat(val);
                    if (val == nf) {
                        val = nf;
                    }
            }
            return val;
        };

        normalizeValues = function (vals) {
            var i, result = [];
            for (i = vals.length; i--;) {
                result[i] = normalizeValue(vals[i]);
            }
            return result;
        };

        remove = function (vals, filter) {
            var i, vl, result = [];
            for (i = 0, vl = vals.length; i < vl; i++) {
                if (vals[i] !== filter) {
                    result.push(vals[i]);
                }
            }
            return result;
        };

        isNumber = function (num) {
            return !isNaN(parseFloat(num)) && isFinite(num);
        };

        formatNumber = function (num, prec, groupsize, groupsep, decsep) {
            var p, i;
            num = (prec === false ? parseFloat(num).toString() : num.toFixed(prec)).split('');
            p = (p = $.inArray('.', num)) < 0 ? num.length : p;
            if (p < num.length) {
                num[p] = decsep;
            }
            for (i = p - groupsize; i > 0; i -= groupsize) {
                num.splice(i, 0, groupsep);
            }
            return num.join('');
        };

        // determine if all values of an array match a value
        // returns true if the array is empty
        all = function (val, arr, ignoreNull) {
            var i;
            for (i = arr.length; i--;) {
                if (ignoreNull && arr[i] === null) continue;
                if (arr[i] !== val) {
                    return false;
                }
            }
            return true;
        };

        // sums the numeric values in an array, ignoring other values
        sum = function (vals) {
            var total = 0, i;
            for (i = vals.length; i--;) {
                total += typeof vals[i] === 'number' ? vals[i] : 0;
            }
            return total;
        };

        ensureArray = function (val) {
            return $.isArray(val) ? val : [val];
        };

        // http://paulirish.com/2008/bookmarklet-inject-new-css-rules/
        addCSS = function (css) {
            var tag;
            //if ('\v' == 'v') /* ie only */ {
            if (document.createStyleSheet) {
                document.createStyleSheet().cssText = css;
            } else {
                tag = document.createElement('style');
                tag.type = 'text/css';
                document.getElementsByTagName('head')[0].appendChild(tag);
                tag[(typeof document.body.style.WebkitAppearance == 'string') /* webkit only */ ? 'innerText' : 'innerHTML'] = css;
            }
        };

        // Provide a cross-browser interface to a few simple drawing primitives
        $.fn.simpledraw = function (width, height, useExisting, interact) {
            var target, mhandler;
            if (useExisting && (target = this.data('_jqs_vcanvas'))) {
                return target;
            }

            if ($.fn.sparkline.canvas === false) {
                // We've already determined that neither Canvas nor VML are available
                return false;

            } else if ($.fn.sparkline.canvas === undefined) {
                // No function defined yet -- need to see if we support Canvas or VML
                var el = document.createElement('canvas');
                if (!!(el.getContext && el.getContext('2d'))) {
                    // Canvas is available
                    $.fn.sparkline.canvas = function (width, height, target, interact) {
                        return new VCanvas_canvas(width, height, target, interact);
                    };
                } else if (document.namespaces && !document.namespaces.v) {
                    // VML is available
                    document.namespaces.add('v', 'urn:schemas-microsoft-com:vml', '#default#VML');
                    $.fn.sparkline.canvas = function (width, height, target, interact) {
                        return new VCanvas_vml(width, height, target);
                    };
                } else {
                    // Neither Canvas nor VML are available
                    $.fn.sparkline.canvas = false;
                    return false;
                }
            }

            if (width === undefined) {
                width = $(this).innerWidth();
            }
            if (height === undefined) {
                height = $(this).innerHeight();
            }

            target = $.fn.sparkline.canvas(width, height, this, interact);

            mhandler = $(this).data('_jqs_mhandler');
            if (mhandler) {
                mhandler.registerCanvas(target);
            }
            return target;
        };

        $.fn.cleardraw = function () {
            var target = this.data('_jqs_vcanvas');
            if (target) {
                target.reset();
            }
        };

        $.RangeMapClass = RangeMap = createClass({
            init: function (map) {
                var key, range, rangelist = [];
                for (key in map) {
                    if (map.hasOwnProperty(key) && typeof key === 'string' && key.indexOf(':') > -1) {
                        range = key.split(':');
                        range[0] = range[0].length === 0 ? -Infinity : parseFloat(range[0]);
                        range[1] = range[1].length === 0 ? Infinity : parseFloat(range[1]);
                        range[2] = map[key];
                        rangelist.push(range);
                    }
                }
                this.map = map;
                this.rangelist = rangelist || false;
            },

            get: function (value) {
                var rangelist = this.rangelist,
                    i, range, result;
                if ((result = this.map[value]) !== undefined) {
                    return result;
                }
                if (rangelist) {
                    for (i = rangelist.length; i--;) {
                        range = rangelist[i];
                        if (range[0] <= value && range[1] >= value) {
                            return range[2];
                        }
                    }
                }
                return undefined;
            }
        });

        // Convenience function
        $.range_map = function (map) {
            return new RangeMap(map);
        };

        MouseHandler = createClass({
            init: function (el, options) {
                var $el = $(el);
                this.$el = $el;
                this.options = options;
                this.currentPageX = 0;
                this.currentPageY = 0;
                this.el = el;
                this.splist = [];
                this.tooltip = null;
                this.over = false;
                this.displayTooltips = !options.get('disableTooltips');
                this.highlightEnabled = !options.get('disableHighlight');
            },

            registerSparkline: function (sp) {
                this.splist.push(sp);
                if (this.over) {
                    this.updateDisplay();
                }
            },

            registerCanvas: function (canvas) {
                var $canvas = $(canvas.canvas);
                this.canvas = canvas;
                this.$canvas = $canvas;
                $canvas.mouseenter($.proxy(this.mouseenter, this));
                $canvas.mouseleave($.proxy(this.mouseleave, this));
                $canvas.click($.proxy(this.mouseclick, this));
            },

            reset: function (removeTooltip) {
                this.splist = [];
                if (this.tooltip && removeTooltip) {
                    this.tooltip.remove();
                    this.tooltip = undefined;
                }
            },

            mouseclick: function (e) {
                var clickEvent = $.Event('sparklineClick');
                clickEvent.originalEvent = e;
                clickEvent.sparklines = this.splist;
                this.$el.trigger(clickEvent);
            },

            mouseenter: function (e) {
                $(document.body).unbind('mousemove.jqs');
                $(document.body).bind('mousemove.jqs', $.proxy(this.mousemove, this));
                this.over = true;
                this.currentPageX = e.pageX;
                this.currentPageY = e.pageY;
                this.currentEl = e.target;
                if (!this.tooltip && this.displayTooltips) {
                    this.tooltip = new Tooltip(this.options);
                    this.tooltip.updatePosition(e.pageX, e.pageY);
                }
                this.updateDisplay();
            },

            mouseleave: function () {
                $(document.body).unbind('mousemove.jqs');
                var splist = this.splist,
                     spcount = splist.length,
                     needsRefresh = false,
                     sp, i;
                this.over = false;
                this.currentEl = null;

                if (this.tooltip) {
                    this.tooltip.remove();
                    this.tooltip = null;
                }

                for (i = 0; i < spcount; i++) {
                    sp = splist[i];
                    if (sp.clearRegionHighlight()) {
                        needsRefresh = true;
                    }
                }

                if (needsRefresh) {
                    this.canvas.render();
                }
            },

            mousemove: function (e) {
                this.currentPageX = e.pageX;
                this.currentPageY = e.pageY;
                this.currentEl = e.target;
                if (this.tooltip) {
                    this.tooltip.updatePosition(e.pageX, e.pageY);
                }
                this.updateDisplay();
            },

            updateDisplay: function () {
                var splist = this.splist,
                     spcount = splist.length,
                     needsRefresh = false,
                     offset = this.$canvas.offset(),
                     localX = this.currentPageX - offset.left,
                     localY = this.currentPageY - offset.top,
                     tooltiphtml, sp, i, result, changeEvent;
                if (!this.over) {
                    return;
                }
                for (i = 0; i < spcount; i++) {
                    sp = splist[i];
                    result = sp.setRegionHighlight(this.currentEl, localX, localY);
                    if (result) {
                        needsRefresh = true;
                    }
                }
                if (needsRefresh) {
                    changeEvent = $.Event('sparklineRegionChange');
                    changeEvent.sparklines = this.splist;
                    this.$el.trigger(changeEvent);
                    if (this.tooltip) {
                        tooltiphtml = '';
                        for (i = 0; i < spcount; i++) {
                            sp = splist[i];
                            tooltiphtml += sp.getCurrentRegionTooltip();
                        }
                        this.tooltip.setContent(tooltiphtml);
                    }
                    if (!this.disableHighlight) {
                        this.canvas.render();
                    }
                }
                if (result === null) {
                    this.mouseleave();
                }
            }
        });


        Tooltip = createClass({
            sizeStyle: 'position: static !important;' +
                'display: block !important;' +
                'visibility: hidden !important;' +
                'float: left !important;',

            init: function (options) {
                var tooltipClassname = options.get('tooltipClassname', 'jqstooltip'),
                    sizetipStyle = this.sizeStyle,
                    offset;
                this.container = options.get('tooltipContainer') || document.body;
                this.tooltipOffsetX = options.get('tooltipOffsetX', 10);
                this.tooltipOffsetY = options.get('tooltipOffsetY', 12);
                // remove any previous lingering tooltip
                $('#jqssizetip').remove();
                $('#jqstooltip').remove();
                this.sizetip = $('<div/>', {
                    id: 'jqssizetip',
                    style: sizetipStyle,
                    'class': tooltipClassname
                });
                this.tooltip = $('<div/>', {
                    id: 'jqstooltip',
                    'class': tooltipClassname
                }).appendTo(this.container);
                // account for the container's location
                offset = this.tooltip.offset();
                this.offsetLeft = offset.left;
                this.offsetTop = offset.top;
                this.hidden = true;
                $(window).unbind('resize.jqs scroll.jqs');
                $(window).bind('resize.jqs scroll.jqs', $.proxy(this.updateWindowDims, this));
                this.updateWindowDims();
            },

            updateWindowDims: function () {
                this.scrollTop = $(window).scrollTop();
                this.scrollLeft = $(window).scrollLeft();
                this.scrollRight = this.scrollLeft + $(window).width();
                this.updatePosition();
            },

            getSize: function (content) {
                this.sizetip.html(content).appendTo(this.container);
                this.width = this.sizetip.width() + 1;
                this.height = this.sizetip.height();
                this.sizetip.remove();
            },

            setContent: function (content) {
                if (!content) {
                    this.tooltip.css('visibility', 'hidden');
                    this.hidden = true;
                    return;
                }
                this.getSize(content);
                this.tooltip.html(content)
                    .css({
                        'width': this.width,
                        'height': this.height,
                        'visibility': 'visible'
                    });
                if (this.hidden) {
                    this.hidden = false;
                    this.updatePosition();
                }
            },

            updatePosition: function (x, y) {
                if (x === undefined) {
                    if (this.mousex === undefined) {
                        return;
                    }
                    x = this.mousex - this.offsetLeft;
                    y = this.mousey - this.offsetTop;

                } else {
                    this.mousex = x = x - this.offsetLeft;
                    this.mousey = y = y - this.offsetTop;
                }
                if (!this.height || !this.width || this.hidden) {
                    return;
                }

                y -= this.height + this.tooltipOffsetY;
                x += this.tooltipOffsetX;

                if (y < this.scrollTop) {
                    y = this.scrollTop;
                }
                if (x < this.scrollLeft) {
                    x = this.scrollLeft;
                } else if (x + this.width > this.scrollRight) {
                    x = this.scrollRight - this.width;
                }

                this.tooltip.css({
                    'left': x,
                    'top': y
                });
            },

            remove: function () {
                this.tooltip.remove();
                this.sizetip.remove();
                this.sizetip = this.tooltip = undefined;
                $(window).unbind('resize.jqs scroll.jqs');
            }
        });

        initStyles = function () {
            addCSS(defaultStyles);
        };

        $(initStyles);

        pending = [];
        $.fn.sparkline = function (userValues, userOptions) {
            return this.each(function () {
                var options = new $.fn.sparkline.options(this, userOptions),
                     $this = $(this),
                     render, i;
                render = function () {
                    var values, width, height, tmp, mhandler, sp, vals;
                    if (userValues === 'html' || userValues === undefined) {
                        vals = this.getAttribute(options.get('tagValuesAttribute'));
                        if (vals === undefined || vals === null) {
                            vals = $this.html();
                        }
                        values = vals.replace(/(^\s*<!--)|(-->\s*$)|\s+/g, '').split(',');
                    } else {
                        values = userValues;
                    }

                    width = options.get('width') === 'auto' ? values.length * options.get('defaultPixelsPerValue') : options.get('width');
                    if (options.get('height') === 'auto') {
                        if (!options.get('composite') || !$.data(this, '_jqs_vcanvas')) {
                            // must be a better way to get the line height
                            tmp = document.createElement('span');
                            tmp.innerHTML = 'a';
                            $this.html(tmp);
                            height = $(tmp).innerHeight() || $(tmp).height();
                            $(tmp).remove();
                            tmp = null;
                        }
                    } else {
                        height = options.get('height');
                    }

                    if (!options.get('disableInteraction')) {
                        mhandler = $.data(this, '_jqs_mhandler');
                        if (!mhandler) {
                            mhandler = new MouseHandler(this, options);
                            $.data(this, '_jqs_mhandler', mhandler);
                        } else if (!options.get('composite')) {
                            mhandler.reset();
                        }
                    } else {
                        mhandler = false;
                    }

                    if (options.get('composite') && !$.data(this, '_jqs_vcanvas')) {
                        if (!$.data(this, '_jqs_errnotify')) {
                            alert('Attempted to attach a composite sparkline to an element with no existing sparkline');
                            $.data(this, '_jqs_errnotify', true);
                        }
                        return;
                    }

                    sp = new $.fn.sparkline[options.get('type')](this, values, options, width, height);

                    sp.render();

                    if (mhandler) {
                        mhandler.registerSparkline(sp);
                    }
                };
                if (($(this).html() && !options.get('disableHiddenCheck') && $(this).is(':hidden')) || !$(this).parents('body').length) {
                    if (!options.get('composite') && $.data(this, '_jqs_pending')) {
                        // remove any existing references to the element
                        for (i = pending.length; i; i--) {
                            if (pending[i - 1][0] == this) {
                                pending.splice(i - 1, 1);
                            }
                        }
                    }
                    pending.push([this, render]);
                    $.data(this, '_jqs_pending', true);
                } else {
                    render.call(this);
                }
            });
        };

        $.fn.sparkline.defaults = getDefaults();


        $.sparkline_display_visible = function () {
            var el, i, pl;
            var done = [];
            for (i = 0, pl = pending.length; i < pl; i++) {
                el = pending[i][0];
                if ($(el).is(':visible') && !$(el).parents().is(':hidden')) {
                    pending[i][1].call(el);
                    $.data(pending[i][0], '_jqs_pending', false);
                    done.push(i);
                } else if (!$(el).closest('html').length && !$.data(el, '_jqs_pending')) {
                    // element has been inserted and removed from the DOM
                    // If it was not yet inserted into the dom then the .data request
                    // will return true.
                    // removing from the dom causes the data to be removed.
                    $.data(pending[i][0], '_jqs_pending', false);
                    done.push(i);
                }
            }
            for (i = done.length; i; i--) {
                pending.splice(done[i - 1], 1);
            }
        };


        /**
         * User option handler
         */
        $.fn.sparkline.options = createClass({
            init: function (tag, userOptions) {
                var extendedOptions, defaults, base, tagOptionType;
                this.userOptions = userOptions = userOptions || {};
                this.tag = tag;
                this.tagValCache = {};
                defaults = $.fn.sparkline.defaults;
                base = defaults.common;
                this.tagOptionsPrefix = userOptions.enableTagOptions && (userOptions.tagOptionsPrefix || base.tagOptionsPrefix);

                tagOptionType = this.getTagSetting('type');
                if (tagOptionType === UNSET_OPTION) {
                    extendedOptions = defaults[userOptions.type || base.type];
                } else {
                    extendedOptions = defaults[tagOptionType];
                }
                this.mergedOptions = $.extend({}, base, extendedOptions, userOptions);
            },


            getTagSetting: function (key) {
                var prefix = this.tagOptionsPrefix,
                    val, i, pairs, keyval;
                if (prefix === false || prefix === undefined) {
                    return UNSET_OPTION;
                }
                if (this.tagValCache.hasOwnProperty(key)) {
                    val = this.tagValCache.key;
                } else {
                    val = this.tag.getAttribute(prefix + key);
                    if (val === undefined || val === null) {
                        val = UNSET_OPTION;
                    } else if (val.substr(0, 1) === '[') {
                        val = val.substr(1, val.length - 2).split(',');
                        for (i = val.length; i--;) {
                            val[i] = normalizeValue(val[i].replace(/(^\s*)|(\s*$)/g, ''));
                        }
                    } else if (val.substr(0, 1) === '{') {
                        pairs = val.substr(1, val.length - 2).split(',');
                        val = {};
                        for (i = pairs.length; i--;) {
                            keyval = pairs[i].split(':', 2);
                            val[keyval[0].replace(/(^\s*)|(\s*$)/g, '')] = normalizeValue(keyval[1].replace(/(^\s*)|(\s*$)/g, ''));
                        }
                    } else {
                        val = normalizeValue(val);
                    }
                    this.tagValCache.key = val;
                }
                return val;
            },

            get: function (key, defaultval) {
                var tagOption = this.getTagSetting(key),
                    result;
                if (tagOption !== UNSET_OPTION) {
                    return tagOption;
                }
                return (result = this.mergedOptions[key]) === undefined ? defaultval : result;
            }
        });


        $.fn.sparkline._base = createClass({
            disabled: false,

            init: function (el, values, options, width, height) {
                this.el = el;
                this.$el = $(el);
                this.values = values;
                this.options = options;
                this.width = width;
                this.height = height;
                this.currentRegion = undefined;
            },

            /**
             * Setup the canvas
             */
            initTarget: function () {
                var interactive = !this.options.get('disableInteraction');
                if (!(this.target = this.$el.simpledraw(this.width, this.height, this.options.get('composite'), interactive))) {
                    this.disabled = true;
                } else {
                    this.canvasWidth = this.target.pixelWidth;
                    this.canvasHeight = this.target.pixelHeight;
                }
            },

            /**
             * Actually render the chart to the canvas
             */
            render: function () {
                if (this.disabled) {
                    this.el.innerHTML = '';
                    return false;
                }
                return true;
            },

            /**
             * Return a region id for a given x/y co-ordinate
             */
            getRegion: function (x, y) {
            },

            /**
             * Highlight an item based on the moused-over x,y co-ordinate
             */
            setRegionHighlight: function (el, x, y) {
                var currentRegion = this.currentRegion,
                    highlightEnabled = !this.options.get('disableHighlight'),
                    newRegion;
                if (x > this.canvasWidth || y > this.canvasHeight || x < 0 || y < 0) {
                    return null;
                }
                newRegion = this.getRegion(el, x, y);
                if (currentRegion !== newRegion) {
                    if (currentRegion !== undefined && highlightEnabled) {
                        this.removeHighlight();
                    }
                    this.currentRegion = newRegion;
                    if (newRegion !== undefined && highlightEnabled) {
                        this.renderHighlight();
                    }
                    return true;
                }
                return false;
            },

            /**
             * Reset any currently highlighted item
             */
            clearRegionHighlight: function () {
                if (this.currentRegion !== undefined) {
                    this.removeHighlight();
                    this.currentRegion = undefined;
                    return true;
                }
                return false;
            },

            renderHighlight: function () {
                this.changeHighlight(true);
            },

            removeHighlight: function () {
                this.changeHighlight(false);
            },

            changeHighlight: function (highlight) { },

            /**
             * Fetch the HTML to display as a tooltip
             */
            getCurrentRegionTooltip: function () {
                var options = this.options,
                    header = '',
                    entries = [],
                    fields, formats, formatlen, fclass, text, i,
                    showFields, showFieldsKey, newFields, fv,
                    formatter, format, fieldlen, j;
                if (this.currentRegion === undefined) {
                    return '';
                }
                fields = this.getCurrentRegionFields();
                formatter = options.get('tooltipFormatter');
                if (formatter) {
                    return formatter(this, options, fields);
                }
                if (options.get('tooltipChartTitle')) {
                    header += '<div class="jqs jqstitle">' + options.get('tooltipChartTitle') + '</div>\n';
                }
                formats = this.options.get('tooltipFormat');
                if (!formats) {
                    return '';
                }
                if (!$.isArray(formats)) {
                    formats = [formats];
                }
                if (!$.isArray(fields)) {
                    fields = [fields];
                }
                showFields = this.options.get('tooltipFormatFieldlist');
                showFieldsKey = this.options.get('tooltipFormatFieldlistKey');
                if (showFields && showFieldsKey) {
                    // user-selected ordering of fields
                    newFields = [];
                    for (i = fields.length; i--;) {
                        fv = fields[i][showFieldsKey];
                        if ((j = $.inArray(fv, showFields)) != -1) {
                            newFields[j] = fields[i];
                        }
                    }
                    fields = newFields;
                }
                formatlen = formats.length;
                fieldlen = fields.length;
                for (i = 0; i < formatlen; i++) {
                    format = formats[i];
                    if (typeof format === 'string') {
                        format = new SPFormat(format);
                    }
                    fclass = format.fclass || 'jqsfield';
                    for (j = 0; j < fieldlen; j++) {
                        if (!fields[j].isNull || !options.get('tooltipSkipNull')) {
                            $.extend(fields[j], {
                                prefix: options.get('tooltipPrefix'),
                                suffix: options.get('tooltipSuffix')
                            });
                            text = format.render(fields[j], options.get('tooltipValueLookups'), options);
                            entries.push('<div class="' + fclass + '">' + text + '</div>');
                        }
                    }
                }
                if (entries.length) {
                    return header + entries.join('\n');
                }
                return '';
            },

            getCurrentRegionFields: function () { },

            calcHighlightColor: function (color, options) {
                var highlightColor = options.get('highlightColor'),
                    lighten = options.get('highlightLighten'),
                    parse, mult, rgbnew, i;
                if (highlightColor) {
                    return highlightColor;
                }
                if (lighten) {
                    // extract RGB values
                    parse = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color) || /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
                    if (parse) {
                        rgbnew = [];
                        mult = color.length === 4 ? 16 : 1;
                        for (i = 0; i < 3; i++) {
                            rgbnew[i] = clipval(Math.round(parseInt(parse[i + 1], 16) * mult * lighten), 0, 255);
                        }
                        return 'rgb(' + rgbnew.join(',') + ')';
                    }

                }
                return color;
            }

        });

        barHighlightMixin = {
            changeHighlight: function (highlight) {
                var currentRegion = this.currentRegion,
                    target = this.target,
                    shapeids = this.regionShapes[currentRegion],
                    newShapes;
                // will be null if the region value was null
                if (shapeids) {
                    newShapes = this.renderRegion(currentRegion, highlight);
                    if ($.isArray(newShapes) || $.isArray(shapeids)) {
                        target.replaceWithShapes(shapeids, newShapes);
                        this.regionShapes[currentRegion] = $.map(newShapes, function (newShape) {
                            return newShape.id;
                        });
                    } else {
                        target.replaceWithShape(shapeids, newShapes);
                        this.regionShapes[currentRegion] = newShapes.id;
                    }
                }
            },

            render: function () {
                var values = this.values,
                    target = this.target,
                    regionShapes = this.regionShapes,
                    shapes, ids, i, j;

                if (!this.cls._super.render.call(this)) {
                    return;
                }
                for (i = values.length; i--;) {
                    shapes = this.renderRegion(i);
                    if (shapes) {
                        if ($.isArray(shapes)) {
                            ids = [];
                            for (j = shapes.length; j--;) {
                                shapes[j].append();
                                ids.push(shapes[j].id);
                            }
                            regionShapes[i] = ids;
                        } else {
                            shapes.append();
                            regionShapes[i] = shapes.id; // store just the shapeid
                        }
                    } else {
                        // null value
                        regionShapes[i] = null;
                    }
                }
                target.render();
            }
        };

        /**
         * Line charts
         */
        $.fn.sparkline.line = line = createClass($.fn.sparkline._base, {
            type: 'line',

            init: function (el, values, options, width, height) {
                line._super.init.call(this, el, values, options, width, height);
                this.vertices = [];
                this.regionMap = [];
                this.xvalues = [];
                this.yvalues = [];
                this.yminmax = [];
                this.hightlightSpotId = null;
                this.lastShapeId = null;
                this.initTarget();
            },

            getRegion: function (el, x, y) {
                var i,
                    regionMap = this.regionMap; // maps regions to value positions
                for (i = regionMap.length; i--;) {
                    if (regionMap[i] !== null && x >= regionMap[i][0] && x <= regionMap[i][1]) {
                        return regionMap[i][2];
                    }
                }
                return undefined;
            },

            getCurrentRegionFields: function () {
                var currentRegion = this.currentRegion;
                return {
                    isNull: this.yvalues[currentRegion] === null,
                    x: this.xvalues[currentRegion],
                    y: this.yvalues[currentRegion],
                    color: this.options.get('lineColor'),
                    fillColor: this.options.get('fillColor'),
                    offset: currentRegion
                };
            },

            renderHighlight: function () {
                var currentRegion = this.currentRegion,
                    target = this.target,
                    vertex = this.vertices[currentRegion],
                    options = this.options,
                    spotRadius = options.get('spotRadius'),
                    highlightSpotColor = options.get('highlightSpotColor'),
                    highlightLineColor = options.get('highlightLineColor'),
                    highlightSpot, highlightLine;

                if (!vertex) {
                    return;
                }
                if (spotRadius && highlightSpotColor) {
                    highlightSpot = target.drawCircle(vertex[0], vertex[1],
                        spotRadius, undefined, highlightSpotColor);
                    this.highlightSpotId = highlightSpot.id;
                    target.insertAfterShape(this.lastShapeId, highlightSpot);
                }
                if (highlightLineColor) {
                    highlightLine = target.drawLine(vertex[0], this.canvasTop, vertex[0],
                        this.canvasTop + this.canvasHeight, highlightLineColor);
                    this.highlightLineId = highlightLine.id;
                    target.insertAfterShape(this.lastShapeId, highlightLine);
                }
            },

            removeHighlight: function () {
                var target = this.target;
                if (this.highlightSpotId) {
                    target.removeShapeId(this.highlightSpotId);
                    this.highlightSpotId = null;
                }
                if (this.highlightLineId) {
                    target.removeShapeId(this.highlightLineId);
                    this.highlightLineId = null;
                }
            },

            scanValues: function () {
                var values = this.values,
                    valcount = values.length,
                    xvalues = this.xvalues,
                    yvalues = this.yvalues,
                    yminmax = this.yminmax,
                    i, val, isStr, isArray, sp;
                for (i = 0; i < valcount; i++) {
                    val = values[i];
                    isStr = typeof (values[i]) === 'string';
                    isArray = typeof (values[i]) === 'object' && values[i] instanceof Array;
                    sp = isStr && values[i].split(':');
                    if (isStr && sp.length === 2) { // x:y
                        xvalues.push(Number(sp[0]));
                        yvalues.push(Number(sp[1]));
                        yminmax.push(Number(sp[1]));
                    } else if (isArray) {
                        xvalues.push(val[0]);
                        yvalues.push(val[1]);
                        yminmax.push(val[1]);
                    } else {
                        xvalues.push(i);
                        if (values[i] === null || values[i] === 'null') {
                            yvalues.push(null);
                        } else {
                            yvalues.push(Number(val));
                            yminmax.push(Number(val));
                        }
                    }
                }
                if (this.options.get('xvalues')) {
                    xvalues = this.options.get('xvalues');
                }

                this.maxy = this.maxyorg = Math.max.apply(Math, yminmax);
                this.miny = this.minyorg = Math.min.apply(Math, yminmax);

                this.maxx = Math.max.apply(Math, xvalues);
                this.minx = Math.min.apply(Math, xvalues);

                this.xvalues = xvalues;
                this.yvalues = yvalues;
                this.yminmax = yminmax;

            },

            processRangeOptions: function () {
                var options = this.options,
                    normalRangeMin = options.get('normalRangeMin'),
                    normalRangeMax = options.get('normalRangeMax');

                if (normalRangeMin !== undefined) {
                    if (normalRangeMin < this.miny) {
                        this.miny = normalRangeMin;
                    }
                    if (normalRangeMax > this.maxy) {
                        this.maxy = normalRangeMax;
                    }
                }
                if (options.get('chartRangeMin') !== undefined && (options.get('chartRangeClip') || options.get('chartRangeMin') < this.miny)) {
                    this.miny = options.get('chartRangeMin');
                }
                if (options.get('chartRangeMax') !== undefined && (options.get('chartRangeClip') || options.get('chartRangeMax') > this.maxy)) {
                    this.maxy = options.get('chartRangeMax');
                }
                if (options.get('chartRangeMinX') !== undefined && (options.get('chartRangeClipX') || options.get('chartRangeMinX') < this.minx)) {
                    this.minx = options.get('chartRangeMinX');
                }
                if (options.get('chartRangeMaxX') !== undefined && (options.get('chartRangeClipX') || options.get('chartRangeMaxX') > this.maxx)) {
                    this.maxx = options.get('chartRangeMaxX');
                }

            },

            drawNormalRange: function (canvasLeft, canvasTop, canvasHeight, canvasWidth, rangey) {
                var normalRangeMin = this.options.get('normalRangeMin'),
                    normalRangeMax = this.options.get('normalRangeMax'),
                    ytop = canvasTop + Math.round(canvasHeight - (canvasHeight * ((normalRangeMax - this.miny) / rangey))),
                    height = Math.round((canvasHeight * (normalRangeMax - normalRangeMin)) / rangey);
                this.target.drawRect(canvasLeft, ytop, canvasWidth, height, undefined, this.options.get('normalRangeColor')).append();
            },

            render: function () {
                var options = this.options,
                    target = this.target,
                    canvasWidth = this.canvasWidth,
                    canvasHeight = this.canvasHeight,
                    vertices = this.vertices,
                    spotRadius = options.get('spotRadius'),
                    regionMap = this.regionMap,
                    rangex, rangey, yvallast,
                    canvasTop, canvasLeft,
                    vertex, path, paths, x, y, xnext, xpos, xposnext,
                    last, next, yvalcount, lineShapes, fillShapes, plen,
                    valueSpots, hlSpotsEnabled, color, xvalues, yvalues, i;

                if (!line._super.render.call(this)) {
                    return;
                }

                this.scanValues();
                this.processRangeOptions();

                xvalues = this.xvalues;
                yvalues = this.yvalues;

                if (!this.yminmax.length || this.yvalues.length < 2) {
                    // empty or all null valuess
                    return;
                }

                canvasTop = canvasLeft = 0;

                rangex = this.maxx - this.minx === 0 ? 1 : this.maxx - this.minx;
                rangey = this.maxy - this.miny === 0 ? 1 : this.maxy - this.miny;
                yvallast = this.yvalues.length - 1;

                if (spotRadius && (canvasWidth < (spotRadius * 4) || canvasHeight < (spotRadius * 4))) {
                    spotRadius = 0;
                }
                if (spotRadius) {
                    // adjust the canvas size as required so that spots will fit
                    hlSpotsEnabled = options.get('highlightSpotColor') && !options.get('disableInteraction');
                    if (hlSpotsEnabled || options.get('minSpotColor') || (options.get('spotColor') && yvalues[yvallast] === this.miny)) {
                        canvasHeight -= Math.ceil(spotRadius);
                    }
                    if (hlSpotsEnabled || options.get('maxSpotColor') || (options.get('spotColor') && yvalues[yvallast] === this.maxy)) {
                        canvasHeight -= Math.ceil(spotRadius);
                        canvasTop += Math.ceil(spotRadius);
                    }
                    if (hlSpotsEnabled ||
                         ((options.get('minSpotColor') || options.get('maxSpotColor')) && (yvalues[0] === this.miny || yvalues[0] === this.maxy))) {
                        canvasLeft += Math.ceil(spotRadius);
                        canvasWidth -= Math.ceil(spotRadius);
                    }
                    if (hlSpotsEnabled || options.get('spotColor') ||
                        (options.get('minSpotColor') || options.get('maxSpotColor') &&
                            (yvalues[yvallast] === this.miny || yvalues[yvallast] === this.maxy))) {
                        canvasWidth -= Math.ceil(spotRadius);
                    }
                }


                canvasHeight--;

                if (options.get('normalRangeMin') !== undefined && !options.get('drawNormalOnTop')) {
                    this.drawNormalRange(canvasLeft, canvasTop, canvasHeight, canvasWidth, rangey);
                }

                path = [];
                paths = [path];
                last = next = null;
                yvalcount = yvalues.length;
                for (i = 0; i < yvalcount; i++) {
                    x = xvalues[i];
                    xnext = xvalues[i + 1];
                    y = yvalues[i];
                    xpos = canvasLeft + Math.round((x - this.minx) * (canvasWidth / rangex));
                    xposnext = i < yvalcount - 1 ? canvasLeft + Math.round((xnext - this.minx) * (canvasWidth / rangex)) : canvasWidth;
                    next = xpos + ((xposnext - xpos) / 2);
                    regionMap[i] = [last || 0, next, i];
                    last = next;
                    if (y === null) {
                        if (i) {
                            if (yvalues[i - 1] !== null) {
                                path = [];
                                paths.push(path);
                            }
                            vertices.push(null);
                        }
                    } else {
                        if (y < this.miny) {
                            y = this.miny;
                        }
                        if (y > this.maxy) {
                            y = this.maxy;
                        }
                        if (!path.length) {
                            // previous value was null
                            path.push([xpos, canvasTop + canvasHeight]);
                        }
                        vertex = [xpos, canvasTop + Math.round(canvasHeight - (canvasHeight * ((y - this.miny) / rangey)))];
                        path.push(vertex);
                        vertices.push(vertex);
                    }
                }

                lineShapes = [];
                fillShapes = [];
                plen = paths.length;
                for (i = 0; i < plen; i++) {
                    path = paths[i];
                    if (path.length) {
                        if (options.get('fillColor')) {
                            path.push([path[path.length - 1][0], (canvasTop + canvasHeight)]);
                            fillShapes.push(path.slice(0));
                            path.pop();
                        }
                        // if there's only a single point in this path, then we want to display it
                        // as a vertical line which means we keep path[0]  as is
                        if (path.length > 2) {
                            // else we want the first value
                            path[0] = [path[0][0], path[1][1]];
                        }
                        lineShapes.push(path);
                    }
                }

                // draw the fill first, then optionally the normal range, then the line on top of that
                plen = fillShapes.length;
                for (i = 0; i < plen; i++) {
                    target.drawShape(fillShapes[i],
                        options.get('fillColor'), options.get('fillColor')).append();
                }

                if (options.get('normalRangeMin') !== undefined && options.get('drawNormalOnTop')) {
                    this.drawNormalRange(canvasLeft, canvasTop, canvasHeight, canvasWidth, rangey);
                }

                plen = lineShapes.length;
                for (i = 0; i < plen; i++) {
                    target.drawShape(lineShapes[i], options.get('lineColor'), undefined,
                        options.get('lineWidth')).append();
                }

                if (spotRadius && options.get('valueSpots')) {
                    valueSpots = options.get('valueSpots');
                    if (valueSpots.get === undefined) {
                        valueSpots = new RangeMap(valueSpots);
                    }
                    for (i = 0; i < yvalcount; i++) {
                        color = valueSpots.get(yvalues[i]);
                        if (color) {
                            target.drawCircle(canvasLeft + Math.round((xvalues[i] - this.minx) * (canvasWidth / rangex)),
                                canvasTop + Math.round(canvasHeight - (canvasHeight * ((yvalues[i] - this.miny) / rangey))),
                                spotRadius, undefined,
                                color).append();
                        }
                    }

                }
                if (spotRadius && options.get('spotColor') && yvalues[yvallast] !== null) {
                    target.drawCircle(canvasLeft + Math.round((xvalues[xvalues.length - 1] - this.minx) * (canvasWidth / rangex)),
                        canvasTop + Math.round(canvasHeight - (canvasHeight * ((yvalues[yvallast] - this.miny) / rangey))),
                        spotRadius, undefined,
                        options.get('spotColor')).append();
                }
                if (this.maxy !== this.minyorg) {
                    if (spotRadius && options.get('minSpotColor')) {
                        x = xvalues[$.inArray(this.minyorg, yvalues)];
                        target.drawCircle(canvasLeft + Math.round((x - this.minx) * (canvasWidth / rangex)),
                            canvasTop + Math.round(canvasHeight - (canvasHeight * ((this.minyorg - this.miny) / rangey))),
                            spotRadius, undefined,
                            options.get('minSpotColor')).append();
                    }
                    if (spotRadius && options.get('maxSpotColor')) {
                        x = xvalues[$.inArray(this.maxyorg, yvalues)];
                        target.drawCircle(canvasLeft + Math.round((x - this.minx) * (canvasWidth / rangex)),
                            canvasTop + Math.round(canvasHeight - (canvasHeight * ((this.maxyorg - this.miny) / rangey))),
                            spotRadius, undefined,
                            options.get('maxSpotColor')).append();
                    }
                }

                this.lastShapeId = target.getLastShapeId();
                this.canvasTop = canvasTop;
                target.render();
            }
        });

        /**
         * Bar charts
         */
        $.fn.sparkline.bar = bar = createClass($.fn.sparkline._base, barHighlightMixin, {
            type: 'bar',

            init: function (el, values, options, width, height) {
                var barWidth = parseInt(options.get('barWidth'), 10),
                    barSpacing = parseInt(options.get('barSpacing'), 10),
                    chartRangeMin = options.get('chartRangeMin'),
                    chartRangeMax = options.get('chartRangeMax'),
                    chartRangeClip = options.get('chartRangeClip'),
                    stackMin = Infinity,
                    stackMax = -Infinity,
                    isStackString, groupMin, groupMax, stackRanges,
                    numValues, i, vlen, range, zeroAxis, xaxisOffset, min, max, clipMin, clipMax,
                    stacked, vlist, j, slen, svals, val, yoffset, yMaxCalc, canvasHeightEf;
                bar._super.init.call(this, el, values, options, width, height);

                // scan values to determine whether to stack bars
                for (i = 0, vlen = values.length; i < vlen; i++) {
                    val = values[i];
                    isStackString = typeof (val) === 'string' && val.indexOf(':') > -1;
                    if (isStackString || $.isArray(val)) {
                        stacked = true;
                        if (isStackString) {
                            val = values[i] = normalizeValues(val.split(':'));
                        }
                        val = remove(val, null); // min/max will treat null as zero
                        groupMin = Math.min.apply(Math, val);
                        groupMax = Math.max.apply(Math, val);
                        if (groupMin < stackMin) {
                            stackMin = groupMin;
                        }
                        if (groupMax > stackMax) {
                            stackMax = groupMax;
                        }
                    }
                }

                this.stacked = stacked;
                this.regionShapes = {};
                this.barWidth = barWidth;
                this.barSpacing = barSpacing;
                this.totalBarWidth = barWidth + barSpacing;
                this.width = width = (values.length * barWidth) + ((values.length - 1) * barSpacing);

                this.initTarget();

                if (chartRangeClip) {
                    clipMin = chartRangeMin === undefined ? -Infinity : chartRangeMin;
                    clipMax = chartRangeMax === undefined ? Infinity : chartRangeMax;
                }

                numValues = [];
                stackRanges = stacked ? [] : numValues;
                var stackTotals = [];
                var stackRangesNeg = [];
                for (i = 0, vlen = values.length; i < vlen; i++) {
                    if (stacked) {
                        vlist = values[i];
                        values[i] = svals = [];
                        stackTotals[i] = 0;
                        stackRanges[i] = stackRangesNeg[i] = 0;
                        for (j = 0, slen = vlist.length; j < slen; j++) {
                            val = svals[j] = chartRangeClip ? clipval(vlist[j], clipMin, clipMax) : vlist[j];
                            if (val !== null) {
                                if (val > 0) {
                                    stackTotals[i] += val;
                                }
                                if (stackMin < 0 && stackMax > 0) {
                                    if (val < 0) {
                                        stackRangesNeg[i] += Math.abs(val);
                                    } else {
                                        stackRanges[i] += val;
                                    }
                                } else {
                                    stackRanges[i] += Math.abs(val - (val < 0 ? stackMax : stackMin));
                                }
                                numValues.push(val);
                            }
                        }
                    } else {
                        val = chartRangeClip ? clipval(values[i], clipMin, clipMax) : values[i];
                        val = values[i] = normalizeValue(val);
                        if (val !== null) {
                            numValues.push(val);
                        }
                    }
                }
                this.max = max = Math.max.apply(Math, numValues);
                this.min = min = Math.min.apply(Math, numValues);
                this.stackMax = stackMax = stacked ? Math.max.apply(Math, stackTotals) : max;
                this.stackMin = stackMin = stacked ? Math.min.apply(Math, numValues) : min;

                if (options.get('chartRangeMin') !== undefined && (options.get('chartRangeClip') || options.get('chartRangeMin') < min)) {
                    min = options.get('chartRangeMin');
                }
                if (options.get('chartRangeMax') !== undefined && (options.get('chartRangeClip') || options.get('chartRangeMax') > max)) {
                    max = options.get('chartRangeMax');
                }

                this.zeroAxis = zeroAxis = options.get('zeroAxis', true);
                if (min <= 0 && max >= 0 && zeroAxis) {
                    xaxisOffset = 0;
                } else if (zeroAxis == false) {
                    xaxisOffset = min;
                } else if (min > 0) {
                    xaxisOffset = min;
                } else {
                    xaxisOffset = max;
                }
                this.xaxisOffset = xaxisOffset;

                range = stacked ? (Math.max.apply(Math, stackRanges) + Math.max.apply(Math, stackRangesNeg)) : max - min;

                // as we plot zero/min values a single pixel line, we add a pixel to all other
                // values - Reduce the effective canvas size to suit
                this.canvasHeightEf = (zeroAxis && min < 0) ? this.canvasHeight - 2 : this.canvasHeight - 1;

                if (min < xaxisOffset) {
                    yMaxCalc = (stacked && max >= 0) ? stackMax : max;
                    yoffset = (yMaxCalc - xaxisOffset) / range * this.canvasHeight;
                    if (yoffset !== Math.ceil(yoffset)) {
                        this.canvasHeightEf -= 2;
                        yoffset = Math.ceil(yoffset);
                    }
                } else {
                    yoffset = this.canvasHeight;
                }
                this.yoffset = yoffset;

                if ($.isArray(options.get('colorMap'))) {
                    this.colorMapByIndex = options.get('colorMap');
                    this.colorMapByValue = null;
                } else {
                    this.colorMapByIndex = null;
                    this.colorMapByValue = options.get('colorMap');
                    if (this.colorMapByValue && this.colorMapByValue.get === undefined) {
                        this.colorMapByValue = new RangeMap(this.colorMapByValue);
                    }
                }

                this.range = range;
            },

            getRegion: function (el, x, y) {
                var result = Math.floor(x / this.totalBarWidth);
                return (result < 0 || result >= this.values.length) ? undefined : result;
            },

            getCurrentRegionFields: function () {
                var currentRegion = this.currentRegion,
                    values = ensureArray(this.values[currentRegion]),
                    result = [],
                    value, i;
                for (i = values.length; i--;) {
                    value = values[i];
                    result.push({
                        isNull: value === null,
                        value: value,
                        color: this.calcColor(i, value, currentRegion),
                        offset: currentRegion
                    });
                }
                return result;
            },

            calcColor: function (stacknum, value, valuenum) {
                var colorMapByIndex = this.colorMapByIndex,
                    colorMapByValue = this.colorMapByValue,
                    options = this.options,
                    color, newColor;
                if (this.stacked) {
                    color = options.get('stackedBarColor');
                } else {
                    color = (value < 0) ? options.get('negBarColor') : options.get('barColor');
                }
                if (value === 0 && options.get('zeroColor') !== undefined) {
                    color = options.get('zeroColor');
                }
                if (colorMapByValue && (newColor = colorMapByValue.get(value))) {
                    color = newColor;
                } else if (colorMapByIndex && colorMapByIndex.length > valuenum) {
                    color = colorMapByIndex[valuenum];
                }
                return $.isArray(color) ? color[stacknum % color.length] : color;
            },

            /**
             * Render bar(s) for a region
             */
            renderRegion: function (valuenum, highlight) {
                var vals = this.values[valuenum],
                    options = this.options,
                    xaxisOffset = this.xaxisOffset,
                    result = [],
                    range = this.range,
                    stacked = this.stacked,
                    target = this.target,
                    x = valuenum * this.totalBarWidth,
                    canvasHeightEf = this.canvasHeightEf,
                    yoffset = this.yoffset,
                    y, height, color, isNull, yoffsetNeg, i, valcount, val, minPlotted, allMin;

                vals = $.isArray(vals) ? vals : [vals];
                valcount = vals.length;
                val = vals[0];
                isNull = all(null, vals);
                allMin = all(xaxisOffset, vals, true);

                if (isNull) {
                    if (options.get('nullColor')) {
                        color = highlight ? options.get('nullColor') : this.calcHighlightColor(options.get('nullColor'), options);
                        y = (yoffset > 0) ? yoffset - 1 : yoffset;
                        return target.drawRect(x, y, this.barWidth - 1, 0, color, color);
                    } else {
                        return undefined;
                    }
                }
                yoffsetNeg = yoffset;
                for (i = 0; i < valcount; i++) {
                    val = vals[i];

                    if (stacked && val === xaxisOffset) {
                        if (!allMin || minPlotted) {
                            continue;
                        }
                        minPlotted = true;
                    }

                    if (range > 0) {
                        height = Math.floor(canvasHeightEf * ((Math.abs(val - xaxisOffset) / range))) + 1;
                    } else {
                        height = 1;
                    }
                    if (val < xaxisOffset || (val === xaxisOffset && yoffset === 0)) {
                        y = yoffsetNeg;
                        yoffsetNeg += height;
                    } else {
                        y = yoffset - height;
                        yoffset -= height;
                    }
                    color = this.calcColor(i, val, valuenum);
                    if (highlight) {
                        color = this.calcHighlightColor(color, options);
                    }
                    result.push(target.drawRect(x, y, this.barWidth - 1, height - 1, color, color));
                }
                if (result.length === 1) {
                    return result[0];
                }
                return result;
            }
        });

        /**
         * Tristate charts
         */
        $.fn.sparkline.tristate = tristate = createClass($.fn.sparkline._base, barHighlightMixin, {
            type: 'tristate',

            init: function (el, values, options, width, height) {
                var barWidth = parseInt(options.get('barWidth'), 10),
                    barSpacing = parseInt(options.get('barSpacing'), 10);
                tristate._super.init.call(this, el, values, options, width, height);

                this.regionShapes = {};
                this.barWidth = barWidth;
                this.barSpacing = barSpacing;
                this.totalBarWidth = barWidth + barSpacing;
                this.values = $.map(values, Number);
                this.width = width = (values.length * barWidth) + ((values.length - 1) * barSpacing);

                if ($.isArray(options.get('colorMap'))) {
                    this.colorMapByIndex = options.get('colorMap');
                    this.colorMapByValue = null;
                } else {
                    this.colorMapByIndex = null;
                    this.colorMapByValue = options.get('colorMap');
                    if (this.colorMapByValue && this.colorMapByValue.get === undefined) {
                        this.colorMapByValue = new RangeMap(this.colorMapByValue);
                    }
                }
                this.initTarget();
            },

            getRegion: function (el, x, y) {
                return Math.floor(x / this.totalBarWidth);
            },

            getCurrentRegionFields: function () {
                var currentRegion = this.currentRegion;
                return {
                    isNull: this.values[currentRegion] === undefined,
                    value: this.values[currentRegion],
                    color: this.calcColor(this.values[currentRegion], currentRegion),
                    offset: currentRegion
                };
            },

            calcColor: function (value, valuenum) {
                var values = this.values,
                    options = this.options,
                    colorMapByIndex = this.colorMapByIndex,
                    colorMapByValue = this.colorMapByValue,
                    color, newColor;

                if (colorMapByValue && (newColor = colorMapByValue.get(value))) {
                    color = newColor;
                } else if (colorMapByIndex && colorMapByIndex.length > valuenum) {
                    color = colorMapByIndex[valuenum];
                } else if (values[valuenum] < 0) {
                    color = options.get('negBarColor');
                } else if (values[valuenum] > 0) {
                    color = options.get('posBarColor');
                } else {
                    color = options.get('zeroBarColor');
                }
                return color;
            },

            renderRegion: function (valuenum, highlight) {
                var values = this.values,
                    options = this.options,
                    target = this.target,
                    canvasHeight, height, halfHeight,
                    x, y, color;

                canvasHeight = target.pixelHeight;
                halfHeight = Math.round(canvasHeight / 2);

                x = valuenum * this.totalBarWidth;
                if (values[valuenum] < 0) {
                    y = halfHeight;
                    height = halfHeight - 1;
                } else if (values[valuenum] > 0) {
                    y = 0;
                    height = halfHeight - 1;
                } else {
                    y = halfHeight - 1;
                    height = 2;
                }
                color = this.calcColor(values[valuenum], valuenum);
                if (color === null) {
                    return;
                }
                if (highlight) {
                    color = this.calcHighlightColor(color, options);
                }
                return target.drawRect(x, y, this.barWidth - 1, height - 1, color, color);
            }
        });

        /**
         * Discrete charts
         */
        $.fn.sparkline.discrete = discrete = createClass($.fn.sparkline._base, barHighlightMixin, {
            type: 'discrete',

            init: function (el, values, options, width, height) {
                discrete._super.init.call(this, el, values, options, width, height);

                this.regionShapes = {};
                this.values = values = $.map(values, Number);
                this.min = Math.min.apply(Math, values);
                this.max = Math.max.apply(Math, values);
                this.range = this.max - this.min;
                this.width = width = options.get('width') === 'auto' ? values.length * 2 : this.width;
                this.interval = Math.floor(width / values.length);
                this.itemWidth = width / values.length;
                if (options.get('chartRangeMin') !== undefined && (options.get('chartRangeClip') || options.get('chartRangeMin') < this.min)) {
                    this.min = options.get('chartRangeMin');
                }
                if (options.get('chartRangeMax') !== undefined && (options.get('chartRangeClip') || options.get('chartRangeMax') > this.max)) {
                    this.max = options.get('chartRangeMax');
                }
                this.initTarget();
                if (this.target) {
                    this.lineHeight = options.get('lineHeight') === 'auto' ? Math.round(this.canvasHeight * 0.3) : options.get('lineHeight');
                }
            },

            getRegion: function (el, x, y) {
                return Math.floor(x / this.itemWidth);
            },

            getCurrentRegionFields: function () {
                var currentRegion = this.currentRegion;
                return {
                    isNull: this.values[currentRegion] === undefined,
                    value: this.values[currentRegion],
                    offset: currentRegion
                };
            },

            renderRegion: function (valuenum, highlight) {
                var values = this.values,
                    options = this.options,
                    min = this.min,
                    max = this.max,
                    range = this.range,
                    interval = this.interval,
                    target = this.target,
                    canvasHeight = this.canvasHeight,
                    lineHeight = this.lineHeight,
                    pheight = canvasHeight - lineHeight,
                    ytop, val, color, x;

                val = clipval(values[valuenum], min, max);
                x = valuenum * interval;
                ytop = Math.round(pheight - pheight * ((val - min) / range));
                color = (options.get('thresholdColor') && val < options.get('thresholdValue')) ? options.get('thresholdColor') : options.get('lineColor');
                if (highlight) {
                    color = this.calcHighlightColor(color, options);
                }
                return target.drawLine(x, ytop, x, ytop + lineHeight, color);
            }
        });

        /**
         * Bullet charts
         */
        $.fn.sparkline.bullet = bullet = createClass($.fn.sparkline._base, {
            type: 'bullet',

            init: function (el, values, options, width, height) {
                var min, max, vals;
                bullet._super.init.call(this, el, values, options, width, height);

                // values: target, performance, range1, range2, range3
                this.values = values = normalizeValues(values);
                // target or performance could be null
                vals = values.slice();
                vals[0] = vals[0] === null ? vals[2] : vals[0];
                vals[1] = values[1] === null ? vals[2] : vals[1];
                min = Math.min.apply(Math, values);
                max = Math.max.apply(Math, values);
                if (options.get('base') === undefined) {
                    min = min < 0 ? min : 0;
                } else {
                    min = options.get('base');
                }
                this.min = min;
                this.max = max;
                this.range = max - min;
                this.shapes = {};
                this.valueShapes = {};
                this.regiondata = {};
                this.width = width = options.get('width') === 'auto' ? '4.0em' : width;
                this.target = this.$el.simpledraw(width, height, options.get('composite'));
                if (!values.length) {
                    this.disabled = true;
                }
                this.initTarget();
            },

            getRegion: function (el, x, y) {
                var shapeid = this.target.getShapeAt(el, x, y);
                return (shapeid !== undefined && this.shapes[shapeid] !== undefined) ? this.shapes[shapeid] : undefined;
            },

            getCurrentRegionFields: function () {
                var currentRegion = this.currentRegion;
                return {
                    fieldkey: currentRegion.substr(0, 1),
                    value: this.values[currentRegion.substr(1)],
                    region: currentRegion
                };
            },

            changeHighlight: function (highlight) {
                var currentRegion = this.currentRegion,
                    shapeid = this.valueShapes[currentRegion],
                    shape;
                delete this.shapes[shapeid];
                switch (currentRegion.substr(0, 1)) {
                    case 'r':
                        shape = this.renderRange(currentRegion.substr(1), highlight);
                        break;
                    case 'p':
                        shape = this.renderPerformance(highlight);
                        break;
                    case 't':
                        shape = this.renderTarget(highlight);
                        break;
                }
                this.valueShapes[currentRegion] = shape.id;
                this.shapes[shape.id] = currentRegion;
                this.target.replaceWithShape(shapeid, shape);
            },

            renderRange: function (rn, highlight) {
                var rangeval = this.values[rn],
                    rangewidth = Math.round(this.canvasWidth * ((rangeval - this.min) / this.range)),
                    color = this.options.get('rangeColors')[rn - 2];
                if (highlight) {
                    color = this.calcHighlightColor(color, this.options);
                }
                return this.target.drawRect(0, 0, rangewidth - 1, this.canvasHeight - 1, color, color);
            },

            renderPerformance: function (highlight) {
                var perfval = this.values[1],
                    perfwidth = Math.round(this.canvasWidth * ((perfval - this.min) / this.range)),
                    color = this.options.get('performanceColor');
                if (highlight) {
                    color = this.calcHighlightColor(color, this.options);
                }
                return this.target.drawRect(0, Math.round(this.canvasHeight * 0.3), perfwidth - 1,
                    Math.round(this.canvasHeight * 0.4) - 1, color, color);
            },

            renderTarget: function (highlight) {
                var targetval = this.values[0],
                    x = Math.round(this.canvasWidth * ((targetval - this.min) / this.range) - (this.options.get('targetWidth') / 2)),
                    targettop = Math.round(this.canvasHeight * 0.10),
                    targetheight = this.canvasHeight - (targettop * 2),
                    color = this.options.get('targetColor');
                if (highlight) {
                    color = this.calcHighlightColor(color, this.options);
                }
                return this.target.drawRect(x, targettop, this.options.get('targetWidth') - 1, targetheight - 1, color, color);
            },

            render: function () {
                var vlen = this.values.length,
                    target = this.target,
                    i, shape;
                if (!bullet._super.render.call(this)) {
                    return;
                }
                for (i = 2; i < vlen; i++) {
                    shape = this.renderRange(i).append();
                    this.shapes[shape.id] = 'r' + i;
                    this.valueShapes['r' + i] = shape.id;
                }
                if (this.values[1] !== null) {
                    shape = this.renderPerformance().append();
                    this.shapes[shape.id] = 'p1';
                    this.valueShapes.p1 = shape.id;
                }
                if (this.values[0] !== null) {
                    shape = this.renderTarget().append();
                    this.shapes[shape.id] = 't0';
                    this.valueShapes.t0 = shape.id;
                }
                target.render();
            }
        });

        /**
         * Pie charts
         */
        $.fn.sparkline.pie = pie = createClass($.fn.sparkline._base, {
            type: 'pie',

            init: function (el, values, options, width, height) {
                var total = 0, i;

                pie._super.init.call(this, el, values, options, width, height);

                this.shapes = {}; // map shape ids to value offsets
                this.valueShapes = {}; // maps value offsets to shape ids
                this.values = values = $.map(values, Number);

                if (options.get('width') === 'auto') {
                    this.width = this.height;
                }

                if (values.length > 0) {
                    for (i = values.length; i--;) {
                        total += values[i];
                    }
                }
                this.total = total;
                this.initTarget();
                this.radius = Math.floor(Math.min(this.canvasWidth, this.canvasHeight) / 2);
            },

            getRegion: function (el, x, y) {
                var shapeid = this.target.getShapeAt(el, x, y);
                return (shapeid !== undefined && this.shapes[shapeid] !== undefined) ? this.shapes[shapeid] : undefined;
            },

            getCurrentRegionFields: function () {
                var currentRegion = this.currentRegion;
                return {
                    isNull: this.values[currentRegion] === undefined,
                    value: this.values[currentRegion],
                    percent: this.values[currentRegion] / this.total * 100,
                    color: this.options.get('sliceColors')[currentRegion % this.options.get('sliceColors').length],
                    offset: currentRegion
                };
            },

            changeHighlight: function (highlight) {
                var currentRegion = this.currentRegion,
                     newslice = this.renderSlice(currentRegion, highlight),
                     shapeid = this.valueShapes[currentRegion];
                delete this.shapes[shapeid];
                this.target.replaceWithShape(shapeid, newslice);
                this.valueShapes[currentRegion] = newslice.id;
                this.shapes[newslice.id] = currentRegion;
            },

            renderSlice: function (valuenum, highlight) {
                var target = this.target,
                    options = this.options,
                    radius = this.radius,
                    borderWidth = options.get('borderWidth'),
                    offset = options.get('offset'),
                    circle = 2 * Math.PI,
                    values = this.values,
                    total = this.total,
                    next = offset ? (2 * Math.PI) * (offset / 360) : 0,
                    start, end, i, vlen, color;

                vlen = values.length;
                for (i = 0; i < vlen; i++) {
                    start = next;
                    end = next;
                    if (total > 0) {  // avoid divide by zero
                        end = next + (circle * (values[i] / total));
                    }
                    if (valuenum === i) {
                        color = options.get('sliceColors')[i % options.get('sliceColors').length];
                        if (highlight) {
                            color = this.calcHighlightColor(color, options);
                        }

                        return target.drawPieSlice(radius, radius, radius - borderWidth, start, end, undefined, color);
                    }
                    next = end;
                }
            },

            render: function () {
                var target = this.target,
                    values = this.values,
                    options = this.options,
                    radius = this.radius,
                    borderWidth = options.get('borderWidth'),
                    shape, i;

                if (!pie._super.render.call(this)) {
                    return;
                }
                if (borderWidth) {
                    target.drawCircle(radius, radius, Math.floor(radius - (borderWidth / 2)),
                        options.get('borderColor'), undefined, borderWidth).append();
                }
                for (i = values.length; i--;) {
                    if (values[i]) { // don't render zero values
                        shape = this.renderSlice(i).append();
                        this.valueShapes[i] = shape.id; // store just the shapeid
                        this.shapes[shape.id] = i;
                    }
                }
                target.render();
            }
        });

        /**
         * Box plots
         */
        $.fn.sparkline.box = box = createClass($.fn.sparkline._base, {
            type: 'box',

            init: function (el, values, options, width, height) {
                box._super.init.call(this, el, values, options, width, height);
                this.values = $.map(values, Number);
                this.width = options.get('width') === 'auto' ? '4.0em' : width;
                this.initTarget();
                if (!this.values.length) {
                    this.disabled = 1;
                }
            },

            /**
             * Simulate a single region
             */
            getRegion: function () {
                return 1;
            },

            getCurrentRegionFields: function () {
                var result = [
                    { field: 'lq', value: this.quartiles[0] },
                    { field: 'med', value: this.quartiles[1] },
                    { field: 'uq', value: this.quartiles[2] }
                ];
                if (this.loutlier !== undefined) {
                    result.push({ field: 'lo', value: this.loutlier });
                }
                if (this.routlier !== undefined) {
                    result.push({ field: 'ro', value: this.routlier });
                }
                if (this.lwhisker !== undefined) {
                    result.push({ field: 'lw', value: this.lwhisker });
                }
                if (this.rwhisker !== undefined) {
                    result.push({ field: 'rw', value: this.rwhisker });
                }
                return result;
            },

            render: function () {
                var target = this.target,
                    values = this.values,
                    vlen = values.length,
                    options = this.options,
                    canvasWidth = this.canvasWidth,
                    canvasHeight = this.canvasHeight,
                    minValue = options.get('chartRangeMin') === undefined ? Math.min.apply(Math, values) : options.get('chartRangeMin'),
                    maxValue = options.get('chartRangeMax') === undefined ? Math.max.apply(Math, values) : options.get('chartRangeMax'),
                    canvasLeft = 0,
                    lwhisker, loutlier, iqr, q1, q2, q3, rwhisker, routlier, i,
                    size, unitSize;

                if (!box._super.render.call(this)) {
                    return;
                }

                if (options.get('raw')) {
                    if (options.get('showOutliers') && values.length > 5) {
                        loutlier = values[0];
                        lwhisker = values[1];
                        q1 = values[2];
                        q2 = values[3];
                        q3 = values[4];
                        rwhisker = values[5];
                        routlier = values[6];
                    } else {
                        lwhisker = values[0];
                        q1 = values[1];
                        q2 = values[2];
                        q3 = values[3];
                        rwhisker = values[4];
                    }
                } else {
                    values.sort(function (a, b) { return a - b; });
                    q1 = quartile(values, 1);
                    q2 = quartile(values, 2);
                    q3 = quartile(values, 3);
                    iqr = q3 - q1;
                    if (options.get('showOutliers')) {
                        lwhisker = rwhisker = undefined;
                        for (i = 0; i < vlen; i++) {
                            if (lwhisker === undefined && values[i] > q1 - (iqr * options.get('outlierIQR'))) {
                                lwhisker = values[i];
                            }
                            if (values[i] < q3 + (iqr * options.get('outlierIQR'))) {
                                rwhisker = values[i];
                            }
                        }
                        loutlier = values[0];
                        routlier = values[vlen - 1];
                    } else {
                        lwhisker = values[0];
                        rwhisker = values[vlen - 1];
                    }
                }
                this.quartiles = [q1, q2, q3];
                this.lwhisker = lwhisker;
                this.rwhisker = rwhisker;
                this.loutlier = loutlier;
                this.routlier = routlier;

                unitSize = canvasWidth / (maxValue - minValue + 1);
                if (options.get('showOutliers')) {
                    canvasLeft = Math.ceil(options.get('spotRadius'));
                    canvasWidth -= 2 * Math.ceil(options.get('spotRadius'));
                    unitSize = canvasWidth / (maxValue - minValue + 1);
                    if (loutlier < lwhisker) {
                        target.drawCircle((loutlier - minValue) * unitSize + canvasLeft,
                            canvasHeight / 2,
                            options.get('spotRadius'),
                            options.get('outlierLineColor'),
                            options.get('outlierFillColor')).append();
                    }
                    if (routlier > rwhisker) {
                        target.drawCircle((routlier - minValue) * unitSize + canvasLeft,
                            canvasHeight / 2,
                            options.get('spotRadius'),
                            options.get('outlierLineColor'),
                            options.get('outlierFillColor')).append();
                    }
                }

                // box
                target.drawRect(
                    Math.round((q1 - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight * 0.1),
                    Math.round((q3 - q1) * unitSize),
                    Math.round(canvasHeight * 0.8),
                    options.get('boxLineColor'),
                    options.get('boxFillColor')).append();
                // left whisker
                target.drawLine(
                    Math.round((lwhisker - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight / 2),
                    Math.round((q1 - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight / 2),
                    options.get('lineColor')).append();
                target.drawLine(
                    Math.round((lwhisker - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight / 4),
                    Math.round((lwhisker - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight - canvasHeight / 4),
                    options.get('whiskerColor')).append();
                // right whisker
                target.drawLine(Math.round((rwhisker - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight / 2),
                    Math.round((q3 - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight / 2),
                    options.get('lineColor')).append();
                target.drawLine(
                    Math.round((rwhisker - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight / 4),
                    Math.round((rwhisker - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight - canvasHeight / 4),
                    options.get('whiskerColor')).append();
                // median line
                target.drawLine(
                    Math.round((q2 - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight * 0.1),
                    Math.round((q2 - minValue) * unitSize + canvasLeft),
                    Math.round(canvasHeight * 0.9),
                    options.get('medianColor')).append();
                if (options.get('target')) {
                    size = Math.ceil(options.get('spotRadius'));
                    target.drawLine(
                        Math.round((options.get('target') - minValue) * unitSize + canvasLeft),
                        Math.round((canvasHeight / 2) - size),
                        Math.round((options.get('target') - minValue) * unitSize + canvasLeft),
                        Math.round((canvasHeight / 2) + size),
                        options.get('targetColor')).append();
                    target.drawLine(
                        Math.round((options.get('target') - minValue) * unitSize + canvasLeft - size),
                        Math.round(canvasHeight / 2),
                        Math.round((options.get('target') - minValue) * unitSize + canvasLeft + size),
                        Math.round(canvasHeight / 2),
                        options.get('targetColor')).append();
                }
                target.render();
            }
        });

        // Setup a very simple "virtual canvas" to make drawing the few shapes we need easier
        // This is accessible as $(foo).simpledraw()

        VShape = createClass({
            init: function (target, id, type, args) {
                this.target = target;
                this.id = id;
                this.type = type;
                this.args = args;
            },
            append: function () {
                this.target.appendShape(this);
                return this;
            }
        });

        VCanvas_base = createClass({
            _pxregex: /(\d+)(px)?\s*$/i,

            init: function (width, height, target) {
                if (!width) {
                    return;
                }
                this.width = width;
                this.height = height;
                this.target = target;
                this.lastShapeId = null;
                if (target[0]) {
                    target = target[0];
                }
                $.data(target, '_jqs_vcanvas', this);
            },

            drawLine: function (x1, y1, x2, y2, lineColor, lineWidth) {
                return this.drawShape([[x1, y1], [x2, y2]], lineColor, lineWidth);
            },

            drawShape: function (path, lineColor, fillColor, lineWidth) {
                return this._genShape('Shape', [path, lineColor, fillColor, lineWidth]);
            },

            drawCircle: function (x, y, radius, lineColor, fillColor, lineWidth) {
                return this._genShape('Circle', [x, y, radius, lineColor, fillColor, lineWidth]);
            },

            drawPieSlice: function (x, y, radius, startAngle, endAngle, lineColor, fillColor) {
                return this._genShape('PieSlice', [x, y, radius, startAngle, endAngle, lineColor, fillColor]);
            },

            drawRect: function (x, y, width, height, lineColor, fillColor) {
                return this._genShape('Rect', [x, y, width, height, lineColor, fillColor]);
            },

            getElement: function () {
                return this.canvas;
            },

            /**
             * Return the most recently inserted shape id
             */
            getLastShapeId: function () {
                return this.lastShapeId;
            },

            /**
             * Clear and reset the canvas
             */
            reset: function () {
                alert('reset not implemented');
            },

            _insert: function (el, target) {
                $(target).html(el);
            },

            /**
             * Calculate the pixel dimensions of the canvas
             */
            _calculatePixelDims: function (width, height, canvas) {
                // XXX This should probably be a configurable option
                var match;
                match = this._pxregex.exec(height);
                if (match) {
                    this.pixelHeight = match[1];
                } else {
                    this.pixelHeight = $(canvas).height();
                }
                match = this._pxregex.exec(width);
                if (match) {
                    this.pixelWidth = match[1];
                } else {
                    this.pixelWidth = $(canvas).width();
                }
            },

            /**
             * Generate a shape object and id for later rendering
             */
            _genShape: function (shapetype, shapeargs) {
                var id = shapeCount++;
                shapeargs.unshift(id);
                return new VShape(this, id, shapetype, shapeargs);
            },

            /**
             * Add a shape to the end of the render queue
             */
            appendShape: function (shape) {
                alert('appendShape not implemented');
            },

            /**
             * Replace one shape with another
             */
            replaceWithShape: function (shapeid, shape) {
                alert('replaceWithShape not implemented');
            },

            /**
             * Insert one shape after another in the render queue
             */
            insertAfterShape: function (shapeid, shape) {
                alert('insertAfterShape not implemented');
            },

            /**
             * Remove a shape from the queue
             */
            removeShapeId: function (shapeid) {
                alert('removeShapeId not implemented');
            },

            /**
             * Find a shape at the specified x/y co-ordinates
             */
            getShapeAt: function (el, x, y) {
                alert('getShapeAt not implemented');
            },

            /**
             * Render all queued shapes onto the canvas
             */
            render: function () {
                alert('render not implemented');
            }
        });

        VCanvas_canvas = createClass(VCanvas_base, {
            init: function (width, height, target, interact) {
                VCanvas_canvas._super.init.call(this, width, height, target);
                this.canvas = document.createElement('canvas');
                if (target[0]) {
                    target = target[0];
                }
                $.data(target, '_jqs_vcanvas', this);
                $(this.canvas).css({ display: 'inline-block', width: width, height: height, verticalAlign: 'top' });
                this._insert(this.canvas, target);
                this._calculatePixelDims(width, height, this.canvas);
                this.canvas.width = this.pixelWidth;
                this.canvas.height = this.pixelHeight;
                this.interact = interact;
                this.shapes = {};
                this.shapeseq = [];
                this.currentTargetShapeId = undefined;
                $(this.canvas).css({ width: this.pixelWidth, height: this.pixelHeight });
            },

            _getContext: function (lineColor, fillColor, lineWidth) {
                var context = this.canvas.getContext('2d');
                if (lineColor !== undefined) {
                    context.strokeStyle = lineColor;
                }
                context.lineWidth = lineWidth === undefined ? 1 : lineWidth;
                if (fillColor !== undefined) {
                    context.fillStyle = fillColor;
                }
                return context;
            },

            reset: function () {
                var context = this._getContext();
                context.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
                this.shapes = {};
                this.shapeseq = [];
                this.currentTargetShapeId = undefined;
            },

            _drawShape: function (shapeid, path, lineColor, fillColor, lineWidth) {
                var context = this._getContext(lineColor, fillColor, lineWidth),
                    i, plen;
                context.beginPath();
                context.moveTo(path[0][0] + 0.5, path[0][1] + 0.5);
                for (i = 1, plen = path.length; i < plen; i++) {
                    context.lineTo(path[i][0] + 0.5, path[i][1] + 0.5); // the 0.5 offset gives us crisp pixel-width lines
                }
                if (lineColor !== undefined) {
                    context.stroke();
                }
                if (fillColor !== undefined) {
                    context.fill();
                }
                if (this.targetX !== undefined && this.targetY !== undefined &&
                    context.isPointInPath(this.targetX, this.targetY)) {
                    this.currentTargetShapeId = shapeid;
                }
            },

            _drawCircle: function (shapeid, x, y, radius, lineColor, fillColor, lineWidth) {
                var context = this._getContext(lineColor, fillColor, lineWidth);
                context.beginPath();
                context.arc(x, y, radius, 0, 2 * Math.PI, false);
                if (this.targetX !== undefined && this.targetY !== undefined &&
                    context.isPointInPath(this.targetX, this.targetY)) {
                    this.currentTargetShapeId = shapeid;
                }
                if (lineColor !== undefined) {
                    context.stroke();
                }
                if (fillColor !== undefined) {
                    context.fill();
                }
            },

            _drawPieSlice: function (shapeid, x, y, radius, startAngle, endAngle, lineColor, fillColor) {
                var context = this._getContext(lineColor, fillColor);
                context.beginPath();
                context.moveTo(x, y);
                context.arc(x, y, radius, startAngle, endAngle, false);
                context.lineTo(x, y);
                context.closePath();
                if (lineColor !== undefined) {
                    context.stroke();
                }
                if (fillColor) {
                    context.fill();
                }
                if (this.targetX !== undefined && this.targetY !== undefined &&
                    context.isPointInPath(this.targetX, this.targetY)) {
                    this.currentTargetShapeId = shapeid;
                }
            },

            _drawRect: function (shapeid, x, y, width, height, lineColor, fillColor) {
                return this._drawShape(shapeid, [[x, y], [x + width, y], [x + width, y + height], [x, y + height], [x, y]], lineColor, fillColor);
            },

            appendShape: function (shape) {
                this.shapes[shape.id] = shape;
                this.shapeseq.push(shape.id);
                this.lastShapeId = shape.id;
                return shape.id;
            },

            replaceWithShape: function (shapeid, shape) {
                var shapeseq = this.shapeseq,
                    i;
                this.shapes[shape.id] = shape;
                for (i = shapeseq.length; i--;) {
                    if (shapeseq[i] == shapeid) {
                        shapeseq[i] = shape.id;
                    }
                }
                delete this.shapes[shapeid];
            },

            replaceWithShapes: function (shapeids, shapes) {
                var shapeseq = this.shapeseq,
                    shapemap = {},
                    sid, i, first;

                for (i = shapeids.length; i--;) {
                    shapemap[shapeids[i]] = true;
                }
                for (i = shapeseq.length; i--;) {
                    sid = shapeseq[i];
                    if (shapemap[sid]) {
                        shapeseq.splice(i, 1);
                        delete this.shapes[sid];
                        first = i;
                    }
                }
                for (i = shapes.length; i--;) {
                    shapeseq.splice(first, 0, shapes[i].id);
                    this.shapes[shapes[i].id] = shapes[i];
                }

            },

            insertAfterShape: function (shapeid, shape) {
                var shapeseq = this.shapeseq,
                    i;
                for (i = shapeseq.length; i--;) {
                    if (shapeseq[i] === shapeid) {
                        shapeseq.splice(i + 1, 0, shape.id);
                        this.shapes[shape.id] = shape;
                        return;
                    }
                }
            },

            removeShapeId: function (shapeid) {
                var shapeseq = this.shapeseq,
                    i;
                for (i = shapeseq.length; i--;) {
                    if (shapeseq[i] === shapeid) {
                        shapeseq.splice(i, 1);
                        break;
                    }
                }
                delete this.shapes[shapeid];
            },

            getShapeAt: function (el, x, y) {
                this.targetX = x;
                this.targetY = y;
                this.render();
                return this.currentTargetShapeId;
            },

            render: function () {
                var shapeseq = this.shapeseq,
                    shapes = this.shapes,
                    shapeCount = shapeseq.length,
                    context = this._getContext(),
                    shapeid, shape, i;
                context.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
                for (i = 0; i < shapeCount; i++) {
                    shapeid = shapeseq[i];
                    shape = shapes[shapeid];
                    this['_draw' + shape.type].apply(this, shape.args);
                }
                if (!this.interact) {
                    // not interactive so no need to keep the shapes array
                    this.shapes = {};
                    this.shapeseq = [];
                }
            }

        });

        VCanvas_vml = createClass(VCanvas_base, {
            init: function (width, height, target) {
                var groupel;
                VCanvas_vml._super.init.call(this, width, height, target);
                if (target[0]) {
                    target = target[0];
                }
                $.data(target, '_jqs_vcanvas', this);
                this.canvas = document.createElement('span');
                $(this.canvas).css({ display: 'inline-block', position: 'relative', overflow: 'hidden', width: width, height: height, margin: '0px', padding: '0px', verticalAlign: 'top' });
                this._insert(this.canvas, target);
                this._calculatePixelDims(width, height, this.canvas);
                this.canvas.width = this.pixelWidth;
                this.canvas.height = this.pixelHeight;
                groupel = '<v:group coordorigin="0 0" coordsize="' + this.pixelWidth + ' ' + this.pixelHeight + '"' +
                        ' style="position:absolute;top:0;left:0;width:' + this.pixelWidth + 'px;height=' + this.pixelHeight + 'px;"></v:group>';
                this.canvas.insertAdjacentHTML('beforeEnd', groupel);
                this.group = $(this.canvas).children()[0];
                this.rendered = false;
                this.prerender = '';
            },

            _drawShape: function (shapeid, path, lineColor, fillColor, lineWidth) {
                var vpath = [],
                    initial, stroke, fill, closed, vel, plen, i;
                for (i = 0, plen = path.length; i < plen; i++) {
                    vpath[i] = '' + (path[i][0]) + ',' + (path[i][1]);
                }
                initial = vpath.splice(0, 1);
                lineWidth = lineWidth === undefined ? 1 : lineWidth;
                stroke = lineColor === undefined ? ' stroked="false" ' : ' strokeWeight="' + lineWidth + 'px" strokeColor="' + lineColor + '" ';
                fill = fillColor === undefined ? ' filled="false"' : ' fillColor="' + fillColor + '" filled="true" ';
                closed = vpath[0] === vpath[vpath.length - 1] ? 'x ' : '';
                vel = '<v:shape coordorigin="0 0" coordsize="' + this.pixelWidth + ' ' + this.pixelHeight + '" ' +
                     ' id="jqsshape' + shapeid + '" ' +
                     stroke +
                     fill +
                    ' style="position:absolute;left:0px;top:0px;height:' + this.pixelHeight + 'px;width:' + this.pixelWidth + 'px;padding:0px;margin:0px;" ' +
                    ' path="m ' + initial + ' l ' + vpath.join(', ') + ' ' + closed + 'e">' +
                    ' </v:shape>';
                return vel;
            },

            _drawCircle: function (shapeid, x, y, radius, lineColor, fillColor, lineWidth) {
                var stroke, fill, vel;
                x -= radius;
                y -= radius;
                stroke = lineColor === undefined ? ' stroked="false" ' : ' strokeWeight="' + lineWidth + 'px" strokeColor="' + lineColor + '" ';
                fill = fillColor === undefined ? ' filled="false"' : ' fillColor="' + fillColor + '" filled="true" ';
                vel = '<v:oval ' +
                     ' id="jqsshape' + shapeid + '" ' +
                    stroke +
                    fill +
                    ' style="position:absolute;top:' + y + 'px; left:' + x + 'px; width:' + (radius * 2) + 'px; height:' + (radius * 2) + 'px"></v:oval>';
                return vel;

            },

            _drawPieSlice: function (shapeid, x, y, radius, startAngle, endAngle, lineColor, fillColor) {
                var vpath, startx, starty, endx, endy, stroke, fill, vel;
                if (startAngle === endAngle) {
                    return '';  // VML seems to have problem when start angle equals end angle.
                }
                if ((endAngle - startAngle) === (2 * Math.PI)) {
                    startAngle = 0.0;  // VML seems to have a problem when drawing a full circle that doesn't start 0
                    endAngle = (2 * Math.PI);
                }

                startx = x + Math.round(Math.cos(startAngle) * radius);
                starty = y + Math.round(Math.sin(startAngle) * radius);
                endx = x + Math.round(Math.cos(endAngle) * radius);
                endy = y + Math.round(Math.sin(endAngle) * radius);

                if (startx === endx && starty === endy) {
                    if ((endAngle - startAngle) < Math.PI) {
                        // Prevent very small slices from being mistaken as a whole pie
                        return '';
                    }
                    // essentially going to be the entire circle, so ignore startAngle
                    startx = endx = x + radius;
                    starty = endy = y;
                }

                if (startx === endx && starty === endy && (endAngle - startAngle) < Math.PI) {
                    return '';
                }

                vpath = [x - radius, y - radius, x + radius, y + radius, startx, starty, endx, endy];
                stroke = lineColor === undefined ? ' stroked="false" ' : ' strokeWeight="1px" strokeColor="' + lineColor + '" ';
                fill = fillColor === undefined ? ' filled="false"' : ' fillColor="' + fillColor + '" filled="true" ';
                vel = '<v:shape coordorigin="0 0" coordsize="' + this.pixelWidth + ' ' + this.pixelHeight + '" ' +
                     ' id="jqsshape' + shapeid + '" ' +
                     stroke +
                     fill +
                    ' style="position:absolute;left:0px;top:0px;height:' + this.pixelHeight + 'px;width:' + this.pixelWidth + 'px;padding:0px;margin:0px;" ' +
                    ' path="m ' + x + ',' + y + ' wa ' + vpath.join(', ') + ' x e">' +
                    ' </v:shape>';
                return vel;
            },

            _drawRect: function (shapeid, x, y, width, height, lineColor, fillColor) {
                return this._drawShape(shapeid, [[x, y], [x, y + height], [x + width, y + height], [x + width, y], [x, y]], lineColor, fillColor);
            },

            reset: function () {
                this.group.innerHTML = '';
            },

            appendShape: function (shape) {
                var vel = this['_draw' + shape.type].apply(this, shape.args);
                if (this.rendered) {
                    this.group.insertAdjacentHTML('beforeEnd', vel);
                } else {
                    this.prerender += vel;
                }
                this.lastShapeId = shape.id;
                return shape.id;
            },

            replaceWithShape: function (shapeid, shape) {
                var existing = $('#jqsshape' + shapeid),
                    vel = this['_draw' + shape.type].apply(this, shape.args);
                existing[0].outerHTML = vel;
            },

            replaceWithShapes: function (shapeids, shapes) {
                // replace the first shapeid with all the new shapes then toast the remaining old shapes
                var existing = $('#jqsshape' + shapeids[0]),
                    replace = '',
                    slen = shapes.length,
                    i;
                for (i = 0; i < slen; i++) {
                    replace += this['_draw' + shapes[i].type].apply(this, shapes[i].args);
                }
                existing[0].outerHTML = replace;
                for (i = 1; i < shapeids.length; i++) {
                    $('#jqsshape' + shapeids[i]).remove();
                }
            },

            insertAfterShape: function (shapeid, shape) {
                var existing = $('#jqsshape' + shapeid),
                     vel = this['_draw' + shape.type].apply(this, shape.args);
                existing[0].insertAdjacentHTML('afterEnd', vel);
            },

            removeShapeId: function (shapeid) {
                var existing = $('#jqsshape' + shapeid);
                this.group.removeChild(existing[0]);
            },

            getShapeAt: function (el, x, y) {
                var shapeid = el.id.substr(8);
                return shapeid;
            },

            render: function () {
                if (!this.rendered) {
                    // batch the intial render into a single repaint
                    this.group.innerHTML = this.prerender;
                    this.rendered = true;
                }
            }
        });

    }))
}(document, Math));
/*! 
 * angular-loading-bar v0.5.2
 * https://chieffancypants.github.io/angular-loading-bar
 * Copyright (c) 2014 Wes Cruver
 * License: MIT
 */
/*
 * angular-loading-bar
 *
 * intercepts XHR requests and creates a loading bar.
 * Based on the excellent nprogress work by rstacruz (more info in readme)
 *
 * (c) 2013 Wes Cruver
 * License: MIT
 */


(function () {

    'use strict';

    // Alias the loading bar for various backwards compatibilities since the project has matured:
    angular.module('angular-loading-bar', ['cfp.loadingBarInterceptor']);
    angular.module('chieffancypants.loadingBar', ['cfp.loadingBarInterceptor']);


    /**
     * loadingBarInterceptor service
     *
     * Registers itself as an Angular interceptor and listens for XHR requests.
     */
    angular.module('cfp.loadingBarInterceptor', ['cfp.loadingBar'])
      .config(['$httpProvider', function ($httpProvider) {

          var interceptor = ['$q', '$cacheFactory', '$timeout', '$rootScope', 'cfpLoadingBar', function ($q, $cacheFactory, $timeout, $rootScope, cfpLoadingBar) {

              /**
               * The total number of requests made
               */
              var reqsTotal = 0;

              /**
               * The number of requests completed (either successfully or not)
               */
              var reqsCompleted = 0;

              /**
               * The amount of time spent fetching before showing the loading bar
               */
              var latencyThreshold = cfpLoadingBar.latencyThreshold;

              /**
               * $timeout handle for latencyThreshold
               */
              var startTimeout;


              /**
               * calls cfpLoadingBar.complete() which removes the
               * loading bar from the DOM.
               */
              function setComplete() {
                  $timeout.cancel(startTimeout);
                  cfpLoadingBar.complete();
                  reqsCompleted = 0;
                  reqsTotal = 0;
              }

              /**
               * Determine if the response has already been cached
               * @param  {Object}  config the config option from the request
               * @return {Boolean} retrns true if cached, otherwise false
               */
              function isCached(config) {
                  var cache;
                  var defaultCache = $cacheFactory.get('$http');
                  var defaults = $httpProvider.defaults;

                  // Choose the proper cache source. Borrowed from angular: $http service
                  if ((config.cache || defaults.cache) && config.cache !== false &&
                    (config.method === 'GET' || config.method === 'JSONP')) {
                      cache = angular.isObject(config.cache) ? config.cache
                        : angular.isObject(defaults.cache) ? defaults.cache
                        : defaultCache;
                  }

                  var cached = cache !== undefined ?
                    cache.get(config.url) !== undefined : false;

                  if (config.cached !== undefined && cached !== config.cached) {
                      return config.cached;
                  }
                  config.cached = cached;
                  return cached;
              }


              return {
                  'request': function (config) {
                      // Check to make sure this request hasn't already been cached and that
                      // the requester didn't explicitly ask us to ignore this request:
                      if (!config.ignoreLoadingBar && !isCached(config)) {
                          $rootScope.$broadcast('cfpLoadingBar:loading', { url: config.url });
                          if (reqsTotal === 0) {
                              startTimeout = $timeout(function () {
                                  cfpLoadingBar.start();
                              }, latencyThreshold);
                          }
                          reqsTotal++;
                          cfpLoadingBar.set(reqsCompleted / reqsTotal);
                      }
                      return config;
                  },

                  'response': function (response) {
                      if (!response.config.ignoreLoadingBar && !isCached(response.config)) {
                          reqsCompleted++;
                          $rootScope.$broadcast('cfpLoadingBar:loaded', { url: response.config.url });
                          if (reqsCompleted >= reqsTotal) {
                              setComplete();
                          } else {
                              cfpLoadingBar.set(reqsCompleted / reqsTotal);
                          }
                      }
                      return response;
                  },

                  'responseError': function (rejection) {
                      if (!rejection.config.ignoreLoadingBar && !isCached(rejection.config)) {
                          reqsCompleted++;
                          $rootScope.$broadcast('cfpLoadingBar:loaded', { url: rejection.config.url });
                          if (reqsCompleted >= reqsTotal) {
                              setComplete();
                          } else {
                              cfpLoadingBar.set(reqsCompleted / reqsTotal);
                          }
                      }
                      return $q.reject(rejection);
                  }
              };
          }];

          $httpProvider.interceptors.push(interceptor);
      }]);


    /**
     * Loading Bar
     *
     * This service handles adding and removing the actual element in the DOM.
     * Generally, best practices for DOM manipulation is to take place in a
     * directive, but because the element itself is injected in the DOM only upon
     * XHR requests, and it's likely needed on every view, the best option is to
     * use a service.
     */
    angular.module('cfp.loadingBar', [])
      .provider('cfpLoadingBar', function () {

          this.includeSpinner = true;
          this.includeBar = true;
          this.latencyThreshold = 100;
          this.startSize = 0.02;
          this.parentSelector = 'body';
          this.spinnerTemplate = '<div id="loading-bar-spinner"><div class="spinner-icon"></div></div>';

          this.$get = ['$injector', '$document', '$timeout', '$rootScope', function ($injector, $document, $timeout, $rootScope) {
              var $animate;
              var $parentSelector = this.parentSelector,
                loadingBarContainer = angular.element('<div id="loading-bar"><div class="bar"><div class="peg"></div></div></div>'),
                loadingBar = loadingBarContainer.find('div').eq(0),
                spinner = angular.element(this.spinnerTemplate);

              var incTimeout,
                completeTimeout,
                started = false,
                status = 0;

              var includeSpinner = this.includeSpinner;
              var includeBar = this.includeBar;
              var startSize = this.startSize;

              /**
               * Inserts the loading bar element into the dom, and sets it to 2%
               */
              function _start() {
                  if (!$animate) {
                      $animate = $injector.get('$animate');
                  }

                  var $parent = $document.find($parentSelector);
                  $timeout.cancel(completeTimeout);

                  // do not continually broadcast the started event:
                  if (started) {
                      return;
                  }

                  $rootScope.$broadcast('cfpLoadingBar:started');
                  started = true;

                  if (includeBar) {
                      $animate.enter(loadingBarContainer, $parent);
                  }

                  if (includeSpinner) {
                      $animate.enter(spinner, $parent);
                  }

                  _set(startSize);
              }

              /**
               * Set the loading bar's width to a certain percent.
               *
               * @param n any value between 0 and 1
               */
              function _set(n) {
                  if (!started) {
                      return;
                  }
                  var pct = (n * 100) + '%';
                  loadingBar.css('width', pct);
                  status = n;

                  // increment loadingbar to give the illusion that there is always
                  // progress but make sure to cancel the previous timeouts so we don't
                  // have multiple incs running at the same time.
                  $timeout.cancel(incTimeout);
                  incTimeout = $timeout(function () {
                      _inc();
                  }, 250);
              }

              /**
               * Increments the loading bar by a random amount
               * but slows down as it progresses
               */
              function _inc() {
                  if (_status() >= 1) {
                      return;
                  }

                  var rnd = 0;

                  // TODO: do this mathmatically instead of through conditions

                  var stat = _status();
                  if (stat >= 0 && stat < 0.25) {
                      // Start out between 3 - 6% increments
                      rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
                  } else if (stat >= 0.25 && stat < 0.65) {
                      // increment between 0 - 3%
                      rnd = (Math.random() * 3) / 100;
                  } else if (stat >= 0.65 && stat < 0.9) {
                      // increment between 0 - 2%
                      rnd = (Math.random() * 2) / 100;
                  } else if (stat >= 0.9 && stat < 0.99) {
                      // finally, increment it .5 %
                      rnd = 0.005;
                  } else {
                      // after 99%, don't increment:
                      rnd = 0;
                  }

                  var pct = _status() + rnd;
                  _set(pct);
              }

              function _status() {
                  return status;
              }

              function _completeAnimation() {
                  status = 0;
                  started = false;
              }

              function _complete() {
                  if (!$animate) {
                      $animate = $injector.get('$animate');
                  }

                  $rootScope.$broadcast('cfpLoadingBar:completed');
                  _set(1);

                  $timeout.cancel(completeTimeout);

                  // Attempt to aggregate any start/complete calls within 500ms:
                  completeTimeout = $timeout(function () {
                      var promise = $animate.leave(loadingBarContainer, _completeAnimation);
                      if (promise && promise.then) {
                          promise.then(_completeAnimation);
                      }
                      $animate.leave(spinner);
                  }, 500);
              }

              return {
                  start: _start,
                  set: _set,
                  status: _status,
                  inc: _inc,
                  complete: _complete,
                  includeSpinner: this.includeSpinner,
                  latencyThreshold: this.latencyThreshold,
                  parentSelector: this.parentSelector,
                  startSize: this.startSize
              };


          }];     //
      });       // wtf javascript. srsly
})();       //
(function (window) {
    'use strict';
    angular.module('tmh.dynamicLocale', []).provider('tmhDynamicLocale', function () {

        var defaultLocale,
          localeLocationPattern = 'angular/i18n/angular-locale_{{locale}}.js',
          storageFactory = 'tmhDynamicLocaleStorageCache',
          storage,
          storeKey = 'tmhDynamicLocale.locale',
          promiseCache = {},
          activeLocale;

        /**
         * Loads a script asynchronously
         *
         * @param {string} url The url for the script
         @ @param {function) callback A function to be called once the script is loaded
         */
        function loadScript(url, callback, errorCallback, $timeout) {
            var script = document.createElement('script'),
              body = document.getElementsByTagName('body')[0],
              removed = false;

            script.type = 'text/javascript';
            if (script.readyState) { // IE
                script.onreadystatechange = function () {
                    if (script.readyState === 'complete' ||
                        script.readyState === 'loaded') {
                        script.onreadystatechange = null;
                        $timeout(
                          function () {
                              if (removed) return;
                              removed = true;
                              body.removeChild(script);
                              callback();
                          }, 30, false);
                    }
                };
            } else { // Others
                script.onload = function () {
                    if (removed) return;
                    removed = true;
                    body.removeChild(script);
                    callback();
                };
                script.onerror = function () {
                    if (removed) return;
                    removed = true;
                    body.removeChild(script);
                    errorCallback();
                };
            }
            script.src = url;
            script.async = false;
            body.appendChild(script);
        }

        /**
         * Loads a locale and replaces the properties from the current locale with the new locale information
         *
         * @param localeUrl The path to the new locale
         * @param $locale The locale at the curent scope
         */
        function loadLocale(localeUrl, $locale, localeId, $rootScope, $q, localeCache, $timeout) {

            function overrideValues(oldObject, newObject) {
                if (activeLocale !== localeId) {
                    return;
                }
                angular.forEach(oldObject, function (value, key) {
                    if (!newObject[key]) {
                        delete oldObject[key];
                    } else if (angular.isArray(newObject[key])) {
                        oldObject[key].length = newObject[key].length;
                    }
                });
                angular.forEach(newObject, function (value, key) {
                    if (angular.isArray(newObject[key]) || angular.isObject(newObject[key])) {
                        if (!oldObject[key]) {
                            oldObject[key] = angular.isArray(newObject[key]) ? [] : {};
                        }
                        overrideValues(oldObject[key], newObject[key]);
                    } else {
                        oldObject[key] = newObject[key];
                    }
                });
            }


            if (promiseCache[localeId]) return promiseCache[localeId];

            var cachedLocale,
              deferred = $q.defer();
            if (localeId === activeLocale) {
                deferred.resolve($locale);
            } else if ((cachedLocale = localeCache.get(localeId))) {
                activeLocale = localeId;
                $rootScope.$evalAsync(function () {
                    overrideValues($locale, cachedLocale);
                    $rootScope.$broadcast('$localeChangeSuccess', localeId, $locale);
                    storage.put(storeKey, localeId);
                    deferred.resolve($locale);
                });
            } else {
                activeLocale = localeId;
                promiseCache[localeId] = deferred.promise;
                loadScript(localeUrl, function () {
                    // Create a new injector with the new locale
                    var localInjector = angular.injector(['ngLocale']),
                      externalLocale = localInjector.get('$locale');

                    overrideValues($locale, externalLocale);
                    localeCache.put(localeId, externalLocale);
                    delete promiseCache[localeId];

                    $rootScope.$apply(function () {
                        $rootScope.$broadcast('$localeChangeSuccess', localeId, $locale);
                        storage.put(storeKey, localeId);
                        deferred.resolve($locale);
                    });
                }, function () {
                    delete promiseCache[localeId];

                    $rootScope.$apply(function () {
                        $rootScope.$broadcast('$localeChangeError', localeId);
                        deferred.reject(localeId);
                    });
                }, $timeout);
            }
            return deferred.promise;
        }

        this.localeLocationPattern = function (value) {
            if (value) {
                localeLocationPattern = value;
                return this;
            } else {
                return localeLocationPattern;
            }
        };

        this.useStorage = function (storageName) {
            storageFactory = storageName;
        };

        this.useCookieStorage = function () {
            this.useStorage('$cookieStore');
        };

        this.defaultLocale = function (value) {
            defaultLocale = value;
        };

        this.$get = ['$rootScope', '$injector', '$interpolate', '$locale', '$q', 'tmhDynamicLocaleCache', '$timeout', function ($rootScope, $injector, interpolate, locale, $q, tmhDynamicLocaleCache, $timeout) {
            var localeLocation = interpolate(localeLocationPattern);

            storage = $injector.get(storageFactory);
            $rootScope.$evalAsync(function () {
                var initialLocale;
                if ((initialLocale = (storage.get(storeKey) || defaultLocale))) {
                    loadLocale(localeLocation({ locale: initialLocale }), locale, initialLocale, $rootScope, $q, tmhDynamicLocaleCache, $timeout);
                }
            });
            return {
                /**
                 * @ngdoc method
                 * @description
                 * @param {string=} value Sets the locale to the new locale. Changing the locale will trigger
                 *    a background task that will retrieve the new locale and configure the current $locale
                 *    instance with the information from the new locale
                 */
                set: function (value) {
                    return loadLocale(localeLocation({ locale: value }), locale, value, $rootScope, $q, tmhDynamicLocaleCache, $timeout);
                }
            };
        }];
    }).provider('tmhDynamicLocaleCache', function () {
        this.$get = ['$cacheFactory', function ($cacheFactory) {
            return $cacheFactory('tmh.dynamicLocales');
        }];
    }).provider('tmhDynamicLocaleStorageCache', function () {
        this.$get = ['$cacheFactory', function ($cacheFactory) {
            return $cacheFactory('tmh.dynamicLocales.store');
        }];
    }).run(['tmhDynamicLocale', angular.noop]);
}(window));
/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.14.3 - 2015-10-23
 * License: MIT
 */
angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.collapse", "ui.bootstrap.accordion", "ui.bootstrap.alert", "ui.bootstrap.buttons", "ui.bootstrap.carousel", "ui.bootstrap.dateparser", "ui.bootstrap.position", "ui.bootstrap.datepicker", "ui.bootstrap.dropdown", "ui.bootstrap.stackedMap", "ui.bootstrap.modal", "ui.bootstrap.pagination", "ui.bootstrap.tooltip", "ui.bootstrap.popover", "ui.bootstrap.progressbar", "ui.bootstrap.rating", "ui.bootstrap.tabs", "ui.bootstrap.timepicker", "ui.bootstrap.typeahead"]), angular.module("ui.bootstrap.tpls", ["template/accordion/accordion-group.html", "template/accordion/accordion.html", "template/alert/alert.html", "template/carousel/carousel.html", "template/carousel/slide.html", "template/datepicker/datepicker.html", "template/datepicker/day.html", "template/datepicker/month.html", "template/datepicker/popup.html", "template/datepicker/year.html", "template/modal/backdrop.html", "template/modal/window.html", "template/pagination/pager.html", "template/pagination/pagination.html", "template/tooltip/tooltip-html-popup.html", "template/tooltip/tooltip-popup.html", "template/tooltip/tooltip-template-popup.html", "template/popover/popover-html.html", "template/popover/popover-template.html", "template/popover/popover.html", "template/progressbar/bar.html", "template/progressbar/progress.html", "template/progressbar/progressbar.html", "template/rating/rating.html", "template/tabs/tab.html", "template/tabs/tabset.html", "template/timepicker/timepicker.html", "template/typeahead/typeahead-match.html", "template/typeahead/typeahead-popup.html"]), angular.module("ui.bootstrap.collapse", []).directive("uibCollapse", ["$animate", "$injector", function (a, b) { var c = b.has("$animateCss") ? b.get("$animateCss") : null; return { link: function (b, d, e) { function f() { d.removeClass("collapse").addClass("collapsing").attr("aria-expanded", !0).attr("aria-hidden", !1), c ? c(d, { addClass: "in", easing: "ease", to: { height: d[0].scrollHeight + "px" } }).start()["finally"](g) : a.addClass(d, "in", { to: { height: d[0].scrollHeight + "px" } }).then(g) } function g() { d.removeClass("collapsing").addClass("collapse").css({ height: "auto" }) } function h() { return d.hasClass("collapse") || d.hasClass("in") ? (d.css({ height: d[0].scrollHeight + "px" }).removeClass("collapse").addClass("collapsing").attr("aria-expanded", !1).attr("aria-hidden", !0), void (c ? c(d, { removeClass: "in", to: { height: "0" } }).start()["finally"](i) : a.removeClass(d, "in", { to: { height: "0" } }).then(i))) : i() } function i() { d.css({ height: "0" }), d.removeClass("collapsing").addClass("collapse") } b.$watch(e.uibCollapse, function (a) { a ? h() : f() }) } } }]), angular.module("ui.bootstrap.collapse").value("$collapseSuppressWarning", !1).directive("collapse", ["$animate", "$injector", "$log", "$collapseSuppressWarning", function (a, b, c, d) { var e = b.has("$animateCss") ? b.get("$animateCss") : null; return { link: function (b, f, g) { function h() { f.removeClass("collapse").addClass("collapsing").attr("aria-expanded", !0).attr("aria-hidden", !1), e ? e(f, { easing: "ease", to: { height: f[0].scrollHeight + "px" } }).start().done(i) : a.animate(f, {}, { height: f[0].scrollHeight + "px" }).then(i) } function i() { f.removeClass("collapsing").addClass("collapse in").css({ height: "auto" }) } function j() { return f.hasClass("collapse") || f.hasClass("in") ? (f.css({ height: f[0].scrollHeight + "px" }).removeClass("collapse in").addClass("collapsing").attr("aria-expanded", !1).attr("aria-hidden", !0), void (e ? e(f, { to: { height: "0" } }).start().done(k) : a.animate(f, {}, { height: "0" }).then(k))) : k() } function k() { f.css({ height: "0" }), f.removeClass("collapsing").addClass("collapse") } d || c.warn("collapse is now deprecated. Use uib-collapse instead."), b.$watch(g.collapse, function (a) { a ? j() : h() }) } } }]), angular.module("ui.bootstrap.accordion", ["ui.bootstrap.collapse"]).constant("uibAccordionConfig", { closeOthers: !0 }).controller("UibAccordionController", ["$scope", "$attrs", "uibAccordionConfig", function (a, b, c) { this.groups = [], this.closeOthers = function (d) { var e = angular.isDefined(b.closeOthers) ? a.$eval(b.closeOthers) : c.closeOthers; e && angular.forEach(this.groups, function (a) { a !== d && (a.isOpen = !1) }) }, this.addGroup = function (a) { var b = this; this.groups.push(a), a.$on("$destroy", function (c) { b.removeGroup(a) }) }, this.removeGroup = function (a) { var b = this.groups.indexOf(a); -1 !== b && this.groups.splice(b, 1) } }]).directive("uibAccordion", function () { return { controller: "UibAccordionController", controllerAs: "accordion", transclude: !0, templateUrl: function (a, b) { return b.templateUrl || "template/accordion/accordion.html" } } }).directive("uibAccordionGroup", function () { return { require: "^uibAccordion", transclude: !0, replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/accordion/accordion-group.html" }, scope: { heading: "@", isOpen: "=?", isDisabled: "=?" }, controller: function () { this.setHeading = function (a) { this.heading = a } }, link: function (a, b, c, d) { d.addGroup(a), a.openClass = c.openClass || "panel-open", a.panelClass = c.panelClass, a.$watch("isOpen", function (c) { b.toggleClass(a.openClass, !!c), c && d.closeOthers(a) }), a.toggleOpen = function (b) { a.isDisabled || b && 32 !== b.which || (a.isOpen = !a.isOpen) } } } }).directive("uibAccordionHeading", function () { return { transclude: !0, template: "", replace: !0, require: "^uibAccordionGroup", link: function (a, b, c, d, e) { d.setHeading(e(a, angular.noop)) } } }).directive("uibAccordionTransclude", function () { return { require: ["?^uibAccordionGroup", "?^accordionGroup"], link: function (a, b, c, d) { d = d[0] ? d[0] : d[1], a.$watch(function () { return d[c.uibAccordionTransclude] }, function (a) { a && (b.find("span").html(""), b.find("span").append(a)) }) } } }), angular.module("ui.bootstrap.accordion").value("$accordionSuppressWarning", !1).controller("AccordionController", ["$scope", "$attrs", "$controller", "$log", "$accordionSuppressWarning", function (a, b, c, d, e) { e || d.warn("AccordionController is now deprecated. Use UibAccordionController instead."), angular.extend(this, c("UibAccordionController", { $scope: a, $attrs: b })) }]).directive("accordion", ["$log", "$accordionSuppressWarning", function (a, b) { return { restrict: "EA", controller: "AccordionController", controllerAs: "accordion", transclude: !0, replace: !1, templateUrl: function (a, b) { return b.templateUrl || "template/accordion/accordion.html" }, link: function () { b || a.warn("accordion is now deprecated. Use uib-accordion instead.") } } }]).directive("accordionGroup", ["$log", "$accordionSuppressWarning", function (a, b) { return { require: "^accordion", restrict: "EA", transclude: !0, replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/accordion/accordion-group.html" }, scope: { heading: "@", isOpen: "=?", isDisabled: "=?" }, controller: function () { this.setHeading = function (a) { this.heading = a } }, link: function (c, d, e, f) { b || a.warn("accordion-group is now deprecated. Use uib-accordion-group instead."), f.addGroup(c), c.openClass = e.openClass || "panel-open", c.panelClass = e.panelClass, c.$watch("isOpen", function (a) { d.toggleClass(c.openClass, !!a), a && f.closeOthers(c) }), c.toggleOpen = function (a) { c.isDisabled || a && 32 !== a.which || (c.isOpen = !c.isOpen) } } } }]).directive("accordionHeading", ["$log", "$accordionSuppressWarning", function (a, b) { return { restrict: "EA", transclude: !0, template: "", replace: !0, require: "^accordionGroup", link: function (c, d, e, f, g) { b || a.warn("accordion-heading is now deprecated. Use uib-accordion-heading instead."), f.setHeading(g(c, angular.noop)) } } }]).directive("accordionTransclude", ["$log", "$accordionSuppressWarning", function (a, b) { return { require: "^accordionGroup", link: function (c, d, e, f) { b || a.warn("accordion-transclude is now deprecated. Use uib-accordion-transclude instead."), c.$watch(function () { return f[e.accordionTransclude] }, function (a) { a && (d.find("span").html(""), d.find("span").append(a)) }) } } }]), angular.module("ui.bootstrap.alert", []).controller("UibAlertController", ["$scope", "$attrs", "$interpolate", "$timeout", function (a, b, c, d) { a.closeable = !!b.close; var e = angular.isDefined(b.dismissOnTimeout) ? c(b.dismissOnTimeout)(a.$parent) : null; e && d(function () { a.close() }, parseInt(e, 10)) }]).directive("uibAlert", function () { return { controller: "UibAlertController", controllerAs: "alert", templateUrl: function (a, b) { return b.templateUrl || "template/alert/alert.html" }, transclude: !0, replace: !0, scope: { type: "@", close: "&" } } }), angular.module("ui.bootstrap.alert").value("$alertSuppressWarning", !1).controller("AlertController", ["$scope", "$attrs", "$controller", "$log", "$alertSuppressWarning", function (a, b, c, d, e) { e || d.warn("AlertController is now deprecated. Use UibAlertController instead."), angular.extend(this, c("UibAlertController", { $scope: a, $attrs: b })) }]).directive("alert", ["$log", "$alertSuppressWarning", function (a, b) { return { controller: "AlertController", controllerAs: "alert", templateUrl: function (a, b) { return b.templateUrl || "template/alert/alert.html" }, transclude: !0, replace: !0, scope: { type: "@", close: "&" }, link: function () { b || a.warn("alert is now deprecated. Use uib-alert instead.") } } }]), angular.module("ui.bootstrap.buttons", []).constant("uibButtonConfig", { activeClass: "active", toggleEvent: "click" }).controller("UibButtonsController", ["uibButtonConfig", function (a) { this.activeClass = a.activeClass || "active", this.toggleEvent = a.toggleEvent || "click" }]).directive("uibBtnRadio", function () { return { require: ["uibBtnRadio", "ngModel"], controller: "UibButtonsController", controllerAs: "buttons", link: function (a, b, c, d) { var e = d[0], f = d[1]; b.find("input").css({ display: "none" }), f.$render = function () { b.toggleClass(e.activeClass, angular.equals(f.$modelValue, a.$eval(c.uibBtnRadio))) }, b.on(e.toggleEvent, function () { if (!c.disabled) { var d = b.hasClass(e.activeClass); (!d || angular.isDefined(c.uncheckable)) && a.$apply(function () { f.$setViewValue(d ? null : a.$eval(c.uibBtnRadio)), f.$render() }) } }) } } }).directive("uibBtnCheckbox", function () { return { require: ["uibBtnCheckbox", "ngModel"], controller: "UibButtonsController", controllerAs: "button", link: function (a, b, c, d) { function e() { return g(c.btnCheckboxTrue, !0) } function f() { return g(c.btnCheckboxFalse, !1) } function g(b, c) { return angular.isDefined(b) ? a.$eval(b) : c } var h = d[0], i = d[1]; b.find("input").css({ display: "none" }), i.$render = function () { b.toggleClass(h.activeClass, angular.equals(i.$modelValue, e())) }, b.on(h.toggleEvent, function () { c.disabled || a.$apply(function () { i.$setViewValue(b.hasClass(h.activeClass) ? f() : e()), i.$render() }) }) } } }), angular.module("ui.bootstrap.buttons").value("$buttonsSuppressWarning", !1).controller("ButtonsController", ["$controller", "$log", "$buttonsSuppressWarning", function (a, b, c) { c || b.warn("ButtonsController is now deprecated. Use UibButtonsController instead."), angular.extend(this, a("UibButtonsController")) }]).directive("btnRadio", ["$log", "$buttonsSuppressWarning", function (a, b) { return { require: ["btnRadio", "ngModel"], controller: "ButtonsController", controllerAs: "buttons", link: function (c, d, e, f) { b || a.warn("btn-radio is now deprecated. Use uib-btn-radio instead."); var g = f[0], h = f[1]; d.find("input").css({ display: "none" }), h.$render = function () { d.toggleClass(g.activeClass, angular.equals(h.$modelValue, c.$eval(e.btnRadio))) }, d.bind(g.toggleEvent, function () { if (!e.disabled) { var a = d.hasClass(g.activeClass); (!a || angular.isDefined(e.uncheckable)) && c.$apply(function () { h.$setViewValue(a ? null : c.$eval(e.btnRadio)), h.$render() }) } }) } } }]).directive("btnCheckbox", ["$document", "$log", "$buttonsSuppressWarning", function (a, b, c) { return { require: ["btnCheckbox", "ngModel"], controller: "ButtonsController", controllerAs: "button", link: function (d, e, f, g) { function h() { return j(f.btnCheckboxTrue, !0) } function i() { return j(f.btnCheckboxFalse, !1) } function j(a, b) { var c = d.$eval(a); return angular.isDefined(c) ? c : b } c || b.warn("btn-checkbox is now deprecated. Use uib-btn-checkbox instead."); var k = g[0], l = g[1]; e.find("input").css({ display: "none" }), l.$render = function () { e.toggleClass(k.activeClass, angular.equals(l.$modelValue, h())) }, e.bind(k.toggleEvent, function () { f.disabled || d.$apply(function () { l.$setViewValue(e.hasClass(k.activeClass) ? i() : h()), l.$render() }) }), e.on("keypress", function (b) { f.disabled || 32 !== b.which || a[0].activeElement !== e[0] || d.$apply(function () { l.$setViewValue(e.hasClass(k.activeClass) ? i() : h()), l.$render() }) }) } } }]), angular.module("ui.bootstrap.carousel", []).controller("UibCarouselController", ["$scope", "$element", "$interval", "$animate", function (a, b, c, d) { function e(b, c, e) { s || (angular.extend(b, { direction: e, active: !0 }), angular.extend(m.currentSlide || {}, { direction: e, active: !1 }), d.enabled() && !a.noTransition && !a.$currentTransition && b.$element && m.slides.length > 1 && (b.$element.data(q, b.direction), m.currentSlide && m.currentSlide.$element && m.currentSlide.$element.data(q, b.direction), a.$currentTransition = !0, o ? d.on("addClass", b.$element, function (b, c) { "close" === c && (a.$currentTransition = null, d.off("addClass", b)) }) : b.$element.one("$animate:close", function () { a.$currentTransition = null })), m.currentSlide = b, r = c, g()) } function f(a) { if (angular.isUndefined(n[a].index)) return n[a]; var b; n.length; for (b = 0; b < n.length; ++b) if (n[b].index == a) return n[b] } function g() { h(); var b = +a.interval; !isNaN(b) && b > 0 && (k = c(i, b)) } function h() { k && (c.cancel(k), k = null) } function i() { var b = +a.interval; l && !isNaN(b) && b > 0 && n.length ? a.next() : a.pause() } function j(b) { b.length || (a.$currentTransition = null) } var k, l, m = this, n = m.slides = a.slides = [], o = angular.version.minor >= 4, p = "uib-noTransition", q = "uib-slideDirection", r = -1; m.currentSlide = null; var s = !1; m.select = a.select = function (b, c) { var d = a.indexOfSlide(b); void 0 === c && (c = d > m.getCurrentIndex() ? "next" : "prev"), b && b !== m.currentSlide && !a.$currentTransition && e(b, d, c) }, a.$on("$destroy", function () { s = !0 }), m.getCurrentIndex = function () { return m.currentSlide && angular.isDefined(m.currentSlide.index) ? +m.currentSlide.index : r }, a.indexOfSlide = function (a) { return angular.isDefined(a.index) ? +a.index : n.indexOf(a) }, a.next = function () { var b = (m.getCurrentIndex() + 1) % n.length; return 0 === b && a.noWrap() ? void a.pause() : m.select(f(b), "next") }, a.prev = function () { var b = m.getCurrentIndex() - 1 < 0 ? n.length - 1 : m.getCurrentIndex() - 1; return a.noWrap() && b === n.length - 1 ? void a.pause() : m.select(f(b), "prev") }, a.isActive = function (a) { return m.currentSlide === a }, a.$watch("interval", g), a.$watchCollection("slides", j), a.$on("$destroy", h), a.play = function () { l || (l = !0, g()) }, a.pause = function () { a.noPause || (l = !1, h()) }, m.addSlide = function (b, c) { b.$element = c, n.push(b), 1 === n.length || b.active ? (m.select(n[n.length - 1]), 1 === n.length && a.play()) : b.active = !1 }, m.removeSlide = function (a) { angular.isDefined(a.index) && n.sort(function (a, b) { return +a.index > +b.index }); var b = n.indexOf(a); n.splice(b, 1), n.length > 0 && a.active ? b >= n.length ? m.select(n[b - 1]) : m.select(n[b]) : r > b && r--, 0 === n.length && (m.currentSlide = null) }, a.$watch("noTransition", function (a) { b.data(p, a) }) }]).directive("uibCarousel", [function () { return { transclude: !0, replace: !0, controller: "UibCarouselController", controllerAs: "carousel", require: "carousel", templateUrl: function (a, b) { return b.templateUrl || "template/carousel/carousel.html" }, scope: { interval: "=", noTransition: "=", noPause: "=", noWrap: "&" } } }]).directive("uibSlide", function () { return { require: "^uibCarousel", restrict: "EA", transclude: !0, replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/carousel/slide.html" }, scope: { active: "=?", actual: "=?", index: "=?" }, link: function (a, b, c, d) { d.addSlide(a, b), a.$on("$destroy", function () { d.removeSlide(a) }), a.$watch("active", function (b) { b && d.select(a) }) } } }).animation(".item", ["$injector", "$animate", function (a, b) { function c(a, b, c) { a.removeClass(b), c && c() } var d = "uib-noTransition", e = "uib-slideDirection", f = null; return a.has("$animateCss") && (f = a.get("$animateCss")), { beforeAddClass: function (a, g, h) { if ("active" == g && a.parent() && a.parent().parent() && !a.parent().parent().data(d)) { var i = !1, j = a.data(e), k = "next" == j ? "left" : "right", l = c.bind(this, a, k + " " + j, h); return a.addClass(j), f ? f(a, { addClass: k }).start().done(l) : b.addClass(a, k).then(function () { i || l(), h() }), function () { i = !0 } } h() }, beforeRemoveClass: function (a, g, h) { if ("active" === g && a.parent() && a.parent().parent() && !a.parent().parent().data(d)) { var i = !1, j = a.data(e), k = "next" == j ? "left" : "right", l = c.bind(this, a, k, h); return f ? f(a, { addClass: k }).start().done(l) : b.addClass(a, k).then(function () { i || l(), h() }), function () { i = !0 } } h() } } }]), angular.module("ui.bootstrap.carousel").value("$carouselSuppressWarning", !1).controller("CarouselController", ["$scope", "$element", "$controller", "$log", "$carouselSuppressWarning", function (a, b, c, d, e) { e || d.warn("CarouselController is now deprecated. Use UibCarouselController instead."), angular.extend(this, c("UibCarouselController", { $scope: a, $element: b })) }]).directive("carousel", ["$log", "$carouselSuppressWarning", function (a, b) { return { transclude: !0, replace: !0, controller: "CarouselController", controllerAs: "carousel", require: "carousel", templateUrl: function (a, b) { return b.templateUrl || "template/carousel/carousel.html" }, scope: { interval: "=", noTransition: "=", noPause: "=", noWrap: "&" }, link: function () { b || a.warn("carousel is now deprecated. Use uib-carousel instead.") } } }]).directive("slide", ["$log", "$carouselSuppressWarning", function (a, b) { return { require: "^carousel", transclude: !0, replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/carousel/slide.html" }, scope: { active: "=?", actual: "=?", index: "=?" }, link: function (c, d, e, f) { b || a.warn("slide is now deprecated. Use uib-slide instead."), f.addSlide(c, d), c.$on("$destroy", function () { f.removeSlide(c) }), c.$watch("active", function (a) { a && f.select(c) }) } } }]), angular.module("ui.bootstrap.dateparser", []).service("uibDateParser", ["$log", "$locale", "orderByFilter", function (a, b, c) { function d(a) { var b = [], d = a.split(""); return angular.forEach(g, function (c, e) { var f = a.indexOf(e); if (f > -1) { a = a.split(""), d[f] = "(" + c.regex + ")", a[f] = "$"; for (var g = f + 1, h = f + e.length; h > g; g++) d[g] = "", a[g] = "$"; a = a.join(""), b.push({ index: f, apply: c.apply }) } }), { regex: new RegExp("^" + d.join("") + "$"), map: c(b, "index") } } function e(a, b, c) { return 1 > c ? !1 : 1 === b && c > 28 ? 29 === c && (a % 4 === 0 && a % 100 !== 0 || a % 400 === 0) : 3 === b || 5 === b || 8 === b || 10 === b ? 31 > c : !0 } var f, g, h = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g; this.init = function () { f = b.id, this.parsers = {}, g = { yyyy: { regex: "\\d{4}", apply: function (a) { this.year = +a } }, yy: { regex: "\\d{2}", apply: function (a) { this.year = +a + 2e3 } }, y: { regex: "\\d{1,4}", apply: function (a) { this.year = +a } }, MMMM: { regex: b.DATETIME_FORMATS.MONTH.join("|"), apply: function (a) { this.month = b.DATETIME_FORMATS.MONTH.indexOf(a) } }, MMM: { regex: b.DATETIME_FORMATS.SHORTMONTH.join("|"), apply: function (a) { this.month = b.DATETIME_FORMATS.SHORTMONTH.indexOf(a) } }, MM: { regex: "0[1-9]|1[0-2]", apply: function (a) { this.month = a - 1 } }, M: { regex: "[1-9]|1[0-2]", apply: function (a) { this.month = a - 1 } }, dd: { regex: "[0-2][0-9]{1}|3[0-1]{1}", apply: function (a) { this.date = +a } }, d: { regex: "[1-2]?[0-9]{1}|3[0-1]{1}", apply: function (a) { this.date = +a } }, EEEE: { regex: b.DATETIME_FORMATS.DAY.join("|") }, EEE: { regex: b.DATETIME_FORMATS.SHORTDAY.join("|") }, HH: { regex: "(?:0|1)[0-9]|2[0-3]", apply: function (a) { this.hours = +a } }, hh: { regex: "0[0-9]|1[0-2]", apply: function (a) { this.hours = +a } }, H: { regex: "1?[0-9]|2[0-3]", apply: function (a) { this.hours = +a } }, h: { regex: "[0-9]|1[0-2]", apply: function (a) { this.hours = +a } }, mm: { regex: "[0-5][0-9]", apply: function (a) { this.minutes = +a } }, m: { regex: "[0-9]|[1-5][0-9]", apply: function (a) { this.minutes = +a } }, sss: { regex: "[0-9][0-9][0-9]", apply: function (a) { this.milliseconds = +a } }, ss: { regex: "[0-5][0-9]", apply: function (a) { this.seconds = +a } }, s: { regex: "[0-9]|[1-5][0-9]", apply: function (a) { this.seconds = +a } }, a: { regex: b.DATETIME_FORMATS.AMPMS.join("|"), apply: function (a) { 12 === this.hours && (this.hours = 0), "PM" === a && (this.hours += 12) } } } }, this.init(), this.parse = function (c, g, i) { if (!angular.isString(c) || !g) return c; g = b.DATETIME_FORMATS[g] || g, g = g.replace(h, "\\$&"), b.id !== f && this.init(), this.parsers[g] || (this.parsers[g] = d(g)); var j = this.parsers[g], k = j.regex, l = j.map, m = c.match(k); if (m && m.length) { var n, o; angular.isDate(i) && !isNaN(i.getTime()) ? n = { year: i.getFullYear(), month: i.getMonth(), date: i.getDate(), hours: i.getHours(), minutes: i.getMinutes(), seconds: i.getSeconds(), milliseconds: i.getMilliseconds() } : (i && a.warn("dateparser:", "baseDate is not a valid date"), n = { year: 1900, month: 0, date: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }); for (var p = 1, q = m.length; q > p; p++) { var r = l[p - 1]; r.apply && r.apply.call(n, m[p]) } return e(n.year, n.month, n.date) && (angular.isDate(i) && !isNaN(i.getTime()) ? (o = new Date(i), o.setFullYear(n.year, n.month, n.date, n.hours, n.minutes, n.seconds, n.milliseconds || 0)) : o = new Date(n.year, n.month, n.date, n.hours, n.minutes, n.seconds, n.milliseconds || 0)), o } } }]), angular.module("ui.bootstrap.dateparser").value("$dateParserSuppressWarning", !1).service("dateParser", ["$log", "$dateParserSuppressWarning", "uibDateParser", function (a, b, c) { b || a.warn("dateParser is now deprecated. Use uibDateParser instead."), angular.extend(this, c) }]), angular.module("ui.bootstrap.position", []).factory("$uibPosition", ["$document", "$window", function (a, b) { function c(a, c) { return a.currentStyle ? a.currentStyle[c] : b.getComputedStyle ? b.getComputedStyle(a)[c] : a.style[c] } function d(a) { return "static" === (c(a, "position") || "static") } var e = function (b) { for (var c = a[0], e = b.offsetParent || c; e && e !== c && d(e) ;) e = e.offsetParent; return e || c }; return { position: function (b) { var c = this.offset(b), d = { top: 0, left: 0 }, f = e(b[0]); f != a[0] && (d = this.offset(angular.element(f)), d.top += f.clientTop - f.scrollTop, d.left += f.clientLeft - f.scrollLeft); var g = b[0].getBoundingClientRect(); return { width: g.width || b.prop("offsetWidth"), height: g.height || b.prop("offsetHeight"), top: c.top - d.top, left: c.left - d.left } }, offset: function (c) { var d = c[0].getBoundingClientRect(); return { width: d.width || c.prop("offsetWidth"), height: d.height || c.prop("offsetHeight"), top: d.top + (b.pageYOffset || a[0].documentElement.scrollTop), left: d.left + (b.pageXOffset || a[0].documentElement.scrollLeft) } }, positionElements: function (a, b, c, d) { var e, f, g, h, i = c.split("-"), j = i[0], k = i[1] || "center"; e = d ? this.offset(a) : this.position(a), f = b.prop("offsetWidth"), g = b.prop("offsetHeight"); var l = { center: function () { return e.left + e.width / 2 - f / 2 }, left: function () { return e.left }, right: function () { return e.left + e.width } }, m = { center: function () { return e.top + e.height / 2 - g / 2 }, top: function () { return e.top }, bottom: function () { return e.top + e.height } }; switch (j) { case "right": h = { top: m[k](), left: l[j]() }; break; case "left": h = { top: m[k](), left: e.left - f }; break; case "bottom": h = { top: m[j](), left: l[k]() }; break; default: h = { top: e.top - g, left: l[k]() } } return h } } }]), angular.module("ui.bootstrap.position").value("$positionSuppressWarning", !1).service("$position", ["$log", "$positionSuppressWarning", "$uibPosition", function (a, b, c) { b || a.warn("$position is now deprecated. Use $uibPosition instead."), angular.extend(this, c) }]), angular.module("ui.bootstrap.datepicker", ["ui.bootstrap.dateparser", "ui.bootstrap.position"]).value("$datepickerSuppressError", !1).constant("uibDatepickerConfig", { formatDay: "dd", formatMonth: "MMMM", formatYear: "yyyy", formatDayHeader: "EEE", formatDayTitle: "MMMM yyyy", formatMonthTitle: "yyyy", datepickerMode: "day", minMode: "day", maxMode: "year", showWeeks: !0, startingDay: 0, yearRange: 20, minDate: null, maxDate: null, shortcutPropagation: !1 }).controller("UibDatepickerController", ["$scope", "$attrs", "$parse", "$interpolate", "$log", "dateFilter", "uibDatepickerConfig", "$datepickerSuppressError", function (a, b, c, d, e, f, g, h) { var i = this, j = { $setViewValue: angular.noop }; this.modes = ["day", "month", "year"], angular.forEach(["formatDay", "formatMonth", "formatYear", "formatDayHeader", "formatDayTitle", "formatMonthTitle", "showWeeks", "startingDay", "yearRange", "shortcutPropagation"], function (c, e) { i[c] = angular.isDefined(b[c]) ? 6 > e ? d(b[c])(a.$parent) : a.$parent.$eval(b[c]) : g[c] }), angular.forEach(["minDate", "maxDate"], function (d) { b[d] ? a.$parent.$watch(c(b[d]), function (a) { i[d] = a ? new Date(a) : null, i.refreshView() }) : i[d] = g[d] ? new Date(g[d]) : null }), angular.forEach(["minMode", "maxMode"], function (d) { b[d] ? a.$parent.$watch(c(b[d]), function (c) { i[d] = angular.isDefined(c) ? c : b[d], a[d] = i[d], ("minMode" == d && i.modes.indexOf(a.datepickerMode) < i.modes.indexOf(i[d]) || "maxMode" == d && i.modes.indexOf(a.datepickerMode) > i.modes.indexOf(i[d])) && (a.datepickerMode = i[d]) }) : (i[d] = g[d] || null, a[d] = i[d]) }), a.datepickerMode = a.datepickerMode || g.datepickerMode, a.uniqueId = "datepicker-" + a.$id + "-" + Math.floor(1e4 * Math.random()), angular.isDefined(b.initDate) ? (this.activeDate = a.$parent.$eval(b.initDate) || new Date, a.$parent.$watch(b.initDate, function (a) { a && (j.$isEmpty(j.$modelValue) || j.$invalid) && (i.activeDate = a, i.refreshView()) })) : this.activeDate = new Date, a.isActive = function (b) { return 0 === i.compare(b.date, i.activeDate) ? (a.activeDateId = b.uid, !0) : !1 }, this.init = function (a) { j = a, j.$render = function () { i.render() } }, this.render = function () { if (j.$viewValue) { var a = new Date(j.$viewValue), b = !isNaN(a); b ? this.activeDate = a : h || e.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.') } this.refreshView() }, this.refreshView = function () { if (this.element) { this._refreshView(); var a = j.$viewValue ? new Date(j.$viewValue) : null; j.$setValidity("dateDisabled", !a || this.element && !this.isDisabled(a)) } }, this.createDateObject = function (a, b) { var c = j.$viewValue ? new Date(j.$viewValue) : null; return { date: a, label: f(a, b), selected: c && 0 === this.compare(a, c), disabled: this.isDisabled(a), current: 0 === this.compare(a, new Date), customClass: this.customClass(a) } }, this.isDisabled = function (c) { return this.minDate && this.compare(c, this.minDate) < 0 || this.maxDate && this.compare(c, this.maxDate) > 0 || b.dateDisabled && a.dateDisabled({ date: c, mode: a.datepickerMode }) }, this.customClass = function (b) { return a.customClass({ date: b, mode: a.datepickerMode }) }, this.split = function (a, b) { for (var c = []; a.length > 0;) c.push(a.splice(0, b)); return c }, a.select = function (b) { if (a.datepickerMode === i.minMode) { var c = j.$viewValue ? new Date(j.$viewValue) : new Date(0, 0, 0, 0, 0, 0, 0); c.setFullYear(b.getFullYear(), b.getMonth(), b.getDate()), j.$setViewValue(c), j.$render() } else i.activeDate = b, a.datepickerMode = i.modes[i.modes.indexOf(a.datepickerMode) - 1] }, a.move = function (a) { var b = i.activeDate.getFullYear() + a * (i.step.years || 0), c = i.activeDate.getMonth() + a * (i.step.months || 0); i.activeDate.setFullYear(b, c, 1), i.refreshView() }, a.toggleMode = function (b) { b = b || 1, a.datepickerMode === i.maxMode && 1 === b || a.datepickerMode === i.minMode && -1 === b || (a.datepickerMode = i.modes[i.modes.indexOf(a.datepickerMode) + b]) }, a.keys = { 13: "enter", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home", 37: "left", 38: "up", 39: "right", 40: "down" }; var k = function () { i.element[0].focus() }; a.$on("uib:datepicker.focus", k), a.keydown = function (b) { var c = a.keys[b.which]; if (c && !b.shiftKey && !b.altKey) if (b.preventDefault(), i.shortcutPropagation || b.stopPropagation(), "enter" === c || "space" === c) { if (i.isDisabled(i.activeDate)) return; a.select(i.activeDate) } else !b.ctrlKey || "up" !== c && "down" !== c ? (i.handleKeyDown(c, b), i.refreshView()) : a.toggleMode("up" === c ? 1 : -1) } }]).controller("UibDaypickerController", ["$scope", "$element", "dateFilter", function (a, b, c) { function d(a, b) { return 1 !== b || a % 4 !== 0 || a % 100 === 0 && a % 400 !== 0 ? f[b] : 29 } function e(a) { var b = new Date(a); b.setDate(b.getDate() + 4 - (b.getDay() || 7)); var c = b.getTime(); return b.setMonth(0), b.setDate(1), Math.floor(Math.round((c - b) / 864e5) / 7) + 1 } var f = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; this.step = { months: 1 }, this.element = b, this.init = function (b) { angular.extend(b, this), a.showWeeks = b.showWeeks, b.refreshView() }, this.getDates = function (a, b) { for (var c, d = new Array(b), e = new Date(a), f = 0; b > f;) c = new Date(e), d[f++] = c, e.setDate(e.getDate() + 1); return d }, this._refreshView = function () { var b = this.activeDate.getFullYear(), d = this.activeDate.getMonth(), f = new Date(this.activeDate); f.setFullYear(b, d, 1); var g = this.startingDay - f.getDay(), h = g > 0 ? 7 - g : -g, i = new Date(f); h > 0 && i.setDate(-h + 1); for (var j = this.getDates(i, 42), k = 0; 42 > k; k++) j[k] = angular.extend(this.createDateObject(j[k], this.formatDay), { secondary: j[k].getMonth() !== d, uid: a.uniqueId + "-" + k }); a.labels = new Array(7); for (var l = 0; 7 > l; l++) a.labels[l] = { abbr: c(j[l].date, this.formatDayHeader), full: c(j[l].date, "EEEE") }; if (a.title = c(this.activeDate, this.formatDayTitle), a.rows = this.split(j, 7), a.showWeeks) { a.weekNumbers = []; for (var m = (11 - this.startingDay) % 7, n = a.rows.length, o = 0; n > o; o++) a.weekNumbers.push(e(a.rows[o][m].date)) } }, this.compare = function (a, b) { return new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate()) }, this.handleKeyDown = function (a, b) { var c = this.activeDate.getDate(); if ("left" === a) c -= 1; else if ("up" === a) c -= 7; else if ("right" === a) c += 1; else if ("down" === a) c += 7; else if ("pageup" === a || "pagedown" === a) { var e = this.activeDate.getMonth() + ("pageup" === a ? -1 : 1); this.activeDate.setMonth(e, 1), c = Math.min(d(this.activeDate.getFullYear(), this.activeDate.getMonth()), c) } else "home" === a ? c = 1 : "end" === a && (c = d(this.activeDate.getFullYear(), this.activeDate.getMonth())); this.activeDate.setDate(c) } }]).controller("UibMonthpickerController", ["$scope", "$element", "dateFilter", function (a, b, c) { this.step = { years: 1 }, this.element = b, this.init = function (a) { angular.extend(a, this), a.refreshView() }, this._refreshView = function () { for (var b, d = new Array(12), e = this.activeDate.getFullYear(), f = 0; 12 > f; f++) b = new Date(this.activeDate), b.setFullYear(e, f, 1), d[f] = angular.extend(this.createDateObject(b, this.formatMonth), { uid: a.uniqueId + "-" + f }); a.title = c(this.activeDate, this.formatMonthTitle), a.rows = this.split(d, 3) }, this.compare = function (a, b) { return new Date(a.getFullYear(), a.getMonth()) - new Date(b.getFullYear(), b.getMonth()) }, this.handleKeyDown = function (a, b) { var c = this.activeDate.getMonth(); if ("left" === a) c -= 1; else if ("up" === a) c -= 3; else if ("right" === a) c += 1; else if ("down" === a) c += 3; else if ("pageup" === a || "pagedown" === a) { var d = this.activeDate.getFullYear() + ("pageup" === a ? -1 : 1); this.activeDate.setFullYear(d) } else "home" === a ? c = 0 : "end" === a && (c = 11); this.activeDate.setMonth(c) } }]).controller("UibYearpickerController", ["$scope", "$element", "dateFilter", function (a, b, c) { function d(a) { return parseInt((a - 1) / e, 10) * e + 1 } var e; this.element = b, this.yearpickerInit = function () { e = this.yearRange, this.step = { years: e } }, this._refreshView = function () { for (var b, c = new Array(e), f = 0, g = d(this.activeDate.getFullYear()) ; e > f; f++) b = new Date(this.activeDate), b.setFullYear(g + f, 0, 1), c[f] = angular.extend(this.createDateObject(b, this.formatYear), { uid: a.uniqueId + "-" + f }); a.title = [c[0].label, c[e - 1].label].join(" - "), a.rows = this.split(c, 5) }, this.compare = function (a, b) { return a.getFullYear() - b.getFullYear() }, this.handleKeyDown = function (a, b) { var c = this.activeDate.getFullYear(); "left" === a ? c -= 1 : "up" === a ? c -= 5 : "right" === a ? c += 1 : "down" === a ? c += 5 : "pageup" === a || "pagedown" === a ? c += ("pageup" === a ? -1 : 1) * this.step.years : "home" === a ? c = d(this.activeDate.getFullYear()) : "end" === a && (c = d(this.activeDate.getFullYear()) + e - 1), this.activeDate.setFullYear(c) } }]).directive("uibDatepicker", function () { return { replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/datepicker.html" }, scope: { datepickerMode: "=?", dateDisabled: "&", customClass: "&", shortcutPropagation: "&?" }, require: ["uibDatepicker", "^ngModel"], controller: "UibDatepickerController", controllerAs: "datepicker", link: function (a, b, c, d) { var e = d[0], f = d[1]; e.init(f) } } }).directive("uibDaypicker", function () { return { replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/day.html" }, require: ["^?uibDatepicker", "uibDaypicker", "^?datepicker"], controller: "UibDaypickerController", link: function (a, b, c, d) { var e = d[0] || d[2], f = d[1]; f.init(e) } } }).directive("uibMonthpicker", function () { return { replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/month.html" }, require: ["^?uibDatepicker", "uibMonthpicker", "^?datepicker"], controller: "UibMonthpickerController", link: function (a, b, c, d) { var e = d[0] || d[2], f = d[1]; f.init(e) } } }).directive("uibYearpicker", function () { return { replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/year.html" }, require: ["^?uibDatepicker", "uibYearpicker", "^?datepicker"], controller: "UibYearpickerController", link: function (a, b, c, d) { var e = d[0] || d[2]; angular.extend(e, d[1]), e.yearpickerInit(), e.refreshView() } } }).constant("uibDatepickerPopupConfig", { datepickerPopup: "yyyy-MM-dd", datepickerPopupTemplateUrl: "template/datepicker/popup.html", datepickerTemplateUrl: "template/datepicker/datepicker.html", html5Types: { date: "yyyy-MM-dd", "datetime-local": "yyyy-MM-ddTHH:mm:ss.sss", month: "yyyy-MM" }, currentText: "Today", clearText: "Clear", closeText: "Done", closeOnDateSelection: !0, appendToBody: !1, showButtonBar: !0, onOpenFocus: !0 }).controller("UibDatepickerPopupController", ["$scope", "$element", "$attrs", "$compile", "$parse", "$document", "$rootScope", "$uibPosition", "dateFilter", "uibDateParser", "uibDatepickerPopupConfig", "$timeout", function (a, b, c, d, e, f, g, h, i, j, k, l) {
    function m(a) { return a.replace(/([A-Z])/g, function (a) { return "-" + a.toLowerCase() }) } function n(b) { if (angular.isNumber(b) && (b = new Date(b)), b) { if (angular.isDate(b) && !isNaN(b)) return b; if (angular.isString(b)) { var c = j.parse(b, r, a.date); return isNaN(c) ? void 0 : c } return void 0 } return null } function o(a, b) { var d = a || b; if (!c.ngRequired && !d) return !0; if (angular.isNumber(d) && (d = new Date(d)), d) { if (angular.isDate(d) && !isNaN(d)) return !0; if (angular.isString(d)) { var e = j.parse(d, r); return !isNaN(e) } return !1 } return !0 } function p(c) { var d = A[0], e = b[0].contains(c.target), f = void 0 !== d.contains && d.contains(c.target); !a.isOpen || e || f || a.$apply(function () { a.isOpen = !1 }) } function q(c) { 27 === c.which && a.isOpen ? (c.preventDefault(), c.stopPropagation(), a.$apply(function () { a.isOpen = !1 }), b[0].focus()) : 40 !== c.which || a.isOpen || (c.preventDefault(), c.stopPropagation(), a.$apply(function () { a.isOpen = !0 })) } var r, s, t, u, v, w, x, y, z, A, B = {}, C = !1; a.watchData = {}, this.init = function (h) { if (z = h, s = angular.isDefined(c.closeOnDateSelection) ? a.$parent.$eval(c.closeOnDateSelection) : k.closeOnDateSelection, t = angular.isDefined(c.datepickerAppendToBody) ? a.$parent.$eval(c.datepickerAppendToBody) : k.appendToBody, u = angular.isDefined(c.onOpenFocus) ? a.$parent.$eval(c.onOpenFocus) : k.onOpenFocus, v = angular.isDefined(c.datepickerPopupTemplateUrl) ? c.datepickerPopupTemplateUrl : k.datepickerPopupTemplateUrl, w = angular.isDefined(c.datepickerTemplateUrl) ? c.datepickerTemplateUrl : k.datepickerTemplateUrl, a.showButtonBar = angular.isDefined(c.showButtonBar) ? a.$parent.$eval(c.showButtonBar) : k.showButtonBar, k.html5Types[c.type] ? (r = k.html5Types[c.type], C = !0) : (r = c.datepickerPopup || c.uibDatepickerPopup || k.datepickerPopup, c.$observe("uibDatepickerPopup", function (a, b) { var c = a || k.datepickerPopup; if (c !== r && (r = c, z.$modelValue = null, !r)) throw new Error("uibDatepickerPopup must have a date format specified.") })), !r) throw new Error("uibDatepickerPopup must have a date format specified."); if (C && c.datepickerPopup) throw new Error("HTML5 date input types do not support custom formats."); if (x = angular.element("<div uib-datepicker-popup-wrap><div uib-datepicker></div></div>"), x.attr({ "ng-model": "date", "ng-change": "dateSelection(date)", "template-url": v }), y = angular.element(x.children()[0]), y.attr("template-url", w), C && "month" === c.type && (y.attr("datepicker-mode", '"month"'), y.attr("min-mode", "month")), c.datepickerOptions) { var l = a.$parent.$eval(c.datepickerOptions); l && l.initDate && (a.initDate = l.initDate, y.attr("init-date", "initDate"), delete l.initDate), angular.forEach(l, function (a, b) { y.attr(m(b), a) }) } angular.forEach(["minMode", "maxMode", "minDate", "maxDate", "datepickerMode", "initDate", "shortcutPropagation"], function (b) { if (c[b]) { var d = e(c[b]); if (a.$parent.$watch(d, function (c) { a.watchData[b] = c, ("minDate" === b || "maxDate" === b) && (B[b] = new Date(c)) }), y.attr(m(b), "watchData." + b), "datepickerMode" === b) { var f = d.assign; a.$watch("watchData." + b, function (b, c) { angular.isFunction(f) && b !== c && f(a.$parent, b) }) } } }), c.dateDisabled && y.attr("date-disabled", "dateDisabled({ date: date, mode: mode })"), c.showWeeks && y.attr("show-weeks", c.showWeeks), c.customClass && y.attr("custom-class", "customClass({ date: date, mode: mode })"), C ? z.$formatters.push(function (b) { return a.date = b, b }) : (z.$$parserName = "date", z.$validators.date = o, z.$parsers.unshift(n), z.$formatters.push(function (b) { return a.date = b, z.$isEmpty(b) ? b : i(b, r) })), z.$viewChangeListeners.push(function () { a.date = j.parse(z.$viewValue, r, a.date) }), b.bind("keydown", q), A = d(x)(a), x.remove(), t ? f.find("body").append(A) : b.after(A), a.$on("$destroy", function () { a.isOpen === !0 && (g.$$phase || a.$apply(function () { a.isOpen = !1 })), A.remove(), b.unbind("keydown", q), f.unbind("click", p) }) }, a.getText = function (b) { return a[b + "Text"] || k[b + "Text"] }, a.isDisabled = function (b) { return "today" === b && (b = new Date), a.watchData.minDate && a.compare(b, B.minDate) < 0 || a.watchData.maxDate && a.compare(b, B.maxDate) > 0 }, a.compare = function (a, b) { return new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate()) }, a.dateSelection = function (c) { angular.isDefined(c) && (a.date = c); var d = a.date ? i(a.date, r) : null; b.val(d), z.$setViewValue(d), s && (a.isOpen = !1, b[0].focus()) }, a.keydown = function (c) { 27 === c.which && (a.isOpen = !1, b[0].focus()) }, a.select = function (b) { if ("today" === b) { var c = new Date; angular.isDate(a.date) ? (b = new Date(a.date), b.setFullYear(c.getFullYear(), c.getMonth(), c.getDate())) : b = new Date(c.setHours(0, 0, 0, 0)) } a.dateSelection(b) }, a.close = function () { a.isOpen = !1, b[0].focus() }, a.$watch("isOpen", function (c) { c ? (a.position = t ? h.offset(b) : h.position(b), a.position.top = a.position.top + b.prop("offsetHeight"), l(function () { u && a.$broadcast("uib:datepicker.focus"), f.bind("click", p) }, 0, !1)) : f.unbind("click", p) })
}]).directive("uibDatepickerPopup", function () { return { require: ["ngModel", "uibDatepickerPopup"], controller: "UibDatepickerPopupController", scope: { isOpen: "=?", currentText: "@", clearText: "@", closeText: "@", dateDisabled: "&", customClass: "&" }, link: function (a, b, c, d) { var e = d[0], f = d[1]; f.init(e) } } }).directive("uibDatepickerPopupWrap", function () { return { replace: !0, transclude: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/popup.html" } } }), angular.module("ui.bootstrap.datepicker").value("$datepickerSuppressWarning", !1).controller("DatepickerController", ["$scope", "$attrs", "$parse", "$interpolate", "$log", "dateFilter", "uibDatepickerConfig", "$datepickerSuppressError", "$datepickerSuppressWarning", function (a, b, c, d, e, f, g, h, i) { i || e.warn("DatepickerController is now deprecated. Use UibDatepickerController instead."); var j = this, k = { $setViewValue: angular.noop }; this.modes = ["day", "month", "year"], angular.forEach(["formatDay", "formatMonth", "formatYear", "formatDayHeader", "formatDayTitle", "formatMonthTitle", "showWeeks", "startingDay", "yearRange", "shortcutPropagation"], function (c, e) { j[c] = angular.isDefined(b[c]) ? 6 > e ? d(b[c])(a.$parent) : a.$parent.$eval(b[c]) : g[c] }), angular.forEach(["minDate", "maxDate"], function (d) { b[d] ? a.$parent.$watch(c(b[d]), function (a) { j[d] = a ? new Date(a) : null, j.refreshView() }) : j[d] = g[d] ? new Date(g[d]) : null }), angular.forEach(["minMode", "maxMode"], function (d) { b[d] ? a.$parent.$watch(c(b[d]), function (c) { j[d] = angular.isDefined(c) ? c : b[d], a[d] = j[d], ("minMode" == d && j.modes.indexOf(a.datepickerMode) < j.modes.indexOf(j[d]) || "maxMode" == d && j.modes.indexOf(a.datepickerMode) > j.modes.indexOf(j[d])) && (a.datepickerMode = j[d]) }) : (j[d] = g[d] || null, a[d] = j[d]) }), a.datepickerMode = a.datepickerMode || g.datepickerMode, a.uniqueId = "datepicker-" + a.$id + "-" + Math.floor(1e4 * Math.random()), angular.isDefined(b.initDate) ? (this.activeDate = a.$parent.$eval(b.initDate) || new Date, a.$parent.$watch(b.initDate, function (a) { a && (k.$isEmpty(k.$modelValue) || k.$invalid) && (j.activeDate = a, j.refreshView()) })) : this.activeDate = new Date, a.isActive = function (b) { return 0 === j.compare(b.date, j.activeDate) ? (a.activeDateId = b.uid, !0) : !1 }, this.init = function (a) { k = a, k.$render = function () { j.render() } }, this.render = function () { if (k.$viewValue) { var a = new Date(k.$viewValue), b = !isNaN(a); b ? this.activeDate = a : h || e.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.') } this.refreshView() }, this.refreshView = function () { if (this.element) { this._refreshView(); var a = k.$viewValue ? new Date(k.$viewValue) : null; k.$setValidity("dateDisabled", !a || this.element && !this.isDisabled(a)) } }, this.createDateObject = function (a, b) { var c = k.$viewValue ? new Date(k.$viewValue) : null; return { date: a, label: f(a, b), selected: c && 0 === this.compare(a, c), disabled: this.isDisabled(a), current: 0 === this.compare(a, new Date), customClass: this.customClass(a) } }, this.isDisabled = function (c) { return this.minDate && this.compare(c, this.minDate) < 0 || this.maxDate && this.compare(c, this.maxDate) > 0 || b.dateDisabled && a.dateDisabled({ date: c, mode: a.datepickerMode }) }, this.customClass = function (b) { return a.customClass({ date: b, mode: a.datepickerMode }) }, this.split = function (a, b) { for (var c = []; a.length > 0;) c.push(a.splice(0, b)); return c }, this.fixTimeZone = function (a) { var b = a.getHours(); a.setHours(23 === b ? b + 2 : 0) }, a.select = function (b) { if (a.datepickerMode === j.minMode) { var c = k.$viewValue ? new Date(k.$viewValue) : new Date(0, 0, 0, 0, 0, 0, 0); c.setFullYear(b.getFullYear(), b.getMonth(), b.getDate()), k.$setViewValue(c), k.$render() } else j.activeDate = b, a.datepickerMode = j.modes[j.modes.indexOf(a.datepickerMode) - 1] }, a.move = function (a) { var b = j.activeDate.getFullYear() + a * (j.step.years || 0), c = j.activeDate.getMonth() + a * (j.step.months || 0); j.activeDate.setFullYear(b, c, 1), j.refreshView() }, a.toggleMode = function (b) { b = b || 1, a.datepickerMode === j.maxMode && 1 === b || a.datepickerMode === j.minMode && -1 === b || (a.datepickerMode = j.modes[j.modes.indexOf(a.datepickerMode) + b]) }, a.keys = { 13: "enter", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home", 37: "left", 38: "up", 39: "right", 40: "down" }; var l = function () { j.element[0].focus() }; a.$on("uib:datepicker.focus", l), a.keydown = function (b) { var c = a.keys[b.which]; if (c && !b.shiftKey && !b.altKey) if (b.preventDefault(), j.shortcutPropagation || b.stopPropagation(), "enter" === c || "space" === c) { if (j.isDisabled(j.activeDate)) return; a.select(j.activeDate) } else !b.ctrlKey || "up" !== c && "down" !== c ? (j.handleKeyDown(c, b), j.refreshView()) : a.toggleMode("up" === c ? 1 : -1) } }]).directive("datepicker", ["$log", "$datepickerSuppressWarning", function (a, b) { return { replace: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/datepicker.html" }, scope: { datepickerMode: "=?", dateDisabled: "&", customClass: "&", shortcutPropagation: "&?" }, require: ["datepicker", "^ngModel"], controller: "DatepickerController", controllerAs: "datepicker", link: function (c, d, e, f) { b || a.warn("datepicker is now deprecated. Use uib-datepicker instead."); var g = f[0], h = f[1]; g.init(h) } } }]).directive("daypicker", ["$log", "$datepickerSuppressWarning", function (a, b) { return { replace: !0, templateUrl: "template/datepicker/day.html", require: ["^datepicker", "daypicker"], controller: "UibDaypickerController", link: function (c, d, e, f) { b || a.warn("daypicker is now deprecated. Use uib-daypicker instead."); var g = f[0], h = f[1]; h.init(g) } } }]).directive("monthpicker", ["$log", "$datepickerSuppressWarning", function (a, b) { return { replace: !0, templateUrl: "template/datepicker/month.html", require: ["^datepicker", "monthpicker"], controller: "UibMonthpickerController", link: function (c, d, e, f) { b || a.warn("monthpicker is now deprecated. Use uib-monthpicker instead."); var g = f[0], h = f[1]; h.init(g) } } }]).directive("yearpicker", ["$log", "$datepickerSuppressWarning", function (a, b) { return { replace: !0, templateUrl: "template/datepicker/year.html", require: ["^datepicker", "yearpicker"], controller: "UibYearpickerController", link: function (c, d, e, f) { b || a.warn("yearpicker is now deprecated. Use uib-yearpicker instead."); var g = f[0]; angular.extend(g, f[1]), g.yearpickerInit(), g.refreshView() } } }]).directive("datepickerPopup", ["$log", "$datepickerSuppressWarning", function (a, b) { return { require: ["ngModel", "datepickerPopup"], controller: "UibDatepickerPopupController", scope: { isOpen: "=?", currentText: "@", clearText: "@", closeText: "@", dateDisabled: "&", customClass: "&" }, link: function (c, d, e, f) { b || a.warn("datepicker-popup is now deprecated. Use uib-datepicker-popup instead."); var g = f[0], h = f[1]; h.init(g) } } }]).directive("datepickerPopupWrap", ["$log", "$datepickerSuppressWarning", function (a, b) { return { replace: !0, transclude: !0, templateUrl: function (a, b) { return b.templateUrl || "template/datepicker/popup.html" }, link: function () { b || a.warn("datepicker-popup-wrap is now deprecated. Use uib-datepicker-popup-wrap instead.") } } }]), angular.module("ui.bootstrap.dropdown", ["ui.bootstrap.position"]).constant("uibDropdownConfig", { openClass: "open" }).service("uibDropdownService", ["$document", "$rootScope", function (a, b) { var c = null; this.open = function (b) { c || (a.bind("click", d), a.bind("keydown", e)), c && c !== b && (c.isOpen = !1), c = b }, this.close = function (b) { c === b && (c = null, a.unbind("click", d), a.unbind("keydown", e)) }; var d = function (a) { if (c && (!a || "disabled" !== c.getAutoClose())) { var d = c.getToggleElement(); if (!(a && d && d[0].contains(a.target))) { var e = c.getDropdownElement(); a && "outsideClick" === c.getAutoClose() && e && e[0].contains(a.target) || (c.isOpen = !1, b.$$phase || c.$apply()) } } }, e = function (a) { 27 === a.which ? (c.focusToggleElement(), d()) : c.isKeynavEnabled() && /(38|40)/.test(a.which) && c.isOpen && (a.preventDefault(), a.stopPropagation(), c.focusDropdownEntry(a.which)) } }]).controller("UibDropdownController", ["$scope", "$element", "$attrs", "$parse", "uibDropdownConfig", "uibDropdownService", "$animate", "$uibPosition", "$document", "$compile", "$templateRequest", function (a, b, c, d, e, f, g, h, i, j, k) { var l, m, n = this, o = a.$new(), p = e.openClass, q = angular.noop, r = c.onToggle ? d(c.onToggle) : angular.noop, s = !1, t = !1; b.addClass("dropdown"), this.init = function () { c.isOpen && (m = d(c.isOpen), q = m.assign, a.$watch(m, function (a) { o.isOpen = !!a })), s = angular.isDefined(c.dropdownAppendToBody), t = angular.isDefined(c.uibKeyboardNav), s && n.dropdownMenu && (i.find("body").append(n.dropdownMenu), b.on("$destroy", function () { n.dropdownMenu.remove() })) }, this.toggle = function (a) { return o.isOpen = arguments.length ? !!a : !o.isOpen }, this.isOpen = function () { return o.isOpen }, o.getToggleElement = function () { return n.toggleElement }, o.getAutoClose = function () { return c.autoClose || "always" }, o.getElement = function () { return b }, o.isKeynavEnabled = function () { return t }, o.focusDropdownEntry = function (a) { var c = n.dropdownMenu ? angular.element(n.dropdownMenu).find("a") : angular.element(b).find("ul").eq(0).find("a"); switch (a) { case 40: angular.isNumber(n.selectedOption) ? n.selectedOption = n.selectedOption === c.length - 1 ? n.selectedOption : n.selectedOption + 1 : n.selectedOption = 0; break; case 38: angular.isNumber(n.selectedOption) ? n.selectedOption = 0 === n.selectedOption ? 0 : n.selectedOption - 1 : n.selectedOption = c.length - 1 } c[n.selectedOption].focus() }, o.getDropdownElement = function () { return n.dropdownMenu }, o.focusToggleElement = function () { n.toggleElement && n.toggleElement[0].focus() }, o.$watch("isOpen", function (c, d) { if (s && n.dropdownMenu) { var e = h.positionElements(b, n.dropdownMenu, "bottom-left", !0), i = { top: e.top + "px", display: c ? "block" : "none" }, m = n.dropdownMenu.hasClass("dropdown-menu-right"); m ? (i.left = "auto", i.right = window.innerWidth - (e.left + b.prop("offsetWidth")) + "px") : (i.left = e.left + "px", i.right = "auto"), n.dropdownMenu.css(i) } if (g[c ? "addClass" : "removeClass"](b, p).then(function () { angular.isDefined(c) && c !== d && r(a, { open: !!c }) }), c) n.dropdownMenuTemplateUrl && k(n.dropdownMenuTemplateUrl).then(function (a) { l = o.$new(), j(a.trim())(l, function (a) { var b = a; n.dropdownMenu.replaceWith(b), n.dropdownMenu = b }) }), o.focusToggleElement(), f.open(o); else { if (n.dropdownMenuTemplateUrl) { l && l.$destroy(); var t = angular.element('<ul class="dropdown-menu"></ul>'); n.dropdownMenu.replaceWith(t), n.dropdownMenu = t } f.close(o), n.selectedOption = null } angular.isFunction(q) && q(a, c) }), a.$on("$locationChangeSuccess", function () { "disabled" !== o.getAutoClose() && (o.isOpen = !1) }); var u = a.$on("$destroy", function () { o.$destroy() }); o.$on("$destroy", u) }]).directive("uibDropdown", function () { return { controller: "UibDropdownController", link: function (a, b, c, d) { d.init() } } }).directive("uibDropdownMenu", function () { return { restrict: "AC", require: "?^uibDropdown", link: function (a, b, c, d) { if (d && !angular.isDefined(c.dropdownNested)) { b.addClass("dropdown-menu"); var e = c.templateUrl; e && (d.dropdownMenuTemplateUrl = e), d.dropdownMenu || (d.dropdownMenu = b) } } } }).directive("uibKeyboardNav", function () { return { restrict: "A", require: "?^uibDropdown", link: function (a, b, c, d) { b.bind("keydown", function (a) { if (-1 !== [38, 40].indexOf(a.which)) { a.preventDefault(), a.stopPropagation(); var b = d.dropdownMenu.find("a"); switch (a.which) { case 40: angular.isNumber(d.selectedOption) ? d.selectedOption = d.selectedOption === b.length - 1 ? d.selectedOption : d.selectedOption + 1 : d.selectedOption = 0; break; case 38: angular.isNumber(d.selectedOption) ? d.selectedOption = 0 === d.selectedOption ? 0 : d.selectedOption - 1 : d.selectedOption = b.length - 1 } b[d.selectedOption].focus() } }) } } }).directive("uibDropdownToggle", function () { return { require: "?^uibDropdown", link: function (a, b, c, d) { if (d) { b.addClass("dropdown-toggle"), d.toggleElement = b; var e = function (e) { e.preventDefault(), b.hasClass("disabled") || c.disabled || a.$apply(function () { d.toggle() }) }; b.bind("click", e), b.attr({ "aria-haspopup": !0, "aria-expanded": !1 }), a.$watch(d.isOpen, function (a) { b.attr("aria-expanded", !!a) }), a.$on("$destroy", function () { b.unbind("click", e) }) } } } }), angular.module("ui.bootstrap.dropdown").value("$dropdownSuppressWarning", !1).service("dropdownService", ["$log", "$dropdownSuppressWarning", "uibDropdownService", function (a, b, c) { b || a.warn("dropdownService is now deprecated. Use uibDropdownService instead."), angular.extend(this, c) }]).controller("DropdownController", ["$scope", "$element", "$attrs", "$parse", "uibDropdownConfig", "uibDropdownService", "$animate", "$uibPosition", "$document", "$compile", "$templateRequest", "$log", "$dropdownSuppressWarning", function (a, b, c, d, e, f, g, h, i, j, k, l, m) { m || l.warn("DropdownController is now deprecated. Use UibDropdownController instead."); var n, o, p = this, q = a.$new(), r = e.openClass, s = angular.noop, t = c.onToggle ? d(c.onToggle) : angular.noop, u = !1, v = !1; b.addClass("dropdown"), this.init = function () { c.isOpen && (o = d(c.isOpen), s = o.assign, a.$watch(o, function (a) { q.isOpen = !!a })), u = angular.isDefined(c.dropdownAppendToBody), v = angular.isDefined(c.uibKeyboardNav), u && p.dropdownMenu && (i.find("body").append(p.dropdownMenu), b.on("$destroy", function () { p.dropdownMenu.remove() })) }, this.toggle = function (a) { return q.isOpen = arguments.length ? !!a : !q.isOpen }, this.isOpen = function () { return q.isOpen }, q.getToggleElement = function () { return p.toggleElement }, q.getAutoClose = function () { return c.autoClose || "always" }, q.getElement = function () { return b }, q.isKeynavEnabled = function () { return v }, q.focusDropdownEntry = function (a) { var c = p.dropdownMenu ? angular.element(p.dropdownMenu).find("a") : angular.element(b).find("ul").eq(0).find("a"); switch (a) { case 40: angular.isNumber(p.selectedOption) ? p.selectedOption = p.selectedOption === c.length - 1 ? p.selectedOption : p.selectedOption + 1 : p.selectedOption = 0; break; case 38: angular.isNumber(p.selectedOption) ? p.selectedOption = 0 === p.selectedOption ? 0 : p.selectedOption - 1 : p.selectedOption = c.length - 1 } c[p.selectedOption].focus() }, q.getDropdownElement = function () { return p.dropdownMenu }, q.focusToggleElement = function () { p.toggleElement && p.toggleElement[0].focus() }, q.$watch("isOpen", function (c, d) { if (u && p.dropdownMenu) { var e = h.positionElements(b, p.dropdownMenu, "bottom-left", !0), i = { top: e.top + "px", display: c ? "block" : "none" }, l = p.dropdownMenu.hasClass("dropdown-menu-right"); l ? (i.left = "auto", i.right = window.innerWidth - (e.left + b.prop("offsetWidth")) + "px") : (i.left = e.left + "px", i.right = "auto"), p.dropdownMenu.css(i) } if (g[c ? "addClass" : "removeClass"](b, r).then(function () { angular.isDefined(c) && c !== d && t(a, { open: !!c }) }), c) p.dropdownMenuTemplateUrl && k(p.dropdownMenuTemplateUrl).then(function (a) { n = q.$new(), j(a.trim())(n, function (a) { var b = a; p.dropdownMenu.replaceWith(b), p.dropdownMenu = b }) }), q.focusToggleElement(), f.open(q); else { if (p.dropdownMenuTemplateUrl) { n && n.$destroy(); var m = angular.element('<ul class="dropdown-menu"></ul>'); p.dropdownMenu.replaceWith(m), p.dropdownMenu = m } f.close(q), p.selectedOption = null } angular.isFunction(s) && s(a, c) }), a.$on("$locationChangeSuccess", function () { "disabled" !== q.getAutoClose() && (q.isOpen = !1) }); var w = a.$on("$destroy", function () { q.$destroy() }); q.$on("$destroy", w) }]).directive("dropdown", ["$log", "$dropdownSuppressWarning", function (a, b) { return { controller: "DropdownController", link: function (c, d, e, f) { b || a.warn("dropdown is now deprecated. Use uib-dropdown instead."), f.init() } } }]).directive("dropdownMenu", ["$log", "$dropdownSuppressWarning", function (a, b) { return { restrict: "AC", require: "?^dropdown", link: function (c, d, e, f) { if (f && !angular.isDefined(e.dropdownNested)) { b || a.warn("dropdown-menu is now deprecated. Use uib-dropdown-menu instead."), d.addClass("dropdown-menu"); var g = e.templateUrl; g && (f.dropdownMenuTemplateUrl = g), f.dropdownMenu || (f.dropdownMenu = d) } } } }]).directive("keyboardNav", ["$log", "$dropdownSuppressWarning", function (a, b) { return { restrict: "A", require: "?^dropdown", link: function (c, d, e, f) { b || a.warn("keyboard-nav is now deprecated. Use uib-keyboard-nav instead."), d.bind("keydown", function (a) { if (-1 !== [38, 40].indexOf(a.which)) { a.preventDefault(), a.stopPropagation(); var b = f.dropdownMenu.find("a"); switch (a.which) { case 40: angular.isNumber(f.selectedOption) ? f.selectedOption = f.selectedOption === b.length - 1 ? f.selectedOption : f.selectedOption + 1 : f.selectedOption = 0; break; case 38: angular.isNumber(f.selectedOption) ? f.selectedOption = 0 === f.selectedOption ? 0 : f.selectedOption - 1 : f.selectedOption = b.length - 1 } b[f.selectedOption].focus() } }) } } }]).directive("dropdownToggle", ["$log", "$dropdownSuppressWarning", function (a, b) { return { require: "?^dropdown", link: function (c, d, e, f) { if (b || a.warn("dropdown-toggle is now deprecated. Use uib-dropdown-toggle instead."), f) { d.addClass("dropdown-toggle"), f.toggleElement = d; var g = function (a) { a.preventDefault(), d.hasClass("disabled") || e.disabled || c.$apply(function () { f.toggle() }) }; d.bind("click", g), d.attr({ "aria-haspopup": !0, "aria-expanded": !1 }), c.$watch(f.isOpen, function (a) { d.attr("aria-expanded", !!a) }), c.$on("$destroy", function () { d.unbind("click", g) }) } } } }]), angular.module("ui.bootstrap.stackedMap", []).factory("$$stackedMap", function () { return { createNew: function () { var a = []; return { add: function (b, c) { a.push({ key: b, value: c }) }, get: function (b) { for (var c = 0; c < a.length; c++) if (b == a[c].key) return a[c] }, keys: function () { for (var b = [], c = 0; c < a.length; c++) b.push(a[c].key); return b }, top: function () { return a[a.length - 1] }, remove: function (b) { for (var c = -1, d = 0; d < a.length; d++) if (b == a[d].key) { c = d; break } return a.splice(c, 1)[0] }, removeTop: function () { return a.splice(a.length - 1, 1)[0] }, length: function () { return a.length } } } } }), angular.module("ui.bootstrap.modal", ["ui.bootstrap.stackedMap"]).factory("$$multiMap", function () { return { createNew: function () { var a = {}; return { entries: function () { return Object.keys(a).map(function (b) { return { key: b, value: a[b] } }) }, get: function (b) { return a[b] }, hasKey: function (b) { return !!a[b] }, keys: function () { return Object.keys(a) }, put: function (b, c) { a[b] || (a[b] = []), a[b].push(c) }, remove: function (b, c) { var d = a[b]; if (d) { var e = d.indexOf(c); -1 !== e && d.splice(e, 1), d.length || delete a[b] } } } } } }).directive("uibModalBackdrop", ["$animate", "$injector", "$uibModalStack", function (a, b, c) { function d(b, d, f) { d.addClass("modal-backdrop"), f.modalInClass && (e ? e(d, { addClass: f.modalInClass }).start() : a.addClass(d, f.modalInClass), b.$on(c.NOW_CLOSING_EVENT, function (b, c) { var g = c(); e ? e(d, { removeClass: f.modalInClass }).start().then(g) : a.removeClass(d, f.modalInClass).then(g) })) } var e = null; return b.has("$animateCss") && (e = b.get("$animateCss")), { replace: !0, templateUrl: "template/modal/backdrop.html", compile: function (a, b) { return a.addClass(b.backdropClass), d } } }]).directive("uibModalWindow", ["$uibModalStack", "$q", "$animate", "$injector", function (a, b, c, d) { var e = null; return d.has("$animateCss") && (e = d.get("$animateCss")), { scope: { index: "@" }, replace: !0, transclude: !0, templateUrl: function (a, b) { return b.templateUrl || "template/modal/window.html" }, link: function (d, f, g) { f.addClass(g.windowClass || ""), f.addClass(g.windowTopClass || ""), d.size = g.size, d.close = function (b) { var c = a.getTop(); c && c.value.backdrop && "static" !== c.value.backdrop && b.target === b.currentTarget && (b.preventDefault(), b.stopPropagation(), a.dismiss(c.key, "backdrop click")) }, f.on("click", d.close), d.$isRendered = !0; var h = b.defer(); g.$observe("modalRender", function (a) { "true" == a && h.resolve() }), h.promise.then(function () { var h = null; g.modalInClass && (h = e ? e(f, { addClass: g.modalInClass }).start() : c.addClass(f, g.modalInClass), d.$on(a.NOW_CLOSING_EVENT, function (a, b) { var d = b(); e ? e(f, { removeClass: g.modalInClass }).start().then(d) : c.removeClass(f, g.modalInClass).then(d) })), b.when(h).then(function () { var a = f[0].querySelector("[autofocus]"); a ? a.focus() : f[0].focus() }); var i = a.getTop(); i && a.modalRendered(i.key) }) } } }]).directive("uibModalAnimationClass", function () { return { compile: function (a, b) { b.modalAnimation && a.addClass(b.uibModalAnimationClass) } } }).directive("uibModalTransclude", function () { return { link: function (a, b, c, d, e) { e(a.$parent, function (a) { b.empty(), b.append(a) }) } } }).factory("$uibModalStack", ["$animate", "$timeout", "$document", "$compile", "$rootScope", "$q", "$injector", "$$multiMap", "$$stackedMap", function (a, b, c, d, e, f, g, h, i) { function j() { for (var a = -1, b = u.keys(), c = 0; c < b.length; c++) u.get(b[c]).value.backdrop && (a = c); return a } function k(a, b) { var d = c.find("body").eq(0), e = u.get(a).value; u.remove(a), n(e.modalDomEl, e.modalScope, function () { var b = e.openedClass || t; v.remove(b, a), d.toggleClass(b, v.hasKey(b)), l(!0) }), m(), b && b.focus ? b.focus() : d.focus() } function l(a) { var b; u.length() > 0 && (b = u.top().value, b.modalDomEl.toggleClass(b.windowTopClass || "", a)) } function m() { if (q && -1 == j()) { var a = r; n(q, r, function () { a = null }), q = void 0, r = void 0 } } function n(b, c, d) { function e() { e.done || (e.done = !0, p ? p(b, { event: "leave" }).start().then(function () { b.remove() }) : a.leave(b), c.$destroy(), d && d()) } var g, h = null, i = function () { return g || (g = f.defer(), h = g.promise), function () { g.resolve() } }; return c.$broadcast(w.NOW_CLOSING_EVENT, i), f.when(h).then(e) } function o(a, b, c) { return !a.value.modalScope.$broadcast("modal.closing", b, c).defaultPrevented } var p = null; g.has("$animateCss") && (p = g.get("$animateCss")); var q, r, s, t = "modal-open", u = i.createNew(), v = h.createNew(), w = { NOW_CLOSING_EVENT: "modal.stack.now-closing" }, x = 0, y = "a[href], area[href], input:not([disabled]), button:not([disabled]),select:not([disabled]), textarea:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable=true]"; return e.$watch(j, function (a) { r && (r.index = a) }), c.bind("keydown", function (a) { if (a.isDefaultPrevented()) return a; var b = u.top(); if (b && b.value.keyboard) switch (a.which) { case 27: a.preventDefault(), e.$apply(function () { w.dismiss(b.key, "escape key press") }); break; case 9: w.loadFocusElementList(b); var c = !1; a.shiftKey ? w.isFocusInFirstItem(a) && (c = w.focusLastFocusableElement()) : w.isFocusInLastItem(a) && (c = w.focusFirstFocusableElement()), c && (a.preventDefault(), a.stopPropagation()) } }), w.open = function (a, b) { var f = c[0].activeElement, g = b.openedClass || t; l(!1), u.add(a, { deferred: b.deferred, renderDeferred: b.renderDeferred, modalScope: b.scope, backdrop: b.backdrop, keyboard: b.keyboard, openedClass: b.openedClass, windowTopClass: b.windowTopClass }), v.put(g, a); var h = c.find("body").eq(0), i = j(); if (i >= 0 && !q) { r = e.$new(!0), r.index = i; var k = angular.element('<div uib-modal-backdrop="modal-backdrop"></div>'); k.attr("backdrop-class", b.backdropClass), b.animation && k.attr("modal-animation", "true"), q = d(k)(r), h.append(q) } var m = angular.element('<div uib-modal-window="modal-window"></div>'); m.attr({ "template-url": b.windowTemplateUrl, "window-class": b.windowClass, "window-top-class": b.windowTopClass, size: b.size, index: u.length() - 1, animate: "animate" }).html(b.content), b.animation && m.attr("modal-animation", "true"); var n = d(m)(b.scope); u.top().value.modalDomEl = n, u.top().value.modalOpener = f, h.append(n), h.addClass(g), w.clearFocusListCache() }, w.close = function (a, b) { var c = u.get(a); return c && o(c, b, !0) ? (c.value.modalScope.$$uibDestructionScheduled = !0, c.value.deferred.resolve(b), k(a, c.value.modalOpener), !0) : !c }, w.dismiss = function (a, b) { var c = u.get(a); return c && o(c, b, !1) ? (c.value.modalScope.$$uibDestructionScheduled = !0, c.value.deferred.reject(b), k(a, c.value.modalOpener), !0) : !c }, w.dismissAll = function (a) { for (var b = this.getTop() ; b && this.dismiss(b.key, a) ;) b = this.getTop() }, w.getTop = function () { return u.top() }, w.modalRendered = function (a) { var b = u.get(a); b && b.value.renderDeferred.resolve() }, w.focusFirstFocusableElement = function () { return s.length > 0 ? (s[0].focus(), !0) : !1 }, w.focusLastFocusableElement = function () { return s.length > 0 ? (s[s.length - 1].focus(), !0) : !1 }, w.isFocusInFirstItem = function (a) { return s.length > 0 ? (a.target || a.srcElement) == s[0] : !1 }, w.isFocusInLastItem = function (a) { return s.length > 0 ? (a.target || a.srcElement) == s[s.length - 1] : !1 }, w.clearFocusListCache = function () { s = [], x = 0 }, w.loadFocusElementList = function (a) { if ((void 0 === s || !s.length) && a) { var b = a.value.modalDomEl; b && b.length && (s = b[0].querySelectorAll(y)) } }, w }]).provider("$uibModal", function () { var a = { options: { animation: !0, backdrop: !0, keyboard: !0 }, $get: ["$injector", "$rootScope", "$q", "$templateRequest", "$controller", "$uibModalStack", "$modalSuppressWarning", "$log", function (b, c, d, e, f, g, h, i) { function j(a) { return a.template ? d.when(a.template) : e(angular.isFunction(a.templateUrl) ? a.templateUrl() : a.templateUrl) } function k(a) { var c = []; return angular.forEach(a, function (a) { angular.isFunction(a) || angular.isArray(a) ? c.push(d.when(b.invoke(a))) : angular.isString(a) ? c.push(d.when(b.get(a))) : c.push(d.when(a)) }), c } var l = {}, m = null; return l.getPromiseChain = function () { return m }, l.open = function (b) { function e() { return r } var l = d.defer(), n = d.defer(), o = d.defer(), p = { result: l.promise, opened: n.promise, rendered: o.promise, close: function (a) { return g.close(p, a) }, dismiss: function (a) { return g.dismiss(p, a) } }; if (b = angular.extend({}, a.options, b), b.resolve = b.resolve || {}, !b.template && !b.templateUrl) throw new Error("One of template or templateUrl options is required."); var q, r = d.all([j(b)].concat(k(b.resolve))); return q = m = d.all([m]).then(e, e).then(function (a) { var d = (b.scope || c).$new(); d.$close = p.close, d.$dismiss = p.dismiss, d.$on("$destroy", function () { d.$$uibDestructionScheduled || d.$dismiss("$uibUnscheduledDestruction") }); var e, j = {}, k = 1; b.controller && (j.$scope = d, j.$uibModalInstance = p, Object.defineProperty(j, "$modalInstance", { get: function () { return h || i.warn("$modalInstance is now deprecated. Use $uibModalInstance instead."), p } }), angular.forEach(b.resolve, function (b, c) { j[c] = a[k++] }), e = f(b.controller, j), b.controllerAs && (b.bindToController && angular.extend(e, d), d[b.controllerAs] = e)), g.open(p, { scope: d, deferred: l, renderDeferred: o, content: a[0], animation: b.animation, backdrop: b.backdrop, keyboard: b.keyboard, backdropClass: b.backdropClass, windowTopClass: b.windowTopClass, windowClass: b.windowClass, windowTemplateUrl: b.windowTemplateUrl, size: b.size, openedClass: b.openedClass }), n.resolve(!0) }, function (a) { n.reject(a), l.reject(a) })["finally"](function () { m === q && (m = null) }), p }, l }] }; return a }), angular.module("ui.bootstrap.modal").value("$modalSuppressWarning", !1).directive("modalBackdrop", ["$animate", "$injector", "$modalStack", "$log", "$modalSuppressWarning", function (a, b, c, d, e) { function f(b, f, h) { e || d.warn("modal-backdrop is now deprecated. Use uib-modal-backdrop instead."), f.addClass("modal-backdrop"), h.modalInClass && (g ? g(f, { addClass: h.modalInClass }).start() : a.addClass(f, h.modalInClass), b.$on(c.NOW_CLOSING_EVENT, function (b, c) { var d = c(); g ? g(f, { removeClass: h.modalInClass }).start().then(d) : a.removeClass(f, h.modalInClass).then(d) })) } var g = null; return b.has("$animateCss") && (g = b.get("$animateCss")), { replace: !0, templateUrl: "template/modal/backdrop.html", compile: function (a, b) { return a.addClass(b.backdropClass), f } } }]).directive("modalWindow", ["$modalStack", "$q", "$animate", "$injector", "$log", "$modalSuppressWarning", function (a, b, c, d, e, f) { var g = null; return d.has("$animateCss") && (g = d.get("$animateCss")), { scope: { index: "@" }, replace: !0, transclude: !0, templateUrl: function (a, b) { return b.templateUrl || "template/modal/window.html" }, link: function (d, h, i) { f || e.warn("modal-window is now deprecated. Use uib-modal-window instead."), h.addClass(i.windowClass || ""), h.addClass(i.windowTopClass || ""), d.size = i.size, d.close = function (b) { var c = a.getTop(); c && c.value.backdrop && "static" !== c.value.backdrop && b.target === b.currentTarget && (b.preventDefault(), b.stopPropagation(), a.dismiss(c.key, "backdrop click")) }, h.on("click", d.close), d.$isRendered = !0; var j = b.defer(); i.$observe("modalRender", function (a) { "true" == a && j.resolve() }), j.promise.then(function () { var e = null; i.modalInClass && (e = g ? g(h, { addClass: i.modalInClass }).start() : c.addClass(h, i.modalInClass), d.$on(a.NOW_CLOSING_EVENT, function (a, b) { var d = b(); g ? g(h, { removeClass: i.modalInClass }).start().then(d) : c.removeClass(h, i.modalInClass).then(d) })), b.when(e).then(function () { var a = h[0].querySelector("[autofocus]"); a ? a.focus() : h[0].focus() }); var f = a.getTop(); f && a.modalRendered(f.key) }) } } }]).directive("modalAnimationClass", ["$log", "$modalSuppressWarning", function (a, b) { return { compile: function (c, d) { b || a.warn("modal-animation-class is now deprecated. Use uib-modal-animation-class instead."), d.modalAnimation && c.addClass(d.modalAnimationClass) } } }]).directive("modalTransclude", ["$log", "$modalSuppressWarning", function (a, b) {
    return {
        link: function (c, d, e, f, g) {
            b || a.warn("modal-transclude is now deprecated. Use uib-modal-transclude instead."), g(c.$parent, function (a) { d.empty(), d.append(a) })
        }
    }
}]).service("$modalStack", ["$animate", "$timeout", "$document", "$compile", "$rootScope", "$q", "$injector", "$$multiMap", "$$stackedMap", "$uibModalStack", "$log", "$modalSuppressWarning", function (a, b, c, d, e, f, g, h, i, j, k, l) { l || k.warn("$modalStack is now deprecated. Use $uibModalStack instead."), angular.extend(this, j) }]).provider("$modal", ["$uibModalProvider", function (a) { angular.extend(this, a), this.$get = ["$injector", "$log", "$modalSuppressWarning", function (b, c, d) { return d || c.warn("$modal is now deprecated. Use $uibModal instead."), b.invoke(a.$get) }] }]), angular.module("ui.bootstrap.pagination", []).controller("UibPaginationController", ["$scope", "$attrs", "$parse", function (a, b, c) { var d = this, e = { $setViewValue: angular.noop }, f = b.numPages ? c(b.numPages).assign : angular.noop; this.init = function (g, h) { e = g, this.config = h, e.$render = function () { d.render() }, b.itemsPerPage ? a.$parent.$watch(c(b.itemsPerPage), function (b) { d.itemsPerPage = parseInt(b, 10), a.totalPages = d.calculateTotalPages() }) : this.itemsPerPage = h.itemsPerPage, a.$watch("totalItems", function () { a.totalPages = d.calculateTotalPages() }), a.$watch("totalPages", function (b) { f(a.$parent, b), a.page > b ? a.selectPage(b) : e.$render() }) }, this.calculateTotalPages = function () { var b = this.itemsPerPage < 1 ? 1 : Math.ceil(a.totalItems / this.itemsPerPage); return Math.max(b || 0, 1) }, this.render = function () { a.page = parseInt(e.$viewValue, 10) || 1 }, a.selectPage = function (b, c) { c && c.preventDefault(); var d = !a.ngDisabled || !c; d && a.page !== b && b > 0 && b <= a.totalPages && (c && c.target && c.target.blur(), e.$setViewValue(b), e.$render()) }, a.getText = function (b) { return a[b + "Text"] || d.config[b + "Text"] }, a.noPrevious = function () { return 1 === a.page }, a.noNext = function () { return a.page === a.totalPages } }]).constant("uibPaginationConfig", { itemsPerPage: 10, boundaryLinks: !1, directionLinks: !0, firstText: "First", previousText: "Previous", nextText: "Next", lastText: "Last", rotate: !0 }).directive("uibPagination", ["$parse", "uibPaginationConfig", function (a, b) { return { restrict: "EA", scope: { totalItems: "=", firstText: "@", previousText: "@", nextText: "@", lastText: "@", ngDisabled: "=" }, require: ["uibPagination", "?ngModel"], controller: "UibPaginationController", controllerAs: "pagination", templateUrl: function (a, b) { return b.templateUrl || "template/pagination/pagination.html" }, replace: !0, link: function (c, d, e, f) { function g(a, b, c) { return { number: a, text: b, active: c } } function h(a, b) { var c = [], d = 1, e = b, f = angular.isDefined(k) && b > k; f && (l ? (d = Math.max(a - Math.floor(k / 2), 1), e = d + k - 1, e > b && (e = b, d = e - k + 1)) : (d = (Math.ceil(a / k) - 1) * k + 1, e = Math.min(d + k - 1, b))); for (var h = d; e >= h; h++) { var i = g(h, h, h === a); c.push(i) } if (f && !l) { if (d > 1) { var j = g(d - 1, "...", !1); c.unshift(j) } if (b > e) { var m = g(e + 1, "...", !1); c.push(m) } } return c } var i = f[0], j = f[1]; if (j) { var k = angular.isDefined(e.maxSize) ? c.$parent.$eval(e.maxSize) : b.maxSize, l = angular.isDefined(e.rotate) ? c.$parent.$eval(e.rotate) : b.rotate; c.boundaryLinks = angular.isDefined(e.boundaryLinks) ? c.$parent.$eval(e.boundaryLinks) : b.boundaryLinks, c.directionLinks = angular.isDefined(e.directionLinks) ? c.$parent.$eval(e.directionLinks) : b.directionLinks, i.init(j, b), e.maxSize && c.$parent.$watch(a(e.maxSize), function (a) { k = parseInt(a, 10), i.render() }); var m = i.render; i.render = function () { m(), c.page > 0 && c.page <= c.totalPages && (c.pages = h(c.page, c.totalPages)) } } } } }]).constant("uibPagerConfig", { itemsPerPage: 10, previousText: "« Previous", nextText: "Next »", align: !0 }).directive("uibPager", ["uibPagerConfig", function (a) { return { restrict: "EA", scope: { totalItems: "=", previousText: "@", nextText: "@", ngDisabled: "=" }, require: ["uibPager", "?ngModel"], controller: "UibPaginationController", controllerAs: "pagination", templateUrl: function (a, b) { return b.templateUrl || "template/pagination/pager.html" }, replace: !0, link: function (b, c, d, e) { var f = e[0], g = e[1]; g && (b.align = angular.isDefined(d.align) ? b.$parent.$eval(d.align) : a.align, f.init(g, a)) } } }]), angular.module("ui.bootstrap.pagination").value("$paginationSuppressWarning", !1).controller("PaginationController", ["$scope", "$attrs", "$parse", "$log", "$paginationSuppressWarning", function (a, b, c, d, e) { e || d.warn("PaginationController is now deprecated. Use UibPaginationController instead."); var f = this, g = { $setViewValue: angular.noop }, h = b.numPages ? c(b.numPages).assign : angular.noop; this.init = function (d, e) { g = d, this.config = e, g.$render = function () { f.render() }, b.itemsPerPage ? a.$parent.$watch(c(b.itemsPerPage), function (b) { f.itemsPerPage = parseInt(b, 10), a.totalPages = f.calculateTotalPages() }) : this.itemsPerPage = e.itemsPerPage, a.$watch("totalItems", function () { a.totalPages = f.calculateTotalPages() }), a.$watch("totalPages", function (b) { h(a.$parent, b), a.page > b ? a.selectPage(b) : g.$render() }) }, this.calculateTotalPages = function () { var b = this.itemsPerPage < 1 ? 1 : Math.ceil(a.totalItems / this.itemsPerPage); return Math.max(b || 0, 1) }, this.render = function () { a.page = parseInt(g.$viewValue, 10) || 1 }, a.selectPage = function (b, c) { c && c.preventDefault(); var d = !a.ngDisabled || !c; d && a.page !== b && b > 0 && b <= a.totalPages && (c && c.target && c.target.blur(), g.$setViewValue(b), g.$render()) }, a.getText = function (b) { return a[b + "Text"] || f.config[b + "Text"] }, a.noPrevious = function () { return 1 === a.page }, a.noNext = function () { return a.page === a.totalPages } }]).directive("pagination", ["$parse", "uibPaginationConfig", "$log", "$paginationSuppressWarning", function (a, b, c, d) { return { restrict: "EA", scope: { totalItems: "=", firstText: "@", previousText: "@", nextText: "@", lastText: "@", ngDisabled: "=" }, require: ["pagination", "?ngModel"], controller: "PaginationController", controllerAs: "pagination", templateUrl: function (a, b) { return b.templateUrl || "template/pagination/pagination.html" }, replace: !0, link: function (e, f, g, h) { function i(a, b, c) { return { number: a, text: b, active: c } } function j(a, b) { var c = [], d = 1, e = b, f = angular.isDefined(m) && b > m; f && (n ? (d = Math.max(a - Math.floor(m / 2), 1), e = d + m - 1, e > b && (e = b, d = e - m + 1)) : (d = (Math.ceil(a / m) - 1) * m + 1, e = Math.min(d + m - 1, b))); for (var g = d; e >= g; g++) { var h = i(g, g, g === a); c.push(h) } if (f && !n) { if (d > 1) { var j = i(d - 1, "...", !1); c.unshift(j) } if (b > e) { var k = i(e + 1, "...", !1); c.push(k) } } return c } d || c.warn("pagination is now deprecated. Use uib-pagination instead."); var k = h[0], l = h[1]; if (l) { var m = angular.isDefined(g.maxSize) ? e.$parent.$eval(g.maxSize) : b.maxSize, n = angular.isDefined(g.rotate) ? e.$parent.$eval(g.rotate) : b.rotate; e.boundaryLinks = angular.isDefined(g.boundaryLinks) ? e.$parent.$eval(g.boundaryLinks) : b.boundaryLinks, e.directionLinks = angular.isDefined(g.directionLinks) ? e.$parent.$eval(g.directionLinks) : b.directionLinks, k.init(l, b), g.maxSize && e.$parent.$watch(a(g.maxSize), function (a) { m = parseInt(a, 10), k.render() }); var o = k.render; k.render = function () { o(), e.page > 0 && e.page <= e.totalPages && (e.pages = j(e.page, e.totalPages)) } } } } }]).directive("pager", ["uibPagerConfig", "$log", "$paginationSuppressWarning", function (a, b, c) { return { restrict: "EA", scope: { totalItems: "=", previousText: "@", nextText: "@", ngDisabled: "=" }, require: ["pager", "?ngModel"], controller: "PaginationController", controllerAs: "pagination", templateUrl: function (a, b) { return b.templateUrl || "template/pagination/pager.html" }, replace: !0, link: function (d, e, f, g) { c || b.warn("pager is now deprecated. Use uib-pager instead."); var h = g[0], i = g[1]; i && (d.align = angular.isDefined(f.align) ? d.$parent.$eval(f.align) : a.align, h.init(i, a)) } } }]), angular.module("ui.bootstrap.tooltip", ["ui.bootstrap.position", "ui.bootstrap.stackedMap"]).provider("$uibTooltip", function () { function a(a) { var b = /[A-Z]/g, c = "-"; return a.replace(b, function (a, b) { return (b ? c : "") + a.toLowerCase() }) } var b = { placement: "top", animation: !0, popupDelay: 0, popupCloseDelay: 0, useContentExp: !1 }, c = { mouseenter: "mouseleave", click: "click", focus: "blur", none: "" }, d = {}; this.options = function (a) { angular.extend(d, a) }, this.setTriggers = function (a) { angular.extend(c, a) }, this.$get = ["$window", "$compile", "$timeout", "$document", "$uibPosition", "$interpolate", "$rootScope", "$parse", "$$stackedMap", function (e, f, g, h, i, j, k, l, m) { var n = m.createNew(); return h.on("keypress", function (a) { if (27 === a.which) { var b = n.top(); b && (b.value.close(), n.removeTop(), b = null) } }), function (e, k, m, o) { function p(a) { var b = (a || o.trigger || m).split(" "), d = b.map(function (a) { return c[a] || a }); return { show: b, hide: d } } o = angular.extend({}, b, d, o); var q = a(e), r = j.startSymbol(), s = j.endSymbol(), t = "<div " + q + '-popup title="' + r + "title" + s + '" ' + (o.useContentExp ? 'content-exp="contentExp()" ' : 'content="' + r + "content" + s + '" ') + 'placement="' + r + "placement" + s + '" popup-class="' + r + "popupClass" + s + '" animation="animation" is-open="isOpen"origin-scope="origScope" style="visibility: hidden; display: block; top: -9999px; left: -9999px;"></div>'; return { compile: function (a, b) { var c = f(t); return function (a, b, d, f) { function j() { L.isOpen ? q() : m() } function m() { (!K || a.$eval(d[k + "Enable"])) && (u(), x(), L.popupDelay ? F || (F = g(r, L.popupDelay, !1)) : r()) } function q() { s(), L.popupCloseDelay ? G || (G = g(t, L.popupCloseDelay, !1)) : t() } function r() { return s(), u(), L.content ? (v(), void L.$evalAsync(function () { L.isOpen = !0, y(!0), Q() })) : angular.noop } function s() { F && (g.cancel(F), F = null), H && (g.cancel(H), H = null) } function t() { s(), u(), L && L.$evalAsync(function () { L.isOpen = !1, y(!1), L.animation ? E || (E = g(w, 150, !1)) : w() }) } function u() { G && (g.cancel(G), G = null), E && (g.cancel(E), E = null) } function v() { C || (D = L.$new(), C = c(D, function (a) { I ? h.find("body").append(a) : b.after(a) }), z()) } function w() { A(), E = null, C && (C.remove(), C = null), D && (D.$destroy(), D = null) } function x() { L.title = d[k + "Title"], O ? L.content = O(a) : L.content = d[e], L.popupClass = d[k + "Class"], L.placement = angular.isDefined(d[k + "Placement"]) ? d[k + "Placement"] : o.placement; var b = parseInt(d[k + "PopupDelay"], 10), c = parseInt(d[k + "PopupCloseDelay"], 10); L.popupDelay = isNaN(b) ? o.popupDelay : b, L.popupCloseDelay = isNaN(c) ? o.popupCloseDelay : c } function y(b) { N && angular.isFunction(N.assign) && N.assign(a, b) } function z() { P.length = 0, O ? (P.push(a.$watch(O, function (a) { L.content = a, !a && L.isOpen && t() })), P.push(D.$watch(function () { M || (M = !0, D.$$postDigest(function () { M = !1, L && L.isOpen && Q() })) }))) : P.push(d.$observe(e, function (a) { L.content = a, !a && L.isOpen ? t() : Q() })), P.push(d.$observe(k + "Title", function (a) { L.title = a, L.isOpen && Q() })), P.push(d.$observe(k + "Placement", function (a) { L.placement = a ? a : o.placement, L.isOpen && Q() })) } function A() { P.length && (angular.forEach(P, function (a) { a() }), P.length = 0) } function B() { var a = d[k + "Trigger"]; R(), J = p(a), "none" !== J.show && J.show.forEach(function (a, c) { a === J.hide[c] ? b[0].addEventListener(a, j) : a && (b[0].addEventListener(a, m), J.hide[c].split(" ").forEach(function (a) { b[0].addEventListener(a, q) })), b.on("keypress", function (a) { 27 === a.which && q() }) }) } var C, D, E, F, G, H, I = angular.isDefined(o.appendToBody) ? o.appendToBody : !1, J = p(void 0), K = angular.isDefined(d[k + "Enable"]), L = a.$new(!0), M = !1, N = angular.isDefined(d[k + "IsOpen"]) ? l(d[k + "IsOpen"]) : !1, O = o.useContentExp ? l(d[e]) : !1, P = [], Q = function () { C && C.html() && (H || (H = g(function () { C.css({ top: 0, left: 0 }); var a = i.positionElements(b, C, L.placement, I); a.top += "px", a.left += "px", a.visibility = "visible", C.css(a), H = null }, 0, !1))) }; L.origScope = a, L.isOpen = !1, n.add(L, { close: t }), L.contentExp = function () { return L.content }, d.$observe("disabled", function (a) { a && s(), a && L.isOpen && t() }), N && a.$watch(N, function (a) { L && !a === L.isOpen && j() }); var R = function () { J.show.forEach(function (a) { b.unbind(a, m) }), J.hide.forEach(function (a) { a.split(" ").forEach(function (a) { b[0].removeEventListener(a, q) }) }) }; B(); var S = a.$eval(d[k + "Animation"]); L.animation = angular.isDefined(S) ? !!S : o.animation; var T = a.$eval(d[k + "AppendToBody"]); I = angular.isDefined(T) ? T : I, I && a.$on("$locationChangeSuccess", function () { L.isOpen && t() }), a.$on("$destroy", function () { s(), u(), R(), w(), n.remove(L), L = null }) } } } } }] }).directive("uibTooltipTemplateTransclude", ["$animate", "$sce", "$compile", "$templateRequest", function (a, b, c, d) { return { link: function (e, f, g) { var h, i, j, k = e.$eval(g.tooltipTemplateTranscludeScope), l = 0, m = function () { i && (i.remove(), i = null), h && (h.$destroy(), h = null), j && (a.leave(j).then(function () { i = null }), i = j, j = null) }; e.$watch(b.parseAsResourceUrl(g.uibTooltipTemplateTransclude), function (b) { var g = ++l; b ? (d(b, !0).then(function (d) { if (g === l) { var e = k.$new(), i = d, n = c(i)(e, function (b) { m(), a.enter(b, f) }); h = e, j = n, h.$emit("$includeContentLoaded", b) } }, function () { g === l && (m(), e.$emit("$includeContentError", b)) }), e.$emit("$includeContentRequested", b)) : m() }), e.$on("$destroy", m) } } }]).directive("uibTooltipClasses", function () { return { restrict: "A", link: function (a, b, c) { a.placement && b.addClass(a.placement), a.popupClass && b.addClass(a.popupClass), a.animation() && b.addClass(c.tooltipAnimationClass) } } }).directive("uibTooltipPopup", function () { return { replace: !0, scope: { content: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/tooltip/tooltip-popup.html", link: function (a, b) { b.addClass("tooltip") } } }).directive("uibTooltip", ["$uibTooltip", function (a) { return a("uibTooltip", "tooltip", "mouseenter") }]).directive("uibTooltipTemplatePopup", function () { return { replace: !0, scope: { contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&", originScope: "&" }, templateUrl: "template/tooltip/tooltip-template-popup.html", link: function (a, b) { b.addClass("tooltip") } } }).directive("uibTooltipTemplate", ["$uibTooltip", function (a) { return a("uibTooltipTemplate", "tooltip", "mouseenter", { useContentExp: !0 }) }]).directive("uibTooltipHtmlPopup", function () { return { replace: !0, scope: { contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/tooltip/tooltip-html-popup.html", link: function (a, b) { b.addClass("tooltip") } } }).directive("uibTooltipHtml", ["$uibTooltip", function (a) { return a("uibTooltipHtml", "tooltip", "mouseenter", { useContentExp: !0 }) }]), angular.module("ui.bootstrap.tooltip").value("$tooltipSuppressWarning", !1).provider("$tooltip", ["$uibTooltipProvider", function (a) { angular.extend(this, a), this.$get = ["$log", "$tooltipSuppressWarning", "$injector", function (b, c, d) { return c || b.warn("$tooltip is now deprecated. Use $uibTooltip instead."), d.invoke(a.$get) }] }]).directive("tooltipTemplateTransclude", ["$animate", "$sce", "$compile", "$templateRequest", "$log", "$tooltipSuppressWarning", function (a, b, c, d, e, f) { return { link: function (g, h, i) { f || e.warn("tooltip-template-transclude is now deprecated. Use uib-tooltip-template-transclude instead."); var j, k, l, m = g.$eval(i.tooltipTemplateTranscludeScope), n = 0, o = function () { k && (k.remove(), k = null), j && (j.$destroy(), j = null), l && (a.leave(l).then(function () { k = null }), k = l, l = null) }; g.$watch(b.parseAsResourceUrl(i.tooltipTemplateTransclude), function (b) { var e = ++n; b ? (d(b, !0).then(function (d) { if (e === n) { var f = m.$new(), g = d, i = c(g)(f, function (b) { o(), a.enter(b, h) }); j = f, l = i, j.$emit("$includeContentLoaded", b) } }, function () { e === n && (o(), g.$emit("$includeContentError", b)) }), g.$emit("$includeContentRequested", b)) : o() }), g.$on("$destroy", o) } } }]).directive("tooltipClasses", ["$log", "$tooltipSuppressWarning", function (a, b) { return { restrict: "A", link: function (c, d, e) { b || a.warn("tooltip-classes is now deprecated. Use uib-tooltip-classes instead."), c.placement && d.addClass(c.placement), c.popupClass && d.addClass(c.popupClass), c.animation() && d.addClass(e.tooltipAnimationClass) } } }]).directive("tooltipPopup", ["$log", "$tooltipSuppressWarning", function (a, b) { return { replace: !0, scope: { content: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/tooltip/tooltip-popup.html", link: function (c, d) { b || a.warn("tooltip-popup is now deprecated. Use uib-tooltip-popup instead."), d.addClass("tooltip") } } }]).directive("tooltip", ["$tooltip", function (a) { return a("tooltip", "tooltip", "mouseenter") }]).directive("tooltipTemplatePopup", ["$log", "$tooltipSuppressWarning", function (a, b) { return { replace: !0, scope: { contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&", originScope: "&" }, templateUrl: "template/tooltip/tooltip-template-popup.html", link: function (c, d) { b || a.warn("tooltip-template-popup is now deprecated. Use uib-tooltip-template-popup instead."), d.addClass("tooltip") } } }]).directive("tooltipTemplate", ["$tooltip", function (a) { return a("tooltipTemplate", "tooltip", "mouseenter", { useContentExp: !0 }) }]).directive("tooltipHtmlPopup", ["$log", "$tooltipSuppressWarning", function (a, b) { return { replace: !0, scope: { contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/tooltip/tooltip-html-popup.html", link: function (c, d) { b || a.warn("tooltip-html-popup is now deprecated. Use uib-tooltip-html-popup instead."), d.addClass("tooltip") } } }]).directive("tooltipHtml", ["$tooltip", function (a) { return a("tooltipHtml", "tooltip", "mouseenter", { useContentExp: !0 }) }]), angular.module("ui.bootstrap.popover", ["ui.bootstrap.tooltip"]).directive("uibPopoverTemplatePopup", function () { return { replace: !0, scope: { title: "@", contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&", originScope: "&" }, templateUrl: "template/popover/popover-template.html", link: function (a, b) { b.addClass("popover") } } }).directive("uibPopoverTemplate", ["$uibTooltip", function (a) { return a("uibPopoverTemplate", "popover", "click", { useContentExp: !0 }) }]).directive("uibPopoverHtmlPopup", function () { return { replace: !0, scope: { contentExp: "&", title: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/popover/popover-html.html", link: function (a, b) { b.addClass("popover") } } }).directive("uibPopoverHtml", ["$uibTooltip", function (a) { return a("uibPopoverHtml", "popover", "click", { useContentExp: !0 }) }]).directive("uibPopoverPopup", function () { return { replace: !0, scope: { title: "@", content: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/popover/popover.html", link: function (a, b) { b.addClass("popover") } } }).directive("uibPopover", ["$uibTooltip", function (a) { return a("uibPopover", "popover", "click") }]), angular.module("ui.bootstrap.popover").value("$popoverSuppressWarning", !1).directive("popoverTemplatePopup", ["$log", "$popoverSuppressWarning", function (a, b) { return { replace: !0, scope: { title: "@", contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&", originScope: "&" }, templateUrl: "template/popover/popover-template.html", link: function (c, d) { b || a.warn("popover-template-popup is now deprecated. Use uib-popover-template-popup instead."), d.addClass("popover") } } }]).directive("popoverTemplate", ["$tooltip", function (a) { return a("popoverTemplate", "popover", "click", { useContentExp: !0 }) }]).directive("popoverHtmlPopup", ["$log", "$popoverSuppressWarning", function (a, b) { return { replace: !0, scope: { contentExp: "&", title: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/popover/popover-html.html", link: function (c, d) { b || a.warn("popover-html-popup is now deprecated. Use uib-popover-html-popup instead."), d.addClass("popover") } } }]).directive("popoverHtml", ["$tooltip", function (a) { return a("popoverHtml", "popover", "click", { useContentExp: !0 }) }]).directive("popoverPopup", ["$log", "$popoverSuppressWarning", function (a, b) { return { replace: !0, scope: { title: "@", content: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&" }, templateUrl: "template/popover/popover.html", link: function (c, d) { b || a.warn("popover-popup is now deprecated. Use uib-popover-popup instead."), d.addClass("popover") } } }]).directive("popover", ["$tooltip", function (a) { return a("popover", "popover", "click") }]), angular.module("ui.bootstrap.progressbar", []).constant("uibProgressConfig", { animate: !0, max: 100 }).controller("UibProgressController", ["$scope", "$attrs", "uibProgressConfig", function (a, b, c) { var d = this, e = angular.isDefined(b.animate) ? a.$parent.$eval(b.animate) : c.animate; this.bars = [], a.max = angular.isDefined(a.max) ? a.max : c.max, this.addBar = function (b, c, f) { e || c.css({ transition: "none" }), this.bars.push(b), b.max = a.max, b.title = f && angular.isDefined(f.title) ? f.title : "progressbar", b.$watch("value", function (a) { b.recalculatePercentage() }), b.recalculatePercentage = function () { var a = d.bars.reduce(function (a, b) { return b.percent = +(100 * b.value / b.max).toFixed(2), a + b.percent }, 0); a > 100 && (b.percent -= a - 100) }, b.$on("$destroy", function () { c = null, d.removeBar(b) }) }, this.removeBar = function (a) { this.bars.splice(this.bars.indexOf(a), 1), this.bars.forEach(function (a) { a.recalculatePercentage() }) }, a.$watch("max", function (b) { d.bars.forEach(function (b) { b.max = a.max, b.recalculatePercentage() }) }) }]).directive("uibProgress", function () { return { replace: !0, transclude: !0, controller: "UibProgressController", require: "uibProgress", scope: { max: "=?" }, templateUrl: "template/progressbar/progress.html" } }).directive("uibBar", function () { return { replace: !0, transclude: !0, require: "^uibProgress", scope: { value: "=", type: "@" }, templateUrl: "template/progressbar/bar.html", link: function (a, b, c, d) { d.addBar(a, b, c) } } }).directive("uibProgressbar", function () { return { replace: !0, transclude: !0, controller: "UibProgressController", scope: { value: "=", max: "=?", type: "@" }, templateUrl: "template/progressbar/progressbar.html", link: function (a, b, c, d) { d.addBar(a, angular.element(b.children()[0]), { title: c.title }) } } }), angular.module("ui.bootstrap.progressbar").value("$progressSuppressWarning", !1).controller("ProgressController", ["$scope", "$attrs", "uibProgressConfig", "$log", "$progressSuppressWarning", function (a, b, c, d, e) { e || d.warn("ProgressController is now deprecated. Use UibProgressController instead."); var f = this, g = angular.isDefined(b.animate) ? a.$parent.$eval(b.animate) : c.animate; this.bars = [], a.max = angular.isDefined(a.max) ? a.max : c.max, this.addBar = function (b, c, d) { g || c.css({ transition: "none" }), this.bars.push(b), b.max = a.max, b.title = d && angular.isDefined(d.title) ? d.title : "progressbar", b.$watch("value", function (a) { b.recalculatePercentage() }), b.recalculatePercentage = function () { b.percent = +(100 * b.value / b.max).toFixed(2); var a = f.bars.reduce(function (a, b) { return a + b.percent }, 0); a > 100 && (b.percent -= a - 100) }, b.$on("$destroy", function () { c = null, f.removeBar(b) }) }, this.removeBar = function (a) { this.bars.splice(this.bars.indexOf(a), 1) }, a.$watch("max", function (b) { f.bars.forEach(function (b) { b.max = a.max, b.recalculatePercentage() }) }) }]).directive("progress", ["$log", "$progressSuppressWarning", function (a, b) { return { replace: !0, transclude: !0, controller: "ProgressController", require: "progress", scope: { max: "=?", title: "@?" }, templateUrl: "template/progressbar/progress.html", link: function () { b || a.warn("progress is now deprecated. Use uib-progress instead.") } } }]).directive("bar", ["$log", "$progressSuppressWarning", function (a, b) { return { replace: !0, transclude: !0, require: "^progress", scope: { value: "=", type: "@" }, templateUrl: "template/progressbar/bar.html", link: function (c, d, e, f) { b || a.warn("bar is now deprecated. Use uib-bar instead."), f.addBar(c, d) } } }]).directive("progressbar", ["$log", "$progressSuppressWarning", function (a, b) { return { replace: !0, transclude: !0, controller: "ProgressController", scope: { value: "=", max: "=?", type: "@" }, templateUrl: "template/progressbar/progressbar.html", link: function (c, d, e, f) { b || a.warn("progressbar is now deprecated. Use uib-progressbar instead."), f.addBar(c, angular.element(d.children()[0]), { title: e.title }) } } }]), angular.module("ui.bootstrap.rating", []).constant("uibRatingConfig", { max: 5, stateOn: null, stateOff: null, titles: ["one", "two", "three", "four", "five"] }).controller("UibRatingController", ["$scope", "$attrs", "uibRatingConfig", function (a, b, c) { var d = { $setViewValue: angular.noop }; this.init = function (e) { d = e, d.$render = this.render, d.$formatters.push(function (a) { return angular.isNumber(a) && a << 0 !== a && (a = Math.round(a)), a }), this.stateOn = angular.isDefined(b.stateOn) ? a.$parent.$eval(b.stateOn) : c.stateOn, this.stateOff = angular.isDefined(b.stateOff) ? a.$parent.$eval(b.stateOff) : c.stateOff; var f = angular.isDefined(b.titles) ? a.$parent.$eval(b.titles) : c.titles; this.titles = angular.isArray(f) && f.length > 0 ? f : c.titles; var g = angular.isDefined(b.ratingStates) ? a.$parent.$eval(b.ratingStates) : new Array(angular.isDefined(b.max) ? a.$parent.$eval(b.max) : c.max); a.range = this.buildTemplateObjects(g) }, this.buildTemplateObjects = function (a) { for (var b = 0, c = a.length; c > b; b++) a[b] = angular.extend({ index: b }, { stateOn: this.stateOn, stateOff: this.stateOff, title: this.getTitle(b) }, a[b]); return a }, this.getTitle = function (a) { return a >= this.titles.length ? a + 1 : this.titles[a] }, a.rate = function (b) { !a.readonly && b >= 0 && b <= a.range.length && (d.$setViewValue(d.$viewValue === b ? 0 : b), d.$render()) }, a.enter = function (b) { a.readonly || (a.value = b), a.onHover({ value: b }) }, a.reset = function () { a.value = d.$viewValue, a.onLeave() }, a.onKeydown = function (b) { /(37|38|39|40)/.test(b.which) && (b.preventDefault(), b.stopPropagation(), a.rate(a.value + (38 === b.which || 39 === b.which ? 1 : -1))) }, this.render = function () { a.value = d.$viewValue } }]).directive("uibRating", function () { return { require: ["uibRating", "ngModel"], scope: { readonly: "=?", onHover: "&", onLeave: "&" }, controller: "UibRatingController", templateUrl: "template/rating/rating.html", replace: !0, link: function (a, b, c, d) { var e = d[0], f = d[1]; e.init(f) } } }), angular.module("ui.bootstrap.rating").value("$ratingSuppressWarning", !1).controller("RatingController", ["$scope", "$attrs", "$controller", "$log", "$ratingSuppressWarning", function (a, b, c, d, e) { e || d.warn("RatingController is now deprecated. Use UibRatingController instead."), angular.extend(this, c("UibRatingController", { $scope: a, $attrs: b })) }]).directive("rating", ["$log", "$ratingSuppressWarning", function (a, b) { return { require: ["rating", "ngModel"], scope: { readonly: "=?", onHover: "&", onLeave: "&" }, controller: "RatingController", templateUrl: "template/rating/rating.html", replace: !0, link: function (c, d, e, f) { b || a.warn("rating is now deprecated. Use uib-rating instead."); var g = f[0], h = f[1]; g.init(h) } } }]), angular.module("ui.bootstrap.tabs", []).controller("UibTabsetController", ["$scope", function (a) { var b = this, c = b.tabs = a.tabs = []; b.select = function (a) { angular.forEach(c, function (b) { b.active && b !== a && (b.active = !1, b.onDeselect(), a.selectCalled = !1) }), a.active = !0, a.selectCalled || (a.onSelect(), a.selectCalled = !0) }, b.addTab = function (a) { c.push(a), 1 === c.length && a.active !== !1 ? a.active = !0 : a.active ? b.select(a) : a.active = !1 }, b.removeTab = function (a) { var e = c.indexOf(a); if (a.active && c.length > 1 && !d) { var f = e == c.length - 1 ? e - 1 : e + 1; b.select(c[f]) } c.splice(e, 1) }; var d; a.$on("$destroy", function () { d = !0 }) }]).directive("uibTabset", function () { return { restrict: "EA", transclude: !0, replace: !0, scope: { type: "@" }, controller: "UibTabsetController", templateUrl: "template/tabs/tabset.html", link: function (a, b, c) { a.vertical = angular.isDefined(c.vertical) ? a.$parent.$eval(c.vertical) : !1, a.justified = angular.isDefined(c.justified) ? a.$parent.$eval(c.justified) : !1 } } }).directive("uibTab", ["$parse", function (a) { return { require: "^uibTabset", restrict: "EA", replace: !0, templateUrl: "template/tabs/tab.html", transclude: !0, scope: { active: "=?", heading: "@", onSelect: "&select", onDeselect: "&deselect" }, controller: function () { }, link: function (b, c, d, e, f) { b.$watch("active", function (a) { a && e.select(b) }), b.disabled = !1, d.disable && b.$parent.$watch(a(d.disable), function (a) { b.disabled = !!a }), b.select = function () { b.disabled || (b.active = !0) }, e.addTab(b), b.$on("$destroy", function () { e.removeTab(b) }), b.$transcludeFn = f } } }]).directive("uibTabHeadingTransclude", function () { return { restrict: "A", require: ["?^uibTab", "?^tab"], link: function (a, b) { a.$watch("headingElement", function (a) { a && (b.html(""), b.append(a)) }) } } }).directive("uibTabContentTransclude", function () { function a(a) { return a.tagName && (a.hasAttribute("tab-heading") || a.hasAttribute("data-tab-heading") || a.hasAttribute("x-tab-heading") || a.hasAttribute("uib-tab-heading") || a.hasAttribute("data-uib-tab-heading") || a.hasAttribute("x-uib-tab-heading") || "tab-heading" === a.tagName.toLowerCase() || "data-tab-heading" === a.tagName.toLowerCase() || "x-tab-heading" === a.tagName.toLowerCase() || "uib-tab-heading" === a.tagName.toLowerCase() || "data-uib-tab-heading" === a.tagName.toLowerCase() || "x-uib-tab-heading" === a.tagName.toLowerCase()) } return { restrict: "A", require: ["?^uibTabset", "?^tabset"], link: function (b, c, d) { var e = b.$eval(d.uibTabContentTransclude); e.$transcludeFn(e.$parent, function (b) { angular.forEach(b, function (b) { a(b) ? e.headingElement = b : c.append(b) }) }) } } }), angular.module("ui.bootstrap.tabs").value("$tabsSuppressWarning", !1).controller("TabsetController", ["$scope", "$controller", "$log", "$tabsSuppressWarning", function (a, b, c, d) { d || c.warn("TabsetController is now deprecated. Use UibTabsetController instead."), angular.extend(this, b("UibTabsetController", { $scope: a })) }]).directive("tabset", ["$log", "$tabsSuppressWarning", function (a, b) { return { restrict: "EA", transclude: !0, replace: !0, scope: { type: "@" }, controller: "TabsetController", templateUrl: "template/tabs/tabset.html", link: function (c, d, e) { b || a.warn("tabset is now deprecated. Use uib-tabset instead."), c.vertical = angular.isDefined(e.vertical) ? c.$parent.$eval(e.vertical) : !1, c.justified = angular.isDefined(e.justified) ? c.$parent.$eval(e.justified) : !1 } } }]).directive("tab", ["$parse", "$log", "$tabsSuppressWarning", function (a, b, c) { return { require: "^tabset", restrict: "EA", replace: !0, templateUrl: "template/tabs/tab.html", transclude: !0, scope: { active: "=?", heading: "@", onSelect: "&select", onDeselect: "&deselect" }, controller: function () { }, link: function (d, e, f, g, h) { c || b.warn("tab is now deprecated. Use uib-tab instead."), d.$watch("active", function (a) { a && g.select(d) }), d.disabled = !1, f.disable && d.$parent.$watch(a(f.disable), function (a) { d.disabled = !!a }), d.select = function () { d.disabled || (d.active = !0) }, g.addTab(d), d.$on("$destroy", function () { g.removeTab(d) }), d.$transcludeFn = h } } }]).directive("tabHeadingTransclude", ["$log", "$tabsSuppressWarning", function (a, b) { return { restrict: "A", require: "^tab", link: function (c, d) { b || a.warn("tab-heading-transclude is now deprecated. Use uib-tab-heading-transclude instead."), c.$watch("headingElement", function (a) { a && (d.html(""), d.append(a)) }) } } }]).directive("tabContentTransclude", ["$log", "$tabsSuppressWarning", function (a, b) { function c(a) { return a.tagName && (a.hasAttribute("tab-heading") || a.hasAttribute("data-tab-heading") || a.hasAttribute("x-tab-heading") || "tab-heading" === a.tagName.toLowerCase() || "data-tab-heading" === a.tagName.toLowerCase() || "x-tab-heading" === a.tagName.toLowerCase()) } return { restrict: "A", require: "^tabset", link: function (d, e, f) { b || a.warn("tab-content-transclude is now deprecated. Use uib-tab-content-transclude instead."); var g = d.$eval(f.tabContentTransclude); g.$transcludeFn(g.$parent, function (a) { angular.forEach(a, function (a) { c(a) ? g.headingElement = a : e.append(a) }) }) } } }]), angular.module("ui.bootstrap.timepicker", []).constant("uibTimepickerConfig", { hourStep: 1, minuteStep: 1, showMeridian: !0, meridians: null, readonlyInput: !1, mousewheel: !0, arrowkeys: !0, showSpinners: !0 }).controller("UibTimepickerController", ["$scope", "$element", "$attrs", "$parse", "$log", "$locale", "uibTimepickerConfig", function (a, b, c, d, e, f, g) {
    function h() { var b = parseInt(a.hours, 10), c = a.showMeridian ? b > 0 && 13 > b : b >= 0 && 24 > b; return c ? (a.showMeridian && (12 === b && (b = 0), a.meridian === r[1] && (b += 12)), b) : void 0 } function i() { var b = parseInt(a.minutes, 10); return b >= 0 && 60 > b ? b : void 0 } function j(a) { return angular.isDefined(a) && a.toString().length < 2 ? "0" + a : a.toString() } function k(a) { l(), q.$setViewValue(new Date(p)), m(a) } function l() { q.$setValidity("time", !0), a.invalidHours = !1, a.invalidMinutes = !1 } function m(b) { var c = p.getHours(), d = p.getMinutes(); a.showMeridian && (c = 0 === c || 12 === c ? 12 : c % 12), a.hours = "h" === b ? c : j(c), "m" !== b && (a.minutes = j(d)), a.meridian = p.getHours() < 12 ? r[0] : r[1] } function n(a, b) { var c = new Date(a.getTime() + 6e4 * b), d = new Date(a); return d.setHours(c.getHours(), c.getMinutes()), d } function o(a) { p = n(p, a), k() } var p = new Date, q = { $setViewValue: angular.noop }, r = angular.isDefined(c.meridians) ? a.$parent.$eval(c.meridians) : g.meridians || f.DATETIME_FORMATS.AMPMS; a.tabindex = angular.isDefined(c.tabindex) ? c.tabindex : 0, b.removeAttr("tabindex"), this.init = function (b, d) { q = b, q.$render = this.render, q.$formatters.unshift(function (a) { return a ? new Date(a) : null }); var e = d.eq(0), f = d.eq(1), h = angular.isDefined(c.mousewheel) ? a.$parent.$eval(c.mousewheel) : g.mousewheel; h && this.setupMousewheelEvents(e, f); var i = angular.isDefined(c.arrowkeys) ? a.$parent.$eval(c.arrowkeys) : g.arrowkeys; i && this.setupArrowkeyEvents(e, f), a.readonlyInput = angular.isDefined(c.readonlyInput) ? a.$parent.$eval(c.readonlyInput) : g.readonlyInput, this.setupInputEvents(e, f) }; var s = g.hourStep; c.hourStep && a.$parent.$watch(d(c.hourStep), function (a) { s = parseInt(a, 10) }); var t = g.minuteStep; c.minuteStep && a.$parent.$watch(d(c.minuteStep), function (a) { t = parseInt(a, 10) }); var u; a.$parent.$watch(d(c.min), function (a) { var b = new Date(a); u = isNaN(b) ? void 0 : b }); var v; a.$parent.$watch(d(c.max), function (a) { var b = new Date(a); v = isNaN(b) ? void 0 : b }), a.noIncrementHours = function () {
        var a = n(p, 60 * s);
        return a > v || p > a && u > a
    }, a.noDecrementHours = function () { var a = n(p, 60 * -s); return u > a || a > p && a > v }, a.noIncrementMinutes = function () { var a = n(p, t); return a > v || p > a && u > a }, a.noDecrementMinutes = function () { var a = n(p, -t); return u > a || a > p && a > v }, a.noToggleMeridian = function () { return p.getHours() < 13 ? n(p, 720) > v : n(p, -720) < u }, a.showMeridian = g.showMeridian, c.showMeridian && a.$parent.$watch(d(c.showMeridian), function (b) { if (a.showMeridian = !!b, q.$error.time) { var c = h(), d = i(); angular.isDefined(c) && angular.isDefined(d) && (p.setHours(c), k()) } else m() }), this.setupMousewheelEvents = function (b, c) { var d = function (a) { a.originalEvent && (a = a.originalEvent); var b = a.wheelDelta ? a.wheelDelta : -a.deltaY; return a.detail || b > 0 }; b.bind("mousewheel wheel", function (b) { a.$apply(d(b) ? a.incrementHours() : a.decrementHours()), b.preventDefault() }), c.bind("mousewheel wheel", function (b) { a.$apply(d(b) ? a.incrementMinutes() : a.decrementMinutes()), b.preventDefault() }) }, this.setupArrowkeyEvents = function (b, c) { b.bind("keydown", function (b) { 38 === b.which ? (b.preventDefault(), a.incrementHours(), a.$apply()) : 40 === b.which && (b.preventDefault(), a.decrementHours(), a.$apply()) }), c.bind("keydown", function (b) { 38 === b.which ? (b.preventDefault(), a.incrementMinutes(), a.$apply()) : 40 === b.which && (b.preventDefault(), a.decrementMinutes(), a.$apply()) }) }, this.setupInputEvents = function (b, c) { if (a.readonlyInput) return a.updateHours = angular.noop, void (a.updateMinutes = angular.noop); var d = function (b, c) { q.$setViewValue(null), q.$setValidity("time", !1), angular.isDefined(b) && (a.invalidHours = b), angular.isDefined(c) && (a.invalidMinutes = c) }; a.updateHours = function () { var a = h(), b = i(); angular.isDefined(a) && angular.isDefined(b) ? (p.setHours(a), u > p || p > v ? d(!0) : k("h")) : d(!0) }, b.bind("blur", function (b) { !a.invalidHours && a.hours < 10 && a.$apply(function () { a.hours = j(a.hours) }) }), a.updateMinutes = function () { var a = i(), b = h(); angular.isDefined(a) && angular.isDefined(b) ? (p.setMinutes(a), u > p || p > v ? d(void 0, !0) : k("m")) : d(void 0, !0) }, c.bind("blur", function (b) { !a.invalidMinutes && a.minutes < 10 && a.$apply(function () { a.minutes = j(a.minutes) }) }) }, this.render = function () { var b = q.$viewValue; isNaN(b) ? (q.$setValidity("time", !1), e.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')) : (b && (p = b), u > p || p > v ? (q.$setValidity("time", !1), a.invalidHours = !0, a.invalidMinutes = !0) : l(), m()) }, a.showSpinners = angular.isDefined(c.showSpinners) ? a.$parent.$eval(c.showSpinners) : g.showSpinners, a.incrementHours = function () { a.noIncrementHours() || o(60 * s) }, a.decrementHours = function () { a.noDecrementHours() || o(60 * -s) }, a.incrementMinutes = function () { a.noIncrementMinutes() || o(t) }, a.decrementMinutes = function () { a.noDecrementMinutes() || o(-t) }, a.toggleMeridian = function () { a.noToggleMeridian() || o(720 * (p.getHours() < 12 ? 1 : -1)) }
}]).directive("uibTimepicker", function () { return { restrict: "EA", require: ["uibTimepicker", "?^ngModel"], controller: "UibTimepickerController", controllerAs: "timepicker", replace: !0, scope: {}, templateUrl: function (a, b) { return b.templateUrl || "template/timepicker/timepicker.html" }, link: function (a, b, c, d) { var e = d[0], f = d[1]; f && e.init(f, b.find("input")) } } }), angular.module("ui.bootstrap.timepicker").value("$timepickerSuppressWarning", !1).controller("TimepickerController", ["$scope", "$element", "$attrs", "$controller", "$log", "$timepickerSuppressWarning", function (a, b, c, d, e, f) { f || e.warn("TimepickerController is now deprecated. Use UibTimepickerController instead."), angular.extend(this, d("UibTimepickerController", { $scope: a, $element: b, $attrs: c })) }]).directive("timepicker", ["$log", "$timepickerSuppressWarning", function (a, b) { return { restrict: "EA", require: ["timepicker", "?^ngModel"], controller: "TimepickerController", controllerAs: "timepicker", replace: !0, scope: {}, templateUrl: function (a, b) { return b.templateUrl || "template/timepicker/timepicker.html" }, link: function (c, d, e, f) { b || a.warn("timepicker is now deprecated. Use uib-timepicker instead."); var g = f[0], h = f[1]; h && g.init(h, d.find("input")) } } }]), angular.module("ui.bootstrap.typeahead", ["ui.bootstrap.position"]).factory("uibTypeaheadParser", ["$parse", function (a) { var b = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/; return { parse: function (c) { var d = c.match(b); if (!d) throw new Error('Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_" but got "' + c + '".'); return { itemName: d[3], source: a(d[4]), viewMapper: a(d[2] || d[1]), modelMapper: a(d[1]) } } } }]).controller("UibTypeaheadController", ["$scope", "$element", "$attrs", "$compile", "$parse", "$q", "$timeout", "$document", "$window", "$rootScope", "$uibPosition", "uibTypeaheadParser", function (a, b, c, d, e, f, g, h, i, j, k, l) { function m() { K.moveInProgress || (K.moveInProgress = !0, K.$digest()), S && g.cancel(S), S = g(function () { K.matches.length && n(), K.moveInProgress = !1 }, r) } function n() { K.position = C ? k.offset(b) : k.position(b), K.position.top += b.prop("offsetHeight") } var o, p, q = [9, 13, 27, 38, 40], r = 200, s = a.$eval(c.typeaheadMinLength); s || 0 === s || (s = 1); var t, u, v = a.$eval(c.typeaheadWaitMs) || 0, w = a.$eval(c.typeaheadEditable) !== !1, x = e(c.typeaheadLoading).assign || angular.noop, y = e(c.typeaheadOnSelect), z = angular.isDefined(c.typeaheadSelectOnBlur) ? a.$eval(c.typeaheadSelectOnBlur) : !1, A = e(c.typeaheadNoResults).assign || angular.noop, B = c.typeaheadInputFormatter ? e(c.typeaheadInputFormatter) : void 0, C = c.typeaheadAppendToBody ? a.$eval(c.typeaheadAppendToBody) : !1, D = c.typeaheadAppendToElementId || !1, E = a.$eval(c.typeaheadFocusFirst) !== !1, F = c.typeaheadSelectOnExact ? a.$eval(c.typeaheadSelectOnExact) : !1, G = e(c.ngModel), H = e(c.ngModel + "($$$p)"), I = function (b, c) { return angular.isFunction(G(a)) && p && p.$options && p.$options.getterSetter ? H(b, { $$$p: c }) : G.assign(b, c) }, J = l.parse(c.uibTypeahead), K = a.$new(), L = a.$on("$destroy", function () { K.$destroy() }); K.$on("$destroy", L); var M = "typeahead-" + K.$id + "-" + Math.floor(1e4 * Math.random()); b.attr({ "aria-autocomplete": "list", "aria-expanded": !1, "aria-owns": M }); var N = angular.element("<div uib-typeahead-popup></div>"); N.attr({ id: M, matches: "matches", active: "activeIdx", select: "select(activeIdx)", "move-in-progress": "moveInProgress", query: "query", position: "position" }), angular.isDefined(c.typeaheadTemplateUrl) && N.attr("template-url", c.typeaheadTemplateUrl), angular.isDefined(c.typeaheadPopupTemplateUrl) && N.attr("popup-template-url", c.typeaheadPopupTemplateUrl); var O = function () { K.matches = [], K.activeIdx = -1, b.attr("aria-expanded", !1) }, P = function (a) { return M + "-option-" + a }; K.$watch("activeIdx", function (a) { 0 > a ? b.removeAttr("aria-activedescendant") : b.attr("aria-activedescendant", P(a)) }); var Q = function (a, b) { return K.matches.length > b && a ? a.toUpperCase() === K.matches[b].label.toUpperCase() : !1 }, R = function (c) { var d = { $viewValue: c }; x(a, !0), A(a, !1), f.when(J.source(a, d)).then(function (e) { var f = c === o.$viewValue; if (f && t) if (e && e.length > 0) { K.activeIdx = E ? 0 : -1, A(a, !1), K.matches.length = 0; for (var g = 0; g < e.length; g++) d[J.itemName] = e[g], K.matches.push({ id: P(g), label: J.viewMapper(K, d), model: e[g] }); K.query = c, n(), b.attr("aria-expanded", !0), F && 1 === K.matches.length && Q(c, 0) && K.select(0) } else O(), A(a, !0); f && x(a, !1) }, function () { O(), x(a, !1), A(a, !0) }) }; C && (angular.element(i).bind("resize", m), h.find("body").bind("scroll", m)); var S; K.moveInProgress = !1, K.query = void 0; var T, U = function (a) { T = g(function () { R(a) }, v) }, V = function () { T && g.cancel(T) }; O(), K.select = function (d) { var e, f, h = {}; u = !0, h[J.itemName] = f = K.matches[d].model, e = J.modelMapper(a, h), I(a, e), o.$setValidity("editable", !0), o.$setValidity("parse", !0), y(a, { $item: f, $model: e, $label: J.viewMapper(a, h) }), O(), K.$eval(c.typeaheadFocusOnSelect) !== !1 && g(function () { b[0].focus() }, 0, !1) }, b.bind("keydown", function (a) { if (0 !== K.matches.length && -1 !== q.indexOf(a.which)) { if (-1 === K.activeIdx && (9 === a.which || 13 === a.which)) return O(), void K.$digest(); a.preventDefault(), 40 === a.which ? (K.activeIdx = (K.activeIdx + 1) % K.matches.length, K.$digest()) : 38 === a.which ? (K.activeIdx = (K.activeIdx > 0 ? K.activeIdx : K.matches.length) - 1, K.$digest()) : 13 === a.which || 9 === a.which ? K.$apply(function () { K.select(K.activeIdx) }) : 27 === a.which && (a.stopPropagation(), O(), K.$digest()) } }), b.bind("blur", function () { z && K.matches.length && -1 !== K.activeIdx && !u && (u = !0, K.$apply(function () { K.select(K.activeIdx) })), t = !1, u = !1 }); var W = function (a) { b[0] !== a.target && 3 !== a.which && 0 !== K.matches.length && (O(), j.$$phase || K.$digest()) }; h.bind("click", W), a.$on("$destroy", function () { h.unbind("click", W), (C || D) && X.remove(), C && (angular.element(i).unbind("resize", m), h.find("body").unbind("scroll", m)), N.remove() }); var X = d(N)(K); C ? h.find("body").append(X) : D !== !1 ? angular.element(h[0].getElementById(D)).append(X) : b.after(X), this.init = function (b, c) { o = b, p = c, o.$parsers.unshift(function (b) { return t = !0, 0 === s || b && b.length >= s ? v > 0 ? (V(), U(b)) : R(b) : (x(a, !1), V(), O()), w ? b : b ? void o.$setValidity("editable", !1) : (o.$setValidity("editable", !0), null) }), o.$formatters.push(function (b) { var c, d, e = {}; return w || o.$setValidity("editable", !0), B ? (e.$model = b, B(a, e)) : (e[J.itemName] = b, c = J.viewMapper(a, e), e[J.itemName] = void 0, d = J.viewMapper(a, e), c !== d ? c : b) }) } }]).directive("uibTypeahead", function () { return { controller: "UibTypeaheadController", require: ["ngModel", "^?ngModelOptions", "uibTypeahead"], link: function (a, b, c, d) { d[2].init(d[0], d[1]) } } }).directive("uibTypeaheadPopup", function () { return { scope: { matches: "=", query: "=", active: "=", position: "&", moveInProgress: "=", select: "&" }, replace: !0, templateUrl: function (a, b) { return b.popupTemplateUrl || "template/typeahead/typeahead-popup.html" }, link: function (a, b, c) { a.templateUrl = c.templateUrl, a.isOpen = function () { return a.matches.length > 0 }, a.isActive = function (b) { return a.active == b }, a.selectActive = function (b) { a.active = b }, a.selectMatch = function (b) { a.select({ activeIdx: b }) } } } }).directive("uibTypeaheadMatch", ["$templateRequest", "$compile", "$parse", function (a, b, c) { return { scope: { index: "=", match: "=", query: "=" }, link: function (d, e, f) { var g = c(f.templateUrl)(d.$parent) || "template/typeahead/typeahead-match.html"; a(g).then(function (a) { b(a.trim())(d, function (a) { e.replaceWith(a) }) }) } } }]).filter("uibTypeaheadHighlight", ["$sce", "$injector", "$log", function (a, b, c) { function d(a) { return a.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1") } function e(a) { return /<.*>/g.test(a) } var f; return f = b.has("$sanitize"), function (b, g) { return !f && e(b) && c.warn("Unsafe use of typeahead please use ngSanitize"), b = g ? ("" + b).replace(new RegExp(d(g), "gi"), "<strong>$&</strong>") : b, f || (b = a.trustAsHtml(b)), b } }]), angular.module("ui.bootstrap.typeahead").value("$typeaheadSuppressWarning", !1).service("typeaheadParser", ["$parse", "uibTypeaheadParser", "$log", "$typeaheadSuppressWarning", function (a, b, c, d) { return d || c.warn("typeaheadParser is now deprecated. Use uibTypeaheadParser instead."), b }]).directive("typeahead", ["$compile", "$parse", "$q", "$timeout", "$document", "$window", "$rootScope", "$uibPosition", "typeaheadParser", "$log", "$typeaheadSuppressWarning", function (a, b, c, d, e, f, g, h, i, j, k) { var l = [9, 13, 27, 38, 40], m = 200; return { require: ["ngModel", "^?ngModelOptions"], link: function (n, o, p, q) { function r() { N.moveInProgress || (N.moveInProgress = !0, N.$digest()), V && d.cancel(V), V = d(function () { N.matches.length && s(), N.moveInProgress = !1 }, m) } function s() { N.position = F ? h.offset(o) : h.position(o), N.position.top += o.prop("offsetHeight") } k || j.warn("typeahead is now deprecated. Use uib-typeahead instead."); var t = q[0], u = q[1], v = n.$eval(p.typeaheadMinLength); v || 0 === v || (v = 1); var w, x, y = n.$eval(p.typeaheadWaitMs) || 0, z = n.$eval(p.typeaheadEditable) !== !1, A = b(p.typeaheadLoading).assign || angular.noop, B = b(p.typeaheadOnSelect), C = angular.isDefined(p.typeaheadSelectOnBlur) ? n.$eval(p.typeaheadSelectOnBlur) : !1, D = b(p.typeaheadNoResults).assign || angular.noop, E = p.typeaheadInputFormatter ? b(p.typeaheadInputFormatter) : void 0, F = p.typeaheadAppendToBody ? n.$eval(p.typeaheadAppendToBody) : !1, G = p.typeaheadAppendToElementId || !1, H = n.$eval(p.typeaheadFocusFirst) !== !1, I = p.typeaheadSelectOnExact ? n.$eval(p.typeaheadSelectOnExact) : !1, J = b(p.ngModel), K = b(p.ngModel + "($$$p)"), L = function (a, b) { return angular.isFunction(J(n)) && u && u.$options && u.$options.getterSetter ? K(a, { $$$p: b }) : J.assign(a, b) }, M = i.parse(p.typeahead), N = n.$new(), O = n.$on("$destroy", function () { N.$destroy() }); N.$on("$destroy", O); var P = "typeahead-" + N.$id + "-" + Math.floor(1e4 * Math.random()); o.attr({ "aria-autocomplete": "list", "aria-expanded": !1, "aria-owns": P }); var Q = angular.element("<div typeahead-popup></div>"); Q.attr({ id: P, matches: "matches", active: "activeIdx", select: "select(activeIdx)", "move-in-progress": "moveInProgress", query: "query", position: "position" }), angular.isDefined(p.typeaheadTemplateUrl) && Q.attr("template-url", p.typeaheadTemplateUrl), angular.isDefined(p.typeaheadPopupTemplateUrl) && Q.attr("popup-template-url", p.typeaheadPopupTemplateUrl); var R = function () { N.matches = [], N.activeIdx = -1, o.attr("aria-expanded", !1) }, S = function (a) { return P + "-option-" + a }; N.$watch("activeIdx", function (a) { 0 > a ? o.removeAttr("aria-activedescendant") : o.attr("aria-activedescendant", S(a)) }); var T = function (a, b) { return N.matches.length > b && a ? a.toUpperCase() === N.matches[b].label.toUpperCase() : !1 }, U = function (a) { var b = { $viewValue: a }; A(n, !0), D(n, !1), c.when(M.source(n, b)).then(function (c) { var d = a === t.$viewValue; if (d && w) if (c && c.length > 0) { N.activeIdx = H ? 0 : -1, D(n, !1), N.matches.length = 0; for (var e = 0; e < c.length; e++) b[M.itemName] = c[e], N.matches.push({ id: S(e), label: M.viewMapper(N, b), model: c[e] }); N.query = a, s(), o.attr("aria-expanded", !0), I && 1 === N.matches.length && T(a, 0) && N.select(0) } else R(), D(n, !0); d && A(n, !1) }, function () { R(), A(n, !1), D(n, !0) }) }; F && (angular.element(f).bind("resize", r), e.find("body").bind("scroll", r)); var V; N.moveInProgress = !1, R(), N.query = void 0; var W, X = function (a) { W = d(function () { U(a) }, y) }, Y = function () { W && d.cancel(W) }; t.$parsers.unshift(function (a) { return w = !0, 0 === v || a && a.length >= v ? y > 0 ? (Y(), X(a)) : U(a) : (A(n, !1), Y(), R()), z ? a : a ? void t.$setValidity("editable", !1) : (t.$setValidity("editable", !0), null) }), t.$formatters.push(function (a) { var b, c, d = {}; return z || t.$setValidity("editable", !0), E ? (d.$model = a, E(n, d)) : (d[M.itemName] = a, b = M.viewMapper(n, d), d[M.itemName] = void 0, c = M.viewMapper(n, d), b !== c ? b : a) }), N.select = function (a) { var b, c, e = {}; x = !0, e[M.itemName] = c = N.matches[a].model, b = M.modelMapper(n, e), L(n, b), t.$setValidity("editable", !0), t.$setValidity("parse", !0), B(n, { $item: c, $model: b, $label: M.viewMapper(n, e) }), R(), N.$eval(p.typeaheadFocusOnSelect) !== !1 && d(function () { o[0].focus() }, 0, !1) }, o.bind("keydown", function (a) { if (0 !== N.matches.length && -1 !== l.indexOf(a.which)) { if (-1 === N.activeIdx && (9 === a.which || 13 === a.which)) return R(), void N.$digest(); a.preventDefault(), 40 === a.which ? (N.activeIdx = (N.activeIdx + 1) % N.matches.length, N.$digest()) : 38 === a.which ? (N.activeIdx = (N.activeIdx > 0 ? N.activeIdx : N.matches.length) - 1, N.$digest()) : 13 === a.which || 9 === a.which ? N.$apply(function () { N.select(N.activeIdx) }) : 27 === a.which && (a.stopPropagation(), R(), N.$digest()) } }), o.bind("blur", function () { C && N.matches.length && -1 !== N.activeIdx && !x && (x = !0, N.$apply(function () { N.select(N.activeIdx) })), w = !1, x = !1 }); var Z = function (a) { o[0] !== a.target && 3 !== a.which && 0 !== N.matches.length && (R(), g.$$phase || N.$digest()) }; e.bind("click", Z), n.$on("$destroy", function () { e.unbind("click", Z), (F || G) && $.remove(), F && (angular.element(f).unbind("resize", r), e.find("body").unbind("scroll", r)), Q.remove() }); var $ = a(Q)(N); F ? e.find("body").append($) : G !== !1 ? angular.element(e[0].getElementById(G)).append($) : o.after($) } } }]).directive("typeaheadPopup", ["$typeaheadSuppressWarning", "$log", function (a, b) { return { scope: { matches: "=", query: "=", active: "=", position: "&", moveInProgress: "=", select: "&" }, replace: !0, templateUrl: function (a, b) { return b.popupTemplateUrl || "template/typeahead/typeahead-popup.html" }, link: function (c, d, e) { a || b.warn("typeahead-popup is now deprecated. Use uib-typeahead-popup instead."), c.templateUrl = e.templateUrl, c.isOpen = function () { return c.matches.length > 0 }, c.isActive = function (a) { return c.active == a }, c.selectActive = function (a) { c.active = a }, c.selectMatch = function (a) { c.select({ activeIdx: a }) } } } }]).directive("typeaheadMatch", ["$templateRequest", "$compile", "$parse", "$typeaheadSuppressWarning", "$log", function (a, b, c, d, e) { return { restrict: "EA", scope: { index: "=", match: "=", query: "=" }, link: function (f, g, h) { d || e.warn("typeahead-match is now deprecated. Use uib-typeahead-match instead."); var i = c(h.templateUrl)(f.$parent) || "template/typeahead/typeahead-match.html"; a(i).then(function (a) { b(a.trim())(f, function (a) { g.replaceWith(a) }) }) } } }]).filter("typeaheadHighlight", ["$sce", "$injector", "$log", "$typeaheadSuppressWarning", function (a, b, c, d) { function e(a) { return a.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1") } function f(a) { return /<.*>/g.test(a) } var g; return g = b.has("$sanitize"), function (b, h) { return d || c.warn("typeaheadHighlight is now deprecated. Use uibTypeaheadHighlight instead."), !g && f(b) && c.warn("Unsafe use of typeahead please use ngSanitize"), b = h ? ("" + b).replace(new RegExp(e(h), "gi"), "<strong>$&</strong>") : b, g || (b = a.trustAsHtml(b)), b } }]), angular.module("template/accordion/accordion-group.html", []).run(["$templateCache", function (a) { a.put("template/accordion/accordion-group.html", '<div class="panel {{panelClass || \'panel-default\'}}">\n  <div class="panel-heading" ng-keypress="toggleOpen($event)">\n    <h4 class="panel-title">\n      <a href tabindex="0" class="accordion-toggle" ng-click="toggleOpen()" uib-accordion-transclude="heading"><span ng-class="{\'text-muted\': isDisabled}">{{heading}}</span></a>\n    </h4>\n  </div>\n  <div class="panel-collapse collapse" uib-collapse="!isOpen">\n	  <div class="panel-body" ng-transclude></div>\n  </div>\n</div>\n') }]), angular.module("template/accordion/accordion.html", []).run(["$templateCache", function (a) { a.put("template/accordion/accordion.html", '<div class="panel-group" ng-transclude></div>') }]), angular.module("template/alert/alert.html", []).run(["$templateCache", function (a) { a.put("template/alert/alert.html", '<div class="alert" ng-class="[\'alert-\' + (type || \'warning\'), closeable ? \'alert-dismissible\' : null]" role="alert">\n    <button ng-show="closeable" type="button" class="close" ng-click="close({$event: $event})">\n        <span aria-hidden="true">&times;</span>\n        <span class="sr-only">Close</span>\n    </button>\n    <div ng-transclude></div>\n</div>\n') }]), angular.module("template/carousel/carousel.html", []).run(["$templateCache", function (a) { a.put("template/carousel/carousel.html", '<div ng-mouseenter="pause()" ng-mouseleave="play()" class="carousel" ng-swipe-right="prev()" ng-swipe-left="next()">\n  <div class="carousel-inner" ng-transclude></div>\n  <a role="button" href class="left carousel-control" ng-click="prev()" ng-show="slides.length > 1">\n    <span aria-hidden="true" class="glyphicon glyphicon-chevron-left"></span>\n    <span class="sr-only">previous</span>\n  </a>\n  <a role="button" href class="right carousel-control" ng-click="next()" ng-show="slides.length > 1">\n    <span aria-hidden="true" class="glyphicon glyphicon-chevron-right"></span>\n    <span class="sr-only">next</span>\n  </a>\n  <ol class="carousel-indicators" ng-show="slides.length > 1">\n    <li ng-repeat="slide in slides | orderBy:indexOfSlide track by $index" ng-class="{ active: isActive(slide) }" ng-click="select(slide)">\n      <span class="sr-only">slide {{ $index + 1 }} of {{ slides.length }}<span ng-if="isActive(slide)">, currently active</span></span>\n    </li>\n  </ol>\n</div>') }]), angular.module("template/carousel/slide.html", []).run(["$templateCache", function (a) { a.put("template/carousel/slide.html", '<div ng-class="{\n    \'active\': active\n  }" class="item text-center" ng-transclude></div>\n') }]), angular.module("template/datepicker/datepicker.html", []).run(["$templateCache", function (a) { a.put("template/datepicker/datepicker.html", '<div ng-switch="datepickerMode" role="application" ng-keydown="keydown($event)">\n  <uib-daypicker ng-switch-when="day" tabindex="0"></uib-daypicker>\n  <uib-monthpicker ng-switch-when="month" tabindex="0"></uib-monthpicker>\n  <uib-yearpicker ng-switch-when="year" tabindex="0"></uib-yearpicker>\n</div>') }]), angular.module("template/datepicker/day.html", []).run(["$templateCache", function (a) { a.put("template/datepicker/day.html", '<table role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="{{::5 + showWeeks}}"><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n    <tr>\n      <th ng-if="showWeeks" class="text-center"></th>\n      <th ng-repeat="label in ::labels track by $index" class="text-center"><small aria-label="{{::label.full}}">{{::label.abbr}}</small></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-if="showWeeks" class="text-center h6"><em>{{ weekNumbers[$index] }}</em></td>\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{::dt.uid}}" ng-class="::dt.customClass">\n        <button type="button" style="min-width:100%;" class="btn btn-default btn-sm" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="::{\'text-muted\': dt.secondary, \'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n') }]), angular.module("template/datepicker/month.html", []).run(["$templateCache", function (a) { a.put("template/datepicker/month.html", '<table role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{::dt.uid}}" ng-class="::dt.customClass">\n        <button type="button" style="min-width:100%;" class="btn btn-default" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="::{\'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n') }]), angular.module("template/datepicker/popup.html", []).run(["$templateCache", function (a) { a.put("template/datepicker/popup.html", '<ul class="dropdown-menu" dropdown-nested ng-if="isOpen" style="display: block" ng-style="{top: position.top+\'px\', left: position.left+\'px\'}" ng-keydown="keydown($event)" ng-click="$event.stopPropagation()">\n	<li ng-transclude></li>\n	<li ng-if="showButtonBar" style="padding:10px 9px 2px">\n		<span class="btn-group pull-left">\n			<button type="button" class="btn btn-sm btn-info" ng-click="select(\'today\')" ng-disabled="isDisabled(\'today\')">{{ getText(\'current\') }}</button>\n			<button type="button" class="btn btn-sm btn-danger" ng-click="select(null)">{{ getText(\'clear\') }}</button>\n		</span>\n		<button type="button" class="btn btn-sm btn-success pull-right" ng-click="close()">{{ getText(\'close\') }}</button>\n	</li>\n</ul>\n') }]), angular.module("template/datepicker/year.html", []).run(["$templateCache", function (a) { a.put("template/datepicker/year.html", '<table role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="3"><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{::dt.uid}}" ng-class="::dt.customClass">\n        <button type="button" style="min-width:100%;" class="btn btn-default" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="::{\'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n') }]), angular.module("template/modal/backdrop.html", []).run(["$templateCache", function (a) { a.put("template/modal/backdrop.html", '<div uib-modal-animation-class="fade"\n     modal-in-class="in"\n     ng-style="{\'z-index\': 1040 + (index && 1 || 0) + index*10}"\n></div>\n') }]), angular.module("template/modal/window.html", []).run(["$templateCache", function (a) { a.put("template/modal/window.html", '<div modal-render="{{$isRendered}}" tabindex="-1" role="dialog" class="modal"\n    uib-modal-animation-class="fade"\n    modal-in-class="in"\n    ng-style="{\'z-index\': 1050 + index*10, display: \'block\'}">\n    <div class="modal-dialog" ng-class="size ? \'modal-\' + size : \'\'"><div class="modal-content" uib-modal-transclude></div></div>\n</div>\n') }]), angular.module("template/pagination/pager.html", []).run(["$templateCache", function (a) { a.put("template/pagination/pager.html", '<ul class="pager">\n  <li ng-class="{disabled: noPrevious()||ngDisabled, previous: align}"><a href ng-click="selectPage(page - 1, $event)">{{::getText(\'previous\')}}</a></li>\n  <li ng-class="{disabled: noNext()||ngDisabled, next: align}"><a href ng-click="selectPage(page + 1, $event)">{{::getText(\'next\')}}</a></li>\n</ul>\n') }]), angular.module("template/pagination/pagination.html", []).run(["$templateCache", function (a) { a.put("template/pagination/pagination.html", '<ul class="pagination">\n  <li ng-if="::boundaryLinks" ng-class="{disabled: noPrevious()||ngDisabled}" class="pagination-first"><a href ng-click="selectPage(1, $event)">{{::getText(\'first\')}}</a></li>\n  <li ng-if="::directionLinks" ng-class="{disabled: noPrevious()||ngDisabled}" class="pagination-prev"><a href ng-click="selectPage(page - 1, $event)">{{::getText(\'previous\')}}</a></li>\n  <li ng-repeat="page in pages track by $index" ng-class="{active: page.active,disabled: ngDisabled&&!page.active}" class="pagination-page"><a href ng-click="selectPage(page.number, $event)">{{page.text}}</a></li>\n  <li ng-if="::directionLinks" ng-class="{disabled: noNext()||ngDisabled}" class="pagination-next"><a href ng-click="selectPage(page + 1, $event)">{{::getText(\'next\')}}</a></li>\n  <li ng-if="::boundaryLinks" ng-class="{disabled: noNext()||ngDisabled}" class="pagination-last"><a href ng-click="selectPage(totalPages, $event)">{{::getText(\'last\')}}</a></li>\n</ul>\n') }]), angular.module("template/tooltip/tooltip-html-popup.html", []).run(["$templateCache", function (a) { a.put("template/tooltip/tooltip-html-popup.html", '<div\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>\n</div>\n') }]), angular.module("template/tooltip/tooltip-popup.html", []).run(["$templateCache", function (a) { a.put("template/tooltip/tooltip-popup.html", '<div\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n') }]), angular.module("template/tooltip/tooltip-template-popup.html", []).run(["$templateCache", function (a) { a.put("template/tooltip/tooltip-template-popup.html", '<div\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner"\n    uib-tooltip-template-transclude="contentExp()"\n    tooltip-template-transclude-scope="originScope()"></div>\n</div>\n') }]), angular.module("template/popover/popover-html.html", []).run(["$templateCache", function (a) { a.put("template/popover/popover-html.html", '<div tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content" ng-bind-html="contentExp()"></div>\n  </div>\n</div>\n') }]), angular.module("template/popover/popover-template.html", []).run(["$templateCache", function (a) { a.put("template/popover/popover-template.html", '<div tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content"\n        uib-tooltip-template-transclude="contentExp()"\n        tooltip-template-transclude-scope="originScope()"></div>\n  </div>\n</div>\n') }]), angular.module("template/popover/popover.html", []).run(["$templateCache", function (a) { a.put("template/popover/popover.html", '<div tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n') }]), angular.module("template/progressbar/bar.html", []).run(["$templateCache", function (a) { a.put("template/progressbar/bar.html", '<div class="progress-bar" ng-class="type && \'progress-bar-\' + type" role="progressbar" aria-valuenow="{{value}}" aria-valuemin="0" aria-valuemax="{{max}}" ng-style="{width: (percent < 100 ? percent : 100) + \'%\'}" aria-valuetext="{{percent | number:0}}%" aria-labelledby="{{::title}}" style="min-width: 0;" ng-transclude></div>\n') }]), angular.module("template/progressbar/progress.html", []).run(["$templateCache", function (a) { a.put("template/progressbar/progress.html", '<div class="progress" ng-transclude aria-labelledby="{{::title}}"></div>') }]), angular.module("template/progressbar/progressbar.html", []).run(["$templateCache", function (a) { a.put("template/progressbar/progressbar.html", '<div class="progress">\n  <div class="progress-bar" ng-class="type && \'progress-bar-\' + type" role="progressbar" aria-valuenow="{{value}}" aria-valuemin="0" aria-valuemax="{{max}}" ng-style="{width: (percent < 100 ? percent : 100) + \'%\'}" aria-valuetext="{{percent | number:0}}%" aria-labelledby="{{::title}}" style="min-width: 0;" ng-transclude></div>\n</div>\n') }]), angular.module("template/rating/rating.html", []).run(["$templateCache", function (a) {
    a.put("template/rating/rating.html", '<span ng-mouseleave="reset()" ng-keydown="onKeydown($event)" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="{{range.length}}" aria-valuenow="{{value}}">\n    <span ng-repeat-start="r in range track by $index" class="sr-only">({{ $index < value ? \'*\' : \' \' }})</span>\n    <i ng-repeat-end ng-mouseenter="enter($index + 1)" ng-click="rate($index + 1)" class="glyphicon" ng-class="$index < value && (r.stateOn || \'glyphicon-star\') || (r.stateOff || \'glyphicon-star-empty\')" ng-attr-title="{{r.title}}" aria-valuetext="{{r.title}}"></i>\n</span>\n');
}]), angular.module("template/tabs/tab.html", []).run(["$templateCache", function (a) { a.put("template/tabs/tab.html", '<li ng-class="{active: active, disabled: disabled}">\n  <a href ng-click="select()" uib-tab-heading-transclude>{{heading}}</a>\n</li>\n') }]), angular.module("template/tabs/tabset.html", []).run(["$templateCache", function (a) { a.put("template/tabs/tabset.html", '<div>\n  <ul class="nav nav-{{type || \'tabs\'}}" ng-class="{\'nav-stacked\': vertical, \'nav-justified\': justified}" ng-transclude></ul>\n  <div class="tab-content">\n    <div class="tab-pane" \n         ng-repeat="tab in tabs" \n         ng-class="{active: tab.active}"\n         uib-tab-content-transclude="tab">\n    </div>\n  </div>\n</div>\n') }]), angular.module("template/timepicker/timepicker.html", []).run(["$templateCache", function (a) { a.put("template/timepicker/timepicker.html", '<table>\n  <tbody>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td><a ng-click="incrementHours()" ng-class="{disabled: noIncrementHours()}" class="btn btn-link" ng-disabled="noIncrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td>&nbsp;</td>\n      <td><a ng-click="incrementMinutes()" ng-class="{disabled: noIncrementMinutes()}" class="btn btn-link" ng-disabled="noIncrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n    <tr>\n      <td class="form-group" ng-class="{\'has-error\': invalidHours}">\n        <input style="width:50px;" type="text" ng-model="hours" ng-change="updateHours()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}">\n      </td>\n      <td>:</td>\n      <td class="form-group" ng-class="{\'has-error\': invalidMinutes}">\n        <input style="width:50px;" type="text" ng-model="minutes" ng-change="updateMinutes()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}">\n      </td>\n      <td ng-show="showMeridian"><button type="button" ng-class="{disabled: noToggleMeridian()}" class="btn btn-default text-center" ng-click="toggleMeridian()" ng-disabled="noToggleMeridian()" tabindex="{{::tabindex}}">{{meridian}}</button></td>\n    </tr>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td><a ng-click="decrementHours()" ng-class="{disabled: noDecrementHours()}" class="btn btn-link" ng-disabled="noDecrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td>&nbsp;</td>\n      <td><a ng-click="decrementMinutes()" ng-class="{disabled: noDecrementMinutes()}" class="btn btn-link" ng-disabled="noDecrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n  </tbody>\n</table>\n') }]), angular.module("template/typeahead/typeahead-match.html", []).run(["$templateCache", function (a) { a.put("template/typeahead/typeahead-match.html", '<a href tabindex="-1" ng-bind-html="match.label | uibTypeaheadHighlight:query"></a>\n') }]), angular.module("template/typeahead/typeahead-popup.html", []).run(["$templateCache", function (a) { a.put("template/typeahead/typeahead-popup.html", '<ul class="dropdown-menu" ng-show="isOpen() && !moveInProgress" ng-style="{top: position().top+\'px\', left: position().left+\'px\'}" style="display: block;" role="listbox" aria-hidden="{{!isOpen()}}">\n    <li ng-repeat="match in matches track by $index" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)" ng-click="selectMatch($index)" role="option" id="{{::match.id}}">\n        <div uib-typeahead-match index="$index" match="match" query="query" template-url="templateUrl"></div>\n    </li>\n</ul>\n') }]), !angular.$$csp() && angular.element(document).find("head").prepend('<style type="text/css">.ng-animate.item:not(.left):not(.right){-webkit-transition:0s ease-in-out left;transition:0s ease-in-out left}</style>');
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
(function () { function n(n) { function t(t, r, e, u, i, o) { for (; i >= 0 && o > i; i += n) { var a = u ? u[i] : i; e = r(e, t[a], a, t) } return e } return function (r, e, u, i) { e = b(e, i, 4); var o = !k(r) && m.keys(r), a = (o || r).length, c = n > 0 ? 0 : a - 1; return arguments.length < 3 && (u = r[o ? o[c] : c], c += n), t(r, e, u, o, c, a) } } function t(n) { return function (t, r, e) { r = x(r, e); for (var u = O(t), i = n > 0 ? 0 : u - 1; i >= 0 && u > i; i += n) if (r(t[i], i, t)) return i; return -1 } } function r(n, t, r) { return function (e, u, i) { var o = 0, a = O(e); if ("number" == typeof i) n > 0 ? o = i >= 0 ? i : Math.max(i + a, o) : a = i >= 0 ? Math.min(i + 1, a) : i + a + 1; else if (r && i && a) return i = r(e, u), e[i] === u ? i : -1; if (u !== u) return i = t(l.call(e, o, a), m.isNaN), i >= 0 ? i + o : -1; for (i = n > 0 ? o : a - 1; i >= 0 && a > i; i += n) if (e[i] === u) return i; return -1 } } function e(n, t) { var r = I.length, e = n.constructor, u = m.isFunction(e) && e.prototype || a, i = "constructor"; for (m.has(n, i) && !m.contains(t, i) && t.push(i) ; r--;) i = I[r], i in n && n[i] !== u[i] && !m.contains(t, i) && t.push(i) } var u = this, i = u._, o = Array.prototype, a = Object.prototype, c = Function.prototype, f = o.push, l = o.slice, s = a.toString, p = a.hasOwnProperty, h = Array.isArray, v = Object.keys, g = c.bind, y = Object.create, d = function () { }, m = function (n) { return n instanceof m ? n : this instanceof m ? void (this._wrapped = n) : new m(n) }; "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = m), exports._ = m) : u._ = m, m.VERSION = "1.8.3"; var b = function (n, t, r) { if (t === void 0) return n; switch (null == r ? 3 : r) { case 1: return function (r) { return n.call(t, r) }; case 2: return function (r, e) { return n.call(t, r, e) }; case 3: return function (r, e, u) { return n.call(t, r, e, u) }; case 4: return function (r, e, u, i) { return n.call(t, r, e, u, i) } } return function () { return n.apply(t, arguments) } }, x = function (n, t, r) { return null == n ? m.identity : m.isFunction(n) ? b(n, t, r) : m.isObject(n) ? m.matcher(n) : m.property(n) }; m.iteratee = function (n, t) { return x(n, t, 1 / 0) }; var _ = function (n, t) { return function (r) { var e = arguments.length; if (2 > e || null == r) return r; for (var u = 1; e > u; u++) for (var i = arguments[u], o = n(i), a = o.length, c = 0; a > c; c++) { var f = o[c]; t && r[f] !== void 0 || (r[f] = i[f]) } return r } }, j = function (n) { if (!m.isObject(n)) return {}; if (y) return y(n); d.prototype = n; var t = new d; return d.prototype = null, t }, w = function (n) { return function (t) { return null == t ? void 0 : t[n] } }, A = Math.pow(2, 53) - 1, O = w("length"), k = function (n) { var t = O(n); return "number" == typeof t && t >= 0 && A >= t }; m.each = m.forEach = function (n, t, r) { t = b(t, r); var e, u; if (k(n)) for (e = 0, u = n.length; u > e; e++) t(n[e], e, n); else { var i = m.keys(n); for (e = 0, u = i.length; u > e; e++) t(n[i[e]], i[e], n) } return n }, m.map = m.collect = function (n, t, r) { t = x(t, r); for (var e = !k(n) && m.keys(n), u = (e || n).length, i = Array(u), o = 0; u > o; o++) { var a = e ? e[o] : o; i[o] = t(n[a], a, n) } return i }, m.reduce = m.foldl = m.inject = n(1), m.reduceRight = m.foldr = n(-1), m.find = m.detect = function (n, t, r) { var e; return e = k(n) ? m.findIndex(n, t, r) : m.findKey(n, t, r), e !== void 0 && e !== -1 ? n[e] : void 0 }, m.filter = m.select = function (n, t, r) { var e = []; return t = x(t, r), m.each(n, function (n, r, u) { t(n, r, u) && e.push(n) }), e }, m.reject = function (n, t, r) { return m.filter(n, m.negate(x(t)), r) }, m.every = m.all = function (n, t, r) { t = x(t, r); for (var e = !k(n) && m.keys(n), u = (e || n).length, i = 0; u > i; i++) { var o = e ? e[i] : i; if (!t(n[o], o, n)) return !1 } return !0 }, m.some = m.any = function (n, t, r) { t = x(t, r); for (var e = !k(n) && m.keys(n), u = (e || n).length, i = 0; u > i; i++) { var o = e ? e[i] : i; if (t(n[o], o, n)) return !0 } return !1 }, m.contains = m.includes = m.include = function (n, t, r, e) { return k(n) || (n = m.values(n)), ("number" != typeof r || e) && (r = 0), m.indexOf(n, t, r) >= 0 }, m.invoke = function (n, t) { var r = l.call(arguments, 2), e = m.isFunction(t); return m.map(n, function (n) { var u = e ? t : n[t]; return null == u ? u : u.apply(n, r) }) }, m.pluck = function (n, t) { return m.map(n, m.property(t)) }, m.where = function (n, t) { return m.filter(n, m.matcher(t)) }, m.findWhere = function (n, t) { return m.find(n, m.matcher(t)) }, m.max = function (n, t, r) { var e, u, i = -1 / 0, o = -1 / 0; if (null == t && null != n) { n = k(n) ? n : m.values(n); for (var a = 0, c = n.length; c > a; a++) e = n[a], e > i && (i = e) } else t = x(t, r), m.each(n, function (n, r, e) { u = t(n, r, e), (u > o || u === -1 / 0 && i === -1 / 0) && (i = n, o = u) }); return i }, m.min = function (n, t, r) { var e, u, i = 1 / 0, o = 1 / 0; if (null == t && null != n) { n = k(n) ? n : m.values(n); for (var a = 0, c = n.length; c > a; a++) e = n[a], i > e && (i = e) } else t = x(t, r), m.each(n, function (n, r, e) { u = t(n, r, e), (o > u || 1 / 0 === u && 1 / 0 === i) && (i = n, o = u) }); return i }, m.shuffle = function (n) { for (var t, r = k(n) ? n : m.values(n), e = r.length, u = Array(e), i = 0; e > i; i++) t = m.random(0, i), t !== i && (u[i] = u[t]), u[t] = r[i]; return u }, m.sample = function (n, t, r) { return null == t || r ? (k(n) || (n = m.values(n)), n[m.random(n.length - 1)]) : m.shuffle(n).slice(0, Math.max(0, t)) }, m.sortBy = function (n, t, r) { return t = x(t, r), m.pluck(m.map(n, function (n, r, e) { return { value: n, index: r, criteria: t(n, r, e) } }).sort(function (n, t) { var r = n.criteria, e = t.criteria; if (r !== e) { if (r > e || r === void 0) return 1; if (e > r || e === void 0) return -1 } return n.index - t.index }), "value") }; var F = function (n) { return function (t, r, e) { var u = {}; return r = x(r, e), m.each(t, function (e, i) { var o = r(e, i, t); n(u, e, o) }), u } }; m.groupBy = F(function (n, t, r) { m.has(n, r) ? n[r].push(t) : n[r] = [t] }), m.indexBy = F(function (n, t, r) { n[r] = t }), m.countBy = F(function (n, t, r) { m.has(n, r) ? n[r]++ : n[r] = 1 }), m.toArray = function (n) { return n ? m.isArray(n) ? l.call(n) : k(n) ? m.map(n, m.identity) : m.values(n) : [] }, m.size = function (n) { return null == n ? 0 : k(n) ? n.length : m.keys(n).length }, m.partition = function (n, t, r) { t = x(t, r); var e = [], u = []; return m.each(n, function (n, r, i) { (t(n, r, i) ? e : u).push(n) }), [e, u] }, m.first = m.head = m.take = function (n, t, r) { return null == n ? void 0 : null == t || r ? n[0] : m.initial(n, n.length - t) }, m.initial = function (n, t, r) { return l.call(n, 0, Math.max(0, n.length - (null == t || r ? 1 : t))) }, m.last = function (n, t, r) { return null == n ? void 0 : null == t || r ? n[n.length - 1] : m.rest(n, Math.max(0, n.length - t)) }, m.rest = m.tail = m.drop = function (n, t, r) { return l.call(n, null == t || r ? 1 : t) }, m.compact = function (n) { return m.filter(n, m.identity) }; var S = function (n, t, r, e) { for (var u = [], i = 0, o = e || 0, a = O(n) ; a > o; o++) { var c = n[o]; if (k(c) && (m.isArray(c) || m.isArguments(c))) { t || (c = S(c, t, r)); var f = 0, l = c.length; for (u.length += l; l > f;) u[i++] = c[f++] } else r || (u[i++] = c) } return u }; m.flatten = function (n, t) { return S(n, t, !1) }, m.without = function (n) { return m.difference(n, l.call(arguments, 1)) }, m.uniq = m.unique = function (n, t, r, e) { m.isBoolean(t) || (e = r, r = t, t = !1), null != r && (r = x(r, e)); for (var u = [], i = [], o = 0, a = O(n) ; a > o; o++) { var c = n[o], f = r ? r(c, o, n) : c; t ? (o && i === f || u.push(c), i = f) : r ? m.contains(i, f) || (i.push(f), u.push(c)) : m.contains(u, c) || u.push(c) } return u }, m.union = function () { return m.uniq(S(arguments, !0, !0)) }, m.intersection = function (n) { for (var t = [], r = arguments.length, e = 0, u = O(n) ; u > e; e++) { var i = n[e]; if (!m.contains(t, i)) { for (var o = 1; r > o && m.contains(arguments[o], i) ; o++); o === r && t.push(i) } } return t }, m.difference = function (n) { var t = S(arguments, !0, !0, 1); return m.filter(n, function (n) { return !m.contains(t, n) }) }, m.zip = function () { return m.unzip(arguments) }, m.unzip = function (n) { for (var t = n && m.max(n, O).length || 0, r = Array(t), e = 0; t > e; e++) r[e] = m.pluck(n, e); return r }, m.object = function (n, t) { for (var r = {}, e = 0, u = O(n) ; u > e; e++) t ? r[n[e]] = t[e] : r[n[e][0]] = n[e][1]; return r }, m.findIndex = t(1), m.findLastIndex = t(-1), m.sortedIndex = function (n, t, r, e) { r = x(r, e, 1); for (var u = r(t), i = 0, o = O(n) ; o > i;) { var a = Math.floor((i + o) / 2); r(n[a]) < u ? i = a + 1 : o = a } return i }, m.indexOf = r(1, m.findIndex, m.sortedIndex), m.lastIndexOf = r(-1, m.findLastIndex), m.range = function (n, t, r) { null == t && (t = n || 0, n = 0), r = r || 1; for (var e = Math.max(Math.ceil((t - n) / r), 0), u = Array(e), i = 0; e > i; i++, n += r) u[i] = n; return u }; var E = function (n, t, r, e, u) { if (!(e instanceof t)) return n.apply(r, u); var i = j(n.prototype), o = n.apply(i, u); return m.isObject(o) ? o : i }; m.bind = function (n, t) { if (g && n.bind === g) return g.apply(n, l.call(arguments, 1)); if (!m.isFunction(n)) throw new TypeError("Bind must be called on a function"); var r = l.call(arguments, 2), e = function () { return E(n, e, t, this, r.concat(l.call(arguments))) }; return e }, m.partial = function (n) { var t = l.call(arguments, 1), r = function () { for (var e = 0, u = t.length, i = Array(u), o = 0; u > o; o++) i[o] = t[o] === m ? arguments[e++] : t[o]; for (; e < arguments.length;) i.push(arguments[e++]); return E(n, r, this, this, i) }; return r }, m.bindAll = function (n) { var t, r, e = arguments.length; if (1 >= e) throw new Error("bindAll must be passed function names"); for (t = 1; e > t; t++) r = arguments[t], n[r] = m.bind(n[r], n); return n }, m.memoize = function (n, t) { var r = function (e) { var u = r.cache, i = "" + (t ? t.apply(this, arguments) : e); return m.has(u, i) || (u[i] = n.apply(this, arguments)), u[i] }; return r.cache = {}, r }, m.delay = function (n, t) { var r = l.call(arguments, 2); return setTimeout(function () { return n.apply(null, r) }, t) }, m.defer = m.partial(m.delay, m, 1), m.throttle = function (n, t, r) { var e, u, i, o = null, a = 0; r || (r = {}); var c = function () { a = r.leading === !1 ? 0 : m.now(), o = null, i = n.apply(e, u), o || (e = u = null) }; return function () { var f = m.now(); a || r.leading !== !1 || (a = f); var l = t - (f - a); return e = this, u = arguments, 0 >= l || l > t ? (o && (clearTimeout(o), o = null), a = f, i = n.apply(e, u), o || (e = u = null)) : o || r.trailing === !1 || (o = setTimeout(c, l)), i } }, m.debounce = function (n, t, r) { var e, u, i, o, a, c = function () { var f = m.now() - o; t > f && f >= 0 ? e = setTimeout(c, t - f) : (e = null, r || (a = n.apply(i, u), e || (i = u = null))) }; return function () { i = this, u = arguments, o = m.now(); var f = r && !e; return e || (e = setTimeout(c, t)), f && (a = n.apply(i, u), i = u = null), a } }, m.wrap = function (n, t) { return m.partial(t, n) }, m.negate = function (n) { return function () { return !n.apply(this, arguments) } }, m.compose = function () { var n = arguments, t = n.length - 1; return function () { for (var r = t, e = n[t].apply(this, arguments) ; r--;) e = n[r].call(this, e); return e } }, m.after = function (n, t) { return function () { return --n < 1 ? t.apply(this, arguments) : void 0 } }, m.before = function (n, t) { var r; return function () { return --n > 0 && (r = t.apply(this, arguments)), 1 >= n && (t = null), r } }, m.once = m.partial(m.before, 2); var M = !{ toString: null }.propertyIsEnumerable("toString"), I = ["valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"]; m.keys = function (n) { if (!m.isObject(n)) return []; if (v) return v(n); var t = []; for (var r in n) m.has(n, r) && t.push(r); return M && e(n, t), t }, m.allKeys = function (n) { if (!m.isObject(n)) return []; var t = []; for (var r in n) t.push(r); return M && e(n, t), t }, m.values = function (n) { for (var t = m.keys(n), r = t.length, e = Array(r), u = 0; r > u; u++) e[u] = n[t[u]]; return e }, m.mapObject = function (n, t, r) { t = x(t, r); for (var e, u = m.keys(n), i = u.length, o = {}, a = 0; i > a; a++) e = u[a], o[e] = t(n[e], e, n); return o }, m.pairs = function (n) { for (var t = m.keys(n), r = t.length, e = Array(r), u = 0; r > u; u++) e[u] = [t[u], n[t[u]]]; return e }, m.invert = function (n) { for (var t = {}, r = m.keys(n), e = 0, u = r.length; u > e; e++) t[n[r[e]]] = r[e]; return t }, m.functions = m.methods = function (n) { var t = []; for (var r in n) m.isFunction(n[r]) && t.push(r); return t.sort() }, m.extend = _(m.allKeys), m.extendOwn = m.assign = _(m.keys), m.findKey = function (n, t, r) { t = x(t, r); for (var e, u = m.keys(n), i = 0, o = u.length; o > i; i++) if (e = u[i], t(n[e], e, n)) return e }, m.pick = function (n, t, r) { var e, u, i = {}, o = n; if (null == o) return i; m.isFunction(t) ? (u = m.allKeys(o), e = b(t, r)) : (u = S(arguments, !1, !1, 1), e = function (n, t, r) { return t in r }, o = Object(o)); for (var a = 0, c = u.length; c > a; a++) { var f = u[a], l = o[f]; e(l, f, o) && (i[f] = l) } return i }, m.omit = function (n, t, r) { if (m.isFunction(t)) t = m.negate(t); else { var e = m.map(S(arguments, !1, !1, 1), String); t = function (n, t) { return !m.contains(e, t) } } return m.pick(n, t, r) }, m.defaults = _(m.allKeys, !0), m.create = function (n, t) { var r = j(n); return t && m.extendOwn(r, t), r }, m.clone = function (n) { return m.isObject(n) ? m.isArray(n) ? n.slice() : m.extend({}, n) : n }, m.tap = function (n, t) { return t(n), n }, m.isMatch = function (n, t) { var r = m.keys(t), e = r.length; if (null == n) return !e; for (var u = Object(n), i = 0; e > i; i++) { var o = r[i]; if (t[o] !== u[o] || !(o in u)) return !1 } return !0 }; var N = function (n, t, r, e) { if (n === t) return 0 !== n || 1 / n === 1 / t; if (null == n || null == t) return n === t; n instanceof m && (n = n._wrapped), t instanceof m && (t = t._wrapped); var u = s.call(n); if (u !== s.call(t)) return !1; switch (u) { case "[object RegExp]": case "[object String]": return "" + n == "" + t; case "[object Number]": return +n !== +n ? +t !== +t : 0 === +n ? 1 / +n === 1 / t : +n === +t; case "[object Date]": case "[object Boolean]": return +n === +t } var i = "[object Array]" === u; if (!i) { if ("object" != typeof n || "object" != typeof t) return !1; var o = n.constructor, a = t.constructor; if (o !== a && !(m.isFunction(o) && o instanceof o && m.isFunction(a) && a instanceof a) && "constructor" in n && "constructor" in t) return !1 } r = r || [], e = e || []; for (var c = r.length; c--;) if (r[c] === n) return e[c] === t; if (r.push(n), e.push(t), i) { if (c = n.length, c !== t.length) return !1; for (; c--;) if (!N(n[c], t[c], r, e)) return !1 } else { var f, l = m.keys(n); if (c = l.length, m.keys(t).length !== c) return !1; for (; c--;) if (f = l[c], !m.has(t, f) || !N(n[f], t[f], r, e)) return !1 } return r.pop(), e.pop(), !0 }; m.isEqual = function (n, t) { return N(n, t) }, m.isEmpty = function (n) { return null == n ? !0 : k(n) && (m.isArray(n) || m.isString(n) || m.isArguments(n)) ? 0 === n.length : 0 === m.keys(n).length }, m.isElement = function (n) { return !(!n || 1 !== n.nodeType) }, m.isArray = h || function (n) { return "[object Array]" === s.call(n) }, m.isObject = function (n) { var t = typeof n; return "function" === t || "object" === t && !!n }, m.each(["Arguments", "Function", "String", "Number", "Date", "RegExp", "Error"], function (n) { m["is" + n] = function (t) { return s.call(t) === "[object " + n + "]" } }), m.isArguments(arguments) || (m.isArguments = function (n) { return m.has(n, "callee") }), "function" != typeof /./ && "object" != typeof Int8Array && (m.isFunction = function (n) { return "function" == typeof n || !1 }), m.isFinite = function (n) { return isFinite(n) && !isNaN(parseFloat(n)) }, m.isNaN = function (n) { return m.isNumber(n) && n !== +n }, m.isBoolean = function (n) { return n === !0 || n === !1 || "[object Boolean]" === s.call(n) }, m.isNull = function (n) { return null === n }, m.isUndefined = function (n) { return n === void 0 }, m.has = function (n, t) { return null != n && p.call(n, t) }, m.noConflict = function () { return u._ = i, this }, m.identity = function (n) { return n }, m.constant = function (n) { return function () { return n } }, m.noop = function () { }, m.property = w, m.propertyOf = function (n) { return null == n ? function () { } : function (t) { return n[t] } }, m.matcher = m.matches = function (n) { return n = m.extendOwn({}, n), function (t) { return m.isMatch(t, n) } }, m.times = function (n, t, r) { var e = Array(Math.max(0, n)); t = b(t, r, 1); for (var u = 0; n > u; u++) e[u] = t(u); return e }, m.random = function (n, t) { return null == t && (t = n, n = 0), n + Math.floor(Math.random() * (t - n + 1)) }, m.now = Date.now || function () { return (new Date).getTime() }; var B = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "`": "&#x60;" }, T = m.invert(B), R = function (n) { var t = function (t) { return n[t] }, r = "(?:" + m.keys(n).join("|") + ")", e = RegExp(r), u = RegExp(r, "g"); return function (n) { return n = null == n ? "" : "" + n, e.test(n) ? n.replace(u, t) : n } }; m.escape = R(B), m.unescape = R(T), m.result = function (n, t, r) { var e = null == n ? void 0 : n[t]; return e === void 0 && (e = r), m.isFunction(e) ? e.call(n) : e }; var q = 0; m.uniqueId = function (n) { var t = ++q + ""; return n ? n + t : t }, m.templateSettings = { evaluate: /<%([\s\S]+?)%>/g, interpolate: /<%=([\s\S]+?)%>/g, escape: /<%-([\s\S]+?)%>/g }; var K = /(.)^/, z = { "'": "'", "\\": "\\", "\r": "r", "\n": "n", "\u2028": "u2028", "\u2029": "u2029" }, D = /\\|'|\r|\n|\u2028|\u2029/g, L = function (n) { return "\\" + z[n] }; m.template = function (n, t, r) { !t && r && (t = r), t = m.defaults({}, t, m.templateSettings); var e = RegExp([(t.escape || K).source, (t.interpolate || K).source, (t.evaluate || K).source].join("|") + "|$", "g"), u = 0, i = "__p+='"; n.replace(e, function (t, r, e, o, a) { return i += n.slice(u, a).replace(D, L), u = a + t.length, r ? i += "'+\n((__t=(" + r + "))==null?'':_.escape(__t))+\n'" : e ? i += "'+\n((__t=(" + e + "))==null?'':__t)+\n'" : o && (i += "';\n" + o + "\n__p+='"), t }), i += "';\n", t.variable || (i = "with(obj||{}){\n" + i + "}\n"), i = "var __t,__p='',__j=Array.prototype.join," + "print=function(){__p+=__j.call(arguments,'');};\n" + i + "return __p;\n"; try { var o = new Function(t.variable || "obj", "_", i) } catch (a) { throw a.source = i, a } var c = function (n) { return o.call(this, n, m) }, f = t.variable || "obj"; return c.source = "function(" + f + "){\n" + i + "}", c }, m.chain = function (n) { var t = m(n); return t._chain = !0, t }; var P = function (n, t) { return n._chain ? m(t).chain() : t }; m.mixin = function (n) { m.each(m.functions(n), function (t) { var r = m[t] = n[t]; m.prototype[t] = function () { var n = [this._wrapped]; return f.apply(n, arguments), P(this, r.apply(m, n)) } }) }, m.mixin(m), m.each(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (n) { var t = o[n]; m.prototype[n] = function () { var r = this._wrapped; return t.apply(r, arguments), "shift" !== n && "splice" !== n || 0 !== r.length || delete r[0], P(this, r) } }), m.each(["concat", "join", "slice"], function (n) { var t = o[n]; m.prototype[n] = function () { return P(this, t.apply(this._wrapped, arguments)) } }), m.prototype.value = function () { return this._wrapped }, m.prototype.valueOf = m.prototype.toJSON = m.prototype.value, m.prototype.toString = function () { return "" + this._wrapped }, "function" == typeof define && define.amd && define("underscore", [], function () { return m }) }).call(this);
//# sourceMappingURL=underscore-min.map
// https://github.com/vkiryukhin/vkBeautify
!function () { function e(e) { var r = "    "; if (isNaN(parseInt(e))) r = e; else switch (e) { case 1: r = " "; break; case 2: r = "  "; break; case 3: r = "   "; break; case 4: r = "    "; break; case 5: r = "     "; break; case 6: r = "      "; break; case 7: r = "       "; break; case 8: r = "        "; break; case 9: r = "         "; break; case 10: r = "          "; break; case 11: r = "           "; break; case 12: r = "            " } var c = ["\n"]; for (ix = 0; 100 > ix; ix++) c.push(c[ix] + r); return c } function r() { this.step = "    ", this.shift = e(this.step) } function c(e, r) { return r - (e.replace(/\(/g, "").length - e.replace(/\)/g, "").length) } function a(e, r) { return e.replace(/\s{1,}/g, " ").replace(/ AND /gi, "~::~" + r + r + "AND ").replace(/ BETWEEN /gi, "~::~" + r + "BETWEEN ").replace(/ CASE /gi, "~::~" + r + "CASE ").replace(/ ELSE /gi, "~::~" + r + "ELSE ").replace(/ END /gi, "~::~" + r + "END ").replace(/ FROM /gi, "~::~FROM ").replace(/ GROUP\s{1,}BY/gi, "~::~GROUP BY ").replace(/ HAVING /gi, "~::~HAVING ").replace(/ IN /gi, " IN ").replace(/ JOIN /gi, "~::~JOIN ").replace(/ CROSS~::~{1,}JOIN /gi, "~::~CROSS JOIN ").replace(/ INNER~::~{1,}JOIN /gi, "~::~INNER JOIN ").replace(/ LEFT~::~{1,}JOIN /gi, "~::~LEFT JOIN ").replace(/ RIGHT~::~{1,}JOIN /gi, "~::~RIGHT JOIN ").replace(/ ON /gi, "~::~" + r + "ON ").replace(/ OR /gi, "~::~" + r + r + "OR ").replace(/ ORDER\s{1,}BY/gi, "~::~ORDER BY ").replace(/ OVER /gi, "~::~" + r + "OVER ").replace(/\(\s{0,}SELECT /gi, "~::~(SELECT ").replace(/\)\s{0,}SELECT /gi, ")~::~SELECT ").replace(/ THEN /gi, " THEN~::~" + r).replace(/ UNION /gi, "~::~UNION~::~").replace(/ USING /gi, "~::~USING ").replace(/ WHEN /gi, "~::~" + r + "WHEN ").replace(/ WHERE /gi, "~::~WHERE ").replace(/ WITH /gi, "~::~WITH ").replace(/ ALL /gi, " ALL ").replace(/ AS /gi, " AS ").replace(/ ASC /gi, " ASC ").replace(/ DESC /gi, " DESC ").replace(/ DISTINCT /gi, " DISTINCT ").replace(/ EXISTS /gi, " EXISTS ").replace(/ NOT /gi, " NOT ").replace(/ NULL /gi, " NULL ").replace(/ LIKE /gi, " LIKE ").replace(/\s{0,}SELECT /gi, "SELECT ").replace(/\s{0,}UPDATE /gi, "UPDATE ").replace(/ SET /gi, " SET ").replace(/~::~{1,}/g, "~::~").split("~::~") } r.prototype.xml = function (r, c) { var a = r.replace(/>\s{0,}</g, "><").replace(/</g, "~::~<").replace(/\s*xmlns\:/g, "~::~xmlns:").replace(/\s*xmlns\=/g, "~::~xmlns=").split("~::~"), s = a.length, p = !1, l = 0, i = "", n = 0, t = c ? e(c) : this.shift; for (n = 0; s > n; n++) a[n].search(/<!/) > -1 ? (i += t[l] + a[n], p = !0, (a[n].search(/-->/) > -1 || a[n].search(/\]>/) > -1 || a[n].search(/!DOCTYPE/) > -1) && (p = !1)) : a[n].search(/-->/) > -1 || a[n].search(/\]>/) > -1 ? (i += a[n], p = !1) : /^<\w/.exec(a[n - 1]) && /^<\/\w/.exec(a[n]) && /^<[\w:\-\.\,]+/.exec(a[n - 1]) == /^<\/[\w:\-\.\,]+/.exec(a[n])[0].replace("/", "") ? (i += a[n], p || l--) : a[n].search(/<\w/) > -1 && -1 == a[n].search(/<\//) && -1 == a[n].search(/\/>/) ? i = i += p ? a[n] : t[l++] + a[n] : a[n].search(/<\w/) > -1 && a[n].search(/<\//) > -1 ? i = i += p ? a[n] : t[l] + a[n] : a[n].search(/<\//) > -1 ? i = i += p ? a[n] : t[--l] + a[n] : a[n].search(/\/>/) > -1 ? i = i += p ? a[n] : t[l] + a[n] : i += a[n].search(/<\?/) > -1 ? t[l] + a[n] : a[n].search(/xmlns\:/) > -1 || a[n].search(/xmlns\=/) > -1 ? t[l] + a[n] : a[n]; return "\n" == i[0] ? i.slice(1) : i }, r.prototype.json = function (e, r) { var r = r ? r : this.step; return "undefined" == typeof JSON ? e : "string" == typeof e ? JSON.stringify(JSON.parse(e), null, r) : "object" == typeof e ? JSON.stringify(e, null, r) : e }, r.prototype.css = function (r, c) { var a = r.replace(/\s{1,}/g, " ").replace(/\{/g, "{~::~").replace(/\}/g, "~::~}~::~").replace(/\;/g, ";~::~").replace(/\/\*/g, "~::~/*").replace(/\*\//g, "*/~::~").replace(/~::~\s{0,}~::~/g, "~::~").split("~::~"), s = a.length, p = 0, l = "", i = 0, n = c ? e(c) : this.shift; for (i = 0; s > i; i++) l += /\{/.exec(a[i]) ? n[p++] + a[i] : /\}/.exec(a[i]) ? n[--p] + a[i] : /\*\\/.exec(a[i]) ? n[p] + a[i] : n[p] + a[i]; return l.replace(/^\n{1,}/, "") }, r.prototype.sql = function (r, s) { var p = r.replace(/\s{1,}/g, " ").replace(/\'/gi, "~::~'").split("~::~"), l = p.length, i = [], n = 0, t = this.step, g = 0, E = "", N = 0, o = s ? e(s) : this.shift; for (N = 0; l > N; N++) i = i.concat(N % 2 ? p[N] : a(p[N], t)); for (l = i.length, N = 0; l > N; N++) { g = c(i[N], g), /\s{0,}\s{0,}SELECT\s{0,}/.exec(i[N]) && (i[N] = i[N].replace(/\,/g, ",\n" + t + t)), /\s{0,}\s{0,}SET\s{0,}/.exec(i[N]) && (i[N] = i[N].replace(/\,/g, ",\n" + t + t)), /\s{0,}\(\s{0,}SELECT\s{0,}/.exec(i[N]) ? (n++, E += o[n] + i[N]) : /\'/.exec(i[N]) ? (1 > g && n && n--, E += i[N]) : (E += o[n] + i[N], 1 > g && n && n--) } return E = E.replace(/^\n{1,}/, "").replace(/\n{1,}/g, "\n") }, r.prototype.xmlmin = function (e, r) { var c = r ? e : e.replace(/\<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)\>/g, "").replace(/[ \r\n\t]{1,}xmlns/g, " xmlns"); return c.replace(/>\s{0,}</g, "><") }, r.prototype.jsonmin = function (e) { return "undefined" == typeof JSON ? e : JSON.stringify(JSON.parse(e), null, 0) }, r.prototype.cssmin = function (e, r) { var c = r ? e : e.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g, ""); return c.replace(/\s{1,}/g, " ").replace(/\{\s{1,}/g, "{").replace(/\}\s{1,}/g, "}").replace(/\;\s{1,}/g, ";").replace(/\/\*\s{1,}/g, "/*").replace(/\*\/\s{1,}/g, "*/") }, r.prototype.sqlmin = function (e) { return e.replace(/\s{1,}/g, " ").replace(/\s{1,}\(/, "(").replace(/\s{1,}\)/, ")") }, window.vkbeautify = new r }();