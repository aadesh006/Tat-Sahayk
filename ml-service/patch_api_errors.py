#!/usr/bin/env python3
import re
from pathlib import Path
from datetime import datetime
import shutil

def backup_file(filepath: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = filepath.with_suffix(f'.py.backup_{timestamp}')
    shutil.copy2(filepath, backup_path)
    return backup_path

def patch_datetime_serialization(content: str) -> tuple[str, int]:
    changes = 0
    
    pattern1 = r'"timestamp":\s*datetime\.now\(\)'
    replacement1 = '"timestamp": datetime.now().isoformat()'
    new_content = re.sub(pattern1, replacement1, content)
    changes += len(re.findall(pattern1, content))
    
    pattern2 = r'"timestamp"\s*:\s*datetime\.now\(\)'
    replacement2 = '"timestamp": datetime.now().isoformat()'
    new_content = re.sub(pattern2, replacement2, new_content)
    
    return new_content, changes

def patch_pydantic_v2(content: str) -> tuple[str, int]:
    changes = 0
    
    if 'schema_extra' in content:
        content = re.sub(
            r'\bschema_extra\b',
            'json_schema_extra',
            content
        )
        changes += 1
    
    return content, changes

def add_protected_namespaces_fix(content: str) -> tuple[str, int]:
    changes = 0
    pattern = r'(class Config:(?:\s+[\w\s=\{\}\[\]\(\),"\':]+)*)'
    
    def add_protected_namespaces(match):
        nonlocal changes
        config_block = match.group(1)
        if 'protected_namespaces' not in config_block:
            lines = config_block.split('\n')
            if len(lines) > 1:
                lines.insert(1, '        protected_namespaces = ()  # Fix model_ namespace warnings')
                changes += 1
                return '\n'.join(lines)
        return config_block
    
    new_content = re.sub(pattern, add_protected_namespaces, content)
    return new_content, changes

def generate_entity_schema_fix() -> str:
    """Generate the correct entity schema code"""
    return '''
# ============================================================================
# ENTITY SCHEMA FIX
# ============================================================================
# Add this to your response models (likely in src/api/models/responses.py)

from pydantic import BaseModel, Field
from typing import List, Optional

class Entity(BaseModel):
    """Single entity with metadata"""
    text: str = Field(..., description="The entity text")
    label: str = Field(..., description="Entity type (LOCATION, ORG, etc.)")
    start: int = Field(..., description="Start position in text")
    end: int = Field(..., description="End position in text")
    confidence: Optional[float] = Field(None, description="Confidence score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Mumbai",
                "label": "LOCATION",
                "start": 19,
                "end": 25,
                "confidence": 0.95
            }
        }

class EntityResponse(BaseModel):
    """Entity extraction results"""
    locations: List[str] = Field(default_factory=list)
    organizations: List[str] = Field(default_factory=list)
    dates: List[str] = Field(default_factory=list)
    times: List[str] = Field(default_factory=list)
    all_entities: List[Entity] = Field(default_factory=list)  # Changed from List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "locations": ["Mumbai", "Chennai"],
                "organizations": ["NDRF"],
                "dates": ["2024-01-30"],
                "times": ["14:30"],
                "all_entities": [
                    {
                        "text": "Mumbai",
                        "label": "LOCATION",
                        "start": 0,
                        "end": 6
                    }
                ]
            }
        }

# ============================================================================
# If you want to keep all_entities as List[str], change your data processing:
# ============================================================================

def extract_entities_text_only(entities: List[dict]) -> List[str]:
    """Extract just the text from entity objects"""
    return [entity['text'] for entity in entities]

# Then in your endpoint:
# all_entities = extract_entities_text_only(raw_entities)
'''

def patch_file(filepath: Path, dry_run: bool = False) -> dict:
    """
    Patch a file with all fixes
    Returns: dict with patch statistics
    """
    if not filepath.exists():
        return {"error": f"File not found: {filepath}"}
    
    print(f"\n{'='*80}")
    print(f"Patching: {filepath}")
    print(f"{'='*80}")
    
    # Read original content
    original_content = filepath.read_text()
    content = original_content
    total_changes = 0
    
    # Apply patches
    patches = []
    
    # Patch 1: Datetime serialization
    content, changes = patch_datetime_serialization(content)
    if changes > 0:
        patches.append(f"✓ Fixed {changes} datetime serialization issue(s)")
        total_changes += changes
    
    # Patch 2: Pydantic V2
    content, changes = patch_pydantic_v2(content)
    if changes > 0:
        patches.append(f"✓ Fixed {changes} Pydantic V2 compatibility issue(s)")
        total_changes += changes
    
    # Patch 3: Protected namespaces
    content, changes = add_protected_namespaces_fix(content)
    if changes > 0:
        patches.append(f"✓ Added {changes} protected_namespaces fix(es)")
        total_changes += changes
    
    # Report results
    if total_changes == 0:
        print("ℹ No changes needed")
        return {"filepath": str(filepath), "changes": 0, "patches": []}
    
    print(f"\nChanges to apply:")
    for patch in patches:
        print(f"  {patch}")
    
    if dry_run:
        print(f"\n⚠ DRY RUN - No files modified")
        return {
            "filepath": str(filepath),
            "changes": total_changes,
            "patches": patches,
            "dry_run": True
        }
    
    # Create backup
    backup_path = backup_file(filepath)
    print(f"\n✓ Backup created: {backup_path}")
    
    # Write patched content
    filepath.write_text(content)
    print(f"✓ Patched: {filepath}")
    
    return {
        "filepath": str(filepath),
        "changes": total_changes,
        "patches": patches,
        "backup": str(backup_path)
    }

def main():
    """Main patch script"""
    print(f"\n")
    print("TAT-SAHAYK ML API - AUTOMATED PATCH SCRIPT")
    print(f"\n")
    print()
    print("This script will fix:")
    print("  1. Datetime JSON serialization errors")
    print("  2. Pydantic V2 compatibility warnings")
    print("  3. Protected namespace conflicts")
    print()
    
    files_to_patch = [
        Path("src/api/routes/main.py"),
        Path("src/api/models/responses.py"),
    ]
    
    if not Path("src").exists():
        print(" Error: Not in project root directory")
        print("   Please run this script from the ml-service directory")
        return
    
    response = input("Run in DRY RUN mode first? (Y/n): ").strip().lower()
    dry_run = response != 'n'
    
    results = []

    for filepath in files_to_patch:
        result = patch_file(filepath, dry_run=dry_run)
        results.append(result)
    
    print(f"\n")
    print("ENTITY SCHEMA FIX")
    print(f"\n")
    
    entity_fix_file = Path("ENTITY_SCHEMA_FIX.py")
    entity_fix_file.write_text(generate_entity_schema_fix())
    print(f" Generated: {entity_fix_file}")
    print(f"  Review this file and apply the changes to your response models")

    print(f"\n")
    print("SUMMARY")
    print(f"\n")
    
    total_changes = sum(r.get('changes', 0) for r in results)
    
    if dry_run:
        print(f"\n DRY RUN COMPLETE - No files were modified")
        print(f"  Total changes that would be applied: {total_changes}")
        print(f"\nTo apply changes, run again and answer 'n' to dry run prompt")
    else:
        print(f"\n PATCHING COMPLETE")
        print(f"  Total changes applied: {total_changes}")
        
        for result in results:
            if result.get('changes', 0) > 0:
                print(f"\n  {result['filepath']}:")
                for patch in result['patches']:
                    print(f"    {patch}")
        
        print(f"\n")
        print("NEXT STEPS")
        print(f"\n")
        print(f"1. Review ENTITY_SCHEMA_FIX.py")
        print(f"2. Apply entity schema changes to your response models")
        print(f"3. Restart the API server:")
        print(f"   ./scripts/start_api.sh")
        print(f"4. Test the endpoints:")
        print(f"   python tests/test_api_endpoints.py")
    
    return results

if __name__ == "__main__":
    main()