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

def capture_screenshot(role_name, token, url, output_path, width=1280, height=800):
    print(f"\n--- Testing {role_name} at {url} ({width}x{height}) ---")
    
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
        
        # Access localhost to set domain context for cookie injection
        driver.get("http://localhost:3000/login")
        time.sleep(1.5)
        
        cookie = {
            "name": "next-auth.session-token",
            "value": token,
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
            "secure": False
        }
        driver.add_cookie(cookie)
        
        # Navigate to target page
        driver.get(url)
        time.sleep(3.5)  # Wait for page, API requests, animations to resolve
        
        print(f"Result URL: {driver.current_url}")
        print(f"Page Title: {driver.title}")
        
        # Take screenshot
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        driver.save_screenshot(output_path)
        print(f"Screenshot saved: {output_path}")
        
    except Exception as e:
        print(f"Error for {role_name}: {e}", file=sys.stderr)
    finally:
        driver.quit()

def main():
    tokens = get_tokens()
    
    client_token = tokens.get("CLIENT_TOKEN")
    freelancer_token = tokens.get("FREELANCER_TOKEN")
    admin_token = tokens.get("ADMIN_TOKEN")
    incomplete_freelancer_token = tokens.get("INCOMPLETE_FREELANCER_TOKEN")
    new_user_token = tokens.get("NEW_USER_TOKEN")
    
    artifact_dir = "/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81"
    
    # 1. Test Client Dashboard
    capture_screenshot(
        "Client Dashboard",
        client_token,
        "http://localhost:3000/client/projects",
        f"{artifact_dir}/client_dashboard.png"
    )
    
    # 2. Test Freelancer Dashboard
    capture_screenshot(
        "Freelancer Dashboard",
        freelancer_token,
        "http://localhost:3000/projects",
        f"{artifact_dir}/freelancer_dashboard.png"
    )
    
    # 3. Test Admin Dashboard
    capture_screenshot(
        "Admin Dashboard",
        admin_token,
        "http://localhost:3000/admin/overview",
        f"{artifact_dir}/admin_dashboard.png"
    )

    # 4. Test Incomplete Freelancer (Should redirect to /complete-profile)
    capture_screenshot(
        "Incomplete Freelancer (Redirect Test)",
        incomplete_freelancer_token,
        "http://localhost:3000/projects",
        f"{artifact_dir}/freelancer_incomplete_profile.png"
    )

    # 5. Test Brand New User (Should redirect to /select-role)
    capture_screenshot(
        "Brand New User (Redirect Test)",
        new_user_token,
        "http://localhost:3000/projects",
        f"{artifact_dir}/new_user_select_role.png"
    )

if __name__ == "__main__":
    main()
