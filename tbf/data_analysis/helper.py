import os
import sys
import glob
import time
import json
import contextlib
from datetime import datetime
from datetime import date

import pandas as pd
import numpy as np

from database_connector import connect, postgresql_to_dataframe, to_cat, postgresql_to_dataframe_fast


def get_url_dict():
    url_dict = pd.read_pickle("../echo/url_dict.pickle")
    ver = url_dict["version"]
    url_entries = []
    for url_id in url_dict:
        if url_id == "version":
            continue
        entry = {
            "url_dict_version": ver,
            "url_id": url_id}
        for el, val in url_dict[url_id].items():
            if  el.startswith("ecocnt"):
                entry["body"] = f"{el}={val[0]}"
            elif el == "ecohd_status":
                entry["Status-Code"] = val[0]
            else:
                entry[el] = val[0]
        url_entries.append(entry)

    uf = pd.DataFrame.from_records(url_entries)
    uf = uf.fillna("empty")
    uf[uf.select_dtypes(['object']).columns] = uf.select_dtypes(['object']).astype(str)
    uf[uf.select_dtypes(['object']).columns] = uf.select_dtypes(['object']).apply(to_cat)
    return uf
    
        
def get_data(browser, inc, param_dict, limit=None, log=True):
    conn = connect(param_dict)
    column_names = ["id", "browser", "version", "headless", "url", "url_id", "inc_method", 
                    "run", "retry", "insertion_time", "observation", "error_run", "notes", 
                    ]
    if browser == "webkit":
        column_names = column_names[1:] + column_names[:1]
    # Execute the "SELECT *" query
    limit_string = f"LIMIT {limit}" if limit else ""
    df = postgresql_to_dataframe(conn, f"select * from observations WHERE browser = '{browser}' and inc_method = '{inc}' {limit_string}", column_names, non_cat=["observation"])
    conn.close()
    
    uf = get_url_dict()
    res = pd.merge(df, uf, on=["url_id"])
    
    if log:
        print(df.info())
        df.tail()
        res.info()
        
    return res, uf


# (win.)performanceAPI.timing.(fetchStart|duration) replace time with >0 or with x
def repl(match): 
    try:
        method = match.group(1)
        time = int(match.group(2))
        if time > 0:
            return f"{method}: >0"
        else:
            return f"{method}: {time}"
    except Exception as e:
        print(e)
        return match.group(0)

    
def smooth_data(res, methods):
    # Smoothing

    # Timing: on/off only
    for timing_method in ['complete_time', 'loading_time']:
        smooth = f"{timing_method}.smooth"
        res[smooth] = res[timing_method].apply(lambda x: ">0" if x > 0 else x)
        try:
            methods.remove(timing_method)
            methods.add(smooth)
        except KeyError:
            print(f"{timing_method} could not be removed")

    # Securitypolicyviolation, remove URL
    method = "el-securitypolicyviolation"
    smooth = f"{method}.smooth"
    res[smooth] = res[method].str.replace("/echo/(.*)/", "/echo/<redacted>/", regex=True)
    try:
        methods.remove(method)
        methods.add(smooth)
    except KeyError:
        print(f"{method} could not be removed")

    # Remove time from performanceAPI + remove very long entries
    for method in ["win.performanceAPI", "performanceAPI"]:
        smooth = f"{method}.smooth"
        res[smooth] = res[method].str.replace("('duration'|'fetchStart'): (\d+)", repl, regex=True)
        # Some are very long?, smooth
        res[smooth] = res[smooth].apply(lambda x: "<too long>" if len(x) > 1000 else x)
        try:
            methods.remove(method)
            methods.add(smooth)
        except KeyError:
            print(f"{method} could not be removed")
            
    # Convert new methods to category
    res[res.select_dtypes(['object']).columns] = res.select_dtypes(['object']).apply(to_cat)
    return res, methods


def transform_data(res, log=True):
    # Drop the uf columns again (not needed for now)
    res = res.drop(columns=['insertion_time','url_dict_version', 'ecohd_status_groups', 'X-Content-Type-Options',
           'X-Frame-Options', 'Content-Type', 'Content-Disposition',
           'Cross-Origin-Resource-Policy', 'Cross-Origin-Opener-Policy',
           'Location', 'Content-Security-Policy', 'body', 'Status-Code'])
    
    # Remove error runs (they have no observations), important to reset the index afterwards!
    res = res.drop(res.loc[res["error_run"]].index).reset_index()
    
    # Convert json to columns; only the top-level
    obs = pd.json_normalize(res["observation"], max_level=0)
    res = res.merge(obs, left_index=True, right_index=True)
    methods = set(obs.columns)
    
    # Map object to string, then category, for fast processing (direct category not working with list/dict values)
    # We then only have category + int left of observations
    res[res.select_dtypes(['object']).columns] = res.select_dtypes(['object']).astype(str)
    res[res.select_dtypes(['object']).columns] = res.select_dtypes(['object']).apply(to_cat)
    method_unique_count = res[list(methods)].nunique().sort_values(axis=0, ascending=False)
    smoothing = method_unique_count[method_unique_count > 9].index.tolist()

    if log:
        display(method_unique_count.to_frame().head(5))
        print(f"Methods that might need smoothing: {smoothing}\n")
        for method in smoothing:
            print(f"Method: {method}, first 5 values: {res[method].unique().tolist()[:5]}\n")
    
    res, methods = smooth_data(res, methods)

    # Convert every observation method to it's own row
    inc_methods = res["inc_method"].unique()
    browsers = res["browser"].unique()
    results = res[["browser", "run", *methods, "url_id", "inc_method"]]
    results = results.melt(id_vars=["browser", "url_id", "run", "inc_method"], 
            var_name="observation_method", 
            value_name="observation")
    results[results.select_dtypes(['object']).columns] = results.select_dtypes(['object']).apply(to_cat)
    
    return results, methods

        
def remove_cannot_work(results, log=True):
    leak_channel_count = results.groupby(["browser", "inc_method", "observation_method"])["observation"].nunique()
    lcc = leak_channel_count.to_frame().reset_index()
    cannot_work = leak_channel_count.loc[leak_channel_count <= 1].reset_index()
    can_work = leak_channel_count.loc[leak_channel_count >= 2].reset_index()
    if log:
        print("Number of channels with a certain observation count")
        print(can_work["observation"].value_counts())
        
    can_work_index = can_work.set_index(["browser", "inc_method", "observation_method"]).index
    # Keep the subset of leak channels of the flat result that have at least two diffent observations
    all_obs = len(results)
    results = results.set_index(["browser", "inc_method", "observation_method"])
    results = results.loc[results.index.isin(can_work_index)]
    results = results.reset_index()
    might_work = len(results)
    results = results.loc[results.duplicated(subset=["browser", "url_id", "inc_method", "observation_method"], keep=False)]
    two_obs = len(results)
    if log:
        print(f"All observations: {all_obs}, all that might work: {might_work}, all that might work and have at least two observations: {two_obs}")
    return results


def remove_unstable(results, base_dir, conf=0.01, log=True):
    # Stability estimations
    groups = results.groupby(["browser", "inc_method", "observation_method"])
    stability_frame = pd.DataFrame({"browser": [], "inc_method": [], "observation_method": [], "count": [], "diff": [], "ratio": []})
    remove = pd.DataFrame()
    for _, group in groups:
        count = len(group)
        diff_results = group.drop_duplicates(subset=["inc_method", "url_id", "observation"], keep=False)
        diff = len(diff_results)
        remove = pd.concat([remove, diff_results])
        ratio = diff/count
        browser = group.iloc[0]["browser"]
        inc_method = group.iloc[0]["inc_method"]
        observation_method = group.iloc[0]["observation_method"]
        stability_frame.loc[len(stability_frame)] = [browser, inc_method, observation_method, count, diff, ratio]
    #remove = remove.merge(uf, on=["url_id"])
    
    stability_frame = stability_frame.sort_values("ratio", ascending=False)
    if log:
        # Unstable: 
        # chromium all -> paymentAPI
        # firefox audio, video -> events-fired-all; events-fired (Maybe replace with smooth version? only if error is fired or not?)
        with pd.option_context("display.max_rows", 1000):
            display(stability_frame)
    
    inc = results["inc_method"].unique().to_list()
    browser = results["browser"].unique().to_list()
    stability_frame.to_csv(f"{base_dir}/stab/{inc}_{browser}.csv")
    
            
    # Remove unstable methods 
    perfect_stable = stability_frame.loc[stability_frame["ratio"] == 0]
    unstable = stability_frame.loc[stability_frame["ratio"] >= conf]
    stable_enough = stability_frame.loc[stability_frame["ratio"].between(0, conf, inclusive="neither")]
    stable = pd.concat([perfect_stable, stable_enough])
    if log:
        print(f"Conf for unstable: {conf}, unstable: {len(unstable)}, stable enough: {len(stable_enough)}, perfecty stable {len(perfect_stable)}, stable: {len(stable)}, all: {len(stability_frame)}")

    # Remove unstable methods
    unstable_index = unstable.set_index(["browser", "inc_method", "observation_method"]).index
    results = results.set_index(["browser", "inc_method", "observation_method"])
    results = results.loc[~results.index.isin(unstable_index)]
    results = results.reset_index()
    
    # Remove all observations from tests with more than one result ("flaky" tests) (even if the method is stable enough)
    # Also remove all other observations for that test as the test likely is broken at least once
    remove = remove.loc[remove["observation_method"].isin(stable["observation_method"].unique())]  # Otherwise, we would also remove tests that only differed in an unstable method
    remove = remove.set_index(["browser", "inc_method", "url_id"])
    results = results.set_index(["browser", "inc_method", "url_id"])
    results = results.loc[~results.index.isin(remove.index)].reset_index()

    # Remove channels with only one observation left 
    if len(stable) > 0:
        results = remove_cannot_work(results, log=False)
    
    return results


def observation_stats(results, threshold=200):
    # Display count of values
    leak_channel_value_count = results.groupby(["browser", "inc_method", "observation_method"])[["observation"]].value_counts().to_frame().reset_index("observation")
    # How few observations are enough to say it's a fluke? (fixed at 100, 128 is the lowest with correct results?, some remaining with wrong results over 100, e.g. onblur)
    # remove them and if then only one observation remains for that leak channel, remove it from the set of working ones
    leak_channel_value_count = leak_channel_value_count.loc[leak_channel_value_count[0] != 0]  # Values are category, so hide 0 elements
    with pd.option_context("display.max_rows", 121):
        display(leak_channel_value_count.loc[leak_channel_value_count[0] <= threshold].sort_values(0, ascending=False))

        
# Check sameness of remaning channels
def check_occur_together(a, b):
    len_a = len(np.unique(a))
    len_b = len(np.unique(b))
    c = set(zip(a,b))
    if len_a == len_b == len(c):
        return 1
    else:
        return 0

    
def to_codes(column):
    return column.astype("category").cat.codes



def replace_string(row):
    if type(row) == str:
        return row.replace('"', "")
    return row


def check_sameness(results, base_dir, log=True, threshold=32):
    # Also removes very rare observations
    groups = results.groupby(["inc_method", "browser"])
    # How many remaining channels are the "same"/leak the same information  
    # Compare observation methods for each inclusion method
    same_dict = {}
    to_remove = pd.DataFrame()
    to_remove_count = 0
    for (inc_method, browser), group in groups:
        if log:
            print(inc_method, browser)
        observation_methods = group["observation_method"].unique()
        test = group.set_index(["browser", "inc_method", "observation_method", "url_id"])["observation"].unstack("observation_method").reset_index()
        if not inc_method in same_dict:
            same_dict[inc_method] = {}
        
        # " is not allowed in text for later query
        for observation_method in observation_methods:
            test[observation_method] = test[observation_method].apply(replace_string)
        
        # This method has problems with na (i.e, not for every observation_method an entry exist), but should not matter as all offending rows are removed in remove_unstable
        same_channels_dat = test[observation_methods].value_counts().to_frame()
        if log:
            display(same_channels_dat)
        same_channels_dat.to_csv(f"{base_dir}/same/{inc_method}_{browser}.csv")
        
        # Save all the rows, with less than threshold observations to remove later
        to_remove_index = same_channels_dat.loc[same_channels_dat[0] < threshold].reset_index()
        to_remove_count += to_remove_index[0].sum()
  
        for _, row in to_remove_index.iterrows():
            conds = ""
            for observation_method in observation_methods:
                conds += f"`{observation_method}` == "
                obs = row[observation_method]
                if type(obs) == str:
                    conds += f'"{obs}"'
                else:
                    conds += f"{obs}"
                conds += " & "
            conds = conds[:-2]
            to_remove = pd.concat([to_remove, test.query(conds)])
        
        # Special removals (they have more than threshold observations, but are still incorrect/noise)
        # Firefox link-stylesheet events-fired == uncalled, script events-fired == uncalled, embed-img perfAPI.smooth == uncalled
        # ...
        if browser == "firefox" and inc_method in ["link-stylesheet", "script"]:
            to_remove = pd.concat([to_remove, test.query('`events-fired` == "uncalled"')])
            to_remove_count = len(to_remove)
        if browser == "firefox" and inc_method == "embed-img":
            to_remove = pd.concat([to_remove, test.query('`performanceAPI.smooth` == "uncalled"')])
            to_remove_count = len(to_remove)
        
        # Get correlations
        same_channels_corr = same_channels_dat.loc[same_channels_dat[0] > threshold].reset_index()[observation_methods].apply(to_codes).corr(method=check_occur_together)
        observation_methods = list(same_channels_corr.columns)
        same_channels = sorted([l.tolist() for l in list(same_channels_corr.groupby(list(observation_methods)).groups.values())], reverse=True, key=len)
        same_dict[inc_method][browser] = (same_channels_dat, same_channels_corr, same_channels)
        if log:
            print(f"Same channels: {same_channels}") 
            print(f"Rows to be removed: {to_remove_count}, rows selected {len(to_remove)}")
            
    # Drop rows with very rare observations
    # to_remove_count * len(observation_methods) rows are removed
    if len(to_remove) > 0:
        t = results.loc[(results["browser"].isin(to_remove["browser"])) & (results["url_id"].isin(to_remove["url_id"])) & (results["inc_method"].isin(to_remove["inc_method"]))]
        t = t.set_index(["browser", "url_id", "inc_method"])
        t = t.loc[t.index.isin(to_remove.set_index(["browser", "url_id", "inc_method"]).index)].reset_index()
        results = pd.concat([results, t])
        results = results.drop_duplicates(keep=False)
    return results, same_dict


def create_trees(results, uf, base_dir, log=True, return_early=False):
    tree_data = results.merge(uf, on=["url_id"])
    tree_data = tree_data.rename(columns={"ecohd_status_groups": "Status-Groups"})
    #tree_data = tree_data.rename(columns={"ecohd_status_groups2": "Status-Groups"})

    if log:
        tree_data.head()

    with open(os.devnull, 'w') as devnull:
        with contextlib.redirect_stdout(devnull):  
            import h2o
            h2o.init(nthreads=50, max_mem_size="100G")
            from tree import create_tree_dirs, make_tree
            if not log:
                h2o.no_progress()  # Disable progress bars of h2o

            
    # Create decision trees for every test_property with the given prediction properties
    import warnings
    warnings.filterwarnings("ignore", "Dropping bad") # Ignore the warning that some columns are constant (they will just be ignored)
    warnings.filterwarnings("ignore", "Sample rate") # Ignore that we do not have a test dataset (this is what we want)
    
    result_texts = set()
    for status in ["Status-Groups", "Status-Code"]:
    #for status in ["Status-Code"]:
        config = {
            "h2o_jar": "/data/xsleaker/xsleaker/h2o-3.32.1.3/h2o.jar",
            "base_dir": base_dir,
            "ntrees": 1,
            "max_depth": 0, # Limit the depth of the tree (0: unlimited)
            "min_rows": 8, # 1 # Minimum number of rows for a leaf node
            "stopping_rounds": 2,
            "stopping_metric": "auto",
            "seed": 42,
            "mtries": -2, 
            "sample_rate": 1,
            "min_split_improvement": 0.005, # 0.01 # 0; Problem this is independent from depth, I would like to increase the value with the depth (workaround, change it depending on the observation channel?)
            "binomial_double_trees": True,
            "score_each_iteration": True,
            "score_tree_interval": 1,
        }

        create_tree_dirs(tree_data.browser.unique(), config)

        prediction_properties = [status, "body", "X-Content-Type-Options", 
                             "X-Frame-Options", "Content-Type", "Content-Disposition", "Cross-Origin-Resource-Policy",
                             "Cross-Origin-Opener-Policy", "Location", "Content-Security-Policy"]

        start = time.time()
        for (browser, inc_method, observation_method), group in tree_data.groupby(["browser", "inc_method", "observation_method"]):
            if group["observation"].nunique() == 1:
                text = f"{browser}-{inc_method}-{observation_method} cannot work only one observation left"
                if log:
                    print(text)
                result_texts.add(text)
            else:
                result_texts.add(f"{browser}-{inc_method}-{observation_method} works")
                conf = config.copy()
                tree_model, rule_fit_model = make_tree(group, observation_method, prediction_properties, conf, inc_method, browser, status)   
                if return_early:
                    return tree_model, rule_fit_model

        took = time.time() - start
        if log:
            print(f"took {took} seconds, dot to svg might still be running!")
            
    return result_texts