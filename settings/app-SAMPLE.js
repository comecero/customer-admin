﻿// Make a copy of this file and name it app.js, then place custom values to customize the app's behavior.
// At runtime, the user's app settings will be automatically injected, providing the user's selections to the app.
window.__settings = window.__settings || {}; window.__settings.app =
    {
        "account_id": "AA0000",
        "test": true,
        "app_id": "comecero-customer-admin",
        "development": true,
        "company_name": "My Company Name",
        "page_title": "My Company Customer Management",
        "customer_edit_permissions": ["name", "company_name", "email", "phone", "address", "tax_number"]
};