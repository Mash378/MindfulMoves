import os
import pytest

# This is a config file for system testing, first grab the url of where the app is being hosted
BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:5173")
API_URL = os.getenv("E2E_API_URL", "http://localhost:8000")


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    return {
        **browser_type_launch_args,
        "args": ["--no-sandbox", "--disable-dev-shm-usage"],
    }


# Clear local storage for new tests
@pytest.fixture(autouse=True)
def clear_storage(page):
    yield
    if not page.url.startswith("chrome-error://"):
        page.evaluate("localStorage.clear()")
        page.evaluate("sessionStorage.clear()")
