// Global object stores
const observation_store = {};
const data_store = {};
const then_callbacks = [];
const error_callbacks = [];
const finally_callbacks = [];

// Correctly log DOMExceptions
DOMException.prototype.toJSON = function() {
    return {
        name: this.name,
        message: this.message,
        code: this.code,
        result: this.result,
        data: this.data
    }
};

// Helper function to store data
const store_data = (key, data) => {
    data_store[key] = data;
}

// Helper function to retrieve data
const get_data = (key) => {
    if (key in data_store) {
        return data_store[key];
    }
    return null;
}

// Log timing information
store_data("start_time", Date.now());
window.addEventListener('load', () => {
    log_observation("loading_time",Date.now() - get_data("start_time"));
});

// Add an observation for a given key
// If the same key has several observations, a list is created
const log_observation = (key, obs) => {
    if (key in observation_store) {
        let old_obs = observation_store[key];
        if (Array.isArray(old_obs)) {
            old_obs.push(obs);
            observation_store[key] = old_obs;
        }
        else {
            observation_store[key] = [old_obs, obs];
        }
    } else {
        observation_store[key] = obs;
    }
}

// Extract all observations, log and return
// Observations that did not occur are logged as "uncalled"
const record_observations = () => {
    log_observation("complete_time", Date.now() - get_data("start_time"));
    // Fix uncalled methods + values that cannot be JSON-stringified 
    for (let key in observation_methods){
        if (!(key in observation_store)){
            observation_store[key] = "uncalled";
        } else if (observation_store[key] === undefined) {
            observation_store[key] = "js-undefined";
        } else if (observation_store[key] === null) {
            observation_store[key] = "js-null";
        } else if (Number.isNaN(observation_store[key])) {
            observation_store[key] = "js-NaN";
        }

    }
    console.log(observation_store);
    return observation_store;
}

// Function that gets executed when the `record and save data` button is clicked
// Calls all `after` methods, then extracts the observations and displays them in a table
const manual_observation = async () => {
    after_obs();
    await new Promise(r => setTimeout(r, 500));
    const data = record_observations();
    const table = document.createElement("table");
    for (let [key, observation] of Object.entries(data)) {
        let tr = table.insertRow(-1);
        let tabCell = tr.insertCell(-1);
        tabCell.innerHTML = key;
        tabCell = tr.insertCell(-1);
        tabCell.innerHTML = observation;
        tabCell = tr.insertCell(-1);
        tabCell.innerHTML = JSON.stringify(observation);
    }
    document.body.appendChild(table);
}



// 1. All `before` observation functions are called
const before_obs = () => {
    for (let [name, observation_method] of Object.entries(observation_methods)){
        if ("before" in observation_method) {
            observation_method["before"]();
        }
    }
}

// 2. All inclusion methods are defined
const define_incs = (url, inc, echo) => {
    try {
        inclusion_methods[inc]["definition"](url, echo);
    } catch (e) {}
}

// 3. All `between` observation functions are called
const between_obs = () => {
    let el = get_data("el");
    let win = get_data("win");
    for (let [name, observation_method] of Object.entries(observation_methods)){
        if ("between" in observation_method) {
            observation_method["between"](el, win);
        }
    }
}

// 4. All inclusion methods are instantiated
const instantiate_incs = (url, inc, echo) => {
    try {
        inclusion_methods[inc]["instantiation"](url, echo, then_callbacks, error_callbacks, finally_callbacks);
    } catch (e) {}
}

// 5. All `after` observation methods are called
const after_obs = () => {
    let url = get_data("url");
    let el = get_data("el");
    let win = get_data("win");
    for (let [name, observation_method] of Object.entries(observation_methods)){
        if ("after" in observation_method) {
            observation_method["after"](el, win, url);
        }
    }
}

// Helper function to add then callback
const add_then = (func) => {
    then_callbacks.push(func);
}

// Helper function to add error callback
const  add_error = (func) => {
    error_callbacks.push(func);
}

// Helper function to add finally callback
const  add_finally = (func) => {
    finally_callbacks.push(func);
}
