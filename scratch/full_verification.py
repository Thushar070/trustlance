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

def run_test_case(role_name, token, path, output_name, width, height, theme="dark"):
    url = f"http://localhost:3000{path}"
    print(f"Testing {role_name} at {path} | Viewport: {width}x{height} | Theme: {theme}")
    
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
        
        # 1. Load login first to get domain context
        driver.get("http://localhost:3000/login")
        time.sleep(1)
        
        # 2. Inject session token cookie
        cookie = {
            "name": "next-auth.session-token",
            "value": token,
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
            "secure": False
        }
        driver.add_cookie(cookie)
        
        # 3. Load target URL
        driver.get(url)
        time.sleep(1.5)
        
        # 4. Inject theme option in localStorage and reload
        driver.execute_script(f"localStorage.setItem('trustlance-theme', '{theme}');")
        driver.refresh()
        time.sleep(2) # Allow JS to adapt and fetch APIs
        
        # 5. Capture screenshot
        artifact_dir = "/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81"
        out_path = f"{artifact_dir}/{output_name}"
        driver.save_screenshot(out_path)
        print(f"-> Screenshot saved: {out_path}")
        
    except Exception as e:
        print(f"Error occurred in test case: {e}", file=sys.stderr)
    finally:
        driver.quit()

def main():
    tokens = get_tokens()
    client_token = tokens.get("CLIENT_TOKEN")
    freelancer_token = tokens.get("FREELANCER_TOKEN")
    admin_token = tokens.get("ADMIN_TOKEN")
    
    # Target IDs from list-projects.js
    proj_id = "cmrhhuylr0001cpg7mdy5yq66"
    disp_id = "cmrhi0wub000lcpg7q37bjwab"
    
    # Viewports list: (width, height, label)
    viewports = [
        (375, 812, "mobile"),
        (1024, 768, "tablet"),
        (1920, 1080, "desktop")
    ]
    
    # ------------------ CLIENT TESTS ------------------
    print("\n========== RUNNING CLIENT TESTS ==========")
    for w, h, lbl in viewports:
        # Dashboard (Dark)
        run_test_case("Client", client_token, "/client/projects", f"client_dashboard_dark_{lbl}.png", w, h, "dark")
        # Project Detail (Dark)
        run_test_case("Client", client_token, f"/projects/{proj_id}", f"client_proj_detail_dark_{lbl}.png", w, h, "dark")
        
    # Extra: Dashboard & Detail in Light Mode for 1920px validation
    run_test_case("Client", client_token, "/client/projects", "client_dashboard_light_desktop.png", 1920, 1080, "light")
    run_test_case("Client", client_token, f"/projects/{proj_id}", "client_proj_detail_light_desktop.png", 1920, 1080, "light")
    
    # Other client pages (at 1920px desktop)
    run_test_case("Client", client_token, "/client/projects/new", "client_post_project_desktop.png", 1920, 1080, "dark")
    run_test_case("Client", client_token, "/payments", "client_payments_desktop.png", 1920, 1080, "dark")
    run_test_case("Client", client_token, "/profile", "client_profile_desktop.png", 1920, 1080, "dark")
    
    # ------------------ FREELANCER TESTS ------------------
    print("\n========== RUNNING FREELANCER TESTS ==========")
    for w, h, lbl in viewports:
        # Browse / Dashboard (Dark)
        run_test_case("Freelancer", freelancer_token, "/projects", f"freelancer_dashboard_dark_{lbl}.png", w, h, "dark")
        
    # Other freelancer pages (at 1920px desktop)
    run_test_case("Freelancer", freelancer_token, f"/projects/{proj_id}", "freelancer_proj_detail_desktop.png", 1920, 1080, "dark")
    run_test_case("Freelancer", freelancer_token, "/payments", "freelancer_payments_desktop.png", 1920, 1080, "dark")
    run_test_case("Freelancer", freelancer_token, "/profile", "freelancer_profile_desktop.png", 1920, 1080, "dark")
    
    # ------------------ ADMIN TESTS ------------------
    print("\n========== RUNNING ADMIN TESTS ==========")
    for w, h, lbl in viewports:
        # Overview (Dark)
        run_test_case("Admin", admin_token, "/admin/overview", f"admin_overview_dark_{lbl}.png", w, h, "dark")
        # Dispute Detail (Dark)
        run_test_case("Admin", admin_token, f"/disputes/{disp_id}", f"admin_disp_detail_dark_{lbl}.png", w, h, "dark")
        
    # Extra: Overview & Dispute Detail in Light Mode for 1920px validation
    run_test_case("Admin", admin_token, "/admin/overview", "admin_overview_light_desktop.png", 1920, 1080, "light")
    run_test_case("Admin", admin_token, f"/disputes/{disp_id}", "admin_disp_detail_light_desktop.png", 1920, 1080, "light")
    
    # Other admin pages (at 1920px desktop)
    run_test_case("Admin", admin_token, "/admin/assignments", "admin_assignments_desktop.png", 1920, 1080, "dark")
    run_test_case("Admin", admin_token, "/admin/disputes", "admin_disputes_desktop.png", 1920, 1080, "dark")

if __name__ == "__main__":
    main()
