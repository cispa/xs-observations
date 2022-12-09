const {prepare_states} = require("./prepare_states");
const {get_client, execute_query, get_hash_info} = require("./utilities");
const fs = require('fs');

for (let first of "0123456789abcdef") {
    for (let second of "0123456789abcdef") {
        fs.promises.mkdir(`body_dir/${first}/${second}`, {recursive: true}).catch(console.error);
    }
}


const collect_responses = async (site, rank, urls, browser, load_timeout, button_timeout, browser_name, version, ignoreHTTPSErrors, login) => {
    let client = await get_client();
    let states;
    if (login) {
        states = ["_visitedl", "_login"]; 
    } else {
        states = ["_ano", "_visited", "_accepted"];
    }
    // states = ["_ano"];
    let info = "01_cc";
    states = await prepare_states(site, rank, states, load_timeout, button_timeout, browser, info, browser_name, version, ignoreHTTPSErrors);
    // Continue if at least two states worked
    if (states.length >= 2) {
        for (let url of urls) {
            for (let state of states) {
                const context = await browser.newContext({
                    storageState: `context_dir/${Math.floor(rank/100)}/${rank}_${site}_${state}_${info}.json`,
                    ignoreHTTPSErrors: ignoreHTTPSErrors
                });
                // Open new page
                const page = await context.newPage();

                let resp_body_hash = "";
                let resp_headers = {};
                let req_headers = {};
                let resp_code = -1;
                let error_text = "";
                let resp_body_info = "";
                let frames = 0;
                try {
                    // Successful requests (we only care about the first top-level request)
                    page.on("response", (async response => {
                        if (response.url() === url) {
                            let request = await response.request();
                            try {
                                let resp_body = await response.body();
                                let body = await get_hash_info(resp_body);
                                resp_body_hash = body[0];
                                resp_body_info = body[1];
                            } catch (e) {
                                // console.log(e.message);
                            }
                            try {
                                resp_headers = await response.allHeaders();
                                req_headers = await request.allHeaders();
                                resp_code = response.status();
                            } catch (e) {
                            }
                        } else {
                            // console.log(`Other request: ${request.url()}`);
                        }
                    }));

                    // Failed requests (we only care about the first top-level request
                    page.on("requestfailed", (async request => {
                        if (request.url() === url) {
                            try {
                                error_text = request.failure().errorText;
                                // console.log(`Main request failed! ${error_text}`);
                                req_headers = await request.allHeaders();
                            } catch (e) {
                            }
                        } else {
                            // console.log(`Other request failed: ${request.url()}`);
                        }
                    }));


                    try {
                        await page.goto(url, {waitUntil: "load", timeout: load_timeout});
                    } catch (e) {
                        // console.log(`Goto failed: ${e.message}`);
                    }
                    await page.waitForTimeout(2000);
                    frames = await page.evaluate(() => window.frames.length);
                } catch (e) {
                    // console.log(e.message);
                }

                // console.log(url, state, resp_code, req_headers, resp_headers, resp_body_hash, resp_body_info, frames);

                // Save to DB
                const query = {
                    text:
                        `INSERT INTO responses(site, url, state, req_headers, resp_code, resp_headers,
                                               resp_body_hash,
                                               resp_body_info, frames, error_text)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        `,
                    values: [site, url, state, JSON.stringify(req_headers), resp_code, JSON.stringify(resp_headers),
                        resp_body_hash, resp_body_info, frames, error_text]
                }
                await execute_query(client, query);

                // Close context and start next state or URL
                await context.close();
            }
        }
    }
    // Close db connection
    await client.end()
}

//collect_responses("google.com", ["https://google.com/abc"]);

exports.collect_responses = collect_responses;