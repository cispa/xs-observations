import json
from collections import Counter

import psycopg2
import h2o
import pandas as pd
import os
import glob
import re
import contextlib
import itertools

sec_rel_headers = [
    "location",
    "content-type",
    "x-frame-options",
    "content-disposition",
    "cross-origin-opener-policy",
    "x-content-type-options",
    "cross-origin-resource-policy",
    "content-security-policy",
]

header_to_header = {
    "location": "Location",
    "content-type": "Content-Type",
    "x-frame-options": "X-Frame-Options",
    "content-disposition": "Content-Disposition",
    "cross-origin-opener-policy": "Cross-Origin-Opener-Policy",
    "x-content-type-options": "X-Content-Type-Options",
    "cross-origin-resource-policy": "Cross-Origin-Resource-Policy",
    "content-security-policy": "Content-Security-Policy",
}

known_cts = ["text/html", "text/css", "application/javascript",
             "video/mp4", "audio/wav", "image/png", "application/pdf", "empty"]
known_unhandled_bodies = set()
known_unhandled_cts = set()

# Methods that can work even though the trees have the same result for both responses
single_methods = {
    "getComputedStyle": ["rgb(0, 0, 255)"],
    "hasOwnProperty-a": ["a=5"],
    "el-error": ["[object ErrorEvent]-undefined-undefined"],
    "el-message": [
        "['Origin: https://172.17.0.1:44300', Message: mes1', 'Origin: https://172.17.0.1:44300, Message: mes1']",
        "Origin: https://172.17.0.1:44300, Message: mes1"],
    "duration": [1, 2],
    "naturalHeight": [50],
    "videoHeight": [100],
    "length": [1, 2],
    "el_securitypolicyviolation.smooth": ["uncalled"],  # Special as we check for not negative instead
}


def fit_header(header, value):
    """Convert headers to fit to our trees."""
    if header == "content-type":
        value = value.split(";")[0]  # Remove charset and stuff
        # All audio/video/javascript/image cts should behave the same
        # (this is not completely correct, e.g., unsupported cts, but should be good enough)
        # Thus change them to the ct we used for building the trees
        if "audio" in value:
            value = "audio/wav"
        elif "video" in value:
            value = "video/mp4"
        elif "javascript" in value:
            value = "application/javascript"
        elif "image" in value:
            value = "image/png"
    elif header == "x-frame-options":
        if value in ["deny", "sameorigin"]:
            value = "deny"  # if xfo is set, it cannot be framed by an attacker
        else:
            value = "empty"  # invalid values are interpreted as not set by (most?) browsers
    elif header == "location":
        value = "http://localhost:8000/echo/"  # if location is set, set it to our location
        # value = "/"  If same-origin redirect
        # If  the states redirect to different locations, we might not see any difference
        # This special case is handled in check_single_methods
    elif header == "content-disposition":
        value = value.split(";")[0]  # Remove filename
        if value == "inline":
            value = "empty"  # inline behaves the same as not set
        else:
            value = "attachment"  # everything else behaves like attachment
    elif header == "x-content-type-options":
        if value == "nosniff":
            value = "nosniff"
        else:
            value = "empty"  # only nosniff should be accepted
    elif header == "cross-origin-opener-policy":
        if value == "unsafe-none":  # unsafe-none should be the same as not set
            value = "empty"
        else:
            value = "same-origin"
    elif header == "cross-origin-resource-policy":
        if value == "cross-origin":  # cross-origin should be the same as not set
            value = "empty"
        else:
            value = "same-origin"
    elif header == "content-security-policy":
        if "frame-src" in value:
            value = "frame-ancestors 'self'"
        else:
            value = "default-src 'self'"
    return value


def fit_code(value):
    if value == -1:
        return 204
    codes = [100, 101, 102, 103, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511, 999]
    # Use the closet code (otherwise h2o crashes)
    return min(codes, key=lambda x:abs(x-value))


def fit_data(data):
    """Process response data to fit to our trees"""
    res = {"URL": data["url"], "state": data["state"], "Status-Code": fit_code(data["resp_code"]), "real_location": ""}
    resp_headers = {k.lower(): v.lower() for k, v in data["resp_headers"].items()}
    for header in sec_rel_headers:
        try:
            # Better processing of headers to fit to our trees!
            tree_header = header_to_header[header]
            if tree_header == "Location":
                res["real_location"] = resp_headers[header].lower()
            res[tree_header] = fit_header(header, resp_headers[header].lower())
        # If header is not in the response, set it to empty
        except KeyError:
            res[header_to_header[header]] = "empty"
    # Parse the body information (just content-type) from the information, we got from the `file` program
    res["body"] = data["resp_body_info"]
    res["resp_body_hash"] = data["resp_body_hash"]
    return pd.Series(res)


def expand_body(row_df):
    """Duplicate rows if response cannot be fit to a single response of our training data due to the body content."""
    # Body according to the file info
    body = row_df["body"].values[0]
    row_df["body"] = "empty"  # Set to empty as default
    if "empty" in body or "" == body:
        return row_df
    # When the content is HTML, all HTML body based leaks might work
    elif "HTML" in body:
        row_df = row_df.loc[row_df.index.repeat(4)]
        row_df["body"].iloc[0] = "ecocnt_html=num_frames=1,input_id=test1"
        row_df["index_i"].iloc[0] = "0"
        row_df["body"].iloc[1] = "ecocnt_html=num_frames=2"
        row_df["index_i"].iloc[1] = "1"
        row_df["body"].iloc[2] = "ecocnt_html=post_message=mes1"
        row_df["index_i"].iloc[2] = "2"
        row_df["body"].iloc[3] = "ecocnt_html=meta_refresh=0;http://localhost:8000/echo/"
        row_df["index_i"].iloc[3] = "3"
        # Never worked, thus not in the trees?
        #row_df["body"].iloc[4] = "paymentAPI=true"
        #row_df["index_i"].iloc[4] = "4"
        return row_df
    # When the body is text, it could be javascript, or css
    elif "ASCII" in body or "UTF-8" in body:
        # ASCII could be script, or css (or json, ...), look at content-type + tika_content_type to infer more info?
        # use some more info when processing?, also compare cookies vs. non-cookies?
        # Depending on that info decide what content to use `ecocnt_css=h1 {color: blue}` for getComputedStyle,
        # `ecocnt_js=.,,.` for onError, `ecocnt_js=var a=5;` for hasOwnProperty, ...
        row_df = row_df.loc[row_df.index.repeat(3)]
        row_df["body"].iloc[0] = "ecocnt_js=var a=5;"
        row_df["index_i"].iloc[0] = "0"
        row_df["body"].iloc[1] = "ecocnt_js=.,,."
        row_df["index_i"].iloc[1] = "1"
        row_df["body"].iloc[2] = "ecocnt_css=h1 {color: blue}"
        row_df["index_i"].iloc[2] = "2"
    elif "image" in body.lower():
        row_df["body"] = "ecocnt_img=width=50,height=50,type=png"
    elif "audio" in body.lower():
        row_df["body"] = "ecocnt_audio=duration=1"
    elif "video" in body.lower():
        row_df["body"] = "ecocnt_vid=width=100,height=100,duration=2"
    elif "pdf" in body.lower():
        row_df["body"] = "ecocnt_pdf=a=a"
    elif "media" in body.lower():
        row_df = row_df.loc[row_df.index.repeat(2)]
        row_df["body"].iloc[0] = "ecocnt_vid=width=100,height=100,duration=2"
        row_df["index_i"].iloc[0] = "0"
        row_df["body"].iloc[1] = "ecocnt_audio=duration=1"
        row_df["index_i"].iloc[1] = "1"
    else:
        if body not in known_unhandled_bodies:
            known_unhandled_bodies.add(body)
            warning_text = f"Warning: unhandled body: according to file {body}"
            print(warning_text)
        else:
            pass
    return row_df


def expand_ct(row_df):
    """Duplicate/change rows due to unknown/unclear content-types."""
    # return several rows for content-type that fit several cases/are unknown?
    ct = row_df["Content-Type"].values[0]

    # Do nothing if the ct is one of the cts used in our tests
    if ct in known_cts:
        return row_df

    # Otherwise, convert some of them
    # If we have no smart conversion rule, treat as ct empty (browser will guess, if xcto is set, result between reality and tree might differ)
    if ct == "application/json":
        row_df["Content-Type"] = "text/html"  # Kinda adhoc? both have CORB protection enabled, so better than empty
    elif ct == "text/plain":
        row_df["Content-Type"] = "empty"
    elif ct == "application/octet-stream":
        row_df["Content-Type"] = "empty"
    else:
        if ct not in known_unhandled_cts:
            known_unhandled_cts.add(ct)
            warning_text = f"Warning: unhandled ct: {ct}"
            print(warning_text)
        row_df["Content-Type"] = "empty"

    return row_df


def expand_input_rows(df):
    """Expand body and content-type for all responses."""
    df = df.copy()
    df.loc[:, "index"] = df.index
    df.loc[:, "index_i"] = "-1"
    # process unknown bodies
    df = df.groupby(["URL", "state"], group_keys=False).apply(expand_body)
    # process unknown headers
    df = df.groupby(["URL", "state"], group_keys=False).apply(expand_ct)
    return df


def basic_pruning(df, site):
    if len(df) == 0:
        return pd.DataFrame(), pd.DataFrame()
    print(f"{site}: Unique URLs: {df['URL'].nunique()}")
    d = df.drop(["state"], axis=1).groupby(["URL"]).nunique()
    # At least one attribute needs to have at least 2 unique values
    # (Status-Code, real_location, body, resp_body_hash, + 8 headers)
    d = d.loc[d.apply(lambda x: any([val != 1 for val in x]), axis=1)]
    df = df.loc[df["URL"].isin(d.index)]
    print(f"{site}: Unique URLs after basic pruning: {df['URL'].nunique()}")
    if len(df) != 0:
        # Expand rows for input of trees
        df = expand_input_rows(df).reset_index()
    return df, d


def check_single_method(row_df, method):
    """For 'single_methods' check whether they could work or not."""
    # Possible improvement: check according to method
    # Currently only check if body hash is the same, for most methods
    # However, not too important as we have dynamic confirmation
    # This should not generate any FNs as a different body hash is required for almost all single methods
    # But it might not be enough (e.g., two images of the same size have different hashes but result in the same observation)
    if len(row_df) == 0:
        return None
    if method == "el_securitypolicyviolation.smooth":
        if row_df["real_location"].nunique() == 1:
            return None
        else:
            return row_df.iloc[0]
    if row_df["resp_body_hash"].nunique() == 1:
        return None
    else:
        return row_df.iloc[0]


def post_process_single(nunique_frame, res, method):
    """Post-process 'single_methods'."""
    if len(nunique_frame) == 0:
        return pd.DataFrame()
    unique_pos_values = single_methods[method]
    # special, check for not negative result (as many positive exist)
    if method == "el_securitypolicyviolation.smooth":
        poss = nunique_frame["unique"].apply(lambda x: True if x != "uncalled" else False)
    # Only check the URLs where all observations have the "positive" result (e.g., image height 50)
    else:
        poss = nunique_frame["unique"].apply(lambda x: True if x in unique_pos_values else False)
    poss = poss[poss == True]
    poss = res.loc[res["URL"].isin(poss.index)].groupby(["URL"], group_keys=False).apply(check_single_method,
                                                                                         method=method)
    return poss


# (win.)performanceAPI.timing.(fetchStart|duration|secureConnectionStart) replace time with >0 or with x
def repl(match):
    try:
        method = match.group(1)
        time = int(match.group(2))
        if time > 0:
            return f'{method}: ">0"'
        else:
            return f"{method}: {time}"
    except Exception as e:
        print(e)
        return match.group(0)


def get_vals(row, data, state):
    opg_url = row.name[0]
    browser = row.name[1]
    version = row.name[2]
    data = data.loc[(data["state"] == state) & (data["opg_url"] == opg_url) & (data["browser"] == browser) & (data["version"] == version)]
    vals = {}
    for prop in row[0]:
        vals[prop] = data[prop].unique().tolist()
    return vals


def group_check(df, group, methods):
    # We need at least 5 rows
    if df.shape[0] != 5:
        return []
    # Methods that have more than one observation in all 5 runs
    working_methods = df[methods].apply(lambda x: True if all(x != 1) else False)
    return working_methods[working_methods].index.to_list()


def get_messages(vals, acc=10):
    mess = {}
    for messages in vals:
        if type(messages) != list:
            if type(messages) == dict:
                messages = [messages]
            else:
                continue
        for m in messages:
            if type(m) != dict:
                continue
            origin = m["Origin"]
            message = m["Message"]
            try:
                mess[origin]["Count"] += 1
                mess[origin]["Messages"].update([round(len(message)/acc)*acc])
            except KeyError:
                d = {"Count": 1, "Messages": Counter()}
                d["Messages"].update([round(len(message)/acc)*acc])
                mess[origin] = d
    return mess


def check_sanity(row):
    methods = set(row[0])
    for key in row["vals_a"].keys():
        # Same value is not allowed to occur for both state_a and state_b
        vals_a = set(row["vals_a"][key])
        vals_b = set(row["vals_b"][key])
        both = vals_a & vals_b
        if len(both) != 0:
            methods.remove(key)
            continue
        vals_a = [val if type(val) == int else json.loads(val) for val in vals_a]
        vals_b = [val if type(val) == int else json.loads(val) for val in vals_b]
        # All lengths of one state have to be larger than the values for the other state
        if key == "length":
            if not (max(vals_a) < min(vals_b) or max(vals_b) < min(vals_a)):
                methods.remove(key)
        # At least one state needs less than 5 unique values for fetch_response
        # Some sites redirect to random URLs, so at least one state should have less than 5 observations
        if key == "fetch_response":
            if len(vals_a) == 5 and len(vals_b) == 5:
                methods.remove(key)
        # Remove sites that received the same "random" postMessages
        if key == "el-message":
            mess_a = get_messages(vals_a)
            mess_b = get_messages(vals_b)
            remove = True
            # One state got a message from a unique origin
            for org in set(mess_a.keys()) ^ set(mess_b.keys()):
                remove = False
                break
                try:
                    if mess_a[org]["Count"] > 4:
                        remove = False
                        break
                except KeyError:
                    if mess_b[org]["Count"] > 4:
                        remove = False
                        break
            else:
                for org in mess_a.keys():
                    # For one origin messages of different length (rounded to nearest 10) were observed
                    for length in set(mess_a[org]["Messages"].keys()) ^ set(mess_b[org]["Messages"].keys()):
                        remove = False
                        break
                        # More advanced idea: the special length needs to occur a certain number of times
                        # Make this dependent on the count of all messages for this origin?
                        try:
                            if mess_a[org]["Messages"][length] > 4:
                                remove = False
                                break
                        except KeyError:
                            if mess_b[org]["Messages"][length] > 4:
                                remove = False
                                break
                    if not remove:
                        break
            if remove:
                methods.remove(key)
        # At least one state needs less than 5 unique values for hasOwnProperty-a
        if key == "hasOwnProperty-a":
            if len(vals_a) == 5 and len(vals_b) == 5:
                methods.remove(key)
        # At least one state needs less than 5 unique values for el-securitypolicyviolation
        # Random redirections
        if key == "el-securitypolicyviolation":
            if len(vals_a) == 5 and len(vals_b) == 5:
                methods.remove(key)

        # Some sites fire load event every some ms
        # Ignore URLs with more than 10 events (in one run) for both states
        if key == "events-fired" or key == "events-fired-all":
            for a, b in zip(vals_a, vals_b):
                if type(a) != list:
                    a = [a]
                if type(b) != list:
                    b = [b]
                if len(a) > 10 and len(b) > 10:
                    methods.remove(key)
                    break

        # perfAPI
        # if 5 different decoded body sizes are observed, then all of one state have to be larger than all of the other state
        if key == "performanceAPI.smooth":
            if len(vals_a) == 5 and len(vals_b) == 5:
                a_decoded = get_decoded(vals_a)
                b_decoded = get_decoded(vals_b)
                if len(a_decoded) == len(b_decoded):
                    if not (max(a_decoded) < min(b_decoded) or max(b_decoded) < min(a_decoded)):
                        methods.remove(key)

    return list(methods)


def get_size(entry):
    return entry["size"]["decodedBodySize"]


def get_decoded(vals):
    decoded = []
    for val in vals:
        if type(val) == list:
            [decoded.append(get_size(v)) for v in val]
        if type(val) == dict:
            decoded.append(get_size(val))
    return decoded


def dumps(row):
    row = row.apply(json.dumps)
    return row


def clean(row):
    working = row[0]
    vals_a = {work: row["vals_a"][work] for work in working}
    vals_b = {work: row["vals_b"][work] for work in working}
    return working, vals_a, vals_b


class Pruner:
    def __init__(self, file_glob="mojo/*_Status-Code.mojo", files=None, initial=False):
        self._conn = psycopg2.connect()
        self._cursor = self._conn.cursor()
        if files is None:
            files = glob.glob(file_glob)
        with open(os.devnull, 'w') as devnull:
            with contextlib.redirect_stdout(devnull):
                if initial:
                    h2o.init(log_level="FATA", nthreads=75, max_mem_size="50G")
                    self._models = [h2o.import_mojo(os.path.abspath(file)) for file in files]
                else:
                    # h2o.init(log_level="FATA", nthreads=10, max_mem_size="10G")
                    h2o.connect()
                    self._models = [h2o.get_model(model_id) for model_id in h2o.models()]
                h2o.no_progress()  # Disable progress bars of h2o
        print(f"h2o init complete: loaded {len(files)} mojos.")

    def select(self, query, params=None):
        try:
            self._cursor.execute(query, params)
            result = self._cursor.fetchall()
        except Exception as error:
            print(f"Error executing query: {query}, error: {error}")
            return None
        else:
            return result

    def update(self, query, params=None):
        try:
            self._cursor.execute(query, params)
            self._conn.commit()
        except Exception as error:
            print(f"Error executing query: {query}, error: {error}")
        finally:
            return None

    def __del__(self):
        self._cursor.close()
        self._conn.close()

    def get_urls(self, site):
        tuples = self.select("SELECT * FROM responses WHERE site = %s", (site,))
        df = pd.DataFrame(tuples, columns=["id", "site", "url", "state", "req_headers", "resp_code", "resp_headers",
                                           "resp_body_hash", "resp_body_info", "frames", "error_text",
                                           "insertion_time"])
        df = df.apply(fit_data, axis=1)
        input_rows, pruned_urls = basic_pruning(df, site)
        if len(df) > 0:
            crawled_urls = json.dumps(df["URL"].unique().tolist())
        else:
            crawled_urls = json.dumps([])
        if len(input_rows) > 0:
            after_basic = json.dumps(input_rows["URL"].unique().tolist())
        else:
            after_basic = json.dumps([])
        finished = len(input_rows) == 0
        self.update("UPDATE site SET crawled_urls = %s, after_basic = %s, finished = %s WHERE site = %s", (crawled_urls, after_basic, finished, site,))
        return input_rows, pruned_urls

    def predict_trees(self, input_rows, site):
        """"Get the predictions for all fitted responses."""
        hf = h2o.H2OFrame(input_rows)
        output = {}
        # Predict for every working method/model/tree
        for model in self._models:
            model_name = model.actual_params["path"]
            inc = model_name.split("mojo/")[1].split("_")[0]
            browser = re.search("(chromium|firefox|webkit)", model_name)[0][0]
            try:
                res = h2o.as_list(model.predict(hf))
                if res["predict"].nunique() > 0:
                    res = res.rename(columns={"predict": f"predict_{model_name}"})
                    res = pd.concat([input_rows, res[[f"predict_{model_name}"]]], axis=1)
                    info = res.groupby(["URL"])[f"predict_{model_name}"].agg(["nunique", "unique"])
                    valid = info[info["nunique"] > 1]
                    for method in single_methods.keys():
                        if method in model_name:
                            # For the methods that do not necessarily need two records according
                            # also check if they work if only one value was predicted
                            new_valids = post_process_single(info[info["nunique"] == 1], res, method)
                            valid = pd.concat([valid, new_valids])
                            break
                    diff_preds = res.loc[res["URL"].isin(valid.index)]
                    urls = diff_preds["URL"].unique()

                    for url in urls:
                        try:
                            inc_list = output[inc]
                            browser_list = inc_list.get(url, "")
                            browser_list += browser
                        except KeyError:
                            output[inc] = {}
                            browser_list = browser
                        finally:
                            output[inc][url] = browser_list

            except Exception as e:
                print(f"{site}-{model_name} crashed predict_trees: {repr(e).split('stacktrace')[0]}")
        hf.detach()
        finished = len(output) == 0
        self.update("UPDATE site SET after_trees = %s, finished = %s WHERE site = %s", (json.dumps(output), finished, site,))
        return output

    def get_confirmed(self, site):
        tuples = self.select("SELECT * FROM dyn_conf WHERE site = %s and not error", (site,))
        df = pd.DataFrame(tuples, columns=["id", "browser", "version", "site", "opg_url", "url", "inc_method", "state", "run", "observation", "error_run", "notes", "response", "insertion_time"])
        if len(df) == 0:
            return {}
        obs = pd.json_normalize(df["observation"], max_level=0)
        methods = set(obs.columns)
        methods.remove("loading_time")
        methods.remove("complete_time")
        df = df.merge(obs, left_index=True, right_index=True)
        df[df.select_dtypes(['object']).columns] = df.select_dtypes(['object']).apply(dumps, axis=1)
        for method in ["win.performanceAPI", "performanceAPI"]:
            smooth = f"{method}.smooth"
            df[smooth] = df[method].str.replace('("duration"|"fetchStart"|"secureConnectionStart"|"redirectStart"|"redirectEnd"|"transferSize"|"encodedBodySize"): (\d+)', repl, regex=True)
            # Some are very long?, smooth
            df[smooth] = df[smooth].apply(lambda x: "<too long>" if len(x) > 1000 else x)
            methods.remove(method)
            methods.add(smooth)

        # Compute results
        # Make binary comparisons between all states
        result_dict = {}
        states = df["state"].unique()
        for (state_a, state_b) in list(itertools.combinations(states, 2)):
            state_a, state_b = sorted((state_a, state_b))
            data = df.loc[df["state"].isin([state_a, state_b])]
            res = data.groupby(["opg_url", "browser", "version", "run", "inc_method", "url"]).nunique()
            res = res[list(methods)]
            # Get all rows that have at least one observation method that differs in a run (between the states)
            res = res.loc[res.apply(lambda row: any([prop != 1 for prop in row]), axis=1)]
            # Get all rows that have the same observation method that differs in all 5 runs
            if len(res) == 0:
                continue
            res = res.reset_index().groupby(["opg_url", "browser", "version", "inc_method", "url"]).apply(lambda x: group_check(x, x.name, list(methods))).to_frame().sort_values(by=["url", "browser", "version", "inc_method"])
            res = res.loc[res[0].astype(bool)]
            if len(res) == 0:
                continue
            res["vals_a"] = res.apply(lambda x: get_vals(x, data, state_a), axis=1)
            res["vals_b"] = res.apply(lambda x: get_vals(x, data, state_b), axis=1)
            # Remove observations methods that have the same value in both states (or other stuff that is not allowed)
            res[0] = res[[0, "vals_a", "vals_b"]].apply(check_sanity, axis=1)
            # Remove rows that have no observation method left
            # print(f"Removed rows: {res.loc[~res[0].astype(bool)]}")
            res = res.loc[res[0].astype(bool)]
            if len(res) == 0:
                continue
            # Remove vals_a, vals_b of methods that were removed by the sanity check
            res[[0, "vals_a", "vals_b"]] = res.apply(clean, axis=1, result_type="expand")
            # Remaining confirmed results
            print(f"{site}: {state_a}-{state_b} can be distinguished by the following pairs:")
            print(res.reset_index()[["url", "browser", "inc_method"]].head(3))
            result_dict[f"{state_a}-{state_b}"] = res.reset_index().to_dict(orient="records")

        self.update("UPDATE site SET confirmed_urls = %s, finished = TRUE WHERE site = %s", (json.dumps(result_dict), site,))
        return result_dict


if __name__ == "__main__":
    pruner = Pruner(files=["../mojo/img_events-fired_chromium_Status-Code.mojo", "../mojo/img_events-fired_firefox_Status-Code.mojo"], initial=True)
    input_rows, basic_pruned = pruner.get_urls("echo.org")
    preds = pruner.predict_trees(input_rows, "echo.org")
    print(preds)
    #pruner.get_confirmed("echo.org")

