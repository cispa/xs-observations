import pickle
import time
import logging

from django.http import HttpResponse, JsonResponse
from django.template import loader, Context

from PIL import Image


logger = logging.getLogger(__name__)

# Example url_dict
url_dict = {
    1: {
        'content-type': ['application/javascript'],
        'Content-Security-Policy': [
            "default-src 'self'; img-src *; media-src media1.com media2.com; script-src userscripts.example.com"],
        'Cross-Origin-Opener-Policy': ['unsafe-none'],
        'Cross-Origin-Resource-Policy': ['same-site'],
        'X-Frame-Options': ['deny'],
        'X-Content-Type-Options': ['no-sniff'],
        'Content-Disposition': ['inline'],
        'Location': ['http://test.dev'],
        'ecocnt_html': [
            'meta_refresh=0;url=http://test.com?url=abc&abc=abc,num_frames=5,div_id=try,post_message=hi"aa\''],
        'ecohd_status': ['404'],
        'ecodly': ['100'],
    }
}

# Get correct url_dict from file
try:
    with open("url_dict.pickle", "rb") as f:
        url_dict = pickle.load(f)
        ver = url_dict.get("version")
except FileNotFoundError:
    ver = "Not set"


def get_ver(request):
    """Returns the version of the current url dict."""
    return HttpResponse(ver)


def echo_id_info(request, url_id):
    """Returns the content of the url_dict of url_id as json.
    """
    url_dict_version = request.GET.get("url_dict_version", ver)
    try:
        info = url_dict[url_id]
        code = 200
    except KeyError:
        info = {"error": f"(url_dict_version={url_dict_version}, url_id={url_id}) does not exist"}
        code = 404
    return JsonResponse(info, status=code)


def echo_id(request, url_id):
    """Return the correct response from the responses service.

    request: request object
    url_id: int, key in the url dict that tells us what to return
    Note: all get and post parameters are ignored
    """
    request.POST = {}
    request.GET = {}
    request.GET = url_dict.get(url_id, {})
    return echo(request)


def string_to_dict(value):
    """Helper to convert a string to a dict.

    value needs to have the following format: <val>,<val>,...
    val needs to have the following format: str=str
    Example value: width=100,height=100,duration=2
    """
    context = dict()
    # Commas separate wanted props, not allowed in the arguments
    if value == '':
        return context
    sets = value[0].split(",")
    for s in sets:
        # Equal sign separates property from value, we split on the first
        # To allow them in the value
        directive, val = s.split("=", 1)
        logger.info(f"{directive}, {val}")
        context[directive] = val
    return context


def add_content(resp, param, value):
    """Adds content/body of the response.

    ecocnt_html: html body,
    ecocnt_css: css body,
    ecocnt_js: js body,
    ecocnt_img: img body,
    ecocnt_vid: video body,
    ecocnt_audio: audio body,
    """
    if param == "ecocnt_html":
        t = loader.get_template("responses/template.html")
        context = string_to_dict(value)
        resp.content = t.render(context)
    elif param == "ecocnt_css":
        resp.content = value
    elif param == "ecocnt_js":
        resp.content = value
    elif param == "ecocnt_img":
        context = string_to_dict(value)
        height = int(context.get("height", 100))
        width = int(context.get("width", 100))
        ct_type = context.get("type", "png")
        img = Image.new("RGB", (width, height))
        img.save(resp, ct_type)
    elif param == "ecocnt_vid":
        context = string_to_dict(value)
        width = context.get("width", "50")
        height = context.get("height", "50")
        duration = context.get("duration", "1")
        movie_path = f"responses/static/responses/movie_({width}, {height})_{duration}.mp4"
        try:
            with open(movie_path, "rb") as f:
                resp.content = f.read()
        except FileNotFoundError as e:
            logger.warning(f"File not found {e}")
            resp.content = "Unsupported movie file"
    elif param == "ecocnt_audio":
        context = string_to_dict(value)
        duration = context.get("duration", "1")
        audio_path = f"responses/static/responses/audio_{duration}.wav"
        try:
            with open(audio_path, "rb") as f:
                resp.content = f.read()
        except FileNotFoundError as e:
            logger.warning(f"File not found {e}")
            resp.content = "Unsupported audio file"
    elif param == "ecocnt_pdf":
        # https://stackoverflow.com/a/66905260
        SMALL_PDF = (
                b"%PDF-1.2 \n"
                b"9 0 obj\n<<\n>>\nstream\nBT/ 32 Tf(  Leaky   )' ET\nendstream\nendobj\n"
                b"4 0 obj\n<<\n/Type /Page\n/Parent 5 0 R\n/Contents 9 0 R\n>>\nendobj\n"
                b"5 0 obj\n<<\n/Kids [4 0 R ]\n/Count 1\n/Type /Pages\n/MediaBox [ 0 0 250 50 ]\n>>\nendobj\n"
                b"3 0 obj\n<<\n/Pages 5 0 R\n/Type /Catalog\n>>\nendobj\n"
                b"trailer\n<<\n/Root 3 0 R\n>>\n"
                b"%%EOF"
            )
        resp.content = SMALL_PDF
    else:
        logger.warning(f"Unsupported body content: {param}")

    # Possible to add additional content options, such flash, appcache, applet, webvtt?

    return resp


def add_special(resp, param, value):
    """Adds special properties to the response.

    Currently only status code is supported.
    Request it with ecohd_status=<code>
    Due to Django limitations the code has to be between 100 and 999.
    """
    if param == "ecohd_status":
        try:
            code = int(value[0])
            # Django Limitation
            if not 100 <= code <= 999:
                raise ValueError(
                    f"Code has to be between 100 and 999 is {code}")
            resp.status_code = code
        except ValueError as e:
            logger.warning(f"Value Error: {e}")
    else:
        resp[param] = value[0]
    return resp


def echo(request):
    """Echos the wanted content/headers requested via GET/POST parameters."""
    resp = HttpResponse()
    # Delete the content-type django sets automatically
    del resp["Content-Type"]

    # same params in get/post will be overriden by get params
    # same params in only one will be a list
    # params = request.POST | request.GET  # only works in 3.9, below is a functionally equivalent way
    params = {**request.POST, **request.GET}
    logger.info(params)

    # Adjust the response for all set parameters
    for param, value in params.items():
        try:
            # Generate wanted content (body)
            if param.startswith("ecocnt"):
                resp = add_content(resp, param, value)
            # Generate wanted special properties (e.g., status code)
            elif param.startswith("ecohd"):
                resp = add_special(resp, param, value)
            # Sleep for ecodly milliseconds
            elif param == "ecodly":
                delay = int(value[0])/1000
                time.sleep(delay)
            # Default: just responses as header (param name as header name and param value as header value)
            else:
                resp[param] = value[0]
        except ValueError as e:
            logger.warning(f"Error occured {e}")
    # Test to check some weird behavior
    # resp["connection"] = "close" # If this is set, 1XX will err and not load forever! (to allow this in django run with -O --noreload)

    # CORS reflection?
    # resp["Access-Control-Allow-Origin"] = "http://localhost:8001" #request.headers["Origin"]
    # resp["Access-Control-Allow-Credentials"] = "true"

    return resp
