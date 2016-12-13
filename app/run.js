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