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
            settings.config.apiPrefix = "https://api.comecero.com" + settings.config.apiPrefix;
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