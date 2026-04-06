import os
import pytest


@pytest.fixture(autouse=True)
def set_working_directory():
    os.chdir(os.path.dirname(__file__))
