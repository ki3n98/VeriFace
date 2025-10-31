import requests
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHBpcmVzIjoxNzYxOTQwMDI3LjM4NjI0MDJ9.cBahn_t93mWpD2L-jRnzU6fWccsxuQUqMWsavMC477A"
r = requests.get("http://localhost:80/protected",
                 headers={"authorization": f"Bearer {token}"})
print(r.status_code, r.json())
