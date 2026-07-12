import sys
import subprocess
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

def get_tokens():
    result = subprocess.run(
        ["node", "--env-file=.env", "scratch/generate-token.js"],
        capture_output=True,
        text=True,
        cwd="/home/billy/Documents/ESCROW"
    )
    tokens = {}
    for line in result.stdout.strip().split("\n"):
        if "=" in line:
            key, val = line.split("=", 1)
            tokens[key.strip()] = val.strip()
    return tokens

def capture(driver, token, path, output_name, width, height, theme="dark"):
    driver.set_window_size(width, height)
    
    # Refresh domain context
    driver.get("http://localhost:3000/login")
    time.sleep(0.5)
    
    cookie = {
        "name": "next-auth.session-token",
        "value": token,
        "domain": "localhost",
        "path": "/",
        "httpOnly": True,
        "secure": False
    }
    driver.add_cookie(cookie)
    
    # Load target URL
    driver.get(f"http://localhost:3000{path}")
    time.sleep(1.5)
    
    # Inject theme preference
    driver.execute_script(f"localStorage.setItem('trustlance-theme', '{theme}');")
    driver.refresh()
    time.sleep(2)
    
    artifact_dir = "/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81"
    out_path = f"{artifact_dir}/{output_name}"
    driver.save_screenshot(out_path)
    print(f"Captured: {output_name}")

def main():
    tokens = get_tokens()
    admin_token = tokens.get("ADMIN_TOKEN")
    client_token = tokens.get("CLIENT_TOKEN")
    
    options = Options()
    options.binary_location = "/usr/bin/chromium"
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        pages = [
            ("/admin/assignments", "assignments"),
            ("/payments", "payments"),
            ("/admin/disputes", "disputes")
        ]
        
        viewports = [
            (375, 812, "mobile"),
            (1024, 768, "tablet"),
            (1920, 1080, "desktop")
        ]
        
        themes = ["dark", "light"]
        
        for path, page_name in pages:
            token = client_token if path == "/payments" else admin_token
            for w, h, size_lbl in viewports:
                for theme in themes:
                    # To minimize screenshot volume, run all viewports for dark theme, 
                    # and desktop + mobile for light theme.
                    if theme == "light" and size_lbl == "tablet":
                        continue
                    out_name = f"{page_name}_{theme}_{size_lbl}.png"
                    capture(driver, token, path, out_name, w, h, theme)
                    
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
