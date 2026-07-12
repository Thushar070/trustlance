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

def main():
    tokens = get_tokens()
    admin_token = tokens.get("ADMIN_TOKEN")
    
    options = Options()
    options.binary_location = "/usr/bin/chromium"
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        driver.set_window_size(1280, 800)
        driver.get("http://localhost:3000/login")
        time.sleep(1)
        
        cookie = {
            "name": "next-auth.session-token",
            "value": admin_token,
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
            "secure": False
        }
        driver.add_cookie(cookie)
        
        driver.get("http://localhost:3000/payments")
        time.sleep(3)
        print("Current URL:", driver.current_url)
        print("Page Title:", driver.title)
        
        # Save a desktop test image for payments
        driver.save_screenshot("/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81/payments_test_check.png")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
