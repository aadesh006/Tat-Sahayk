import sys
from pathlib import Path
import logging
import time

sys.path.append(str(Path(__file__).parent.parent))

from config.settings import settings
from config.logging_config import setup_logging

def run_step(step_name, script_path):
    print(f"\n{'='*80}")
    print(f"STEP: {step_name}")
    print(f"{'='*80}\n")
    
    import subprocess
    start_time = time.time()
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=False
    )
    
    elapsed = time.time() - start_time
    
    if result.returncode == 0:
        print(f"\n {step_name} completed in {elapsed/60:.1f} minutes")
        return True
    else:
        print(f"\n✗ {step_name} failed!")
        return False

def main():
    """Run all training steps"""
    print("TRAINING ALL MODELS - DAY 3")
    print("\n")
    print("="*80)
    
    input("\nPress Enter to continue...")
    
    total_start = time.time()
    
    success = run_step(
        "Add Sentiment & NER Features",
        Path(__file__).parent / "add_ml_features.py"
    )
    if not success:
        print("\n Training failed at feature engineering step")
        return
    
    success = run_step(
        "Train Text Classifier",
        Path(__file__).parent.parent / "src" / "training" / "train_text_classifier.py"
    )
    if not success:
        print("\nTraining failed at text classifier step")
        return
    
    total_elapsed = time.time() - total_start
    
    print("\n")
    print(" ALL MODELS TRAINED SUCCESSFULLY!")
    print(f"\nTotal time: {total_elapsed/60:.1f} minutes")
    print(f"\nTrained models saved to: {settings.MODELS_DIR}")

if __name__ == "__main__":
    main()