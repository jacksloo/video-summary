import click
import subprocess
from datetime import datetime

@click.group()
def cli():
    """数据库迁移管理工具"""
    pass

@cli.command()
@click.argument('description')
def create(description):
    """创建新的迁移文件"""
    timestamp = datetime.now().strftime('%Y_%m_%d_%H')
    filename = f"{timestamp}_{description}"
    subprocess.run(['alembic', 'revision', '--autogenerate', '-m', filename])
    click.echo(f"已创建迁移文件: {filename}")

@cli.command()
def status():
    """查看迁移状态"""
    subprocess.run(['alembic', 'current'])
    click.echo("\n可用迁移历史:")
    subprocess.run(['alembic', 'history'])

@cli.command()
@click.option('--backup/--no-backup', default=True, help='是否备份数据库')
def upgrade(backup):
    """升级数据库到最新版本"""
    if backup:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"backup_{timestamp}.sql"
        subprocess.run(['pg_dump', '-U', 'postgres', 'summary', '-f', backup_file])
        click.echo(f"数据库已备份到: {backup_file}")
    
    subprocess.run(['alembic', 'upgrade', 'head'])
    click.echo("数据库升级完成")

@cli.command()
@click.argument('version')
def downgrade(version):
    """回滚数据库到指定版本"""
    if click.confirm('确定要回滚数据库吗？这可能会导致数据丢失！'):
        subprocess.run(['alembic', 'downgrade', version])
        click.echo(f"数据库已回滚到版本: {version}")

if __name__ == '__main__':
    cli() 