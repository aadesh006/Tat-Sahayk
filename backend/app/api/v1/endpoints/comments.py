from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentResponse
from typing import List

router = APIRouter()

@router.get("/{report_id}/comments", response_model=List[CommentResponse])
def get_comments(report_id: int, db: Session = Depends(get_db)):
    # Get only top-level comments (no parent_id)
    comments = db.query(Comment).filter(
        Comment.report_id == report_id,
        Comment.parent_id == None
    ).order_by(Comment.created_at.asc()).all()
    
    result = []
    for c in comments:
        result.append(CommentResponse(
            id=c.id,
            report_id=c.report_id,
            user_id=c.user_id,
            parent_id=c.parent_id,
            content=c.content,
            created_at=c.created_at,
            author_name=c.author.full_name if c.author else "Unknown",
            author_profile_photo=c.author.profile_photo if c.author else None,
            author_role=c.author.role if c.author else None
        ))
        
        # Add replies (nested comments)
        if hasattr(c, 'replies') and c.replies:
            for reply in sorted(c.replies, key=lambda r: r.created_at):
                result.append(CommentResponse(
                    id=reply.id,
                    report_id=reply.report_id,
                    user_id=reply.user_id,
                    parent_id=reply.parent_id,
                    content=reply.content,
                    created_at=reply.created_at,
                    author_name=reply.author.full_name if reply.author else "Unknown",
                    author_profile_photo=reply.author.profile_photo if reply.author else None,
                    author_role=reply.author.role if reply.author else None
                ))
    
    return result

@router.post("/{report_id}/comments", response_model=CommentResponse)
def create_comment(
    report_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if not comment_in.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    
    # If parent_id is provided, verify it exists
    if comment_in.parent_id:
        parent = db.query(Comment).filter(
            Comment.id == comment_in.parent_id,
            Comment.report_id == report_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    comment = Comment(
        report_id=report_id,
        user_id=current_user.id,
        parent_id=comment_in.parent_id,
        content=comment_in.content.strip()
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return CommentResponse(
        id=comment.id,
        report_id=comment.report_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        content=comment.content,
        created_at=comment.created_at,
        author_name=current_user.full_name,
        author_profile_photo=current_user.profile_photo,
        author_role=current_user.role
    )

@router.delete("/{report_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    report_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.report_id == report_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    # Only comment author can delete their own comment
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(comment)
    db.commit()