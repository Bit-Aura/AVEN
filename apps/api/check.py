import sqlite3

def run():
    conn = sqlite3.connect('pathfinder.db')
    print(conn.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall())
    conn.close()

if __name__ == '__main__':
    run()
