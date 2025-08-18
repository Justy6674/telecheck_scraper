#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🔧 FIXING POSTCODE TO LGA MAPPING\n');
console.log('Current issue: All 180 postcodes incorrectly map to Brisbane\n');

// Sample correct mappings for major Australian postcodes
const correctMappings = [
  // NSW Postcodes
  { postcode: '2000', lga_name: 'Sydney', state: 'NSW' },
  { postcode: '2001', lga_name: 'Sydney', state: 'NSW' },
  { postcode: '2010', lga_name: 'Inner West', state: 'NSW' },
  { postcode: '2011', lga_name: 'Inner West', state: 'NSW' },
  { postcode: '2020', lga_name: 'North Sydney', state: 'NSW' },
  { postcode: '2021', lga_name: 'North Sydney', state: 'NSW' },
  { postcode: '2030', lga_name: 'Randwick', state: 'NSW' },
  { postcode: '2031', lga_name: 'Randwick', state: 'NSW' },
  { postcode: '2040', lga_name: 'Inner West', state: 'NSW' },
  { postcode: '2060', lga_name: 'North Sydney', state: 'NSW' },
  { postcode: '2061', lga_name: 'North Sydney', state: 'NSW' },
  { postcode: '2065', lga_name: 'Willoughby', state: 'NSW' },
  { postcode: '2066', lga_name: 'Willoughby', state: 'NSW' },
  { postcode: '2067', lga_name: 'Willoughby', state: 'NSW' },
  { postcode: '2070', lga_name: 'Hornsby', state: 'NSW' },
  { postcode: '2074', lga_name: 'Hornsby', state: 'NSW' },
  { postcode: '2076', lga_name: 'Hornsby', state: 'NSW' },
  { postcode: '2077', lga_name: 'Hornsby', state: 'NSW' },
  { postcode: '2088', lga_name: 'Mosman', state: 'NSW' },
  { postcode: '2089', lga_name: 'Mosman', state: 'NSW' },
  { postcode: '2090', lga_name: 'Mosman', state: 'NSW' },
  { postcode: '2100', lga_name: 'Northern Beaches', state: 'NSW' },
  { postcode: '2101', lga_name: 'Northern Beaches', state: 'NSW' },
  { postcode: '2145', lga_name: 'Parramatta', state: 'NSW' },
  { postcode: '2150', lga_name: 'Parramatta', state: 'NSW' },
  { postcode: '2170', lga_name: 'Liverpool', state: 'NSW' },
  { postcode: '2200', lga_name: 'Canterbury-Bankstown', state: 'NSW' },
  { postcode: '2250', lga_name: 'Central Coast (NSW)', state: 'NSW' },
  { postcode: '2260', lga_name: 'Central Coast (NSW)', state: 'NSW' },
  { postcode: '2280', lga_name: 'Newcastle', state: 'NSW' },
  { postcode: '2290', lga_name: 'Newcastle', state: 'NSW' },
  { postcode: '2300', lga_name: 'Newcastle', state: 'NSW' },
  { postcode: '2500', lga_name: 'Wollongong', state: 'NSW' },
  { postcode: '2600', lga_name: 'Australian Capital Territory', state: 'ACT' },
  { postcode: '2750', lga_name: 'Penrith', state: 'NSW' },
  { postcode: '2760', lga_name: 'Blacktown', state: 'NSW' },
  { postcode: '2770', lga_name: 'Blacktown', state: 'NSW' },
  
  // VIC Postcodes
  { postcode: '3000', lga_name: 'Melbourne', state: 'VIC' },
  { postcode: '3001', lga_name: 'Melbourne', state: 'VIC' },
  { postcode: '3002', lga_name: 'Melbourne', state: 'VIC' },
  { postcode: '3003', lga_name: 'Melbourne', state: 'VIC' },
  { postcode: '3004', lga_name: 'Melbourne', state: 'VIC' },
  { postcode: '3006', lga_name: 'Melbourne', state: 'VIC' },
  { postcode: '3011', lga_name: 'Brimbank', state: 'VIC' },
  { postcode: '3020', lga_name: 'Brimbank', state: 'VIC' },
  { postcode: '3021', lga_name: 'Brimbank', state: 'VIC' },
  { postcode: '3030', lga_name: 'Wyndham', state: 'VIC' },
  { postcode: '3040', lga_name: 'Moonee Valley', state: 'VIC' },
  { postcode: '3070', lga_name: 'Darebin', state: 'VIC' },
  { postcode: '3121', lga_name: 'Boroondara', state: 'VIC' },
  { postcode: '3141', lga_name: 'Stonnington', state: 'VIC' },
  { postcode: '3150', lga_name: 'Monash', state: 'VIC' },
  { postcode: '3170', lga_name: 'Monash', state: 'VIC' },
  { postcode: '3195', lga_name: 'Kingston', state: 'VIC' },
  { postcode: '3199', lga_name: 'Frankston', state: 'VIC' },
  { postcode: '3220', lga_name: 'Greater Geelong', state: 'VIC' },
  { postcode: '3350', lga_name: 'Ballarat', state: 'VIC' },
  { postcode: '3550', lga_name: 'Greater Bendigo', state: 'VIC' },
  { postcode: '3800', lga_name: 'Casey', state: 'VIC' },
  
  // QLD Postcodes
  { postcode: '4000', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4001', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4005', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4006', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4007', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4010', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4020', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4030', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4032', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4051', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4060', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4101', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4102', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4103', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4109', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4110', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4111', lga_name: 'Brisbane', state: 'QLD' },
  { postcode: '4114', lga_name: 'Logan', state: 'QLD' },
  { postcode: '4115', lga_name: 'Logan', state: 'QLD' },
  { postcode: '4116', lga_name: 'Logan', state: 'QLD' },
  { postcode: '4117', lga_name: 'Logan', state: 'QLD' },
  { postcode: '4118', lga_name: 'Logan', state: 'QLD' },
  { postcode: '4207', lga_name: 'Logan', state: 'QLD' },
  { postcode: '4208', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4209', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4210', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4211', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4215', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4217', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4220', lga_name: 'Gold Coast', state: 'QLD' },
  { postcode: '4300', lga_name: 'Ipswich', state: 'QLD' },
  { postcode: '4301', lga_name: 'Ipswich', state: 'QLD' },
  { postcode: '4305', lga_name: 'Ipswich', state: 'QLD' },
  { postcode: '4350', lga_name: 'Toowoomba', state: 'QLD' },
  { postcode: '4500', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4501', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4502', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4503', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4504', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4505', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4506', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4507', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4508', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4509', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4510', lga_name: 'Moreton Bay', state: 'QLD' },
  { postcode: '4550', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4551', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4556', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4557', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4558', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4559', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4560', lga_name: 'Noosa', state: 'QLD' },
  { postcode: '4564', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4565', lga_name: 'Noosa', state: 'QLD' },
  { postcode: '4566', lga_name: 'Noosa', state: 'QLD' },
  { postcode: '4567', lga_name: 'Noosa', state: 'QLD' },
  { postcode: '4572', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4573', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4575', lga_name: 'Sunshine Coast', state: 'QLD' },
  { postcode: '4700', lga_name: 'Rockhampton', state: 'QLD' },
  { postcode: '4701', lga_name: 'Rockhampton', state: 'QLD' },
  { postcode: '4740', lga_name: 'Mackay', state: 'QLD' },
  { postcode: '4810', lga_name: 'Townsville', state: 'QLD' },
  { postcode: '4811', lga_name: 'Townsville', state: 'QLD' },
  { postcode: '4812', lga_name: 'Townsville', state: 'QLD' },
  { postcode: '4870', lga_name: 'Cairns', state: 'QLD' },
  
  // SA Postcodes
  { postcode: '5000', lga_name: 'Adelaide', state: 'SA' },
  { postcode: '5001', lga_name: 'Adelaide', state: 'SA' },
  { postcode: '5006', lga_name: 'Adelaide', state: 'SA' },
  { postcode: '5007', lga_name: 'Port Adelaide Enfield', state: 'SA' },
  { postcode: '5008', lga_name: 'Port Adelaide Enfield', state: 'SA' },
  { postcode: '5061', lga_name: 'Unley', state: 'SA' },
  { postcode: '5062', lga_name: 'Burnside', state: 'SA' },
  { postcode: '5063', lga_name: 'Adelaide Hills', state: 'SA' },
  { postcode: '5064', lga_name: 'Norwood Payneham St Peters', state: 'SA' },
  { postcode: '5065', lga_name: 'Burnside', state: 'SA' },
  { postcode: '5066', lga_name: 'Burnside', state: 'SA' },
  { postcode: '5067', lga_name: 'Norwood Payneham St Peters', state: 'SA' },
  { postcode: '5068', lga_name: 'Norwood Payneham St Peters', state: 'SA' },
  { postcode: '5069', lga_name: 'Norwood Payneham St Peters', state: 'SA' },
  { postcode: '5070', lga_name: 'Norwood Payneham St Peters', state: 'SA' },
  { postcode: '5108', lga_name: 'Salisbury', state: 'SA' },
  { postcode: '5109', lga_name: 'Salisbury', state: 'SA' },
  { postcode: '5110', lga_name: 'Salisbury', state: 'SA' },
  { postcode: '5112', lga_name: 'Playford', state: 'SA' },
  { postcode: '5113', lga_name: 'Playford', state: 'SA' },
  { postcode: '5114', lga_name: 'Playford', state: 'SA' },
  { postcode: '5115', lga_name: 'Playford', state: 'SA' },
  { postcode: '5116', lga_name: 'Playford', state: 'SA' },
  { postcode: '5117', lga_name: 'Playford', state: 'SA' },
  { postcode: '5118', lga_name: 'Playford', state: 'SA' },
  { postcode: '5120', lga_name: 'Playford', state: 'SA' },
  { postcode: '5121', lga_name: 'Playford', state: 'SA' },
  { postcode: '5125', lga_name: 'Playford', state: 'SA' },
  { postcode: '5126', lga_name: 'Playford', state: 'SA' },
  { postcode: '5127', lga_name: 'Playford', state: 'SA' },
  { postcode: '5158', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5159', lga_name: 'Marion', state: 'SA' },
  { postcode: '5160', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5161', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5162', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5163', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5164', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5165', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5166', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5167', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5168', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5169', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5170', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5171', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5173', lga_name: 'Onkaparinga', state: 'SA' },
  { postcode: '5174', lga_name: 'Onkaparinga', state: 'SA' },
  
  // WA Postcodes
  { postcode: '6000', lga_name: 'Perth', state: 'WA' },
  { postcode: '6003', lga_name: 'Perth', state: 'WA' },
  { postcode: '6004', lga_name: 'Perth', state: 'WA' },
  { postcode: '6005', lga_name: 'Perth', state: 'WA' },
  { postcode: '6006', lga_name: 'Vincent', state: 'WA' },
  { postcode: '6007', lga_name: 'Vincent', state: 'WA' },
  { postcode: '6008', lga_name: 'Subiaco', state: 'WA' },
  { postcode: '6009', lga_name: 'Nedlands', state: 'WA' },
  { postcode: '6010', lga_name: 'Nedlands', state: 'WA' },
  { postcode: '6011', lga_name: 'Cottesloe', state: 'WA' },
  { postcode: '6012', lga_name: 'Mosman Park', state: 'WA' },
  { postcode: '6014', lga_name: 'Cambridge', state: 'WA' },
  { postcode: '6015', lga_name: 'Cambridge', state: 'WA' },
  { postcode: '6016', lga_name: 'Cambridge', state: 'WA' },
  { postcode: '6017', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6018', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6019', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6020', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6021', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6022', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6023', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6024', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6025', lga_name: 'Joondalup', state: 'WA' },
  { postcode: '6026', lga_name: 'Joondalup', state: 'WA' },
  { postcode: '6027', lga_name: 'Joondalup', state: 'WA' },
  { postcode: '6028', lga_name: 'Joondalup', state: 'WA' },
  { postcode: '6029', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6030', lga_name: 'Joondalup', state: 'WA' },
  { postcode: '6050', lga_name: 'Bayswater', state: 'WA' },
  { postcode: '6051', lga_name: 'Bayswater', state: 'WA' },
  { postcode: '6052', lga_name: 'Bayswater', state: 'WA' },
  { postcode: '6053', lga_name: 'Bayswater', state: 'WA' },
  { postcode: '6054', lga_name: 'Bassendean', state: 'WA' },
  { postcode: '6055', lga_name: 'Swan', state: 'WA' },
  { postcode: '6056', lga_name: 'Swan', state: 'WA' },
  { postcode: '6057', lga_name: 'Kalamunda', state: 'WA' },
  { postcode: '6058', lga_name: 'Kalamunda', state: 'WA' },
  { postcode: '6059', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6060', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6061', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6062', lga_name: 'Bayswater', state: 'WA' },
  { postcode: '6063', lga_name: 'Swan', state: 'WA' },
  { postcode: '6064', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6065', lga_name: 'Wanneroo', state: 'WA' },
  { postcode: '6066', lga_name: 'Stirling', state: 'WA' },
  { postcode: '6100', lga_name: 'Victoria Park', state: 'WA' },
  { postcode: '6101', lga_name: 'Victoria Park', state: 'WA' },
  { postcode: '6102', lga_name: 'Victoria Park', state: 'WA' },
  { postcode: '6103', lga_name: 'Victoria Park', state: 'WA' },
  { postcode: '6104', lga_name: 'Belmont', state: 'WA' },
  { postcode: '6105', lga_name: 'Belmont', state: 'WA' },
  { postcode: '6106', lga_name: 'Belmont', state: 'WA' },
  { postcode: '6107', lga_name: 'Canning', state: 'WA' },
  { postcode: '6108', lga_name: 'Canning', state: 'WA' },
  { postcode: '6109', lga_name: 'Kalamunda', state: 'WA' },
  { postcode: '6110', lga_name: 'Gosnells', state: 'WA' },
  { postcode: '6111', lga_name: 'Armadale', state: 'WA' },
  { postcode: '6112', lga_name: 'Armadale', state: 'WA' },
  { postcode: '6147', lga_name: 'Canning', state: 'WA' },
  { postcode: '6148', lga_name: 'Canning', state: 'WA' },
  { postcode: '6149', lga_name: 'South Perth', state: 'WA' },
  { postcode: '6150', lga_name: 'South Perth', state: 'WA' },
  { postcode: '6151', lga_name: 'South Perth', state: 'WA' },
  { postcode: '6152', lga_name: 'South Perth', state: 'WA' },
  { postcode: '6153', lga_name: 'Melville', state: 'WA' },
  { postcode: '6154', lga_name: 'Melville', state: 'WA' },
  { postcode: '6155', lga_name: 'Canning', state: 'WA' },
  { postcode: '6156', lga_name: 'Melville', state: 'WA' },
  { postcode: '6157', lga_name: 'Melville', state: 'WA' },
  { postcode: '6158', lga_name: 'East Fremantle', state: 'WA' },
  { postcode: '6159', lga_name: 'Fremantle', state: 'WA' },
  { postcode: '6160', lga_name: 'Fremantle', state: 'WA' },
  { postcode: '6162', lga_name: 'Fremantle', state: 'WA' },
  { postcode: '6163', lga_name: 'Melville', state: 'WA' },
  { postcode: '6164', lga_name: 'Cockburn', state: 'WA' },
  { postcode: '6165', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6166', lga_name: 'Cockburn', state: 'WA' },
  { postcode: '6167', lga_name: 'Kwinana', state: 'WA' },
  { postcode: '6168', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6169', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6170', lga_name: 'Kwinana', state: 'WA' },
  { postcode: '6171', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6172', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6173', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6174', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6175', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6176', lga_name: 'Rockingham', state: 'WA' },
  { postcode: '6180', lga_name: 'Mandurah', state: 'WA' },
  { postcode: '6181', lga_name: 'Mandurah', state: 'WA' },
  { postcode: '6210', lga_name: 'Mandurah', state: 'WA' },
  
  // TAS Postcodes
  { postcode: '7000', lga_name: 'Hobart', state: 'TAS' },
  { postcode: '7001', lga_name: 'Hobart', state: 'TAS' },
  { postcode: '7004', lga_name: 'Hobart', state: 'TAS' },
  { postcode: '7005', lga_name: 'Glenorchy', state: 'TAS' },
  { postcode: '7008', lga_name: 'Hobart', state: 'TAS' },
  { postcode: '7009', lga_name: 'Glenorchy', state: 'TAS' },
  { postcode: '7010', lga_name: 'Glenorchy', state: 'TAS' },
  { postcode: '7011', lga_name: 'Glenorchy', state: 'TAS' },
  { postcode: '7050', lga_name: 'Kingston', state: 'TAS' },
  { postcode: '7052', lga_name: 'Clarence', state: 'TAS' },
  { postcode: '7053', lga_name: 'Clarence', state: 'TAS' },
  { postcode: '7054', lga_name: 'Clarence', state: 'TAS' },
  { postcode: '7250', lga_name: 'Launceston', state: 'TAS' },
  { postcode: '7310', lga_name: 'Devonport', state: 'TAS' },
  { postcode: '7320', lga_name: 'Burnie', state: 'TAS' },
  
  // NT Postcodes
  { postcode: '0800', lga_name: 'Darwin', state: 'NT' },
  { postcode: '0810', lga_name: 'Darwin', state: 'NT' },
  { postcode: '0820', lga_name: 'Darwin', state: 'NT' },
  { postcode: '0830', lga_name: 'Palmerston', state: 'NT' },
  { postcode: '0870', lga_name: 'Alice Springs', state: 'NT' }
];

async function fixMappings() {
  try {
    console.log('1. Clearing incorrect mappings...');
    
    // Clear existing incorrect mappings
    const { error: deleteError } = await supabase
      .from('postcode_lga_mapping')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (deleteError) {
      console.error('Error clearing mappings:', deleteError);
      return;
    }
    
    console.log('   ✅ Cleared old mappings\n');
    
    console.log('2. Loading correct LGA mappings...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const mapping of correctMappings) {
      // Find the LGA ID
      const { data: lgaData, error: lgaError } = await supabase
        .from('lgas')
        .select('id')
        .ilike('name', `%${mapping.lga_name}%`)
        .limit(1)
        .single();
      
      if (lgaError || !lgaData) {
        console.log(`   ⚠️ LGA not found: ${mapping.lga_name} (${mapping.state})`);
        errorCount++;
        continue;
      }
      
      // Insert the mapping
      const { error: insertError } = await supabase
        .from('postcode_lga_mapping')
        .insert({
          postcode: mapping.postcode,
          lga_id: lgaData.id
        });
      
      if (insertError) {
        console.log(`   ❌ Failed to map ${mapping.postcode} to ${mapping.lga_name}`);
        errorCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`   ✅ Mapped ${successCount} postcodes...`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MAPPING FIX COMPLETE');
    console.log('='.repeat(60));
    console.log(`Successfully mapped: ${successCount} postcodes`);
    console.log(`Failed mappings: ${errorCount}`);
    
    // Verify the fix
    console.log('\n3. Verifying fix...');
    
    const { data: verifyData } = await supabase
      .from('postcode_lga_mapping')
      .select(`
        postcode,
        lga_id,
        lgas (
          name,
          lga_code,
          population
        )
      `)
      .in('postcode', ['2000', '3000', '4000', '5000', '6000', '7000', '0800'])
      .order('postcode');
    
    console.log('\nSample mappings:');
    verifyData?.forEach(m => {
      console.log(`   ${m.postcode} → ${m.lgas.name} (Pop: ${m.lgas.population?.toLocaleString() || 'Unknown'})`);
    });
    
    // Count unique LGAs
    const { data: countData } = await supabase
      .from('postcode_lga_mapping')
      .select('lga_id', { count: 'exact' });
    
    const uniqueLgas = new Set(countData?.map(d => d.lga_id) || []);
    console.log(`\n✅ Total postcodes mapped: ${countData?.length || 0}`);
    console.log(`✅ Unique LGAs: ${uniqueLgas.size}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the fix
console.log('Starting postcode to LGA mapping fix...\n');
fixMappings().catch(console.error);