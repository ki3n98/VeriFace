from keras_facenet import FaceNet
import numpy as np


class ModelService:
    def __init__(self):
        self.embedder = FaceNet()


    def img_to_embedding(self, img: np.ndarray):
        results = self.embedder.extract(img)

        embeddings = [result["embedding"] for result in results]

        return embeddings


    def __cosine_distance(self, a, b):
        a = np.asarray(a).reshape(-1)
        b = np.asarray(b).reshape(-1)
        denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
        return 1.0 - float(np.dot(a, b) / denom)


    def same_identity(self, a, b, threshold=0.5):
        d = self.__cosine_distance(a, b)
        return d < threshold, d
