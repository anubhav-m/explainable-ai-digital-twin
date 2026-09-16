import os
import joblib
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import shap

def train_and_save_models():
    print("Loading data...")
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data'))
    nhanes_files = ['DEMO_J.xpt', 'GHB_J.xpt', 'GLU_J.xpt', 'BIOPRO_J.xpt', 'BMX_J.xpt', 'DIQ_J.xpt', 'PAQ_J.xpt', 'SMQ_J.xpt']
    nhanes_df = None
    
    for file in nhanes_files:
        file_path = os.path.join(data_dir, file)
        if os.path.exists(file_path):
            df = pd.read_sas(file_path)
            nhanes_df = df if nhanes_df is None else pd.merge(nhanes_df, df, on='SEQN', how='outer')

    if nhanes_df is None:
        raise FileNotFoundError(f"Could not find NHANES data in {data_dir}")

    print("Preprocessing...")
    nhanes_df = nhanes_df.dropna(subset=['LBXGH'])
    y = nhanes_df['LBXGH'].fillna(nhanes_df['LBXGH'].median())
    
    features = ['RIDAGEYR', 'RIAGENDR', 'BMXBMI', 'BMXWAIST', 'LBXGLU', 'PAQ605', 'SMQ020']
    X = nhanes_df[features].copy()

    # Preprocessor definition
    num_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')), 
        ('scaler', StandardScaler())
    ])
    cat_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')), 
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer(transformers=[
        ('num', num_transformer, ['RIDAGEYR', 'BMXBMI', 'BMXWAIST', 'LBXGLU']),
        ('cat', cat_transformer, ['RIAGENDR', 'PAQ605', 'SMQ020'])
    ])

    # Fit preprocessor
    print("Fitting preprocessor...")
    X_prep = preprocessor.fit_transform(X)
    
    feature_names = (['RIDAGEYR', 'BMXBMI', 'BMXWAIST', 'LBXGLU'] +
                     list(preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(['RIAGENDR', 'PAQ605', 'SMQ020'])))
    
    X_df = pd.DataFrame(X_prep, columns=feature_names)
    
    # Train model
    print("Training XGBoost...")
    model = XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    model.fit(X_df, y)
    
    # Create Explainer
    print("Initializing SHAP Explainer...")
    explainer = shap.Explainer(model)
    
    # Save artifacts
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../models'))
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(models_dir, 'xgboost_hba1c.pkl'))
    joblib.dump(preprocessor, os.path.join(models_dir, 'preprocessor.pkl'))
    joblib.dump(explainer, os.path.join(models_dir, 'shap_explainer.pkl'))
    joblib.dump(feature_names, os.path.join(models_dir, 'feature_names.pkl'))
    
    print(f"Models successfully saved to {models_dir}")

if __name__ == "__main__":
    train_and_save_models()
