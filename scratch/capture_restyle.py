import sys
import os
import subprocess
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

def get_tokens():
    result = subprocess.run(
        ["node", "--env-file=.env", "scratch/generate-token.js"],
        capture_output=True, text=True, cwd="/home/billy/Documents/ESCROW"
    )
    if result.returncode != 0:
        print("Error generating tokens:", result.stderr, file=sys.stderr)
        sys.exit(1)
    tokens = {}
    for line in result.stdout.strip().split("\n"):
        if "=" in line:
            key, val = line.split("=", 1)
            tokens[key.strip()] = val.strip()
    return tokens

def capture(token, url, name, artifact_dir, width=1920, height=1080, theme="light"):
    options = Options()
    options.binary_location = "/usr/bin/chromium"
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        driver.set_window_size(width, height)
        driver.get("http://localhost:3000/login")
        time.sleep(1)
        
        if token:
            driver.add_cookie({
                "name": "next-auth.session-token",
                "value": token, "domain": "localhost",
                "path": "/", "httpOnly": True, "secure": False
            })
        
        driver.get(url)
        time.sleep(2.5)
        
        if theme == "dark":
            driver.execute_script("localStorage.setItem('trustlance-theme', 'dark'); document.documentElement.className = 'dark';")
        else:
            driver.execute_script("localStorage.setItem('trustlance-theme', 'light'); document.documentElement.classList.remove('dark');")
        time.sleep(0.5)
        
        vp = "mobile" if width < 500 else "desktop"
        filename = f"{name}_{theme}_{vp}.png"
        output_path = os.path.join(artifact_dir, filename)
        driver.save_screenshot(output_path)
        print(f"Captured: {filename}")
    except Exception as e:
        print(f"Error: {name} {theme} {width}: {e}")
    finally:
        driver.quit()

def capture_page(token, url, name, artifact_dir):
    for w, h in [(1920, 1080), (375, 812)]:
        for theme in ["light", "dark"]:
            capture(token, url, name, artifact_dir, w, h, theme)

def main():
    page_filter = sys.argv[1] if len(sys.argv) > 1 else "all"
    tokens = get_tokens()
    ad = "/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81"
    os.makedirs(ad, exist_ok=True)
    
    new_user_token = tokens.get("NEW_USER_TOKEN")
    client_token = tokens.get("CLIENT_TOKEN")
    freelancer_token = tokens.get("FREELANCER_TOKEN")
    
    pages = {
        "select_role": (new_user_token, "http://localhost:3000/select-role", "selectrole"),
        "landing": (None, "http://localhost:3000", "landing"),
        "client_projects": (client_token, "http://localhost:3000/client/projects", "clientprojects"),
        "browse_projects": (freelancer_token, "http://localhost:3000/projects", "browseprojects"),
    }
    
    if page_filter == "all":
        for key, (tok, url, name) in pages.items():
            capture_page(tok, url, name, ad)
    elif page_filter in pages:
        tok, url, name = pages[page_filter]
        capture_page(tok, url, name, ad)
    else:
        print(f"Unknown page: {page_filter}. Options: {list(pages.keys())}")

if __name__ == "__main__":
    main()
