from fastapi import FastAPI

tags_metadata = [
    {
        "name": "Students",
        "description": "Operations related to students",
    },
    {
        "name": "About",
        "description": "Information about the API",
    },
]

app = FastAPI(
    title="Student Management API",
    description="This is a simple API for managing students.",
    version="1.0.0",
    contact={
        "name": "Vidya",
        "email": "vidyashree@gmail.com"
    },
    openapi_tags=tags_metadata
)


@app.get("/", tags=["About"])
def home():
    return {"message": "Hello, FastAPI!"}


@app.get("/about", tags=["About"])
def about():
    return {
        "course": "FastAPI For Beginners",
        "level": "easy"
    }


@app.get("/name/college", tags=["Students"])
def name_college():
    return {
        "name": "Vidya",
        "college": "NIE"
    }