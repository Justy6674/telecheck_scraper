-- Remove all fake/mock disaster data
DELETE FROM disaster_declarations 
WHERE source_system = 'DisasterAssist' 
   OR declaration_authority = 'Australian Government'
   OR postcodes IS NULL
   OR description LIKE '%Mock%'
   OR description LIKE '%mock%'
   OR description LIKE '%test%'
   OR description LIKE '%Test%';