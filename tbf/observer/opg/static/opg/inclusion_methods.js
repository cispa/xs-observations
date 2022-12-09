let inclusion_methods = {
    /***********
     HTML tags (standard)
     e.g., img
     ************/
    "script": {
        "definition": (url) => {
            let el = document.createElement("script");
            el.src = url;
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "link-stylesheet": {
        "definition": (url) => {
            let el = document.createElement("link");
            el.href = url;
            el.rel = "stylesheet"
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "link-prefetch": {
        "definition": (url) => {
            let el = document.createElement("link");
            el.href = url;
            el.rel = "prefetch";
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "img": {
        "definition": (url) => {
            let el = document.createElement("img");
            el.src = url;
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "iframe": {
        // Only when opened using `open`, several load events are fired?
        "definition": (url) => {
            let el = document.createElement("iframe");
            //el.src = url;
            el.name = "iframe-tag";
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
            //let win = el.contentWindow;
            let win = open(url, "iframe-tag");
            store_data("win", win);
        }
    },
    "video": {
        "definition": (url) => {
            let el = document.createElement("video");
            el.src = url;
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "audio": {
        "definition": (url) => {
            let el = document.createElement("audio");
            el.src = url;
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "object": {
        "definition": (url) => {
            let el = document.createElement("object");
            el.data = url;
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el);
        }
    },
    "embed": {
        "definition": (url) => {
            let el = document.createElement("embed");
            el.src = url;
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    "embed-img": {
        "definition": (url) => {
            let el = document.createElement("embed");
            el.src = url;
            el.type = "image/jpg";
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el)
        }
    },
    /*********
    HTML tags (special)
    **********/
    "iframe-dircsp": {
        "definition": (url) => {
            let el = document.createElement("iframe");
            el.src = url;
            el.setAttribute("csp", "default-src 'self';");
            el.addEventListener("load", () => {
                el.src = url;
            }, { once: true });
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el);
            let win = el.contentWindow;
            store_data("win", win);
        }
    },

    /*******
     Fetch
     *******/
    "fetch-creds-cors": {
        "instantiation": (url, echo_base, then_callbacks, error_callbacks, finally_callbacks) => {
            fetch(url, {
                mode: "cors",
                credentials: "include",
            }).then((response) => {
                for (let callback of then_callbacks) {
                    callback(response);
                }
            }).catch((error) => {
                for (let callback of error_callbacks) {
                    callback(error);
                }
                console.log(error);
            }).finally((e) => {
                for (let callback of finally_callbacks) {
                    callback(e);
                }
            });
        }
    },
    "fetch-creds-no-cors": {
        "instantiation": (url, echo_base, then_callbacks, error_callbacks, finally_callbacks) => {
            fetch(url, {
                mode: "no-cors",
                credentials: "include",
            }).then((response) => {
                for (let callback of then_callbacks) {
                    callback(response);
                }
            }).catch((error) => {
                for (let callback of error_callbacks) {
                    callback(error);
                }
                console.log(error);
            }).finally((e) => {
                for (let callback of finally_callbacks) {
                    callback(e);
                }
            });
        }
    },
    "fetch-creds-cors-manual": {
        "instantiation": (url, echo_base, then_callbacks, error_callbacks, finally_callbacks) => {
            fetch(url, {
                mode: "cors",
                credentials: "include",
                redirect: "manual",
            }).then((response) => {
                for (let callback of then_callbacks) {
                    callback(response);
                }
            }).catch((error) => {
                for (let callback of error_callbacks) {
                    callback(error);
                }
                console.log(error);
            }).finally((e) => {
                for (let callback of finally_callbacks) {
                    callback(e);
                }
            });
        }
    },
    "fetch-creds-no-cors-integrity": {
        // See https://xsinator.com/testing.html#SRI%20Error%20Leak
        // Was a bug, integrity and no-cors should not work together
        "instantiation": (url, echo_base, then_callbacks, error_callbacks, finally_callbacks) => {
            fetch(url, {
                mode: "no-cors",
                credentials: "include",
                // curl 'http://localhost:8000/echo/?ecocnt_js=var%20a=5;' | shasum -a 256 | awk '{print $1}' | xxd -r -p | base64
                integrity: "sha256-PgjGFkk4Drug1gCH6mGDJ2aPw5E2VsPKoCPkpCe4HoA="
            }).then((response) => {
                for (let callback of then_callbacks) {
                    callback(response);
                }
            }).catch((error) => {
                for (let callback of error_callbacks) {
                    callback(error);
                }
            }).finally((e) => {
                for (let callback of finally_callbacks) {
                    callback(e);
                }
            });
        }
    },
    "fetch-creds-cors-integrity": {
        // Needs ACAO + ACOC
        // E.g., CORS misconfiguration/Reflected origin
        "instantiation": (url, echo_base, then_callbacks, error_callbacks, finally_callbacks) => {
            fetch(url, {
                mode: "cors",
                credentials: "include",
                // curl 'http://localhost:8000/echo/?ecocnt_js=var%20a=5;' | shasum -a 256 | awk '{print $1}' | xxd -r -p | base64
                integrity: "sha256-PgjGFkk4Drug1gCH6mGDJ2aPw5E2VsPKoCPkpCe4HoA="
            }).then((response) => {
                for (let callback of then_callbacks) {
                    callback(response);
                }
            }).catch((error) => {
                for (let callback of error_callbacks) {
                    callback(error);
                }
            }).finally((e) => {
                for (let callback of finally_callbacks) {
                    callback(e);
                }
            });
        }
    },
    /*********
     Other
     e.g., window.open
     *********/
    "window.open": {
        "instantiation": (url) => {
            let win = window.open(url);
            store_data("win", win);
        }
    },
    "style-import": {
        // See https://xsinator.com/testing.html#Style%20Reload%20Error%20Leak
        // Reload is only triggered, if some tag (not every tag works?) is present that needs longer to load than the style import?
        // Only works inside an iframe, not directly on the page?
        "definition": (url, echo_base) => {
            let el = document.createElement("iframe");
            el.srcdoc = `
            <!DOCTYPE html>
            <html lang="en">
                <body>
                    <link href='${`${echo_base}?ecodly=150`}' rel="stylesheet">
                    <style>
                        @import '${url}';
                    </style>
                </body>
            </html>`
            // let el = document.createElement("style");
            // el.innerHTML = `@import '${url}';`
            // let el_delay = document.createElement("link");
            // el_delay.rel = "stylesheet";
            // el_delay.href = `${echo_base}?ecodly=150`;
            // store_data("el_delay", el_delay);
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            // let el_delay = get_data("el_delay");
            // document.body.appendChild(el_delay);
            document.body.appendChild(el);
            let win = el.contentWindow;
            store_data("win", win);
        }
    },
    "double-script": {
        // See https://xsinator.com/testing.html#Request%20Merging%20Error%20Leak
        // Only works in iframe? (or does not work with dynamically added elements, only "raw" html?)
        "definition": (url) => {
            let el = document.createElement("iframe");
            el.srcdoc = `
            <!DOCTYPE html>
            <html lang="en">
                <body>
                    <script 
                        src='${url}'></script>
                    <script
                        src='${url}'>
                    </script>
                </body>
            </html>`
            store_data("el", el);
        },
        "instantiation": (url) => {
            let el = get_data("el");
            document.body.appendChild(el);
            let win = el.contentWindow;
            store_data("win", win);
        }
    },

    /********
     Notes:
     - adding `-csp` to any of the inclusion methods will add a content-security-policy header to the response
     ********/
}
