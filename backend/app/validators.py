"""Input validation utilities for API routes.

Provides request validation, string sanitization, and schema definitions
for validating incoming API request data.
"""

import re


def sanitize_string(value: str) -> str:
    """Strip HTML tags and escape dangerous characters.

    This function is idempotent: sanitize_string(sanitize_string(x)) == sanitize_string(x).
    """
    if not isinstance(value, str):
        return value
    # Strip HTML tags
    cleaned = re.sub(r'<[^>]*>', '', value)
    # First, unescape any existing HTML entities to avoid double-escaping
    # This ensures idempotency: applying sanitize_string twice yields the same result
    cleaned = cleaned.replace('&#x27;', "'")
    cleaned = cleaned.replace('&quot;', '"')
    cleaned = cleaned.replace('&gt;', '>')
    cleaned = cleaned.replace('&lt;', '<')
    cleaned = cleaned.replace('&amp;', '&')
    # Now escape dangerous characters (& must be first to avoid double-escaping)
    cleaned = cleaned.replace('&', '&amp;')
    cleaned = cleaned.replace('<', '&lt;')
    cleaned = cleaned.replace('>', '&gt;')
    cleaned = cleaned.replace('"', '&quot;')
    cleaned = cleaned.replace("'", '&#x27;')
    return cleaned


def validate_uuid(value: str) -> bool:
    """Check if value is a valid UUID v4 format."""
    if not isinstance(value, str):
        return False
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    return bool(re.match(pattern, value.lower()))


def validate_password_strength(password: str) -> tuple:
    """Validate password is between 8 and 128 characters.

    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    if not isinstance(password, str):
        return (False, 'Password must be a string')
    if len(password) < 8:
        return (False, 'Password must be at least 8 characters')
    if len(password) > 128:
        return (False, 'Password must be at most 128 characters')
    return (True, '')


def validate_request(data: dict, schema: dict) -> tuple:
    """Validate request data against a schema definition.

    Reports ALL failing fields, not just the first.

    Args:
        data: The request data dictionary to validate.
        schema: A dictionary defining field rules. Each field can specify:
            - type: 'string', 'integer', or 'list'
            - required: bool (default False)
            - min_length: minimum string length
            - max_length: maximum string length

    Returns:
        tuple: (is_valid: bool, errors: dict)
    """
    errors = {}

    if not isinstance(data, dict):
        return (False, {'_general': 'Request body must be a JSON object'})

    for field, rules in schema.items():
        value = data.get(field)
        field_type = rules.get('type')
        required = rules.get('required', False)
        min_length = rules.get('min_length')
        max_length = rules.get('max_length')

        # Check required fields
        if required and (value is None or value == ''):
            errors[field] = f'{field} is required'
            continue

        # Skip validation for optional fields that are not present
        if value is None:
            continue

        # Type checking
        if field_type == 'string' and not isinstance(value, str):
            errors[field] = f'{field} must be a string'
            continue
        elif field_type == 'integer' and not isinstance(value, int):
            errors[field] = f'{field} must be an integer'
            continue
        elif field_type == 'list' and not isinstance(value, list):
            errors[field] = f'{field} must be a list'
            continue

        # Length checks for strings
        if field_type == 'string' and isinstance(value, str):
            if min_length and len(value) < min_length:
                errors[field] = f'{field} must be at least {min_length} characters'
            elif max_length and len(value) > max_length:
                errors[field] = f'{field} must be at most {max_length} characters'

    return (len(errors) == 0, errors)


# Schema definitions
REGISTER_SCHEMA = {
    'name': {'type': 'string', 'required': True, 'max_length': 100},
    'images': {'type': 'list', 'required': True},
    'password': {'type': 'string', 'required': True, 'min_length': 8, 'max_length': 128},
}

LOGIN_SCHEMA = {
    'password': {'type': 'string', 'required': False, 'min_length': 8, 'max_length': 128},
    'image': {'type': 'string', 'required': False},
}

NOTE_SCHEMA = {
    'title': {'type': 'string', 'required': True, 'max_length': 255},
    'content': {'type': 'string', 'required': False, 'max_length': 50000},
    'folder_id': {'type': 'integer', 'required': False},
}

FOLDER_SCHEMA = {
    'name': {'type': 'string', 'required': True, 'max_length': 100},
    'parent_id': {'type': 'integer', 'required': False},
}
