from flask_sqlalchemy import SQLAlchemy

# Single shared db instance imported by all models and services
db = SQLAlchemy()