from app.db.schema.user import UserOutput
from app.core.database import get_db
from app.util.embeddings import has_embedding
from app.util.protectRoute import get_current_user
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

modelRouter = APIRouter()

@modelRouter.post("/hasEmbedding")
async def hasEmbedding(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    try:
        res = await has_embedding(session, user.id)
        return res

    except Exception as error:
        print(error)
        raise error