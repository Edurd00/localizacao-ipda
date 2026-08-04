import time
from playwright.sync_api import sync_playwright

def main():
    print("Iniciando a verificação da página de Organização com Playwright no port 3001...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        try:
            # Navigate to /organizacao on port 3000
            print("Navegando para http://localhost:3000/organizacao...")
            page.goto("http://localhost:3000/organizacao")

            # Wait for content to load
            print("Aguardando carregamento da página...")
            page.wait_for_timeout(4000)

            # Let's take a screenshot of the initial page state
            screenshot_path = "verification/organizacao_page_initial.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot salva com sucesso em: {screenshot_path}")

            # Let's interact with the page: expand a node!
            # Find the first expandable node (contains a ChevronRight or is marked cursor-pointer)
            expandable = page.locator(".cursor-pointer").first
            if expandable.count() > 0:
                print("Expandindo o primeiro nó da árvore...")
                expandable.click()
                page.wait_for_timeout(1000)

                # Take an updated screenshot
                screenshot_path_expanded = "verification/organizacao_page_expanded.png"
                page.screenshot(path=screenshot_path_expanded)
                print(f"Screenshot com nó expandido salva em: {screenshot_path_expanded}")

        except Exception as e:
            print(f"Ocorreu um erro durante a execução: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
