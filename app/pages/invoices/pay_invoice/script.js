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