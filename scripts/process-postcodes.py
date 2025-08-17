#!/usr/bin/env python3
"""
Process Australian postcodes CSV and generate SQL insert statements for Supabase
"""
import csv
import json

# Read the CSV
postcodes_data = []
lgas_data = {}
states_data = {}

state_mapping = {
    'NSW': {'id': 1, 'name': 'New South Wales'},
    'VIC': {'id': 2, 'name': 'Victoria'},
    'QLD': {'id': 3, 'name': 'Queensland'},
    'SA': {'id': 4, 'name': 'South Australia'},
    'WA': {'id': 5, 'name': 'Western Australia'},
    'TAS': {'id': 6, 'name': 'Tasmania'},
    'NT': {'id': 7, 'name': 'Northern Territory'},
    'ACT': {'id': 8, 'name': 'Australian Capital Territory'}
}

with open('australian_postcodes.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['postcode'] and row['state']:
            # Process postcode
            postcode_data = {
                'postcode': row['postcode'].zfill(4),
                'suburb': row['locality'],
                'state': row['state'],
                'lat': row['lat'] if row['lat'] else None,
                'long': row['long'] if row['long'] else None,
                'lga_name': row['lgaregion'] if row['lgaregion'] else None,
                'lga_code': row['lgacode'] if row['lgacode'] else None
            }
            postcodes_data.append(postcode_data)
            
            # Collect unique LGAs
            if row['lgacode'] and row['lgaregion']:
                lgas_data[row['lgacode']] = {
                    'code': row['lgacode'],
                    'name': row['lgaregion'],
                    'state': row['state']
                }

# Generate SQL
sql_output = []

# States insert
sql_output.append("-- Insert all Australian states/territories")
sql_output.append("INSERT INTO public.states_territories (id, name, abbreviation) VALUES")
values = []
for abbr, data in state_mapping.items():
    values.append(f"({data['id']}, '{data['name']}', '{abbr}')")
sql_output.append(",\n".join(values))
sql_output.append("ON CONFLICT (id) DO NOTHING;\n")

# LGAs insert
sql_output.append("-- Insert all LGAs (Local Government Areas)")
sql_output.append("INSERT INTO public.lgas (lga_code, name, state_territory_id) VALUES")
values = []
for lga_code, lga_data in lgas_data.items():
    if lga_data['state'] in state_mapping:
        state_id = state_mapping[lga_data['state']]['id']
        # Escape single quotes in names
        name = lga_data['name'].replace("'", "''")
        values.append(f"('{lga_code}', '{name}', {state_id})")
if values:
    # Split into chunks of 1000 for better performance
    chunk_size = 1000
    for i in range(0, len(values), chunk_size):
        chunk = values[i:i+chunk_size]
        if i > 0:
            sql_output.append("INSERT INTO public.lgas (lga_code, name, state_territory_id) VALUES")
        sql_output.append(",\n".join(chunk))
        sql_output.append("ON CONFLICT DO NOTHING;\n")

# Postcodes insert (unique postcodes only)
unique_postcodes = {}
for p in postcodes_data:
    if p['postcode'] not in unique_postcodes:
        unique_postcodes[p['postcode']] = p

sql_output.append("-- Insert all unique postcodes")
sql_output.append("INSERT INTO public.postcodes (postcode, suburb, state_territory_id, latitude, longitude) VALUES")
values = []
for postcode, data in unique_postcodes.items():
    if data['state'] in state_mapping:
        state_id = state_mapping[data['state']]['id']
        suburb = data['suburb'].replace("'", "''")
        lat = data['lat'] if data['lat'] else 'NULL'
        lng = data['long'] if data['long'] else 'NULL'
        values.append(f"('{postcode}', '{suburb}', {state_id}, {lat}, {lng})")

# Split into chunks
chunk_size = 500
for i in range(0, len(values), chunk_size):
    chunk = values[i:i+chunk_size]
    if i > 0:
        sql_output.append("INSERT INTO public.postcodes (postcode, suburb, state_territory_id, latitude, longitude) VALUES")
    sql_output.append(",\n".join(chunk))
    sql_output.append("ON CONFLICT DO NOTHING;\n")

# Write SQL file
with open('load_australian_data.sql', 'w') as f:
    f.write("\n".join(sql_output))

print(f"Generated SQL with:")
print(f"- {len(state_mapping)} states/territories")
print(f"- {len(lgas_data)} LGAs")
print(f"- {len(unique_postcodes)} unique postcodes")
print(f"SQL file saved to: load_australian_data.sql")