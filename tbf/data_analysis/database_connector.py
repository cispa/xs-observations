import psycopg2
import os
import pandas as pd

# Connect to postgres: https://naysan.ca/2020/05/31/postgresql-to-pandas/
# Pandas analysis: https://stackoverflow.com/questions/19384532/get-statistics-for-each-group-such-as-count-mean-etc-using-pandas-groupby


def connect(param_dict=None):
    """ Connect to the PostgreSQL database server """
    conn = None
    if param_dict is None:
        param_dict = {
            "host"      : os.getenv("DB_HOST"),
            "database"  : os.getenv("DB_NAME"),
            "user"      : os.getenv("DB_USER"),
            "password"  : os.getenv("DB_PASSWORD"),
            "port": os.getenv("DB_PORT"),
        }
    try:
        # connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(**param_dict)
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    print("Connection successful")
    return conn


def postgresql_to_dataframe(conn, select_query, column_names, non_cat=None):
    """
    Tranform a SELECT query into a pandas dataframe
    """
    if non_cat is None:
        non_cat = []
    cursor = conn.cursor()
    try:
        cursor.execute(select_query)
    except (Exception, psycopg2.DatabaseError) as error:
        print("Error: %s" % error)
        cursor.close()
        return 1
    
    # Naturally we get a list of tuples
    tuples = cursor.fetchall()
    cursor.close()
    
    # We just need to turn it into a pandas dataframe
    df = pd.DataFrame(tuples, columns=column_names)
    
    # Convert all string (object) columns to categorical to speed things up
    df[df.select_dtypes(['object']).columns] = df.select_dtypes(['object']).apply(to_cat, non_cat=non_cat)
    
    return df


def to_cat(column, non_cat=[]):
    """Change all columns that are not in the non_cat list to type category."""
    if column.name in non_cat:
        return column
    else:
        return column.astype('category')