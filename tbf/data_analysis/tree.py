import os
import json
import subprocess
import time
from pathlib import Path
from urllib.parse import quote
import h2o
from h2o.tree import H2OTree    
from h2o.estimators import H2ORandomForestEstimator
from h2o.estimators import H2ORuleFitEstimator

from h2o.tree import H2OSplitNode, H2OLeafNode
from anytree import AnyNode, RenderTree
from anytree.exporter import JsonExporter

import warnings
warnings.filterwarnings("ignore", "Dropping bad") # Ignore the warning that some columns are constant (they will just be ignored)
warnings.filterwarnings("ignore", "Sample rate") # Ignore that we do not have a test dataset (this is what we want)


#h2o.init(nthreads=60)
h2o.connect()


def create_tree(hf, test_property, prediction_properties, config):
    """Create a decision tree for a given frame and test_property."""
    config = config.copy()
    del config["h2o_jar"]
    del config["base_dir"]
    tree_model = H2ORandomForestEstimator(**config)
    tree_model.train(x=prediction_properties,
          y=test_property,
          training_frame=hf)

    return tree_model

def create_rule_fit(hf, test_property, prediction_properties, config):
    """Create a rule fit model."""
    config = {
        "seed": 42,
        "min_rule_length": 1,
        "max_rule_length": 20,
        "algorithm": "DRF",
        "model_type": "rules_and_linear",
        "rule_generation_ntrees": 1
    }
    rule_fit = H2ORuleFitEstimator(**config)
    rule_fit.train(x=prediction_properties,
                   y=test_property,
                   training_frame=hf)
    return rule_fit


def convert_tree(tree_model, tree_name, config, tree_id=0):
    """Converts a tree to a mojo, dot and png and save everything."""
    mojo_path = f"{config['base_dir']}/mojo/{tree_name}.mojo"
    dot_path = f"{config['base_dir']}/dot/{tree_name}.gv"
    svg_path = f"{config['base_dir']}/svg/{tree_name}.svg"
    if tree_model is not None:
        tree_model.download_mojo(mojo_path)
    result = subprocess.call(["java", "-cp", config["h2o_jar"], "hex.genmodel.tools.PrintMojo", "--tree", str(tree_id), "-i", mojo_path, "-o", dot_path, "-f", "20", "-d", "3"])
    if result:
        print("Error occured!")
        return
    result = subprocess.Popen(["dot", "-Tsvg", dot_path, "-o", svg_path])
    return svg_path


def add_childs(parent, node):
    """Helper to create anytrees from h2o."""
    left_child = node.left_child
    left_split = node.left_levels
    if type(left_child) == H2OSplitNode:
        left = AnyNode(path=f"{parent.split}:{left_split}", split=left_child.split_feature, parent=parent)
        add_childs(left, left_child)
    else:
        AnyNode(path=f"{parent.split}:{left_split}", pred=left_child.prediction, parent=parent)
    right_child = node.right_child
    right_split = node.right_levels
    if type(right_child) == H2OSplitNode:
        right = AnyNode(path=f"{parent.split}:{right_split}", split=right_child.split_feature, parent=parent)
        add_childs(right, right_child)
    else:
        AnyNode(path=f"{parent.split}:{right_split}", pred=right_child.prediction, parent=parent)
    

def convert_anytree(tree_model, tree_name, config, df):
    """Convert h2o tree to anytree."""
    vals = json.loads(df["observation"].value_counts().to_frame().reset_index().rename(columns={"index": "observation", "observation": "count"}).to_json(orient="index"))
    path = f"{config['base_dir']}/obs/{tree_name}.json"
    with open(path, "w") as f:
        json.dump(vals, f)
    for num, val in vals.items():
        try:
            ob = val["observation"]
            tree = H2OTree(model = tree_model, tree_number = 0 , tree_class = ob)
            root_t = tree.root_node
            if type(root_t) == H2OLeafNode:
                root = AnyNode(path="root:root", pred=root_t.prediction)
            else:
                root = AnyNode(path="root:root", split=tree.root_node.split_feature)
                add_childs(root, root_t)
            path = f"{config['base_dir']}/anytree/{tree_name}_{num}.json"
            with open(path, "w") as f:
                JsonExporter().write(root, f)
        except h2o.exceptions.H2OResponseError:
            pass

    
def create_tree_dirs(browser_ids, config):
    """Create the dirs for the decision trees if not existing already."""
    Path(f"{config['base_dir']}/mojo/").mkdir(parents=True, exist_ok=True)
    Path(f"{config['base_dir']}/dot/").mkdir(parents=True, exist_ok=True)
    Path(f"{config['base_dir']}/svg/").mkdir(parents=True, exist_ok=True)
    Path(f"{config['base_dir']}/anytree/").mkdir(parents=True, exist_ok=True)
    Path(f"{config['base_dir']}/obs/").mkdir(parents=True, exist_ok=True)
    Path(f"{config['base_dir']}/stab/").mkdir(parents=True, exist_ok=True)
    Path(f"{config['base_dir']}/same/").mkdir(parents=True, exist_ok=True

    with open(f"{config['base_dir']}/config.json", "w") as f:
        json.dump(config, f)


def replace_string(row):
    """Removes " in strings (h2o bug)."""                                          
    if type(row) == str:
        return row.replace('"', "")
    return row

def make_tree(df, observation_method, prediction_properties, config, inc_method, browser_name, groups):
    """Create decision trees for the given data."""
    tree_name = f"{inc_method}_{observation_method}_{browser_name}_{groups}"
    # print(f"Create tree: {tree_name}")
    num_colums = len(df.columns)
    df["observation"] = df["observation"].apply(replace_string)
    df["observation"] = df["observation"].cat.remove_unused_categories()
    #display(df["observation"].value_counts())
    hf = h2o.H2OFrame(df, column_types=["enum" for _ in range(num_colums)])
    #display(hf.as_data_frame()["observation"].value_counts())
    tree_model = create_tree(hf, "observation", prediction_properties, config)
    rule_fit_model = None
    # rule_fit_model = create_rule_fit(hf, "observation", prediction_properties, config)
    # info_tree(tree_model)
    img_path = convert_tree(tree_model, tree_name, config)
    
    convert_anytree(tree_model, tree_name, config, df)
    return tree_model, rule_fit_model