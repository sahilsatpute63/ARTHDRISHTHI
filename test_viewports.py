import asyncio
import json
import os
import subprocess
import tempfile
import time
import urllib.request
import websockets
import base64

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
RESOLUTIONS = [
    ("1920x1080", 1920, 1080),
    ("1536x1024", 1536, 1024),
    ("1440x900", 1440, 900),
    ("1366x768", 1366, 768),
    ("1280x800", 1280, 800),
    ("1280x720", 1280, 720),
]

_next_id = 1

async def cdp_send(ws, method, params=None):
    global _next_id
    msg_id = _next_id
    _next_id += 1
    req = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(req))
    return msg_id

async def cdp_call(ws, method, params=None, timeout=8.0):
    msg_id = await cdp_send(ws, method, params)
    start = time.time()
    while time.time() - start < timeout:
        raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        resp = json.loads(raw)
        if resp.get("id") == msg_id:
            return resp.get("result", {})
    raise TimeoutError(f"CDP call {method} timed out")

async def test_all():
    port = 9444
    temp_dir = tempfile.mkdtemp()
    
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-fre",
        "--disable-sync",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={temp_dir}",
        "--window-size=1920,1080",
        "about:blank"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    
    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{port}/json")
        tabs = json.loads(req.read().decode())
        ws_url = tabs[0]["webSocketDebuggerUrl"]
        
        async with websockets.connect(ws_url, max_size=20_000_000) as ws:
            await cdp_call(ws, "Page.enable")
            
            # Navigate to the login page
            nav_id = await cdp_send(ws, "Page.navigate", {"url": "http://localhost:3000/login%20page/public/index.html"})
            
            # Wait for loadEventFired
            start = time.time()
            while time.time() - start < 10.0:
                raw = await ws.recv()
                msg = json.loads(raw)
                if msg.get("method") == "Page.loadEventFired":
                    break
            
            # Wait for any CSS transitions or layout
            await asyncio.sleep(1.0)
            
            print("\n================== VIEWPORT VERIFICATION RESULTS ==================")
            for name, w, h in RESOLUTIONS:
                await cdp_call(ws, "Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": 1,
                    "mobile": False
                })
                await asyncio.sleep(0.4)
                
                js_check = """
                (() => {
                    const docEl = document.documentElement;
                    const body = document.body;
                    const page = document.querySelector('.page');
                    const promo = document.querySelector('.promo');
                    const auth = document.querySelector('.auth');
                    const card = document.querySelector('.card');
                    const privacy = document.querySelector('.privacy');
                    
                    return {
                        title: document.title,
                        viewportW: window.innerWidth,
                        viewportH: window.innerHeight,
                        docScrollW: docEl.scrollWidth,
                        docScrollH: docEl.scrollHeight,
                        bodyScrollH: body.scrollHeight,
                        pageScrollH: page ? page.scrollHeight : 0,
                        hasVerticalScroll: docEl.scrollHeight > window.innerHeight,
                        hasHorizontalScroll: docEl.scrollWidth > window.innerWidth,
                        cardTop: Math.round(card ? card.getBoundingClientRect().top : 0),
                        cardBottom: Math.round(card ? card.getBoundingClientRect().bottom : 0),
                        privacyTop: Math.round(privacy ? privacy.getBoundingClientRect().top : 0),
                        privacyBottom: Math.round(privacy ? privacy.getBoundingClientRect().bottom : 0),
                        cardHeight: card ? card.offsetHeight : 0,
                        privacyHeight: privacy ? privacy.offsetHeight : 0
                    };
                })()
                """
                eval_res = await cdp_call(ws, "Runtime.evaluate", {"expression": js_check, "returnByValue": True})
                res = eval_res["result"]["value"]
                
                fits = res['privacyBottom'] <= h
                v_scroll = res['hasVerticalScroll']
                h_scroll = res['hasHorizontalScroll']
                
                status = "PASS" if (fits and not v_scroll and not h_scroll) else "FAIL"
                
                print(f"[{status}] Resolution: {name} ({w}x{h})")
                print(f"       Page Title: '{res.get('title')}'")
                print(f"       Viewport: {res['viewportW']}x{res['viewportH']}")
                print(f"       Document Scroll: {res['docScrollW']}x{res['docScrollH']}")
                print(f"       Has Vertical Scroll: {v_scroll}")
                print(f"       Has Horizontal Scroll: {h_scroll}")
                print(f"       Card Height: {res['cardHeight']}px (top: {res['cardTop']}px, bottom: {res['cardBottom']}px)")
                print(f"       Privacy Section: {res['privacyHeight']}px (top: {res['privacyTop']}px, bottom: {res['privacyBottom']}px <= {h}px: {fits})")
                
                # Take screenshot
                shot = await cdp_call(ws, "Page.captureScreenshot", {"format": "png"})
                data = base64.b64decode(shot["data"])
                ss_path = f"c:/antigravity/ARTHDRISHTHI/screenshot_{name}.png"
                with open(ss_path, "wb") as f:
                    f.write(data)
                print(f"       Screenshot: {ss_path}\n")
            print("===================================================================\n")
                
    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(test_all())
