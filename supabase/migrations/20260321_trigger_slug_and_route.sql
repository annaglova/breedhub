-- Migration: Auto-generate slug and route on entity creation
-- Creates reusable generate_slug() function and BEFORE INSERT trigger

-- Step 1: Reusable slug generator
-- Transliterates Cyrillic/accented → Latin, appends first 8 chars of UUID
CREATE OR REPLACE FUNCTION generate_slug(name TEXT, id UUID) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  slug TEXT;
  uuid8 TEXT;
BEGIN
  slug := lower(trim(COALESCE(name, '')));

  -- Multi-char replacements first (order matters: щ before ш)
  slug := replace(slug, 'щ', 'shch');
  slug := replace(slug, 'ж', 'zh');
  slug := replace(slug, 'ё', 'yo');
  slug := replace(slug, 'х', 'kh');
  slug := replace(slug, 'ц', 'ts');
  slug := replace(slug, 'ч', 'ch');
  slug := replace(slug, 'ш', 'sh');
  slug := replace(slug, 'ю', 'yu');
  slug := replace(slug, 'я', 'ya');
  slug := replace(slug, 'ї', 'yi');
  slug := replace(slug, 'є', 'ye');
  slug := replace(slug, 'ß', 'ss');
  slug := replace(slug, 'æ', 'ae');
  slug := replace(slug, 'œ', 'oe');

  -- Remove soft/hard signs
  slug := replace(slug, 'ъ', '');
  slug := replace(slug, 'ь', '');

  -- Single-char transliteration (accented Latin + Cyrillic)
  -- from: àáâãäå(6) èéêë(4) ìíîï(4) òóôõö(5) ùúûü(4) ýÿ(2) ñçø(3) šžčřďťňůě(9) абвгдезийклмнопрстуфыэіґ(24) = 61
  -- to:   aaaaaa(6) eeee(4) iiii(4) ooooo(5) uuuu(4) yy(2) nco(3) szcrdtnue(9) abvgdeziyklmnoprstufyeig(24) = 61
  slug := translate(slug,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñçøšžčřďťňůěабвгдезийклмнопрстуфыэіґ',
    'aaaaaaeeeeiiiiooooouuuuyyncoszcrdtnueabvgdeziyklmnoprstufyeig'
  );

  -- Replace non-alphanumeric with hyphens
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  slug := trim(BOTH '-' FROM slug);
  -- Collapse multiple hyphens
  slug := regexp_replace(slug, '-+', '-', 'g');

  -- Truncate to 42 chars (42 + '-' + 8 uuid = 51 total max)
  slug := left(slug, 42);
  -- Remove trailing hyphen after truncation
  slug := rtrim(slug, '-');

  -- Append UUID suffix
  uuid8 := left(id::text, 8);

  IF slug = '' OR slug IS NULL THEN
    slug := uuid8;
  ELSE
    slug := slug || '-' || uuid8;
  END IF;

  RETURN slug;
END;
$$;

-- Step 2: Semi-universal trigger function
-- Args: TG_ARGV[0]=entity, TG_ARGV[1]=model, TG_ARGV[2]=partition_field
CREATE OR REPLACE FUNCTION trigger_generate_slug_and_route() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_entity TEXT;
  v_model TEXT;
  v_partition_field TEXT;
  v_partition_id UUID;
BEGIN
  -- Prevent cascade: skip if called from within another trigger
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Read trigger arguments
  v_entity := TG_ARGV[0];                   -- e.g., 'pet', 'account', 'contact'
  v_model := TG_ARGV[1];                    -- e.g., 'pet', 'kennel', 'contact'
  v_partition_field := TG_ARGV[2];           -- e.g., 'breed_id' or ''

  -- Generate slug if empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name, NEW.id);
  END IF;

  -- Resolve partition ID from the record dynamically
  IF v_partition_field IS NOT NULL AND v_partition_field != '' THEN
    EXECUTE format('SELECT ($1).%I', v_partition_field) INTO v_partition_id USING NEW;
  END IF;

  -- Insert route (ignore if slug already exists)
  INSERT INTO routes (slug, entity, entity_id, entity_partition_id, partition_field, model)
  VALUES (
    NEW.slug,
    v_entity,
    NEW.id,
    v_partition_id,
    NULLIF(v_partition_field, ''),
    v_model
  )
  ON CONFLICT (slug) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 3: Attach to pet table
CREATE TRIGGER trg_pet_slug_and_route
  BEFORE INSERT ON pet
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_slug_and_route('pet', 'pet', 'breed_id');
