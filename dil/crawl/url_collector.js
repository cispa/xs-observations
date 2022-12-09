const {URL} = require('url');
const psl = require('psl');

const collect_urls = async (site, page, load_timeout) => {
    let url_set = new Set();
    let url_dict = {};
    const add_url = (url_string, type) => {
        try {
            let url = new URL(url_string);
            if (["https:", "http:"].includes(url.protocol)) {
                let entry;
                if (url in url_set) {
                    entry = url_dict[url];
                } else {
                    entry = {"url": url.href, "count": 0, "request": false, "link": false, "same-site": true}
                    url_set.add(url);
                    entry["same-site"] = psl.get(url.hostname) === site;
                }
                entry["count"] = entry["count"] + 1
                entry[type] = true;
                url_dict[url] = entry;

            } else {
                // console.log(`Invalid scheme: ${url_string}, ${type}`);
            }
        } catch (e) {
            // console.log(`Invalid URL: ${url_string}, ${type}`);
        }
    }

    // Listen to all requests issued by the page
    page.on("request", (request) => {
        add_url(request.url(), "request");
    });

    // Open page
    await page.goto(`https://${site}/`, {waitUntil: "load", timeout: load_timeout});

    // Extract links
    const link_urls = await page.$$eval("a", (link_list) => {
        return link_list.map(link => link.href);
    });
    for (let url of link_urls) {
        add_url(url, "link");
    }

    return url_dict;

};

exports.collect_urls = collect_urls;