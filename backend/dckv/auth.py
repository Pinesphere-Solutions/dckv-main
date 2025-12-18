# import datetime
# import jwt
# from django.conf import settings

# # Hard-coded users
# USERS = {
#     "admin": "admin",
#     "athithya": "12345"
# }

# def create_jwt(username):
#     payload = {
#         "username": username,
#         "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12),
#         "iat": datetime.datetime.utcnow(),
#     }
#     return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")




import datetime
import jwt
from django.conf import settings

USERS = {
    "admin": "admin@@123",
    "athithya": "12345",
    "DCKV-User1": "User1@DCKV"
}

def create_jwt(username):
    payload = {
        "username": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12),
        "iat": datetime.datetime.utcnow(),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    # PyJWT v2 returns str, if bytes decode
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def verify_jwt(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception:
        return None
