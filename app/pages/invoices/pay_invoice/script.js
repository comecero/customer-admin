$("document").ready(function () {

    // Get the token
    var token = localStorage.getItem("token");

    // Define the host
    var host = "api.comecero.com";
    if (window.location.hostname.indexOf("-staging.") > -1) {
        host = "api-staging.comecero.com";
    }

    // Get the query parameters
    var params = utils.getPageQueryParameters();

    // Define the URL
    var url = "https://" + host + "/api/v1/invoices/" + params["invoice_id"] + "/links";

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