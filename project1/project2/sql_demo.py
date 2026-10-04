from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select


# Student model
class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    age: int
    course: str


# Database
DATABASE_URL = "sqlite:///students.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


# Database session
def get_session():
    with Session(engine) as session:
        yield session


# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield


# FastAPI app
app = FastAPI(
    title="SQL Database",
    lifespan=lifespan
)


# 1. CREATE student
@app.post("/students", response_model=Student, status_code=201)
def create_student(
    student: Student,
    session: Session = Depends(get_session)
):
    session.add(student)
    session.commit()
    session.refresh(student)

    return student


# 2. GET all students
@app.get("/students", response_model=list[Student])
def list_students(
    session: Session = Depends(get_session)
):
    return session.exec(select(Student)).all()


# 3. GET one student
@app.get("/students/{student_id}", response_model=Student)
def get_student(
    student_id: int,
    session: Session = Depends(get_session)
):
    student = session.get(Student, student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return student


# 4. UPDATE student
@app.put("/students/{student_id}", response_model=Student)
def update_student(
    student_id: int,
    data: Student,
    session: Session = Depends(get_session)
):
    student = session.get(Student, student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student doesn't exist"
        )

    student.name = data.name
    student.age = data.age
    student.course = data.course

    session.commit()
    session.refresh(student)

    return student


# 5. DELETE student
@app.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    session: Session = Depends(get_session)
):
    student = session.get(Student, student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    session.delete(student)
    session.commit()

    return {
        "message": f"Student {student_id} has been deleted"
    }