import sys
import os
import subprocess
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

def get_tokens():
    print("Generating NextAuth tokens...")
    result = subprocess.run(
        ["node", "--env-file=.env", "scratch/generate-token.js"],
        capture_output=True,
        text=True,
        cwd="/home/billy/Documents/ESCROW"
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

def capture_page_states(token, url, page_name, artifact_dir):
    viewports = [
        {"name": "desktop", "w": 1920, "h": 1080},
        {"name": "mobile", "w": 375, "h": 812}
    ]
    
    themes = ["light", "dark"]
    
    for vp in viewports:
        for theme in themes:
            options = Options()
            options.binary_location = "/usr/bin/chromium"
            options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            
            service = Service("/usr/bin/chromedriver")
            driver = webdriver.Chrome(service=service, options=options)
            
            try:
                driver.set_window_size(vp["w"], vp["h"])
                
                # Load login page first to context cookies
                driver.get("http://localhost:3000/login")
                time.sleep(1)
                
                cookie = {
                    "name": "next-auth.session-token",
                    "value": token,
                    "domain": "localhost",
                    "path": "/",
                    "httpOnly": True,
                    "secure": False
                }
                driver.add_cookie(cookie)
                
                # Load actual target URL
                driver.get(url)
                time.sleep(2)
                
                # Apply theme selection dynamically
                if theme == "dark":
                    driver.execute_script("localStorage.setItem('theme', 'dark'); document.documentElement.className = 'dark'; document.documentElement.setAttribute('data-theme', 'dark');")
                else:
                    driver.execute_script("localStorage.setItem('theme', 'light'); document.documentElement.className = 'light'; document.documentElement.setAttribute('data-theme', 'light');")
                
                time.sleep(1)
                
                output_filename = f"{page_name}_{theme}_{vp['name']}.png"
                output_path = os.path.join(artifact_dir, output_filename)
                
                driver.save_screenshot(output_path)
                print(f"Captured: {output_filename} ({vp['w']}x{vp['h']})")
                
            except Exception as e:
                print(f"Error capturing {page_name} {theme} {vp['name']}: {e}")
            finally:
                driver.quit()

def main():
    tokens = get_tokens()
    client_token = tokens.get("CLIENT_TOKEN")
    
    # Target directory for artifacts
    artifact_dir = "/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81"
    os.makedirs(artifact_dir, exist_ok=True)
    
    # 1. Search page
    capture_page_states(
        client_token, 
        "http://localhost:3000/search", 
        "search", 
        artifact_dir
    )
    
    # 2. Public profile page
    capture_page_states(
        client_token, 
        "http://localhost:3000/profiles/cmrhhv7110003cpg7w19xinvn", 
        "profile", 
        artifact_dir
    )
    
    # 3. Connections inbox
    capture_page_states(
        client_token, 
        "http://localhost:3000/connections", 
        "connections", 
        artifact_dir
    )
    
    # 4. Payments ledger page
    capture_page_states(
        client_token, 
        "http://localhost:3000/payments", 
        "payments", 
        artifact_dir
    )

if __name__ == "__main__":
    main()
