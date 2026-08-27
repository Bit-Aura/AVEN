import sqlite3

def run():
    db_files = ['pathfinder.db', 'career_pathfinder.db', 'apps/api/pathfinder.db', 'apps/api/career_pathfinder.db', 'apps/api/app.db']
    for db_path in db_files:
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            
            # users
            cur.execute('PRAGMA table_info(users)')
            user_cols = [r[1] for r in cur.fetchall()]
            if 'name' not in user_cols:
                cur.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255)")
            if 'role' not in user_cols:
                cur.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'learner'")
            if 'is_active' not in user_cols:
                cur.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
                
            # learner_profiles
            cur.execute('PRAGMA table_info(learner_profiles)')
            lp_cols = [r[1] for r in cur.fetchall()]
            if lp_cols and 'last_known_weekly_hours' not in lp_cols:
                cur.execute("ALTER TABLE learner_profiles ADD COLUMN last_known_weekly_hours REAL DEFAULT 10.0")
                
            # resources
            cur.execute('PRAGMA table_info(resources)')
            res_cols = [r[1] for r in cur.fetchall()]
            if 'resource_type' not in res_cols:
                cur.execute("ALTER TABLE resources ADD COLUMN resource_type VARCHAR(50) DEFAULT 'tutorial'")
            if 'skill_id' not in res_cols:
                cur.execute("ALTER TABLE resources ADD COLUMN skill_id VARCHAR(255)")
            if 'submitted_by_id' not in res_cols:
                cur.execute("ALTER TABLE resources ADD COLUMN submitted_by_id INTEGER")
            if 'status' not in res_cols:
                cur.execute("ALTER TABLE resources ADD COLUMN status VARCHAR(50) DEFAULT 'APPROVED'")
            if 'rejection_reason' not in res_cols:
                cur.execute("ALTER TABLE resources ADD COLUMN rejection_reason TEXT")
            if 'updated_at' not in res_cols:
                cur.execute("ALTER TABLE resources ADD COLUMN updated_at DATETIME")
                
            # mentor_applications
            cur.execute("""
            CREATE TABLE IF NOT EXISTS mentor_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                expertise VARCHAR(255) NOT NULL,
                bio TEXT,
                linkedin_url VARCHAR(512),
                status VARCHAR(50) DEFAULT 'PENDING',
                rejection_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            conn.commit()
            conn.close()
            print(f"Successfully migrated {db_path}")
        except Exception as e:
            print(f"Error on {db_path}: {e}")

if __name__ == '__main__':
    run()

