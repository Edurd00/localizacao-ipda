from playwright.sync_api import sync_playwright, expect

def main():
    print("Iniciando a verificação do frontend com Playwright...")
    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        try:
            # Navigate to the Validation page
            print("Navegando para http://localhost:3000/validacao...")
            page.goto("http://localhost:3000/validacao")

            # Wait for loading element to be hidden
            print("Aguardando carregamento da página...")
            page.wait_for_timeout(3000)

            # Take a screenshot to verify UI components and filter layout
            screenshot_path = "verification/validation_page.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot salva com sucesso em: {screenshot_path}")

        except Exception as e:
            print(f"Ocorreu um erro durante a execução: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
