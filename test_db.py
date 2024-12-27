import psycopg2
from psycopg2 import OperationalError

def test_connection():
    try:
        conn = psycopg2.connect(
            dbname="summary",
            user="postgres",
            password="10086Post*",
            host="localhost"
        )
        print("数据库连接成功！")
        conn.close()
    except OperationalError as e:
        print(f"数据库连接失败：{str(e)}")

if __name__ == "__main__":
    test_connection() 