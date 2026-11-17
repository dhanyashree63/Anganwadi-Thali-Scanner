from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School, ThaliShareContribution, ThaliShareFoundation, User
from app.auth import get_current_user, record_audit_log, require_roles

thalishare_router = APIRouter(prefix="/thalishare", tags=["ThaliShare – Community Contributions"])


class FoundationCreateRequest(BaseModel):
    name: str
    logo_initials: str = "NGO"
    description: str
    mission: str
    registration_status: str = "Submitted for Verification"
    registration_reference: Optional[str] = None
    areas_of_operation: List[str] = Field(default_factory=list)
    initiatives_supported: List[str] = Field(default_factory=list)
    contribution_types: List[str] = Field(
        default_factory=lambda: [
            "MONETARY",
            "FOOD_SUPPLIES",
            "SCHOOL_SPONSORSHIP",
            "INITIATIVE_SUPPORT",
        ]
    )
    official_website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    verified: bool = False
    is_demo: bool = False
    utilization_summary: Optional[str] = None


class ContributionEnquiryRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    contributor_category: str = "INDIVIDUAL"  # INDIVIDUAL, STUDENT, COMPANY_CSR, NGO_ORG
    foundation_id: int
    contribution_type: str  # MONETARY, FOOD_SUPPLIES, SCHOOL_SPONSORSHIP, INITIATIVE_SUPPORT
    amount_inr: Optional[float] = None
    supply_details: Optional[Dict[str, Any]] = None
    school_id: Optional[int] = None
    initiative_name: Optional[str] = None
    meals_supported_est: int = 0
    children_reached_est: int = 0
    message: Optional[str] = None
    is_demo: bool = False


def _serialize_foundation(f: ThaliShareFoundation) -> Dict[str, Any]:
    return {
        "id": f.id,
        "name": f.name,
        "logo_initials": f.logo_initials,
        "description": f.description,
        "mission": f.mission,
        "registration_status": f.registration_status,
        "registration_reference": f.registration_reference,
        "areas_of_operation": f.areas_of_operation or [],
        "initiatives_supported": f.initiatives_supported or [],
        "contribution_types": f.contribution_types or [],
        "official_website": f.official_website,
        "contact_email": f.contact_email,
        "contact_phone": f.contact_phone,
        "verified": bool(f.verified),
        "eligible_recipient": bool(f.verified),
        "is_demo": bool(f.is_demo),
        "utilization_summary": f.utilization_summary,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


def _serialize_contribution(c: ThaliShareContribution) -> Dict[str, Any]:
    return {
        "id": c.id,
        "tracking_ref": c.tracking_ref,
        "foundation_id": c.foundation_id,
        "foundation_name": c.foundation.name if c.foundation else f"Organization #{c.foundation_id}",
        "foundation_website": c.foundation.official_website if c.foundation else None,
        "foundation_contact_email": c.foundation.contact_email if c.foundation else None,
        "full_name": c.full_name,
        "email": c.email,
        "phone": c.phone,
        "contributor_category": c.contributor_category,
        "contribution_type": c.contribution_type,
        "amount_inr": c.amount_inr,
        "supply_details": c.supply_details,
        "school_id": c.school_id,
        "school_name": c.school_name,
        "initiative_name": c.initiative_name,
        "meals_supported_est": c.meals_supported_est,
        "children_reached_est": c.children_reached_est,
        "message": c.message,
        "status": c.status,
        "receipt_note": c.receipt_note,
        "utilization_report": c.utilization_report,
        "is_demo": bool(c.is_demo),
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@thalishare_router.get("/foundations")
def list_foundations(
    location: Optional[str] = Query(None),
    initiative: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    include_demo: bool = Query(True),
    db: Session = Depends(get_db),
):
    q = db.query(ThaliShareFoundation).order_by(
        ThaliShareFoundation.verified.desc(),
        ThaliShareFoundation.id.asc(),
    )
    if verified_only:
        q = q.filter(ThaliShareFoundation.verified == True)
    if not include_demo:
        q = q.filter(ThaliShareFoundation.is_demo == False)

    rows = q.all()
    results = []
    for f in rows:
        if search:
            s_term = search.strip().lower()
            if (
                s_term not in f.name.lower()
                and s_term not in (f.description or "").lower()
                and s_term not in (f.mission or "").lower()
            ):
                continue
        if location:
            loc_term = location.strip().lower()
            areas = [str(a).lower() for a in (f.areas_of_operation or [])]
            if not any(loc_term in a for a in areas):
                continue
        if initiative:
            init_term = initiative.strip().lower()
            inits = [str(i).lower() for i in (f.initiatives_supported or [])]
            if not any(init_term in i for i in inits):
                continue
        results.append(_serialize_foundation(f))

    return results


@thalishare_router.post("/foundations", status_code=status.HTTP_201_CREATED)
def register_foundation(
    payload: FoundationCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Registers a participating foundation or NGO.
    Honesty & Trust Rule: Never invents registration numbers or official links.
    Organizations start unverified unless explicitly verified by an Administrator.
    """
    f = ThaliShareFoundation(
        name=payload.name.strip(),
        logo_initials=(payload.logo_initials or "NGO").strip()[:6].upper(),
        description=payload.description.strip(),
        mission=payload.mission.strip(),
        registration_status=payload.registration_status.strip(),
        registration_reference=payload.registration_reference.strip() if payload.registration_reference else None,
        areas_of_operation=payload.areas_of_operation,
        initiatives_supported=payload.initiatives_supported,
        contribution_types=payload.contribution_types,
        official_website=payload.official_website.strip() if payload.official_website else None,
        contact_email=payload.contact_email.strip() if payload.contact_email else None,
        contact_phone=payload.contact_phone.strip() if payload.contact_phone else None,
        verified=bool(payload.verified),
        is_demo=bool(payload.is_demo),
        utilization_summary=payload.utilization_summary,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return _serialize_foundation(f)


@thalishare_router.put("/foundations/{foundation_id}/verify")
def verify_foundation_status(
    foundation_id: int,
    verified: bool = Query(True),
    registration_status: str = Query("Verified by Platform Administrator"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "OFFICER"])),
):
    f = db.query(ThaliShareFoundation).filter(ThaliShareFoundation.id == foundation_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Foundation not found.")

    prev_ver = f.verified
    f.verified = verified
    f.registration_status = registration_status

    record_audit_log(
        db,
        current_user,
        "ThaliShareFoundation",
        str(f.id),
        "VERIFY_FOUNDATION" if verified else "UNVERIFY_FOUNDATION",
        previous_value={"verified": prev_ver},
        new_value={"verified": f.verified, "registration_status": f.registration_status},
        reason=f"Updated verification status for {f.name}",
    )
    db.commit()
    db.refresh(f)
    return _serialize_foundation(f)


@thalishare_router.post("/contributions", status_code=status.HTTP_201_CREATED)
def submit_contribution_enquiry(
    payload: ContributionEnquiryRequest,
    db: Session = Depends(get_db),
):
    """
    Records a community contribution enquiry / pledge.
    Technical & Trust Constraint:
    - Only allows contributions to organizations whose verification (`verified == True`) has been completed.
    - Uses an enquiry/redirect workflow rather than processing live payments.
    """
    foundation = (
        db.query(ThaliShareFoundation)
        .filter(ThaliShareFoundation.id == payload.foundation_id)
        .first()
    )
    if not foundation:
        raise HTTPException(status_code=404, detail="Selected foundation not found.")
    if not foundation.verified:
        raise HTTPException(
            status_code=400,
            detail="Contributions are only permitted for organizations whose verification has been completed.",
        )

    c_type = payload.contribution_type.upper().strip()
    if c_type not in ("MONETARY", "FOOD_SUPPLIES", "SCHOOL_SPONSORSHIP", "INITIATIVE_SUPPORT"):
        raise HTTPException(status_code=400, detail="Invalid contribution_type.")

    if c_type == "MONETARY" and (payload.amount_inr is None or payload.amount_inr <= 0):
        raise HTTPException(status_code=400, detail="Please enter a valid monetary pledge amount.")

    school_name = None
    if payload.school_id:
        school = db.query(School).filter(School.id == payload.school_id).first()
        if school:
            school_name = f"{school.name} ({school.code})"

    tracking_ref = f"TS-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    meals_est = max(0, int(payload.meals_supported_est))
    children_est = max(0, int(payload.children_reached_est))

    receipt_note = (
        f"Enquiry Reference {tracking_ref} recorded on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}. "
        "No online payment was processed on ThaliCheck; please complete your contribution directly with the verified organization using this reference."
    )

    contrib = ThaliShareContribution(
        tracking_ref=tracking_ref,
        foundation_id=foundation.id,
        full_name=payload.full_name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        contributor_category=payload.contributor_category.upper().strip(),
        contribution_type=c_type,
        amount_inr=float(payload.amount_inr) if payload.amount_inr is not None else None,
        supply_details=payload.supply_details,
        school_id=payload.school_id,
        school_name=school_name,
        initiative_name=payload.initiative_name,
        meals_supported_est=meals_est,
        children_reached_est=children_est,
        message=payload.message,
        status="ENQUIRY_RECORDED",
        receipt_note=receipt_note,
        utilization_report="Pending confirmation & utilization report from receiving organization.",
        is_demo=bool(payload.is_demo or foundation.is_demo),
    )
    db.add(contrib)
    db.commit()
    db.refresh(contrib)
    return _serialize_contribution(contrib)


@thalishare_router.get("/impact")
def get_thalishare_impact(
    include_demo: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Returns Impact Dashboard metrics.
    Honesty Rule:
    - Clearly distinguishes demo data from verified live statistics.
    - Never invents impact numbers; computes strictly from database rows matching `include_demo`.
    """
    fq = db.query(ThaliShareFoundation).filter(ThaliShareFoundation.verified == True)
    cq = db.query(ThaliShareContribution)

    if not include_demo:
        fq = fq.filter(ThaliShareFoundation.is_demo == False)
        cq = cq.filter(ThaliShareContribution.is_demo == False)

    active_foundations = fq.count()
    contribs = cq.order_by(ThaliShareContribution.created_at.desc()).all()

    total_contributions_count = len(contribs)
    total_monetary_pledged_inr = sum(float(c.amount_inr or 0.0) for c in contribs)
    meals_supported = sum(int(c.meals_supported_est or 0) for c in contribs)
    children_reached = sum(int(c.children_reached_est or 0) for c in contribs)
    schools_supported = len({c.school_id for c in contribs if c.school_id is not None})

    return {
        "include_demo": include_demo,
        "data_mode_label": (
            "DEMO ILLUSTRATION INCLUDED (Sample Non-Live Records)"
            if include_demo
            else "VERIFIED LIVE PLATFORM RECORDS ONLY"
        ),
        "total_contributions_count": total_contributions_count,
        "total_monetary_pledged_inr": round(total_monetary_pledged_inr, 2),
        "meals_supported": meals_supported,
        "children_reached": children_reached,
        "schools_supported": schools_supported,
        "active_verified_foundations": active_foundations,
        "recent_contributions": [_serialize_contribution(c) for c in contribs[:10]],
    }


@thalishare_router.get("/track")
def track_contributions(
    query: str = Query(..., description="Tracking Reference ID (TS-...) or Contributor Email"),
    db: Session = Depends(get_db),
):
    q_str = query.strip()
    if not q_str:
        raise HTTPException(status_code=400, detail="Please provide a Tracking Reference ID or Email address.")

    matches = (
        db.query(ThaliShareContribution)
        .filter(
            (ThaliShareContribution.tracking_ref.ilike(q_str))
            | (ThaliShareContribution.email.ilike(q_str))
        )
        .order_by(ThaliShareContribution.created_at.desc())
        .all()
    )
    return [_serialize_contribution(m) for m in matches]
