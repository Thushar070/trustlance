import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time

def main():
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
        driver.get("http://localhost:3000")
        time.sleep(2)
        
        artifact_path = "/home/billy/.gemini/antigravity-ide/brain/2a43700c-4357-4aae-8209-4826f41d0a81/browser_test.png"
        driver.save_screenshot(artifact_path)
        print(f"Browser works! Screenshot saved to {artifact_path}")
    except Exception as e:
        print(f"Browser tool check failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
