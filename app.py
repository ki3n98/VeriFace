from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from pydantic import EmailStr, constr
import mysql.connector


app = FastAPI()
DB_host = "sql5.freesqldatabase.com"
DB_user = "sql5810359"
DB_pw = "SKuiRlIjtu"
DB_name = "sql5810359"

connection = mysql.connector.connect(
    host=DB_host, user=DB_user, password=DB_pw, database=DB_name, connect_timeout=10
)

@app.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    image: UploadFile = File(..., description="User profile image"),
    username: constr(strip_whitespace=True, min_length=3, max_length=255) = Form(...),
    password: constr(min_length=6, max_length=255) = Form(...),
    email: EmailStr = Form(...),
):
    # Basic validation
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be JPEG, PNG, or WEBP.",
        )

    INSERT_QUERY = f'''
        INSERT INTO users(username,password,is_active,email, image_embedding)
        VALUES (%s, %s, %s, %s, %s)
    '''
    
    username = f"{username}"
    password = f"{password}"
    is_active = True
    email = f"{email}"
    image_embedding = 1235648   

    cursor = connection.cursor()
    cursor.execute(INSERT_QUERY, (username, password, is_active, email, image_embedding))
    connection.commit()
    
    
    return {
        "message": "User signup data received.",
        "username": username,
        "email": email,
        "image_filename": image.filename
    }
    
    
@app.post("/delete", status_code=status.HTTP_201_CREATED)
async def delete(
    user_id
):
    
    cursor = connection.cursor()
    DELETE_QUERY = f'''
        DELETE FROM users WHERE id = {user_id};
    '''
    cursor = connection.cursor()
    cursor.execute(DELETE_QUERY)

    connection.commit()
    
    
    return {
        "message": "User deleted.",
    }

