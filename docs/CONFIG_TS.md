Драфт тз на адмінку конфігурування веб інтерфейсу для кінцевих користувачів breedhub

1. В своїй основі будемо використовувати property-based (field-based) підхід. Приклад: маємо структури таблиць supabase d ra-admin /Users/annaglova/projects/react-admin/src/resources/breed/breed.json /Users/annaglova/projects/react-admin/src/resources/account/account.json, але хочемо використовувати підхід, де property - {«name": "name", "type», character varying"} є атомарною складовою всіх конфігів (таблиці супабейса, налаштування меню, налаштування воркспейсів, налаштування, сортування, налаштування видимих полів в воркспейсі і дт).
2. З цією метою в нас в супабейсі є таблиці config create table
   public.config (
   id text not null,
   created_at timestamp with time zone not null default now(),
   data jsonb null default '{}'::jsonb,
   self_data jsonb null default '{}'::jsonb,
   override_data jsonb null default '{}'::jsonb,
   deps jsonb null default '[]'::jsonb,
   type text null,
   constraint config_pkey primary key (id),
   constraint config_type_fkey foreign key (
   type
   ) references config_type (id)
   ) tablespace pg_default;

create trigger update_config_data before insert
or
update on config for each row
execute function update_config_data ();

create trigger update_child_data
after insert
or
update on config for each row
execute function update_child_data (); і config_type create table
public.config_type (
id text not null,
key text not null,
constraint config_type_pkey primary key (id)
) tablespace pg_default; ![alt text](<Знімок екрана 2025-08-26 о 11.46.23.png>)
2.1 Таблиця config має тригери: update_config_data before insert DECLARE
deps_data jsonb;
self_data jsonb;
override_data jsonb;
merged_data jsonb;
BEGIN
-- Отримуємо `data` від батьківських записів у вигляді масиву
SELECT jsonb_agg(data)
INTO deps_data
FROM config
WHERE id IN (SELECT jsonb_array_elements_text(NEW.deps));

    -- Переконуємося, що `deps_data` не є NULL
    deps_data := COALESCE(deps_data, '[]'::jsonb);

    -- Отримуємо self_data та override_data
    self_data := COALESCE(NEW.self_data, '{}'::jsonb);
    override_data := COALESCE(NEW.override_data, '{}'::jsonb);

    -- Відправляємо JSON у HTTP POST і отримуємо злиті дані
    SELECT content::jsonb
    INTO merged_data
    FROM http_post(
        'http://dev.dogarray.com:8010/api/r/json_merge',
        jsonb_build_object(
            'deps_data', deps_data,
            'self_data', self_data,
            'override_data', override_data
        )::text,
        'application/json'
    );

    -- Оновлюємо поле data з отриманими значеннями
    NEW.data := merged_data;

    RETURN NEW;

END; та тригер update_child_data
after insert. DECLARE
child RECORD;
BEGIN
FOR child IN
SELECT \* FROM config WHERE NEW.id IN (SELECT jsonb_array_elements_text(config.deps))
LOOP
-- Тут можеш вставити логіку оновлення `data` в дочірніх елементах
UPDATE config
SET data = (SELECT content::jsonb FROM http_post(
'http://dev.dogarray.com:8010/api/r/json_merge',
jsonb_build_object(
'deps_data', (SELECT jsonb_agg(data) FROM config WHERE id IN (SELECT jsonb_array_elements_text(child.deps))),
'self_data', child.self_data,
'override_data', child.override_data
)::text,
'application/json'
))
WHERE id = child.id;
END LOOP;

    RETURN NEW;

END;
А також функцію мерджа на windmill, що визиваєтсья в тригері /Users/annaglova/projects/windmill/f/common/json_merge.deno.ts
Цей функціонал породжує структури типу INSERT INTO "public"."config" ("id", "created_at", "data", "self_data", "override_data", "deps", "type") VALUES ('Breed_SchemaName', '2025-04-10 15:29:39.458887+00', '{"uid": "397d2e69-1708-4c68-a516-eee9e30a9acd", "rows": 60, "type": "Breed", "caption": "Breed", "component": 0, "validators": [], "displayField": "Name", "fieldsConfig": {"Id": {"uid": "ae0e45ca-c495-4fe7-a39d-3ab7278e1617", "name": "Id", "type": "string", "caption": "Id", "component": 10, "isRequired": true, "levelAccess": 1}, "Url": {"uid": "a6d7fbfe-360e-ef29-bbd4-c4cb02bb0ab5", "name": "Url", "type": "string", "caption": "Url", "component": 10, "levelAccess": 1}, "Name": {"uid": "44d2cacc-384c-4091-8333-2a300895f584", "name": "Name", "type": "string", "caption": "Name", "component": 10, "isRequired": true, "levelAccess": 1}, "Cover": {"uid": "6a71afd0-9517-462d-d2c7-d910866b85de", "name": "Cover", "rows": 60, "type": "Cover", "caption": "Cover", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Cover"}, "Rating": {"uid": "f8a8cf97-c79b-2ae2-e7b6-5ed251316ab5", "name": "Rating", "type": "number", "caption": "Rating", "component": 4, "levelAccess": 1}, "Account": {"uid": "2430a27d-a483-6108-8aab-037fd2cd8875", "name": "Account", "rows": 60, "type": "Account", "caption": "Account", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Account"}, "PetType": {"uid": "f4db7fbf-26dc-2d25-e855-98f135e4f68a", "name": "PetType", "rows": 60, "type": "PetType", "caption": "Pet type", "component": 0, "isRequired": true, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "PetType"}, "Category": {"uid": "ff0a44d4-dd91-bbe5-7a3b-14553943b4f8", "name": "Category", "rows": 60, "type": "BreedCategory", "caption": "Category", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "BreedCategory"}, "Language": {"uid": "259c1d6d-a3f9-f767-c516-1fdbde2a46ce", "name": "Language", "rows": 60, "type": "SysLanguage", "caption": "Authentic language", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "SysLanguage"}, "AdminName": {"uid": "2d636a69-8d1f-43e0-8a57-ec44f5fd6bd2", "name": "AdminName", "type": "string", "caption": "Administrative name", "component": 10, "levelAccess": 1}, "AvatarUrl": {"uid": "287b7f9c-7c97-30a2-3859-f9ad32008ef2", "name": "AvatarUrl", "type": "string", "caption": "Avatar url", "component": 10, "levelAccess": 1}, "CreatedBy": {"uid": "ebf6bb93-8aa6-4a01-900d-c6ea67affe21", "name": "CreatedBy", "rows": 60, "type": "Contact", "caption": "Created by", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Contact"}, "CreatedOn": {"uid": "e80190a5-03b2-4095-90f7-a193a960adee", "name": "CreatedOn", "type": "Date", "caption": "Created on", "component": 3, "levelAccess": 1}, "ModifiedBy": {"uid": "3015559e-cbc6-406a-88af-07f7930be832", "name": "ModifiedBy", "rows": 60, "type": "Contact", "caption": "Modified by", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Contact"}, "ModifiedOn": {"uid": "9928edec-4272-425a-93bb-48743fee4b04", "name": "ModifiedOn", "type": "Date", "caption": "Modified on", "component": 3, "levelAccess": 1}, "PublicData": {"uid": "ff135756-0fae-eb16-e7a5-57b180944885", "name": "PublicData", "rows": 60, "type": "PublicData", "caption": "Public data", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "PublicData"}, "KennelCount": {"uid": "e84cf749-f7b2-5e48-3f81-7f69ce941b04", "name": "KennelCount", "type": "number", "caption": "Kennel count", "component": 4, "levelAccess": 1}, "PatronCount": {"uid": "3a18feba-9a48-4d89-993e-a53ec2710dcd", "name": "PatronCount", "type": "number", "caption": "Patron count", "component": 4, "levelAccess": 1}, "DifferBySize": {"uid": "6a4e9747-10dd-5e0c-29a5-bdca62dbcbb8", "name": "DifferBySize", "type": "boolean", "caption": "Differ by size", "component": 5, "levelAccess": 1}, "AuthenticName": {"uid": "80a8fafd-b4b2-8981-7d88-492490cf30a6", "name": "AuthenticName", "type": "string", "caption": "Authentic name", "component": 10, "levelAccess": 1}, "PaymentRating": {"uid": "1b9214cd-bfc3-4c7a-9527-c485b9c387b6", "name": "PaymentRating", "type": "number", "caption": "Payment rating", "component": 4, "levelAccess": 1}, "HasRelatedBreed": {"uid": "5c2eb948-4959-448d-ab74-da38221b6f53", "name": "HasRelatedBreed", "type": "boolean", "caption": "Has related breed", "component": 5, "levelAccess": 1}, "PetProfileCount": {"uid": "7e967e3c-3426-01e6-d199-b78bced4deca", "name": "PetProfileCount", "type": "number", "caption": "Pets profile count", "component": 4, "levelAccess": 1}, "DifferByCoatType": {"uid": "1f643ddd-52bc-7e6c-f85d-6bcf610ca144", "name": "DifferByCoatType", "type": "boolean", "caption": "Differ by coat type", "component": 5, "levelAccess": 1}, "DifferByCoatColor": {"uid": "2f4b0744-5d19-e69e-6c15-e662ed46e765", "name": "DifferByCoatColor", "type": "boolean", "caption": "Differ by coat color", "component": 5, "levelAccess": 1}, "AchievementProgress": {"uid": "f0df8542-51e7-4ced-817e-03f5523d1901", "name": "AchievementProgress", "type": "number", "caption": "Achievement progress", "component": 4, "levelAccess": 1}, "DifferByBodyFeature": {"uid": "1f073a15-6cdd-4d15-78ce-26a3686b414a", "name": "DifferByBodyFeature", "type": "boolean", "caption": "Differ by body feature", "component": 5, "levelAccess": 1}}, "entitiesColumns": ["Name", "Id", "CreatedBy.Id", "CreatedBy.Name", "ModifiedBy.Id", "ModifiedBy.Name", "Language.Id", "Language.Name", "PublicData.Id", "PublicData.Name", "Account.Id", "Account.Name", "Cover.Id", "Cover.Name", "PetType.Id", "PetType.Name", "Category.Id", "Category.Name"], "entitySchemaName": "Breed"}', '{"fieldsConfig": {"Id": {"uid": "ae0e45ca-c495-4fe7-a39d-3ab7278e1617", "name": "Id", "type": "string", "caption": "Id", "component": 10, "isRequired": true, "levelAccess": 1}, "Url": {"uid": "a6d7fbfe-360e-ef29-bbd4-c4cb02bb0ab5", "name": "Url", "type": "string", "caption": "Url", "component": 10, "levelAccess": 1}, "Name": {"uid": "44d2cacc-384c-4091-8333-2a300895f584", "name": "Name", "type": "string", "caption": "Name", "component": 10, "isRequired": true, "levelAccess": 1}, "Cover": {"uid": "6a71afd0-9517-462d-d2c7-d910866b85de", "name": "Cover", "rows": 60, "type": "Cover", "caption": "Cover", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Cover"}, "Rating": {"uid": "f8a8cf97-c79b-2ae2-e7b6-5ed251316ab5", "name": "Rating", "type": "number", "caption": "Rating", "component": 4, "levelAccess": 1}, "Account": {"uid": "2430a27d-a483-6108-8aab-037fd2cd8875", "name": "Account", "rows": 60, "type": "Account", "caption": "Account", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Account"}, "PetType": {"uid": "f4db7fbf-26dc-2d25-e855-98f135e4f68a", "name": "PetType", "rows": 60, "type": "PetType", "caption": "Pet type", "component": 0, "isRequired": true, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "PetType"}, "Category": {"uid": "ff0a44d4-dd91-bbe5-7a3b-14553943b4f8", "name": "Category", "rows": 60, "type": "BreedCategory", "caption": "Category", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "BreedCategory"}, "Language": {"uid": "259c1d6d-a3f9-f767-c516-1fdbde2a46ce", "name": "Language", "rows": 60, "type": "SysLanguage", "caption": "Authentic language", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "SysLanguage"}, "AdminName": {"uid": "2d636a69-8d1f-43e0-8a57-ec44f5fd6bd2", "name": "AdminName", "type": "string", "caption": "Administrative name", "component": 10, "levelAccess": 1}, "AvatarUrl": {"uid": "287b7f9c-7c97-30a2-3859-f9ad32008ef2", "name": "AvatarUrl", "type": "string", "caption": "Avatar url", "component": 10, "levelAccess": 1}, "CreatedBy": {"uid": "ebf6bb93-8aa6-4a01-900d-c6ea67affe21", "name": "CreatedBy", "rows": 60, "type": "Contact", "caption": "Created by", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Contact"}, "CreatedOn": {"uid": "e80190a5-03b2-4095-90f7-a193a960adee", "name": "CreatedOn", "type": "Date", "caption": "Created on", "component": 3, "levelAccess": 1}, "ModifiedBy": {"uid": "3015559e-cbc6-406a-88af-07f7930be832", "name": "ModifiedBy", "rows": 60, "type": "Contact", "caption": "Modified by", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "Contact"}, "ModifiedOn": {"uid": "9928edec-4272-425a-93bb-48743fee4b04", "name": "ModifiedOn", "type": "Date", "caption": "Modified on", "component": 3, "levelAccess": 1}, "PublicData": {"uid": "ff135756-0fae-eb16-e7a5-57b180944885", "name": "PublicData", "rows": 60, "type": "PublicData", "caption": "Public data", "component": 0, "validators": [], "levelAccess": 1, "displayField": "Name", "entitiesColumns": ["Id", "Name"], "entitySchemaName": "PublicData"}, "KennelCount": {"uid": "e84cf749-f7b2-5e48-3f81-7f69ce941b04", "name": "KennelCount", "type": "number", "caption": "Kennel count", "component": 4, "levelAccess": 1}, "PatronCount": {"uid": "3a18feba-9a48-4d89-993e-a53ec2710dcd", "name": "PatronCount", "type": "number", "caption": "Patron count", "component": 4, "levelAccess": 1}, "DifferBySize": {"uid": "6a4e9747-10dd-5e0c-29a5-bdca62dbcbb8", "name": "DifferBySize", "type": "boolean", "caption": "Differ by size", "component": 5, "levelAccess": 1}, "AuthenticName": {"uid": "80a8fafd-b4b2-8981-7d88-492490cf30a6", "name": "AuthenticName", "type": "string", "caption": "Authentic name", "component": 10, "levelAccess": 1}, "PaymentRating": {"uid": "1b9214cd-bfc3-4c7a-9527-c485b9c387b6", "name": "PaymentRating", "type": "number", "caption": "Payment rating", "component": 4, "levelAccess": 1}, "HasRelatedBreed": {"uid": "5c2eb948-4959-448d-ab74-da38221b6f53", "name": "HasRelatedBreed", "type": "boolean", "caption": "Has related breed", "component": 5, "levelAccess": 1}, "PetProfileCount": {"uid": "7e967e3c-3426-01e6-d199-b78bced4deca", "name": "PetProfileCount", "type": "number", "caption": "Pets profile count", "component": 4, "levelAccess": 1}, "DifferByCoatType": {"uid": "1f643ddd-52bc-7e6c-f85d-6bcf610ca144", "name": "DifferByCoatType", "type": "boolean", "caption": "Differ by coat type", "component": 5, "levelAccess": 1}, "DifferByCoatColor": {"uid": "2f4b0744-5d19-e69e-6c15-e662ed46e765", "name": "DifferByCoatColor", "type": "boolean", "caption": "Differ by coat color", "component": 5, "levelAccess": 1}, "AchievementProgress": {"uid": "f0df8542-51e7-4ced-817e-03f5523d1901", "name": "AchievementProgress", "type": "number", "caption": "Achievement progress", "component": 4, "levelAccess": 1}, "DifferByBodyFeature": {"uid": "1f073a15-6cdd-4d15-78ce-26a3686b414a", "name": "DifferByBodyFeature", "type": "boolean", "caption": "Differ by body feature", "component": 5, "levelAccess": 1}}, "entitiesColumns": ["CreatedBy.Id", "CreatedBy.Name", "ModifiedBy.Id", "ModifiedBy.Name", "Language.Id", "Language.Name", "PublicData.Id", "PublicData.Name", "Account.Id", "Account.Name", "Cover.Id", "Cover.Name", "PetType.Id", "PetType.Name", "Category.Id", "Category.Name"]}', '{}', '["Breed_Lookup"]', 'SchemaName'); 3. Потрібно адаптувати підхід mixin до нашої адмінки і зробити підхід універсальним, щоб функціональні фітчі для полів (propertiy) попадали в більш глобальні структури. Зараз табилці config функціонально працює вірно, але контент неактуальний - він перенесений зі старої бази. Зараз схема актуальної бази формується в ra-admin /Users/annaglova/projects/react-admin

Зпропонуй будь ласка найкращу на твій погляд архітектуру і план імплементації затребуваного функціоналу.

Також потрібно подумати, щоб з таких схем генеровувати схеми для RX-DB (зберігання) https://rxdb.info/rx-schema.html
