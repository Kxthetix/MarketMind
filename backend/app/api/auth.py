import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash, verify_password, create_access_token, generate_otp
from backend.app.models.user import User, OTPVerification
from backend.app.models.portfolio import Portfolio
from backend.app.schemas.user import UserCreate, UserResponse, TokenResponse, OTPVerify, PasswordResetRequest, PasswordResetConfirm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Registers a new user and triggers an OTP verification code."""
    # Check if user already exists
    query = select(User).where(User.email == user_in.email)
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and save user
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        role="free",  # Default role
        is_verified=False
    )
    db.add(new_user)
    await db.flush()  # Allocate ID
    
    # Create Default Portfolio for new user
    default_portfolio = Portfolio(
        user_id=new_user.id,
        name="My First Portfolio",
        holdings=[]
    )
    db.add(default_portfolio)

    # Generate and save OTP
    otp_code = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    otp_entry = OTPVerification(
        user_id=new_user.id,
        otp_code=otp_code,
        expires_at=expiry
    )
    db.add(otp_entry)
    await db.commit()
    
    # Log the OTP (Simulating SMS/Email dispatch)
    logger.info(f"===> [OTP SIMULATOR] Dispatching OTP code {otp_code} to {user_in.email} <===")
    print(f"===> [OTP SIMULATOR] Dispatching OTP code {otp_code} to {user_in.email} <===")

    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Authenticates credentials and issues a JWT session token."""
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    access_token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        email=user.email
    )


@router.post("/verify-otp")
async def verify_otp(payload: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Verifies the 6-digit registration code to activate account."""
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_verified:
        return {"message": "Account is already verified."}

    # Fetch latest OTP
    otp_query = select(OTPVerification).where(
        OTPVerification.user_id == user.id
    ).order_by(OTPVerification.created_at.desc()).limit(1)
    
    otp_result = await db.execute(otp_query)
    otp_entry = otp_result.scalar_one_or_none()
    
    if not otp_entry or otp_entry.otp_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid OTP verification code")
        
    if otp_entry.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP verification code has expired")

    user.is_verified = True
    await db.delete(otp_entry) # Cleanup
    await db.commit()
    
    return {"message": "Account successfully verified and activated."}


@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """Issues a password recovery OTP."""
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        # Avoid user enumeration attacks; return success message regardless
        return {"message": "If the account exists, a reset code was dispatched."}

    otp_code = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    otp_entry = OTPVerification(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expiry
    )
    db.add(otp_entry)
    await db.commit()
    
    logger.info(f"===> [OTP PASSWORD RESET] Dispatching Reset code {otp_code} to {payload.email} <===")
    print(f"===> [OTP PASSWORD RESET] Dispatching Reset code {otp_code} to {payload.email} <===")
    
    return {"message": "If the account exists, a reset code was dispatched."}


@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Resets password using a validated recovery OTP."""
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_query = select(OTPVerification).where(
        OTPVerification.user_id == user.id,
        OTPVerification.otp_code == payload.code
    ).order_by(OTPVerification.created_at.desc()).limit(1)
    
    otp_result = await db.execute(otp_query)
    otp_entry = otp_result.scalar_one_or_none()
    
    if not otp_entry:
        raise HTTPException(status_code=400, detail="Invalid password reset code")
        
    if otp_entry.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Password reset code has expired")

    user.password_hash = get_password_hash(payload.new_password)
    user.is_verified = True  # Implicitly verify
    await db.delete(otp_entry)
    await db.commit()
    
    return {"message": "Password updated successfully."}


@router.post("/social-login", response_model=TokenResponse)
async def social_login(provider: str, token: str, db: AsyncSession = Depends(get_db)):
    """Mock endpoint representing OAuth2 callbacks (Google/GitHub)."""
    # Simply generate a mock user for the dashboard demonstration
    mock_email = f"social_{provider}_user@marketmind.ai"
    
    query = select(User).where(User.email == mock_email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            email=mock_email,
            password_hash=get_password_hash(generate_otp()), # dummy pass
            role="premium", # Elevate mock social logins to premium for testing ease
            is_verified=True
        )
        db.add(user)
        await db.flush()
        
        default_portfolio = Portfolio(
            user_id=user.id,
            name="My First Portfolio",
            holdings=[]
        )
        db.add(default_portfolio)
        await db.commit()
        
    access_token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        email=user.email
    )
