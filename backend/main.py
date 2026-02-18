from fastapi import FastAPI, Request
from fastapi.responses import FileResponse

app = FastAPI()

@app.get("/")
def home():
    return FileResponse("../frontend/index.html")