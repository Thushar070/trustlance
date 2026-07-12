import sys
import os
import time
import argparse
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def main():
    parser = argparse.ArgumentParser(description="Headless browser helper using Chromium & ChromeDriver.")
    parser.add_argument("--url", required=True, help="Target URL to load.")
    parser.add_argument("--token", help="NextAuth session token cookie value.")
    parser.add_argument("--output", required=True, help="Path to save screenshot.")
    parser.add_argument("--width", type=int, default=1280, help="Viewport width.")
    parser.add_argument("--height", type=int, default=800, help="Viewport height.")
    
    args = parser.parse_args()
    
    options = Options()
    options.binary_location = "/usr/bin/chromium"
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        driver.set_window_size(args.width, args.height)
        
        # 1. Access localhost first to set domain context for cookies
        driver.get("http://localhost:3000/login")
        time.sleep(1)
        
        if args.token:
            cookie = {
                "name": "next-auth.session-token",
                "value": args.token,
                "domain": "localhost",
                "path": "/",
                "httpOnly": True,
                "secure": False
            }
            driver.add_cookie(cookie)
            
        # 2. Now navigate to the target URL
        print(f"Navigating to {args.url}...")
        driver.get(args.url)
        time.sleep(2)  # Allow JS and assets to render
        
        # Let's log current URL and title
        print(f"Current URL: {driver.current_url}")
        print(f"Page Title: {driver.title}")
        
        # Save screenshot
        os.makedirs(os.path.dirname(args.output), exist_ok=True)
        driver.save_screenshot(args.output)
        print(f"Screenshot saved to {args.output}")
        
    except Exception as e:
        print(f"Error occurred: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
