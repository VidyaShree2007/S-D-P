from enum import Enum
from typing import Optional

from fastapi import FastAPI, HTTPException

app = FastAPI(
    title="Project - 1",
    description="A beginner-friendly API",
    version="1.0.0",
    swagger_ui_parameters={
        "syntaxHighlight": {
            "theme": "obsidian"
        }
    }
)


@app.get("/")
def home():
    return {"message": "Welcome to your first FastAPI Project"}


@app.get("/home/{name}")
def say_hello(name: str):
    return {"message": f"Hello, {name}!"}


@app.get("/square/{number}")
def square(number: int):
    return {
        "number": number,
        "square": number * number
    }


@app.get("/add")
def add(a: float, b: float):
    return {
        "a": a,
        "b": b,
        "result": a + b
    }


class Operation(str, Enum):
    add = "add"
    subtract = "subtract"
    multiply = "multiply"
    divide = "divide"


@app.get("/calculate/{operation}")
def calculate(operation: Operation, a: float, b: float):

    if operation == Operation.add:
        result = a + b

    elif operation == Operation.subtract:
        result = a - b

    elif operation == Operation.multiply:
        result = a * b

    elif operation == Operation.divide:
        if b == 0:
            raise HTTPException(
                status_code=400,
                detail="Division by zero is not allowed"
            )
        result = a / b

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid operation"
        )

    return {
        "operation": operation.value,
        "a": a,
        "b": b,
        "result": result
    } 

    