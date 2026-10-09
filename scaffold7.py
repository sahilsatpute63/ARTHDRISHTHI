import os

def update_script_js():
    with open('c:/antigravity/ARTHDRISHTHI/script.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We patch loadStateFromAPI to actually overwrite state and render
    patch = """
  async function loadStateFromAPI() {
    try {
      const res = await fetch('http://localhost:8000/api/v1/dashboard/overview');
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded from API:', data);
        Object.assign(state, data);
        renderAll();
      }
    } catch(e) {
      console.error('API not ready, using local data', e);
    }
  }
"""
    if "Object.assign(state, data);" not in content:
        content = content.replace("        // Map backend data to frontend state here", "        Object.assign(state, data);\n        renderAll();")
        with open('c:/antigravity/ARTHDRISHTHI/script.js', 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    update_script_js()
    print("Frontend patch 2 applied")
