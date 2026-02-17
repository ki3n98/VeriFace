import numpy as np
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from fastapi import HTTPException
import torch.nn.functional as F


class ModelService:
    def __init__(self):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.embedder = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        self.mtcnn = MTCNN(image_size=160, margin =20, keep_all= True, device=self.device)


    def img_to_embedding(self, img, multiple=False):
        faces = self.mtcnn(img)
        if faces is None:
            raise HTTPException(status_code = 400, detail = 'No face detected')
        elif len(faces) == 1:
            with torch.no_grad():
                emb = self.embedder(faces[0].unsqueeze(0).to(self.device))
                emb = torch.nn.functional.normalize(emb,p=2,dim =1)
                return emb

        elif multiple and len(faces) >= 2: 
                embs = []
                with torch.no_grad():
                    for face in faces:
                        emb = self.embedder(face.unsqueeze(0).to(self.device))
                        emb = torch.nn.functional.normalize(emb,p=2,dim =1)
                        embs.append(emb)
                return embs

        else:
            raise HTTPException(status_code=400, detail="Multiple faces detected.")
    


    def __cosine_distance(self, a, b):
        a = np.asarray(a).reshape(-1)
        b = np.asarray(b).reshape(-1)
        denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
        return 1.0 - float(np.dot(a, b) / denom)


    def same_identity(self, a, b, threshold=0.5):
        d = self.__cosine_distance(a, b)
        return d < threshold, d
