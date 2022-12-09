const {chromium, firefox, webkit} = require("playwright");
const {prepare_states} = require("./prepare_states");
const {get_client, get_hash_info, close_browser} = require("./utilities");
const nodeCleanup = require("node-cleanup");

let client;
let c, f, w;
let site = "";

const save = async () => {
    await client.end();
    if (c) {await close_browser(c);}
    if (f) {await close_browser(f);}
    if (w) {await close_browser(w);}
    process.exit(0);
}

const cleanup = async () => {
    await save();
}

nodeCleanup( (exitCode, signal) => {
    console.log(`${site}-dyn.js: code=${exitCode}, signal=${signal}`);
    if (signal) {
        nodeCleanup.uninstall();
        cleanup().then(() => process.kill(process.pid, signal));
        return false;
    }
    return true;
});

const dyn_prepare = async (site, rank, browser, load_timeout, button_timeout, browser_name, version, ignoreHTTPSErrors, login) => {
    let states;
    if (login) {
        states = ["_visitedl", "_login"]; 
    } else {
        states = ["_ano", "_visited", "_accepted"];
    }

    let info = `02_${browser_name[0]}c`;
    states = await prepare_states(site, rank, states, load_timeout, button_timeout, browser, info, browser_name, version, ignoreHTTPSErrors);
    return states;
}

const dyn_collect = async (site, rank, inc, url, browser, load_timeout, browser_short, states, run, browser_name, version, ignoreHTTPSErrors) => {
    let info = `02_${browser_short}c`;
    let test_url = `http://observer.org:8001/opg/${inc}/?url=${url}`;
    let works = [];
    // Continue if at least two states worked
    if (states.length >= 2) {
        for (let state of states) {
            let data_json = JSON.stringify("");
            let notes = "";
            let error = false;
            let response_dict = {
                    "resp_body_hash": "",
                    "resp_body_info": "",
                    "resp_headers": "",
                    "resp_code": "",
                    "req_headers": "",
                    "error_text": ""
            };
            const context = await browser.newContext({
                    storageState: `context_dir/${Math.floor(rank/100)}/${rank}_${site}_${state}_${info}.json`, viewport: null,
                    ignoreHTTPSErrors: ignoreHTTPSErrors
            });
            try {
                // Open new page
                const page = await context.newPage();
                await page.waitForTimeout(1000);  // Buffer between requests

                // ToDo: improve response collection for window.open
                page.on("response", (async response => {
                    if (response.url() === url) {
                        let request = await response.request();
                        try {
                            let resp_body = await response.body();
                            let body = await get_hash_info(resp_body);
                            response_dict["resp_body_hash"] = body[0];
                            response_dict["resp_body_info"] = body[1];

                        } catch (e) {
                        }
                        try {
                            response_dict["resp_headers"] = await response.allHeaders();
                            response_dict["req_headers"] = await request.allHeaders();
                            response_dict["resp_code"] = response.status();
                        } catch (e) {
                        }
                    } else {
                        //console.log(`Other request: ${request.url()}`);
                    }
                }));
                // Failed requests (we only care about the first top-level request
                page.on("requestfailed", (async request => {
                    if (request.url() === url) {
                        try {
                            response_dict["error_text"] = request.failure().errorText;
                            response_dict["req_headers"] = await request.allHeaders();
                        } catch (e) {
                        }
                    } else {
                        //console.log(`Other request failed: ${request.url()}`);
                    }
                }));

                if (inc === "window.open") {
                    try {
                        const [popup] = await Promise.all([
                            // It is important to call waitForEvent before click to set up waiting.
                            page.waitForEvent('popup', {timeout: 0.3 * load_timeout}),
                            // Opens popup.
                            page.goto(test_url, {waitUntil: "networkidle", timeout: load_timeout}),
                        ]);
                        // Wait for the opened site
                        await Promise.any([
                            popup.waitForLoadState("networkidle", {timeout: load_timeout}),
                            popup.waitForLoadState("domcontentloaded", {timeout: load_timeout})
                        ]);
                    } catch (err) {
                        notes = err.message;
                    }
                } else {
                    try {
                        await page.goto(test_url, {waitUntil: "networkidle", timeout: load_timeout});
                    } catch (err) {
                        notes = err.message;
                    }
                }

                // Wait for the test element to be added to the DOM
                await page.locator("id=randomWaitElemId01234").waitFor(
                    {state: "attached", timeout: load_timeout});
                // Sleep additional Xms
                await page.waitForTimeout(2000);
                // Extract the data
                await page.evaluate(() => after_obs());
                await page.waitForTimeout(100);
                data_json = await page.evaluate(() => JSON.stringify(record_observations()));
            } catch (e) {
                // When something went wrong with the data collection set error property
                notes = e.message;
                error = true;
            }
            // Save data to db
            const query = {
                text:
                    `INSERT INTO dyn_conf(browser, version, site, opg_url, url, inc_method, state, run,
                                          observation, error, notes, response)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `,
                values: [browser_name, version, site, test_url, url, inc, state, run, data_json, error, notes, JSON.stringify(response_dict)]
            }
            works.push(JSON.parse(data_json));
            await client.query(query)
                .then()
                .catch(e => {
                    throw Error(e.stack)
                });
            // Close context and start next state or URL
            await context.close();
        }
    }
    return early_abort(works, site);
}

let early_abort = (arr, site) => {
    if (arr.length === 0) {
        return true;
    }
    let props = Object.keys(arr[0]);
    for (let prop of props) {
        if (["complete_time", "loading_time"].includes(prop)) {
            //ignore
        } else {
            let vals = new Set();
            for (let state_vals of arr) {
                try {
                    vals.add(JSON.stringify(state_vals[prop]).replaceAll(/(duration.|fetchStart.|secureConnectionStart.|redirectStart.|redirectEnd.|transferSize.|encodedBodySize.):(\d+)/g, "$1: >0"));
                } catch (e) {
                    console.log(`${site}: ${prop} failed stringify`);
                    vals.add("failed_observation");  // Failed observation is an observation
                }
            }
            // One property with more than one observation was observed, continue
            if (vals.size > 1) {
                return false;
            }
        }
    }
    // No property with different values was observed, abort
    return true;
}

(async () => {
    site = process.argv[2];
    let rank = process.argv[3];
    let urls = JSON.parse(process.argv[4]);
    let ignoreHTTPSErrors = Boolean(process.argv[5]);
    let load_timeout = parseInt(process.argv[6]); //20000;
    let button_timeout = parseInt(process.argv[7]); //10000;
    let login = Boolean(process.argv[8]);
    client = await get_client();

    let browser_string = Object.values(urls).map((x) => Object.values(x)).flat().join("");
    if (browser_string.includes("c")) {
        c = await chromium.launch({headless: false});
    }
    if (browser_string.includes("f")) {
        f = await firefox.launch({headless: false});
    }
    if (browser_string.includes("w")) {
        w = await webkit.launch({headless: false});
    }
    try {
        let c_states = [];
        let f_states = [];
        let w_states = [];
        try {
            if (c) {
            c_states = await dyn_prepare(site, rank, c, load_timeout, button_timeout, "chromium", c.version(), ignoreHTTPSErrors, login);
            }
        } catch (e) {
            console.log(`${site} failed dyn_prepare chromium: ${e.message}`);
        }
        try {
            if (f) {
                f_states = await dyn_prepare(site, rank, f, load_timeout, button_timeout, "firefox", f.version(),
                    ignoreHTTPSErrors, login);
            }
        } catch (e) {
           console.log(`${site} failed dyn_prepare firefox: ${e.message}`);
        }
        try {
            if (w) {
                w_states = await dyn_prepare(site, rank, w, load_timeout, button_timeout, "webkit", w.version(), ignoreHTTPSErrors, login);
            }
        } catch (e) {
           console.log(`${site} failed dyn_prepare webkit: ${e.message}`);
        }
        // Test every test url
        // Up to 5 times
        for (const [inc, val] of Object.entries(urls)) {
            for (let [url, browser_string] of Object.entries(val)) {
                for (let i of [0, 1, 2, 3, 4]) {
                    // Basic idea: just make exact comparison of results (without time and other unstable info)
                    // If exact comparison is the same, remove browser from browser_string!
                    if (browser_string.includes("c")) {
                        let early_abort = await dyn_collect(site, rank, inc, url, c, load_timeout, "c", c_states, i, "chromium", c.version(), ignoreHTTPSErrors);
                        if (early_abort) {
                            // remove browser from browser_string
                            browser_string = browser_string.replaceAll("c", "");
                        }
                    }
                    if (browser_string.includes("f")) {
                        let early_abort = await dyn_collect(site, rank, inc, url, f, load_timeout, "f", f_states, i, "firefox", f.version(), ignoreHTTPSErrors);
                        if (early_abort) {
                            // remove browser from browser_string
                            browser_string = browser_string.replaceAll("f", "");
                        }
                    }
                    if (browser_string.includes("w")) {
                        let early_abort = await dyn_collect(site, rank, inc, url, w, load_timeout, "w", w_states, i, "webkit", w.version(), ignoreHTTPSErrors);
                        if (early_abort) {
                            // remove browser from browser_string
                            browser_string = browser_string.replaceAll("w", "");
                        }
                    }
                }

            }
        }
    } catch (e) {
        console.log(`${site} failed dynamic confirmation: ${e.message}`);
    } finally {
        await save();
    }
})();