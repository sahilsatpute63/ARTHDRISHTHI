import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'const firebaseConfig = \{.*?\};'

replacement = """const firebaseConfig = {
        apiKey: "AIzaSyCjObF7HezxGWpjOwELwPFy-xw0OE6P1Gw",
        authDomain: "arthdrishthi.firebaseapp.com",
        projectId: "arthdrishthi",
        storageBucket: "arthdrishthi.firebasestorage.app",
        messagingSenderId: "565991731251",
        appId: "1:565991731251:web:6fb5557b72436f64887346",
        measurementId: "G-V3VFJMG7DY"
      };"""

new_html = re.sub(pattern, replacement, html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
