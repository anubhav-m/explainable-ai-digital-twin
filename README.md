# Explainable AI Digital Twin

A modern, patient-centric healthcare dashboard that creates a longitudinal, virtual representation of a patient. It leverages Machine Learning to forecast clinical outcomes, uses SHAP (SHapley Additive exPlanations) to provide transparent feature-level explainability, and integrates an LLM-powered clinical assistant to deliver evidence-grounded medical insights.

## Key Features

*   **Digital Twin State:** Longitudinal, chronological tracking of clinical vitals, demographics, and lab results.
*   **Predictive ML & XAI:** Real-time risk predictions (e.g., HbA1c levels) utilizing XGBoost, paired with SHAP-based model explainability so you understand why a prediction was made.
*   **What-If Simulator:** Interactive counterfactual testing. Simulate how clinical interventions (like lowering BMI or increasing physical activity) impact patient risk trajectories in real-time.
*   **AI Clinical Assistant:** RAG-augmented insights that answer questions grounded in the patient's live digital twin state and retrieved medical literature.
*   **Premium UI/UX:** A stunning, responsive interface built with Tailwind CSS v4 featuring smooth transitions and full Dark Mode support.

## Technology Stack

**Frontend:**
*   React 19 & TypeScript
*   Vite
*   Tailwind CSS v4
*   Recharts (Data Visualization)
*   Lucide React (Icons)

**Backend:**
*   Python 3 & FastAPI
*   MongoDB (Database)
*   XGBoost & Scikit-learn (Machine Learning)
*   SHAP (Explainable AI)
*   LangChain (RAG / LLM Integration)

## Getting Started

### Prerequisites
Make sure you have Node.js (v18+) and Python (v3.9+) installed on your machine.

### 1. Backend Setup
Navigate to the root directory and set up your Python environment:

```bash
# Create and activate a virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Before running the server, create a `.env` file in the root directory and configure your MongoDB connection string and API keys:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
# Add your LLM API keys here as well
```

```bash
# Start the FastAPI server (must be run from the root directory)
python -m uvicorn backend.api.main:app --reload
```
The backend API will be running at `http://127.0.0.1:8000`.

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and start the Vite dev server:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend application will be running at `http://localhost:5173`.
