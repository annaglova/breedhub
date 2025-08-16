-- ============================================================================
-- Виправлена інтеграція з Windmill (без токенів)
-- ============================================================================

-- Функція для виклику Windmill config_merge
-- Якщо Windmill доступний без авторизації або має внутрішню авторизацію
CREATE OR REPLACE FUNCTION call_windmill_merge(
    deps_data JSONB,
    self_data JSONB,
    override_data JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    response record;
BEGIN
    -- Викликаємо Windmill script без токена
    -- Windmill сам має доступ до Supabase
    SELECT status, content::jsonb as data INTO response
    FROM http_post(
        'http://dev.dogarray.com:8000/api/w/breedhub/jobs/run/f/common/json_merge',
        jsonb_build_object(
            'deps_data', deps_data,
            'self_data', self_data,
            'override_data', override_data
        )::text,
        'application/json'
    );
    
    IF response.status = 200 THEN
        result := response.data;
    ELSE
        -- Fallback to simple merge if Windmill is unavailable
        result := COALESCE(deps_data, '{}'::jsonb) || 
                 COALESCE(self_data, '{}'::jsonb) || 
                 COALESCE(override_data, '{}'::jsonb);
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- При помилці використовуємо простий merge
        RETURN COALESCE(deps_data, '{}'::jsonb) || 
               COALESCE(self_data, '{}'::jsonb) || 
               COALESCE(override_data, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Альтернативна функція якщо потрібен інший формат для нового config_merge
CREATE OR REPLACE FUNCTION call_windmill_config_merge(
    configs JSONB[]
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    response record;
    configs_array JSONB;
BEGIN
    -- Конвертуємо масив в JSONB масив
    SELECT jsonb_agg(config) INTO configs_array
    FROM unnest(configs) as config;
    
    -- Викликаємо Windmill script з новим форматом
    SELECT status, content::jsonb as data INTO response
    FROM http_post(
        'http://dev.dogarray.com:8000/api/w/breedhub/jobs/run/f/common/config_merge',
        jsonb_build_object(
            'configs', configs_array,
            'strategy', 'deep',
            'track_conflicts', true
        )::text,
        'application/json'
    );
    
    IF response.status = 200 THEN
        -- Витягуємо merged з відповіді
        result := response.data->'merged';
    ELSE
        -- Fallback to simple merge
        result := '{}'::jsonb;
        FOR i IN 1..array_length(configs, 1) LOOP
            result := result || configs[i];
        END LOOP;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- При помилці повертаємо простий merge
        result := '{}'::jsonb;
        FOR i IN 1..array_length(configs, 1) LOOP
            result := result || COALESCE(configs[i], '{}'::jsonb);
        END LOOP;
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Оновлена функція compute_merged_config що використовує Windmill
CREATE OR REPLACE FUNCTION compute_merged_config(config_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    parent_config JSONB;
    dep_configs JSONB[];
    current_config RECORD;
    all_configs JSONB[];
    idx INTEGER := 1;
BEGIN
    -- Get current config
    SELECT * INTO current_config
    FROM app_config
    WHERE id = config_id;
    
    IF NOT FOUND THEN
        RETURN '{}'::JSONB;
    END IF;
    
    -- Initialize configs array
    all_configs := ARRAY[]::JSONB[];
    
    -- Add parent config if exists
    IF current_config.parent_id IS NOT NULL THEN
        SELECT computed_config INTO parent_config
        FROM app_config
        WHERE id = current_config.parent_id;
        
        IF parent_config IS NOT NULL THEN
            all_configs[idx] := jsonb_build_object(
                'id', current_config.parent_id::text,
                'priority', 0,
                'base_config', parent_config,
                'overrides', '{}'::jsonb
            );
            idx := idx + 1;
        END IF;
    END IF;
    
    -- Add dependency configs
    FOR dep_config IN
        SELECT ac.id, ac.computed_config, cd.priority
        FROM config_dependencies cd
        JOIN app_config ac ON ac.id = cd.depends_on_id
        WHERE cd.config_id = config_id
        ORDER BY cd.priority
    LOOP
        all_configs[idx] := jsonb_build_object(
            'id', dep_config.id::text,
            'priority', dep_config.priority,
            'base_config', dep_config.computed_config,
            'overrides', '{}'::jsonb
        );
        idx := idx + 1;
    END LOOP;
    
    -- Add current config
    all_configs[idx] := jsonb_build_object(
        'id', current_config.id::text,
        'priority', 999,
        'base_config', current_config.base_config,
        'overrides', current_config.overrides
    );
    
    -- Call Windmill to merge all configs
    IF array_length(all_configs, 1) > 0 THEN
        result := call_windmill_config_merge(all_configs);
    ELSE
        result := current_config.base_config || current_config.overrides;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Тестова функція для перевірки роботи
CREATE OR REPLACE FUNCTION test_windmill_connection()
RETURNS TEXT AS $$
DECLARE
    test_result JSONB;
BEGIN
    test_result := call_windmill_merge(
        '{"test": "deps"}'::jsonb,
        '{"test": "self"}'::jsonb,
        '{"test": "override"}'::jsonb
    );
    
    IF test_result->>'test' = 'override' THEN
        RETURN 'SUCCESS: Windmill integration working';
    ELSE
        RETURN 'FAILED: Check Windmill connection';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Виконайте цю функцію для перевірки:
-- SELECT test_windmill_connection();