import psycopg2
import os

def get_connection():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        return psycopg2.connect(database_url)
    else:
        return psycopg2.connect(
            host="localhost",
            database="url_shortener_db",
            user="postgres",
            password="ikbolAL"
        )