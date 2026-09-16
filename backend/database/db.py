import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.environ.get("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is missing.")

# Initialize MongoDB Client
client = MongoClient(MONGODB_URI)
db = client.digital_twin_db

# Collections
patients_collection = db.patients
twin_states_collection = db.twin_states
predictions_collection = db.predictions

# Create indexes for performance
patients_collection.create_index("patient_id", unique=True)
twin_states_collection.create_index("patient_id")
predictions_collection.create_index("patient_id")
