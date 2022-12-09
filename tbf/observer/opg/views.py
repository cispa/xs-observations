from django.shortcuts import render


def get_observation_page(request, inc_method):
    """Generate an observation page for the given inc_method.

    Query parameters:
    test_url: URL to be included
    """
    ############
    # Special cases where inclusion methods should be adapted
    # E.g., add "-csp" to any inclusion method and a csp will be set
    csp = False
    if inc_method.endswith("-csp"):
        csp = True
        inc_method = inc_method.split("-csp")[0]
    # Add other special cases here
    # ...
    ############

    context = {"inc_method": inc_method}
    test_url = request.get_full_path().split("?url=", 1)[1]
    context["test_url"] = test_url
    context["echo_base"] = "http://127.0.0.1:8000/echo/"  # Alternatively load from config?
    response = render(request, "opg/observation_page.html", context)

    ###################
    # Special inclusion methods that need to change headers
    # Add CSP when requested
    if csp:
        response["Content-Security-Policy"] = f"default-src 'self' 'unsafe-inline' {test_url.split('?')[0]}"

    # Add new methods with special care here:
    # ...
    ###################

    # Return the observation page
    return response
