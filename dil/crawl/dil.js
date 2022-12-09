const {collect_urls} = require("./url_collector.js");
const {collect_responses} = require("./response_collector");
const {chromium} = require("playwright");
const {get_client, execute_query, close_browser, sleep} = require("./utilities");
const _ = require("underscore");
const nodeCleanup = require('node-cleanup');



let browser;
let client;
let site = "undefined";
let rank = -1;
let url_dict = {};
let url_dict_login = {};
let url_list = [];
let error = "";

const save = async () => {
    try {
        const query = {
            text:
                `INSERT INTO site(site, rank, urls, crawl_urls, error, login_urls)
                 VALUES ($1, $2, $3, $4, $5, $6)
                `,
            values: [site, rank, JSON.stringify(Object.values(url_dict)), JSON.stringify(url_list), error, JSON.stringify(Object.values(url_dict_login))]
        }

        await execute_query(client, query);
        await client.end();
    } catch (e) {
       console.log(`${site}: Error in save query: ${e.message}`);
    } finally {
        await close_browser(browser);
        process.exit(0);
    }
}

const cleanup = async () => {
    await save();
}

nodeCleanup( (exitCode, signal) => {
    console.log(`${site}-dil.js: code=${exitCode}, signal=${signal}`);
    if (signal) {
        nodeCleanup.uninstall();
        cleanup().then(() => process.kill(process.pid, signal));
        return false;
    }
    return true;
});


(async () => {
    site = process.argv[2];
    rank = parseInt(process.argv[3]);
    let ignoreHTTPSErrors = Boolean(process.argv[4]);
    let login = Boolean(process.argv[8]); 
    let load_timeout = parseInt(process.argv[5]); // 20000;
    let button_timeout = parseInt(process.argv[6]); // 10000;
    let max_urls = parseInt(process.argv[7]); // 100;
    client = await get_client()
    browser = await chromium.launch({
        headless: false,
    });
    const context = await browser.newContext({ignoreHTTPSErrors: ignoreHTTPSErrors});

    // Open new page
    const page = await context.newPage();
    error = "";
    try {
        url_dict = await collect_urls(site, page, load_timeout);
        await context.close();
        // If login also collect URLs from logged in context
        if (login) {
            const base_path = "/data/data/account_framework/auth";  // ToDo: make base_path configurable
            const login_context = await browser.newContext({ignoreHTTPSErrors: ignoreHTTPSErrors, storageState: `${base_path}/${site}.json`});
            const login_page = await login_context.newPage();
            url_dict_login = await collect_urls(site, login_page, load_timeout);
            await login_context.close();
        }
    } catch (e) {
        url_dict = {};
        error += e.message;
    }
    url_list = [];
    if (!login) {
        url_list = Object.keys(url_dict);
        url_list = _.sample(url_list, max_urls);
    } else {
        // Union of the URLs found in both login/visited crawl
        url_list = _.union(Object.keys(url_dict), Object.keys(url_dict_login));
        // Remove potential logout URLs from the set of tested URLs
        let logout_regex = /log.?out|sign.?out|logoff|signoff|exit|quit|invalidate/i;
        let potential_logout_urls = _.filter(url_list, (x) => x.match(logout_regex));
        console.log(`Potential logout urls: ${potential_logout_urls}`);
        url_list = _.filter(url_list, (x) => !x.match(logout_regex));
        // Sample 2x max urls 
        url_list = _.sample(url_list, 2*max_urls);
    }
    

    try {
        await collect_responses(site, rank, url_list, browser, load_timeout, button_timeout, "chromium", browser.version(), ignoreHTTPSErrors, login);
    } catch (e) {
        error += e.message;
    } finally {
        await save();
    }
})();