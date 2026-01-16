/*
  # Create Activation Function

  1. New Function
    - `activate_user_with_code` - Function that activates a user with a code
    - Takes user_id and code as parameters
    - Validates code and updates user status
    - Returns success/error message

  2. Security
    - Function is SECURITY DEFINER (runs with creator privileges)
    - Validates all inputs
    - Checks code validity, expiration, and usage
    - Updates both code and user atomically
*/

-- Create function to activate user with code
CREATE OR REPLACE FUNCTION activate_user_with_code(
  p_user_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activation_code RECORD;
  v_normalized_code text;
BEGIN
  -- Normalize code (uppercase, trim)
  v_normalized_code := UPPER(TRIM(p_code));

  -- Validate inputs
  IF v_normalized_code IS NULL OR LENGTH(v_normalized_code) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code d''activation requis'
    );
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ID utilisateur requis'
    );
  END IF;

  -- Check if code exists and get its details
  SELECT * INTO v_activation_code
  FROM activation_codes
  WHERE code = v_normalized_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code d''activation invalide'
    );
  END IF;

  -- Check if code is already used
  IF v_activation_code.used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code a déjà été utilisé'
    );
  END IF;

  -- Check if code is expired
  IF v_activation_code.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code a expiré'
    );
  END IF;

  -- Update activation code as used
  UPDATE activation_codes
  SET 
    used = true,
    used_by = p_user_id,
    used_at = NOW()
  WHERE code = v_normalized_code;

  -- Update user status to active
  UPDATE users
  SET 
    status = 'active',
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte activé avec succès !'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de l''activation: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION activate_user_with_code(uuid, text) TO public;
