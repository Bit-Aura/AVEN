import sqlite3

def run():
    try:
        conn = sqlite3.connect('pathfinder.db')
        conn.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'")
        conn.commit()
        conn.close()
        print("Successfully added role column")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    run()
