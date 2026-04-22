from sqlalchemy.ext.declarative import declarative_base

# Base db model for other to inherit from, so that they can be used by SQLAlchemy ORM and create tables in the database

Base = declarative_base()
