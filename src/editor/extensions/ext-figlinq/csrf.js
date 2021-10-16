(function() {
    'use strict';
    // Add CSRF token to the header of all AJAX calls
    // From: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    $.ajaxSetup({
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type)) {
                xhr.setRequestHeader('X-CSRFToken', $.cookie(window.PLOTLYENV.CSRF_COOKIE_NAME));
            }
        }
    });
})();
