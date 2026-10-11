import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import date
from xgboost import XGBRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import shap

from backend.digital_twin.features import CATEGORICAL_FEATURES, FEATURE_SPECS, MODEL_FEATURES, NUMERIC_FEATURES

MODEL_VERSION = "1.1.0"
FEATURE_VERSION = "v2"

def load_nhanes(data_dir):
    nhanes_files = ['DEMO_J.xpt', 'GHB_J.xpt', 'GLU_J.xpt', 'BIOPRO_J.xpt', 'BMX_J.xpt', 'DIQ_J.xpt', 'PAQ_J.xpt', 'SMQ_J.xpt']
    nhanes_df = None

    for file in nhanes_files:
        file_path = os.path.join(data_dir, file)
        if os.path.exists(file_path):
            df = pd.read_sas(file_path)
            nhanes_df = df if nhanes_df is None else pd.merge(nhanes_df, df, on='SEQN', how='outer')

    if nhanes_df is None:
        raise FileNotFoundError(f"Could not find NHANES data in {data_dir}")
    return nhanes_df

def build_preprocessor():
    num_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    cat_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    return ColumnTransformer(transformers=[
        ('num', num_transformer, NUMERIC_FEATURES),
        ('cat', cat_transformer, CATEGORICAL_FEATURES)
    ])

def fit_xgboost(X, y):
    """Fits the preprocessor + XGBoost. As age, BMI, waist or glucose rise, the estimate can only rise."""
    preprocessor = build_preprocessor()
    X_prep = preprocessor.fit_transform(X)

    feature_names = (NUMERIC_FEATURES +
                     list(preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(CATEGORICAL_FEATURES)))

    model = XGBRegressor(
        n_estimators=300, learning_rate=0.05, max_depth=3, random_state=42,
        monotone_constraints=tuple(1 if name in NUMERIC_FEATURES else 0 for name in feature_names)
    )
    model.fit(pd.DataFrame(X_prep, columns=feature_names), y)
    return preprocessor, model, feature_names

def scores(y_true, y_pred):
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 3),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 3),
    }

def evaluate(X, y):
    """Scores XGBoost and simple baselines on a held-out 20% that no model sees during training."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor, model, feature_names = fit_xgboost(X_train, y_train)
    X_test_prep = pd.DataFrame(preprocessor.transform(X_test), columns=feature_names)
    linear = LinearRegression().fit(preprocessor.transform(X_train), y_train)
    glucose_only = LinearRegression().fit(X_train[['LBXGLU']], y_train)

    results = {
        "mean_baseline": scores(y_test, np.full(len(y_test), y_train.mean())),
        "glucose_only_linear": scores(y_test, glucose_only.predict(X_test[['LBXGLU']])),
        "linear_regression": scores(y_test, linear.predict(preprocessor.transform(X_test))),
        "xgboost": scores(y_test, model.predict(X_test_prep)),
    }
    return len(X_train), len(X_test), results

def train_and_save_models():
    print("Loading data...")
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data'))
    nhanes_df = load_nhanes(data_dir)

    print("Preprocessing...")
    nhanes_df = nhanes_df.dropna(subset=['LBXGH'])
    X = nhanes_df[MODEL_FEATURES].copy()

    # Codes 7/9 mean "refused" / "don't know": treat them as missing, not as a real answer
    for col in CATEGORICAL_FEATURES:
        X.loc[~X[col].isin(list(FEATURE_SPECS[col]["choices"])), col] = np.nan

    # The app always asks for fasting glucose, so learn only from people whose glucose was measured
    measured = X['LBXGLU'].notna()
    X, y = X[measured], nhanes_df.loc[measured, 'LBXGH']
    print(f"Training rows (HbA1c and fasting glucose both measured): {len(X)}")

    print("Evaluating on a held-out 20% test set...")
    n_train, n_test, results = evaluate(X, y)
    print(f"{'Model':<22}{'R2':>8}{'MAE':>8}{'RMSE':>8}")
    for name, s in results.items():
        print(f"{name:<22}{s['r2']:>8.3f}{s['mae']:>8.3f}{s['rmse']:>8.3f}")

    print("Training final XGBoost on all rows...")
    preprocessor, model, feature_names = fit_xgboost(X, y)

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

    meta = {
        "model_version": MODEL_VERSION,
        "feature_version": FEATURE_VERSION,
        "trained_on": date.today().isoformat(),
        "dataset": "NHANES 2017-2018: people with both HbA1c and fasting glucose measured",
        "n_rows": int(len(X)),
        "evaluation": {"train_rows": n_train, "test_rows": n_test, **results},
    }
    with open(os.path.join(models_dir, 'model_meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"Models successfully saved to {models_dir}")

if __name__ == "__main__":
    train_and_save_models()
