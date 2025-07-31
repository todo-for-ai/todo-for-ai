"""
仪表盘API
"""

from flask import Blueprint, jsonify
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta

from models import db, User, Project, Task, TaskStatus, UserActivity
from .auth import require_auth, get_current_user
from .base import api_response, api_error

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def get_dashboard_stats():
    """获取仪表盘统计数据（用户隔离）"""
    try:
        current_user = get_current_user()
        
        # 获取用户的项目统计
        user_projects = Project.query.filter_by(owner_id=current_user.id).all()
        project_ids = [p.id for p in user_projects]
        
        # 项目统计
        total_projects = len(user_projects)
        active_projects = len([p for p in user_projects if p.status.value == 'active'])
        
        # 任务统计（只统计用户拥有的项目中的任务）
        if project_ids:
            # 总任务数
            total_tasks = Task.query.filter(Task.project_id.in_(project_ids)).count()
            
            # 各状态任务数
            todo_tasks = Task.query.filter(
                Task.project_id.in_(project_ids),
                Task.status == TaskStatus.TODO
            ).count()
            
            in_progress_tasks = Task.query.filter(
                Task.project_id.in_(project_ids),
                Task.status == TaskStatus.IN_PROGRESS
            ).count()
            
            review_tasks = Task.query.filter(
                Task.project_id.in_(project_ids),
                Task.status == TaskStatus.REVIEW
            ).count()
            
            done_tasks = Task.query.filter(
                Task.project_id.in_(project_ids),
                Task.status == TaskStatus.DONE
            ).count()
            
            # AI任务数（进行中的AI任务）
            ai_tasks = Task.query.filter(
                Task.project_id.in_(project_ids),
                Task.is_ai_task == True,
                Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW])
            ).count()
            
        else:
            total_tasks = todo_tasks = in_progress_tasks = review_tasks = done_tasks = ai_tasks = 0
        
        # 最近项目（最近更新的5个项目）
        recent_projects = Project.query.filter_by(owner_id=current_user.id)\
            .order_by(Project.updated_at.desc())\
            .limit(5).all()
        
        # 最近任务（最近更新的5个任务）
        recent_tasks = []
        if project_ids:
            recent_tasks = Task.query.filter(Task.project_id.in_(project_ids))\
                .order_by(Task.updated_at.desc())\
                .limit(5).all()
        
        # 用户活跃度统计（最近30天）
        activity_stats = UserActivity.get_user_activity_stats(current_user.id, days=30)
        
        return api_response({
            'projects': {
                'total': total_projects,
                'active': active_projects,
            },
            'tasks': {
                'total': total_tasks,
                'todo': todo_tasks,
                'in_progress': in_progress_tasks,
                'review': review_tasks,
                'done': done_tasks,
                'ai_executing': ai_tasks,
            },
            'recent_projects': [p.to_dict() for p in recent_projects],
            'recent_tasks': [t.to_dict(include_project=True) for t in recent_tasks],
            'activity_stats': activity_stats,
        })
        
    except Exception as e:
        return api_error(f"Failed to get dashboard stats: {str(e)}", 500)


@dashboard_bp.route('/activity-heatmap', methods=['GET'])
@require_auth
def get_activity_heatmap():
    """获取用户活跃度热力图数据"""
    try:
        current_user = get_current_user()
        
        # 获取最近365天的活跃度数据
        heatmap_data = UserActivity.get_user_activity_heatmap(current_user.id, days=365)
        
        return api_response({
            'heatmap_data': heatmap_data,
            'user_id': current_user.id,
            'generated_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return api_error(f"Failed to get activity heatmap: {str(e)}", 500)


@dashboard_bp.route('/activity-summary', methods=['GET'])
@require_auth
def get_activity_summary():
    """获取活跃度摘要统计"""
    try:
        current_user = get_current_user()
        
        # 获取不同时间段的统计
        stats_7d = UserActivity.get_user_activity_stats(current_user.id, days=7)
        stats_30d = UserActivity.get_user_activity_stats(current_user.id, days=30)
        stats_90d = UserActivity.get_user_activity_stats(current_user.id, days=90)
        stats_365d = UserActivity.get_user_activity_stats(current_user.id, days=365)
        
        # 计算连续活跃天数
        consecutive_days = _get_consecutive_active_days(current_user.id)
        
        # 获取最活跃的一天
        most_active_day = UserActivity.query.filter_by(user_id=current_user.id)\
            .order_by(UserActivity.total_activity_count.desc())\
            .first()
        
        return api_response({
            'stats_7d': stats_7d,
            'stats_30d': stats_30d,
            'stats_90d': stats_90d,
            'stats_365d': stats_365d,
            'consecutive_active_days': consecutive_days,
            'most_active_day': {
                'date': most_active_day.activity_date.isoformat() if most_active_day else None,
                'count': most_active_day.total_activity_count if most_active_day else 0
            }
        })
        
    except Exception as e:
        return api_error(f"Failed to get activity summary: {str(e)}", 500)


def _get_consecutive_active_days(user_id):
    """计算连续活跃天数"""
    try:
        today = date.today()
        consecutive_days = 0
        current_date = today
        
        # 从今天开始往前查找连续活跃的天数
        while True:
            activity = UserActivity.query.filter_by(
                user_id=user_id,
                activity_date=current_date
            ).first()
            
            if activity and activity.total_activity_count > 0:
                consecutive_days += 1
                current_date -= timedelta(days=1)
            else:
                break
            
            # 防止无限循环，最多查找365天
            if consecutive_days >= 365:
                break
        
        return consecutive_days
        
    except Exception:
        return 0
