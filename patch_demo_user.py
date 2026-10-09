import re

with open('backend/app/main.py', 'r') as f:
    content = f.read()

# Replace demo_password_hash with a real hashed password for 'password'
replacement = '''from app.core.security import get_password_hash
            demo_user = User(
                id=1,
                email="demo@example.com",
                full_name="Demo User",
                password_hash=get_password_hash("password"),
                is_active=True
            )'''

content = re.sub(r'demo_user = User\([\s\S]*?is_active=True\s*\)', replacement, content)

with open('backend/app/main.py', 'w') as f:
    f.write(content)
print("Updated main.py demo user")
