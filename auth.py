
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config import SUPABASE_JWT_SECRET, logger

security = HTTPBearer()

async def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate Supabase JWT token."""
    token = credentials.credentials
    
    if not SUPABASE_JWT_SECRET:
        logger.error("SUPABASE_JWT_SECRET is not configured")
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    try:
        # Decode and verify the JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT Verification Failed: {str(e)}")
        # Debugging: Print headers to see if we are getting what we expect
        # logger.info(f"Token Header: {jwt.get_unverified_header(token)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
