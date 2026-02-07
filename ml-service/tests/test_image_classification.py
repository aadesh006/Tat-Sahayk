import pytest
from src.inference.image_classifier import ImageHazardClassifier
from PIL import Image
import numpy as np
import os
from pathlib import Path

def create_test_image(filename: str, color: str = "blue"):
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    image_path = data_dir / filename
    img_array = np.zeros((224, 224, 3), dtype=np.uint8)
    
    if color == "blue":
        img_array[:, :, 2] = 180  # Blue channel
        img_array[:, :, 1] = 100  # Green channel
        img_array[:, :, 0] = 50   # Red channel
    elif color == "dark_blue":
        # Storm/tsunami dark blue
        img_array[:, :, 2] = 100  # Dark blue
        img_array[:, :, 1] = 50   # Less green
        img_array[:, :, 0] = 30   # Less red
    elif color == "gray":
        # Stormy gray
        img_array[:, :] = 80  # All channels gray
    
    img = Image.fromarray(img_array)
    img.save(image_path)
    
    return str(image_path)

def test_image_classification():
    print("\n Testing Image Classification...")
    
    # Create test image
    print(" Creating test image...")
    image_path = create_test_image("tsunami_sample.jpg", color="dark_blue")
    
    try:
        print("Loading CLIP model...")
        classifier = ImageHazardClassifier()
        print("Model loaded")
        print(f" Classifying image: {image_path}")
        result = classifier.classify_image(image_path)
        assert "hazard_type" in result, "Missing hazard_type in result"
        assert "confidence" in result, "Missing confidence in result"
        assert "all_scores" in result, "Missing all_scores in result"
        assert "is_hazard" in result, "Missing is_hazard in result"
        assert 0 <= result["confidence"] <= 1, f"Invalid confidence: {result['confidence']}"
        print(f"\n Classification Results:")
        print(f"   Hazard Type: {result['hazard_type']}")
        print(f"   Confidence: {result['confidence']:.2%}")
        print(f"   Is Hazard: {result['is_hazard']}")
        print(f"   Severity: {result.get('severity', 'N/A')}")
        
        print(f"\n Top 3 Predictions:")
        sorted_scores = sorted(result['all_scores'].items(), key=lambda x: x[1], reverse=True)
        for i, (hazard, score) in enumerate(sorted_scores[:3], 1):
            print(f"   {i}. {hazard}: {score:.2%}")
        
        print("\n Test PASSED!")
        
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)
            print(f"  Cleaned up test image")

def test_image_text_consistency():
    print("\n Testing Image-Text Consistency")
    
    # Create test image
    image_path = create_test_image("consistency_test.jpg", color="blue")
    
    try:
        classifier = ImageHazardClassifier()
        
        # Test consistency
        result = classifier.verify_consistency(
            image_path=image_path,
            text_prediction="tsunami"
        )
        
        # Assertions
        assert "consistent" in result
        assert "consistency_score" in result
        assert "image_prediction" in result
        assert "text_prediction" in result
        
        print(f"\n Consistency Check:")
        print(f"   Image says: {result['image_prediction']}")
        print(f"   Text says: {result['text_prediction']}")
        print(f"   Match: {result['consistent']}")
        print(f"   Score: {result['consistency_score']:.2%}")
        
        print("\n Test PASSED!")
        
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)

def test_multiple_images():
    """Test classification with different image types"""
    print("\n Testing Multiple Image Types...")
    
    classifier = ImageHazardClassifier()
    test_cases = [
        ("ocean_normal.jpg", "blue", "normal ocean"),
        ("storm_dark.jpg", "dark_blue", "storm/tsunami"),
        ("cloudy_gray.jpg", "gray", "stormy conditions")
    ]
    
    for filename, color, description in test_cases:
        print(f"\n Testing: {description}")
        image_path = create_test_image(filename, color)
        
        try:
            result = classifier.classify_image(image_path)
            print(f"   Result: {result['hazard_type']} ({result['confidence']:.1%})")
            
            assert result['confidence'] > 0, f"Zero confidence for {filename}"
            
        finally:
            if os.path.exists(image_path):
                os.remove(image_path)
    
    print("\n Multiple Images Test PASSED!")

if __name__ == "__main__":

    print("\n")
    print("\n")
    print("\n")
    print("IMAGE CLASSIFICATION TEST SUITE")
    print("\n")
    print("\n")
    print("\n")
    
    test_image_classification()
    print()
    test_image_text_consistency()
    print()
    test_multiple_images()
    
    print("\n")
    print(" ALL IMAGE TESTS PASSED!")