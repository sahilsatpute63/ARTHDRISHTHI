import glob
import os

files = glob.glob(r"C:\antigravity\ARTHDRISHTHI\backend\app\api\v1\*.py")

for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "user_id=1" in content:
        print(f"Patching {fpath}...")
        
        # Add imports if they don't exist
        if "from app.api.deps import get_current_user" not in content:
            # Find the last import
            last_import_idx = content.rfind("import ")
            end_of_line = content.find("\n", last_import_idx)
            imports_str = "\nfrom app.api.deps import get_current_user\nfrom app.models.user import User\n"
            content = content[:end_of_line] + imports_str + content[end_of_line:]
            
        # Replace function definitions
        # e.g. def get_anomalies(db: Session = Depends(get_db)):
        import re
        content = re.sub(r'(def \w+\(.*db: Session = Depends\(get_db\))(\):)', r'\1, current_user: User = Depends(get_current_user)\2', content)
        
        # Replace user_id=1 with user_id=current_user.id
        content = content.replace("user_id=1", "user_id=current_user.id")
        
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
