import os

def build_api_client():
    with open('c:/antigravity/ARTHDRISHTHI/script.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update loadState to rely purely on API
    replacement = """
  const API_BASE = "http://localhost:8000/api/v1";
  
  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("ffs_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
      // Handle unauthorized
      console.error("Unauthorized");
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function loadStateFromAPI() {
    try {
      // Mock loading state
      const dashboard = await apiFetch('/dashboard/overview');
      Object.assign(state, dashboard);
      renderAll();
    } catch(e) {
      console.error('API Error:', e);
      // Fallback to demo mode strictly if flagged, but for now we render empty states.
      alert("Failed to load data from backend. Please start the backend server.");
    }
  }
"""
    if "const API_BASE =" not in content:
        # we find where to inject it. I'll replace my old patch.
        old_patch = """  async function loadStateFromAPI() {
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
  }"""
        if old_patch in content:
            content = content.replace(old_patch, replacement)
        
        with open('c:/antigravity/ARTHDRISHTHI/script.js', 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    build_api_client()
    print("API client wired")
