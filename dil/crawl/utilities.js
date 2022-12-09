const {Client} = require("pg");
const {exec} = require("child_process");
const crypto = require("crypto");
const fs = require("fs");

const get_client = async () => {
    let client = new Client();
    await client
        .connect()
        .then()
        .catch(err => {
            console.error('connection error', err.stack);
            throw Error('connection error');
        });
    return client;
}

const execute_query = async (client, query) => {
    await client.query(query)
            .then()
            .catch(e => {
                throw Error(e.stack)
            });
}


const exec_command = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            resolve(stdout ? stdout : stderr);
        });
    });
}


const get_hash_info = async (resp_body) => {
    let resp_body_hash = crypto.createHash('md5').update(resp_body).digest('hex');
    let path = `body_dir/${resp_body_hash[0]}/${resp_body_hash[1]}/${resp_body_hash}`
    await fs.promises.writeFile(path, resp_body, {flag: "wx"})
        .catch(err => {
            // File exists
        });
    let resp_body_info = await exec_command(`file ${path}`);
    await exec_command(`gzip ${path}`);
    return [resp_body_hash, resp_body_info.split(`${path}: `)[1]];
}

const close_browser = async (browser) => {
    try {
        await browser.close();
    } catch (e) {
        console.log(`Browser crashed!: ${e.message}`);
    }
}

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

exports.get_client = get_client;
exports.execute_query = execute_query;
exports.exec_command = exec_command;
exports.get_hash_info = get_hash_info;
exports.close_browser = close_browser;
exports.sleep = sleep;