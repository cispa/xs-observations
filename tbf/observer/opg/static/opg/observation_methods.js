let observation_methods = {
    /************************************
     Element properties
     e.g., dimensions
     ************************************/
    "height": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.height;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("height", obs);
            }
        }
    },
    "width": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.width;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("width", obs);
            }
        }
    },
    "naturalHeight": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.naturalHeight;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("naturalHeight", obs);
            }
        }
    },
    "naturalWidth": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.naturalWidth;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("naturalWidth", obs);
            }
        }
    },
    "videoHeight": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.videoHeight;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("videoHeight", obs);
            }
        }
    },
    "videoWidth": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.videoWidth;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("videoWidth", obs);
            }
        }
    },
    "duration": {
        "before": () => {
            TimeRanges.prototype.toJSON = function () {
                return {
                    length: this.length,
                }
            }
        },
        "after": (el, win) => {
            let obs;
            try {
                obs = el.duration;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("duration", obs);
            }
        }
    },
    "networkState": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.networkState;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("networkState", obs);
            }
        }
    },
    "readyState": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.readyState;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("readyState", obs);
            }
        }
    },
    "buffered": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.buffered;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("buffered", obs);
            }
        }
    },
    "paused": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.paused;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("paused", obs);
            }
        }
    },
    "seekable": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.seekable;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("seekable", obs);
            }
        }
    },
    "sheet": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.sheet;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("sheet", obs);
            }
        }
    },
    "error": {
        "before": () => {
            MediaError.prototype.toJSON = function () {
                return {
                    code: this.code,
                    message: this.message,
                }
            }
        },
        "after": (el, win) => {
            let obs;
            try {
                obs = el.error;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("error", obs);
            }
        }
    },
    "contentDocument": {
        "after": (el, win) => {
            let obs;
            try {
                obs = el.contentDocument;
            } catch (e) {
                obs = "inapplicable";
            } finally {
                log_observation("contentDocument", obs);
            }
        }
    },
    /****************
     Window properties
     e.g., win.length
     ****************/
    "length": {
        "after": (el, win) => {
            let obs;
            try {
                if (win) {
                    obs = win.length;
                } else {
                    obs = "inapplicable";
                }
            } catch (e) {
                obs = e;
            } finally {
                log_observation("length", obs);
            }
        }
    },
    "window.name": {
        "after": (el, win) => {
            let obs;
            try {
                if (win) {
                    obs = win.window.name;
                } else {
                    obs = "inapplicable";
                }
            } catch (e) {
                obs = e;
            } finally {
                log_observation("window.name", obs);
            }
        }
    },
    "CSS2Properties": {
        "after": (el, win) => {
            let obs;
            try {
                if (win) {
                    obs = win.CSS2Properties;
                } else {
                    obs = "inapplicable";
                }
            } catch (e) {
                obs = e;
            } finally {
                log_observation("CSS2Properties", obs);
            }
        }
    },
    "origin": {
        "after": (el, win) => {
            let obs;
            try {
                if (win) {
                    obs = win.origin;
                } else {
                    obs = "inapplicable";
                }
            } catch (e) {
                obs = e;
            } finally {
                log_observation("origin", obs);
            }
        }
    },
    "opener": {
        "after": (el, win) => {
            let obs;
            try {
                if (win) {
                    obs = win.opener ? "True" : "False";
                } else {
                    obs = "inapplicable";
                }
            } catch (e) {
                obs = e;
            } finally {
                log_observation("opener", obs);
            }
        }
    },
    /*********
     Global listeners
     e.g., window.onerror
     ********/
    "el-error": {
        "before": () => {
            window.addEventListener("error", (message, source, lineno, colno, error) => {
                log_observation("el-error", `${message}-${lineno}-${colno}`);
            });
        }
    },
    "el-blur": {
        "before": () => {
            window.addEventListener("blur", () => {
                log_observation("el-blur", "called");
            });
        }
    },
    "el-message": {
        "before": () => {
            window.addEventListener("message", (event) => {
                log_observation("el-message", {"Origin": event.origin, "Message": JSON.stringify(event.data)});
            });
        }
    },
    "el-securitypolicyviolation": {
        "before": () => {
            window.addEventListener("securitypolicyviolation", (e) => {
                log_observation("el-securitypolicyviolation", `URL: ${e.blockedURI}, Effective Directive: ${e.effectiveDirective}, Status-Code: ${e.statusCode}`)
            });
        }
    },
    /*******
     Global attributes
     e.g., hasOwnProperty
     ******/
    "history.length": {
        "before": () => {
            let current_length = 0;
            try {
                current_length = window.history.length;
            } catch (e) {
                current_length = e;
            } finally {
                store_data("history.length", current_length);
            }
        },
        "after": (el, win) => {
            let old_length = 0;
            let current_length = 0;
            try {
                old_length = get_data("history.length");
                current_length = window.history.length;
            } catch (e) {
                current_length = e;
            } finally {
                log_observation("history.length", `${old_length}-${current_length}`);
            }
        }
    },
    "getComputedStyle": {
        "before": () => {
            let h1_css = document.createElement("h1");
            document.body.appendChild(h1_css);
            store_data("h1_css", h1_css);
        },
        "after": (el, win) => {
            let h1_css = get_data("h1_css");
            let styles = window.getComputedStyle(h1_css);
            let obs = styles.getPropertyValue("color");
            log_observation("getComputedStyle", obs);
        }
    },
    "hasOwnProperty-a": {
        "after": (el, win) => {
            let obs = window.hasOwnProperty("a") ? `a=${window["a"]}` : "does not exist";
            log_observation("hasOwnProperty-a", obs);
        }
    },
    "windowHeight": {
        "before": () => {
            let screen_height = window.innerHeight;
            store_data("screen_height", screen_height);
        },
        "after": (el, win) => {
            let former_height = get_data("screen_height");
            let current_height = window.innerHeight;
            log_observation("windowHeight", `${former_height}-${current_height}`);
        }
    },
    /*********
     Events fired, all grouped under the key "events-fired"?!
     e.g., load event
     load, error, loadedmetadata, stalled, suspend, .... (add more?)
     *******/
    "events-fired": {
        "between": (el, win) => {
            try {
                el.addEventListener("load", (e) => log_observation("events-fired", e.type));
                el.addEventListener("error", (e) => log_observation("events-fired", e.type));
                el.addEventListener("loadedmetadata", (e) => log_observation("events-fired", e.type));
                el.addEventListener("stalled", (e) => log_observation("events-fired", e.type));
                el.addEventListener("suspend", (e) => log_observation("events-fired", e.type));
                // All event listener
                el.addEventListener("mouseleave", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("focus", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loadingerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("reflectionchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("soundstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("bufferedamountlow", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("icecandidateerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("selectionchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("unhandledrejection", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("load", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("encrypted", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("result", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("deviceorientationabsolute", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mousewheel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("sourceopen", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("inactive", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("signalingstatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerdown", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("offline", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("transitionrun", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("updatestart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("updateend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforeunload", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitanimationstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("datachannel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("icegatheringstatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("audiostart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("resourcetimingbufferfull", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("animationcancel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("connectionavailable", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("selectstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("nomatch", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("geometrychange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("active", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("terminate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mouseout", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mouseup", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loadstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("seeking", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loadedmetadata", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dblclick", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("devicemotion", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("begin", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("cuechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("rejectionhandled", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("chargingchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("obsolete", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("paymentauthorized", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mousedown", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mozfullscreenchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("contextmenu", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("keypress", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pagehide", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("closing", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("animationend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerout", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("iceconnectionstatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("volumechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("toggle", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("exit", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("connecting", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("visibilitychange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("wheel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("addstream", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("activate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("addsourcebuffer", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mozfullscreenerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforescriptexecute", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("lostpointercapture", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("cancel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("shippingmethodselected", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("gamepadconnected", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("popstate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loadingdone", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("sourceclose", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("waitingforkey", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("animationstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("enterpictureinpicture", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforeprint", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mute", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("tonechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerlockchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("merchantvalidation", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("sourceended", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("transitionend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforecut", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("securitypolicyviolation", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforexrselect", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("soundend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("drag", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mouseover", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("complete", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("audioprocess", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("speechend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("track", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("blur", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("levelchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("chargingtimechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforeinstallprompt", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dragleave", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("afterprint", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("canplay", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkittransitionend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("paymentmethodselected", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("playing", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("freeze", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("emptied", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("online", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("connectionstatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("prioritychange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerrawupdate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("appinstalled", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("animationiteration", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pageshow", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("fullscreenerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loadend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("boundary", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("removesourcebuffer", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("deviceorientation", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dataavailable", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("ended", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loadeddata", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("message", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("languagechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("invalid", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("voiceschanged", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("removestream", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("repeat", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("progress", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("drop", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("payerdetailchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("inputreport", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("auxclick", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("disconnect", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("paymentmethodchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("noupdate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitfullscreenchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerlockerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerover", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("controllerchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("coordinatorstatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("submit", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dischargingtimechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("characteristicvaluechanged", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("blocked", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("reading", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerup", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("gatheringstatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("shippingcontactselected", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("timeupdate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("checking", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("end", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dragend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mousemove", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("upgradeneeded", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("reset", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("seeked", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerenter", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("success", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointermove", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("icecandidate", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("keydown", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("play", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("display", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("timeout", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("absolutedeviceorientation", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("canplaythrough", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("shippingaddresschange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("slotchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("loading", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("fullscreenchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("selectend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("midimessage", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("change", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("remove", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dragstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("squeezestart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("transitionstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforepaste", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforeinput", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mozorientationchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("gotpointercapture", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mouseenter", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pause", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("cut", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitkeyerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("resume", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("speechstart", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dragover", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("storage", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("connect", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitkeymessage", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("squeeze", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("cached", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitanimationend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("Line", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("scroll", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("selectedcandidatepairchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("enter", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dragenter", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("mark", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("hashchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointercancel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("stalled", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("shippingoptionchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("pointerleave", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("leavepictureinpicture", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitfullscreenerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("resize", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("addtrack", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("input", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("paste", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("release", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("devicechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("finish", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("stop", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("couponcodechanged", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("abort", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("error", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("statechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("bounce", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("formdata", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("unload", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("unmute", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("suspend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("validatemerchant", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("managedconfigurationchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("processorerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("removetrack", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("downloading", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("readystatechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitkeyadded", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("gamepaddisconnected", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("transitioncancel", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("search", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("keystatuseschange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("inputsourceschange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("show", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("audioend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("messageerror", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("squeezeend", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("copy", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("webkitanimationiteration", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("select", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("update", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("durationchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("keyup", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("waiting", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("versionchange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("gattserverdisconnected", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("beforecopy", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("open", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("updatefound", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("negotiationneeded", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("dragexit", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("ratechange", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("start", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("click", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("updateready", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("close", (e) => log_observation("events-fired-all", e.type));
                el.addEventListener("afterscriptexecute", (e) => log_observation("events-fired-all", e.type));
            } catch (e) {
                log_observation("events-fired", e);
            }
        }
    },
    /*******
     performanceAPI
     ******/
    "performanceAPI": {
        "before": () => {
            const smooth = (num) => {
                return Math.ceil(num/10) * 10;
            }
            PerformanceResourceTiming.prototype.toJSON = function () {
                return {
                    "initiatorType": this.initiatorType,
                    "nextHopProtocol": this.nextHopProtocol,
                    // Size properties (might need smoothing)
                    "size": {
                        "transferSize": smooth(this.transferSize),
                        "encodedBodySize": smooth(this.encodedBodySize),
                        "decodedBodySize": smooth(this.decodedBodySize),
                    },
                    // Timing properties (probably need smoothing)
                    "timing": {
                        "duration": smooth(this.duration),
                        "fetchStart": smooth(this.fetchStart),
                        "redirectStart": smooth(this.redirectStart),
                        "redirectEnd": smooth(this.redirectEnd),
                        "secureConnectionStart": smooth(this.secureConnectionStart),
                    }
                }
            }
        },
        "after": (el, win, url) => {
          let entries = performance.getEntriesByName(url);
          for (const entry of entries) {
              log_observation("performanceAPI", entry);
          }
        }
    },
    "win.performanceAPI": {
        "after": (el, win, url) => {
            const smooth = (num) => {
                return Math.ceil(num/10) * 10;
            }

            try {
                win.PerformanceResourceTiming.prototype.toJSON = function () {
                    return {
                        "initiatorType": this.initiatorType,
                        "nextHopProtocol": this.nextHopProtocol,
                        // Size properties (might need smoothing)
                        "size": {
                            "transferSize": smooth(this.transferSize),
                            "encodedBodySize": smooth(this.encodedBodySize),
                            "decodedBodySize": smooth(this.decodedBodySize),
                        },
                        // Timing properties (probably need smoothing)
                        "timing": {
                            "duration": smooth(this.duration),
                            "fetchStart": smooth(this.fetchStart),
                            "redirectStart": smooth(this.redirectStart),
                            "redirectEnd": smooth(this.redirectEnd),
                            "secureConnectionStart": smooth(this.secureConnectionStart),
                        }
                    }
                }
                let entries = win.performance.getEntriesByName(url);
                for (const entry of entries) {
                    log_observation("win.performanceAPI", entry);
                }
            } catch (e) {
                log_observation("win.performanceAPI", e);
            }
        }
    },
    /*****
     Fetch stuff
     ******/
    "fetch_events": {
        "before": () => {
            add_then(() => log_observation("events-fired", "then"));
            add_error(() => log_observation("events-fired", "error"));
        }
    },
    "fetch_errormessage": {
        "before": () => {
            add_error((error) => log_observation("fetch_errormessage", error.message));
        }
    },
    "fetch_response": {
        "before": () => {
            Response.prototype.toJSON = function () {
                return {
                    "type": this.type,
                    "ok": this.ok,
                    "redirected": this.redirected,
                    "status": this.status,
                    "statusText": this.statusText,
                    "url": this.url,
                    "body": this.body,
                    "headers": this.headers,
                }
            }
            add_then((response) => log_observation("fetch_response", response));
        }
    },
    /*****
     PoolParty
     *****/
    "paymentAPI": {
        "after": (el, win, url) => {
            // Taken from https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API/Using_the_Payment_Request_API
            function buildSupportedPaymentMethodData() {
              // Example supported payment methods:
              return [{
                supportedMethods: 'basic-card'
              }];
            }
            function buildShoppingCartDetails() {
              // Hardcoded for demo purposes:
              return {
                id: 'order-123',
                displayItems: [
                  {
                    label: 'Example item',
                    amount: {currency: 'USD', value: '1.00'}
                  }
                ],
                total: {
                  label: 'Total',
                  amount: {currency: 'USD', value: '1.00'}
                }
              };
            }
            try {
                let request = new PaymentRequest(buildSupportedPaymentMethodData(),
                                 buildShoppingCartDetails());
                request.show()
                    .then((paymentResponse) =>  {
                        log_observation("paymentAPI", paymentResponse);
                    }
                    ).catch(error => {
                        log_observation("paymentAPI", error);
                    });
            } catch (e) {
                log_observation("paymentAPI", e.message);
            }
        }
    },
    /*****
     Timing, Caching, ....
     *****/
}
