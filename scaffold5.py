import os

def update_script_js():
    with open('c:/antigravity/ARTHDRISHTHI/script.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Very basic patch for the state loading
    if "async function loadStateFromAPI()" not in content:
        # We find loadState and inject the fetch logic
        replacement = """
  async function loadStateFromAPI() {
    try {
      const res = await fetch('http://localhost:8000/api/v1/dashboard/overview');
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded from API:', data);
        // Map backend data to frontend state here
      }
    } catch(e) {
      console.error('API not ready, using local data', e);
    }
  }
  loadStateFromAPI();
"""
        content = content.replace("let state = loadState();", "let state = loadState();" + replacement)
        
        with open('c:/antigravity/ARTHDRISHTHI/script.js', 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    update_script_js()
    print("Frontend patch applied")
