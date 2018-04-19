app.controller("GettingStartedCtrl", ['$scope', 'SettingsService', function ($scope, SettingsService) {

    // Establish your scope containers
    var settings = SettingsService.get();
    $scope.helpUrl = settings.account.support_website || "mailto:" + settings.account.support_email;

}]);