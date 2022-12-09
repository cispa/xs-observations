import psycopg2


def check_5_vals(row):
    """Returns False is both vals_a and vals_b have 5 unique values."""
    methods = row["observation_methods"]
    vals_a = row["vals_a"]
    vals_b = row["vals_b"]
    for method in methods:
        if len(vals_a[method]) != 5:
            return True
        if len(vals_b[method]) != 5:
            return True
    return False


def stricter_pm(row):
    """One state is only allowed to have a maximum of one unique postMessage."""
    prune = False
    if type(row["observation_methods"]) == list:
        if 'el-message' in row["observation_methods"] and len(row["observation_methods"]) == 1:
            prune = True
    else:
        if row["observation_methods"] == "el-message":
            prune = True
    if prune:
        len_a = len(row["vals_a"]["el-message"])
        len_b = len(row["vals_b"]["el-message"])
        if len_a == 1:
            return True
        if len_b == 1:
            return True
        return False
    else:
        return True

    
def get_uniques(df, cat="browsers"):
    """Return the (n)unique sites by browser or state."""
    if cat == "browsers":
        try:
            sites_firefox = df.loc[df["browser"] == '"firefox"']["site"].unique()
        except KeyError:
            sites_firefox = []
        try:
            sites_chromium = df.loc[df["browser"] == '"chromium"']["site"].unique()
        except KeyError:
            sites_chromium = []
        sites_both = set(sites_firefox) & set(sites_chromium)
        sites_any = set(sites_firefox) | set(sites_chromium)
        only_firefox = set(sites_firefox) - set(sites_both)
        only_chromium = set(sites_chromium) - set(sites_both)
        return {"Both": len(sites_both), "Sum": len(sites_any), "Only FF": len(only_firefox), "Only C": len(only_chromium), "FF": len(sites_firefox), "C": len(sites_chromium), "sites_only_f": only_firefox, "sites_only_c": only_chromium}
    elif cat == "state":
        try:
            sites_hist = df.loc[~df["state"].str.contains("acc")]["site"].unique()
        except KeyError:
            sites_hist = []
        try:
            sites_co = df.loc[df["state"].str.contains("acc")]["site"].unique()
        except KeyError:
            sites_co = []
        sites_both = set(sites_co) & set(sites_hist)
        sites_any = set(sites_co) | set(sites_hist)
        only_co = set(sites_co) - set(sites_hist)
        only_hist = set(sites_hist) - set(sites_co)
        return {"Both": len(sites_both), "Sum": len(sites_any), "Only Cookie": len(only_co), "Only Hist": len(only_hist), "Cookie": len(sites_co), "Hist": len(sites_hist), "sites_only_co": only_co, "sites_only_hist": only_hist}
    elif cat == "site":
        try:
            sites_first = df.loc[df["same_site"]]["site"].unique()
        except KeyError:
            sites_first = []
        try:
            sites_third = df.loc[df["same_site"] == False]["site"].unique()
        except KeyError:
            sites_third = []
        sites_both = set(sites_first) & set(sites_third)
        sites_any = set(sites_first) | set(sites_third)
        only_first = set(sites_first) - set(sites_third)
        only_third = set(sites_third) - set(sites_first)
        return {"Both": len(sites_both), "Sum": len(sites_any), "Only First": len(only_first), "Only Third": len(only_third), "First": len(sites_first), "Third": len(sites_third), "sites_only_first": only_first, "sites_only_third": only_third}
    
    else:
        print(f"Unsupported cat: {cat}")

        
class Conn:
    """Basic postgres connection."""
    def __init__(self):
        self._conn = psycopg2.connect()
        self._cursor = self._conn.cursor()

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