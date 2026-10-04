from enum import Enum
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(
    title="Project - 2 ->Todo List",
    discription="A beginner-friendly API",
    version="1.0.0",
      }

class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TodoCreate(BaseModel):
    title: str =Field(min_length=1, max_length=2, example=("FASTAPI"))
    description: Optional[str] = Field(default=None, max_length=500, example="This is a sample todo item.")
    priority: Priority = Priority.medium

class Todoupdate(TodoCreate):
    completed: bool = False

class TodoPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, min_length=1, max_length=50)
    priority: Optional[Priority] = None
    completed: Optional[bool] = None

class Todo(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    priority: Priority
    completed: bool = False
    created_at: datetime

todos dict[int, Todo] = {}
next_id = 1

def get_todo_or_404(todo_id: int) -> Todo:
    todo = todosget(todo_id)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Todo with id {todo_id} NOT FOUND")
    return Todo

@app.get("/", tags=["Home"])
def home():
    return {"message": "ToDo App is working. visit /docs to try it out."}

@app.get("/todos", response_model= Todo, status_code=status.HTTP_201_CREATED, tags=["Todos"])
def create_todo(todo_in: TodoCreate):
    global next_id
    todo = Todo(
        id=next_id,
        created_at=datetime.now(),
        **todo_in.model_dump()
    )
    todos[next_id] = todo
    next_id += 1
    return todo

                                 

    