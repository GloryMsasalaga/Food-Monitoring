"""add_missing_drink_columns

Revision ID: 67bf54dbf4ad
Revises: 
Create Date: 2025-06-12 15:36:08.514241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67bf54dbf4ad'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add all the missing columns
    op.add_column('drink', sa.Column('calories', sa.Float(), nullable=True))
    op.add_column('drink', sa.Column('caffeine_mg', sa.Float(), nullable=True))
    op.add_column('drink', sa.Column('sodium_mg', sa.Float(), nullable=True))
    op.add_column('drink', sa.Column('potassium_mg', sa.Float(), nullable=True))

def downgrade() -> None:
    # Remove columns if needed to roll back
    op.drop_column('drink', 'calories')
    op.drop_column('drink', 'caffeine_mg')
    op.drop_column('drink', 'sodium_mg')
    op.drop_column('drink', 'potassium_mg')
