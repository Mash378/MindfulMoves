import sqlite3
import os

# Find your database file - adjust the path if needed
db_path = "local.db"  # or "games.db", "instance/local.db", etc.

# Check if file exists
if not os.path.exists(db_path):
    print(f"Database file '{db_path}' not found!")
    print("Looking for .db files in current directory:")
    for file in os.listdir('.'):
        if file.endswith('.db'):
            print(f"  - {file}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(games)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'difficulty' in columns:
        print("'difficulty' column already exists!")
    else:
        # Add the column
        cursor.execute("ALTER TABLE games ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium'")
        conn.commit()
        print("Successfully added 'difficulty' column to games table!")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")