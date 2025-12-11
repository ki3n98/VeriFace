from bcrypt import checkpw, hashpw, gensalt

class HashHelper(object):

    @staticmethod
    def verify_password(plain_pw:str, hashed_pw:str) -> bool:
        return checkpw(plain_pw.encode("utf-8"), hashed_pw.encode("utf-8"))


    @staticmethod
    def get_password_hash(plain_pw:str)-> str:
        return hashpw(
            plain_pw.encode("utf-8"),
            gensalt()
        ).decode("utf-8")   