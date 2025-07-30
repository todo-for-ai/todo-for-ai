"""
附件模型
"""

import os
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean, BigInteger
from sqlalchemy.orm import relationship
from .base import db


class Attachment(db.Model):
    """附件模型"""
    
    __tablename__ = 'attachments'
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment='主键ID')
    task_id = Column(BigInteger, ForeignKey('tasks.id'), nullable=False, comment='任务ID')
    filename = Column(String(255), nullable=False, comment='文件名')
    original_filename = Column(String(255), nullable=False, comment='原始文件名')
    file_path = Column(String(500), nullable=False, comment='文件路径')
    file_size = Column(BigInteger, nullable=False, comment='文件大小 (字节)')
    mime_type = Column(String(100), comment='MIME类型')
    is_image = Column(Boolean, default=False, comment='是否为图片')
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='上传时间')
    uploaded_by = Column(String(100), comment='上传者')
    
    # 关系
    task = relationship('Task', back_populates='attachments')
    
    def __repr__(self):
        return f'<Attachment {self.id}: {self.original_filename}>'
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'is_image': self.is_image,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'uploaded_by': self.uploaded_by,
            'file_size_human': self.get_file_size_human(),
        }
    
    def get_file_size_human(self):
        """获取人类可读的文件大小"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    @property
    def file_extension(self):
        """获取文件扩展名"""
        return os.path.splitext(self.original_filename)[1].lower()
    
    @classmethod
    def create_attachment(cls, task_id, filename, original_filename, file_path, 
                         file_size, mime_type=None, uploaded_by=None):
        """创建附件记录"""
        # 判断是否为图片
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'}
        is_image = os.path.splitext(original_filename)[1].lower() in image_extensions
        
        attachment = cls(
            task_id=task_id,
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            is_image=is_image,
            uploaded_by=uploaded_by
        )
        
        db.session.add(attachment)
        db.session.commit()
        return attachment
    
    @classmethod
    def get_task_attachments(cls, task_id):
        """获取任务的所有附件"""
        return cls.query.filter_by(task_id=task_id).order_by(cls.uploaded_at.desc()).all()
    
    @classmethod
    def get_task_images(cls, task_id):
        """获取任务的图片附件"""
        return cls.query.filter_by(task_id=task_id, is_image=True).order_by(cls.uploaded_at.desc()).all()
    
    def delete_file(self):
        """删除文件和数据库记录"""
        # 删除物理文件
        if os.path.exists(self.file_path):
            try:
                os.remove(self.file_path)
            except OSError:
                pass  # 文件可能已被删除或无权限
        
        # 删除数据库记录
        db.session.delete(self)
        db.session.commit()
