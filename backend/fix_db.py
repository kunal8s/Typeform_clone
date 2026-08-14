import re

# 1. Update main.py
with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ? with %s in SQL queries
content = re.sub(r'(\s+)VALUES\s*\(\?,\s*\?\)', r'\1VALUES (%s, %s)', content)
content = re.sub(r'(\s+)VALUES\s*\(\?,\s*\?,\s*\?\)', r'\1VALUES (%s, %s, %s)', content)
content = re.sub(r'(\s+)VALUES\s*\(\?,\s*\?,\s*\?,\s*\?\)', r'\1VALUES (%s, %s, %s, %s)', content)
content = re.sub(r'(\s+)VALUES\s*\(\?,\s*\?,\s*\?,\s*\?,\s*\?,\s*\?,\s*\?\)', r'\1VALUES (%s, %s, %s, %s, %s, %s, %s)', content)
content = re.sub(r'=\s*\?', r'= %s', content)

# Fix lastrowid
content = content.replace(
    '''cursor.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s)",
        (req.email, password_hash),
    )
    conn.commit()
    user_id = cursor.lastrowid''',
    '''cursor.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
        (req.email, password_hash),
    )
    user_id = cursor.fetchone()["id"]
    conn.commit()'''
)

content = content.replace(
    '''cursor.execute(
        "INSERT INTO forms (user_id, title, share_slug) VALUES (%s, %s, %s)",
        (user["id"], req.title, share_slug),
    )
    conn.commit()
    form_id = cursor.lastrowid''',
    '''cursor.execute(
        "INSERT INTO forms (user_id, title, share_slug) VALUES (%s, %s, %s) RETURNING id",
        (user["id"], req.title, share_slug),
    )
    form_id = cursor.fetchone()["id"]
    conn.commit()'''
)

content = content.replace(
    '''cursor.execute(
        "INSERT INTO forms (user_id, title, description, share_slug) VALUES (%s, %s, %s, %s)",
        (user["id"], new_title, form["description"], share_slug),
    )
    new_form_id = cursor.lastrowid''',
    '''cursor.execute(
        "INSERT INTO forms (user_id, title, description, share_slug) VALUES (%s, %s, %s, %s) RETURNING id",
        (user["id"], new_title, form["description"], share_slug),
    )
    new_form_id = cursor.fetchone()["id"]'''
)

content = content.replace(
    '''cursor.execute(
        "INSERT INTO responses (form_id, respondent_id) VALUES (%s, %s)",
        (form_id, respondent_id)
    )
    response_id = cursor.lastrowid''',
    '''cursor.execute(
        "INSERT INTO responses (form_id, respondent_id) VALUES (%s, %s) RETURNING id",
        (form_id, respondent_id)
    )
    response_id = cursor.fetchone()["id"]'''
)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated main.py")
