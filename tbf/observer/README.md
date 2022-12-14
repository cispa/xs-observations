# Observer

Application to observe browser behavior for different HTTP responses in the context of XS-Leaks using an observation page generator.

## Start the app

Run `poetry run uwsgi --ini uwsgi.ini` (or set `DEBUG=True` in `observer/settings.py` and run `poetry run python manage.py runserver 8001`)
The app is now available at http://localhost:8001/.

## Observation of a URL 

To observe the browser behavior for a given inclusion method and URL visit `http://localhost:8001/opg/<inc_method>/?url=<url>`.
For example visit http://localhost:8001/opg/iframe/?url=http://127.0.0.1:8000/echo/?ecohd_status=500, then press `record and show data` to see the results.

## Structure of a test

0. Setup: Page with response headers and helper code for the given URL is generated by Django (usually should not be changed)
1. Observation: **Before**: All global observation listeners or environment changes (e.g., toJSON) are applied
2. Inclusion: **Definition**: The inclusion method is defined.
3. Observation: **Between**: Observation listener for the inclusion method are defined.
4. Inclusion: **Instantiation**: The inclusion of the URL is performed.
5. Observation: **After**: Observations after the inclusion are performed.

### Inclusion methods

Currently, the following inclusion methods are supported: 
```js
[
  // HTML tags
  "script",
  "link-stylesheet",
  "link-prefetch",
  "img",
  "iframe",
  "video",
  "audio",
  "object",
  "embed",
  "embed-img",
  // HTML tags special
  "iframe-dircsp",
  // Fetch
  "fetch-creds-cors",
  "fetch-creds-no-cors",
  "fetch-creds-cors-manual",
  "fetch-creds-no-cors-integrity",
  "fetch-creds-cors-integrity",
  // Special
  "window.open",
  "style-import",
  "double-script"
]
```
All inclusion methods support an additional mode by adding `-csp` to them and a CSP that only allows the original URL is added.

#### Adding additional inclusion methods

Adding new inclusion methods is simple. Add an entry to the file in [/opg/static/opg/inclusion_methods.js](opg/static/opg/inclusion_methods.js).
The code can contain two functions `definition` and `instantiation`, in the first the inclusion should be setup and in the second the inclusion should be performed. Both functions get the URL as input and should store `elements` as `el` and `window references` as `win` using the available `store_data` function. For inclusion methods that are promises (e.g., fetch), three lists of observation callbacks are provided. 
See the following example for a script inclusion.
```js
"script": {
    // Define the inclusion
    // `url` is the given URL that should be included, `echo_base` is the base url of an echo application instance
    // Should store the element as `el`
    "definition": (url, echo_base) => {
        let el = document.createElement("script");
        el.src = url;
        store_data("el", el);
    },
    // Load the URL
    // `url` is the giver URL that should be included, `echo_base` is the base url of an echo application
    // `(then|error|finally)_callbacks` are list of callback functions that should be called if the inclusion method is a promise
    // Stored data from the `definition` can be accessed by `get_data('key')`
    "instantiation": (url, echo_base, then_callbacks, error_callbacks, finally_callbacks) => {
        let el = get_data("el");
        document.body.appendChild(el)
    }
}
```

### Observation methods

Currently, the following observation methods are supported:
```js
[
  // Element properties  
  "height",
  "width",
  "naturalHeight",
  "naturalWidth",
  "videoHeight",
  "videoWidth",
  "duration",
  "networkState",
  "readyState",
  "buffered",
  "paused",
  "seekable",
  "sheet",
  "error",
  "contentDocument",
  // Window properties  
  "length",
  "window.name",
  "CSS2Properties",
  "origin",
  "opener",
  // Global listeners  
  "el-error",
  "el-blur",
  "el-message",
  "el-securitypolicyviolation",
  // Global properties  
  "history.length",
  "getComputedStyle",
  "hasOwnProperty-a",
  "windowHeight",
  // Events fired  
  "events-fired",
  // performace API  
  "performanceAPI",
  "win.performanceAPI",
  // Promise callbacks  
  "fetch_events",
  "fetch_errormessage",
  "fetch_response"
]
```

#### Adding additional observation methods

Adding new observation methods is easy. Add an entry to the file in [/opg/static/opg/observation_methods.js](opg/static/opg/observation_methods.js).
The code can contain three functions `before`, `between`, and `after` that get executed in relation to when the inclusion method is defined and instantiated.
See the following example:
```js
"windowHeight": {
    // Code that is executed before anything
    // Data that is needed later can be stored using `store_data(key, value)`
    "before": () => {
        let screen_height = window.innerHeight;
        store_data("screen_height", screen_height);
    },
    // Code that is executed between definition and instantiation
    // Note that `el` and `win` might be null and that the code should catch all errors    
    "between": (el, win) => {
    },
    // Code that is executed after the URL is loaded according to the inclusion method
    // `url` is the URL that got included
    // The results should be recoreded using `log_observation(method_name, value)`    
    "after": (el, win, url) => {
        let former_height = get_data("screen_height");
        let current_height = window.innerHeight;
        log_observation("windowHeight", `${former_height}-${current_height}`);
    }
}
```

## Additional notes

- If the inclusion method needs additional features, such as specific response headers, then modify the following [view file](opg/views.py).
- The [all_events.js](all_events.js) file is used to enumerate all events handlers available in different browsers.