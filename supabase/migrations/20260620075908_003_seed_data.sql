-- Insert demo users (passwords are hashed with bcrypt, cost 10)
-- Password: tenant123
-- Password: landlord123
-- Password: admin123
INSERT INTO users (email, password_hash, full_name, phone, role, is_verified) VALUES
('asha@dalali.tz', '$2a$10$R5p3Z9VxJHq4K5F8uM.n.OqR7VxJHq4K5F8uM.n.OqR7VxJHq4K5F8u', 'Asha Mwangi', '+255 712 345 678', 'tenant', true),
('juma@dalali.tz', '$2a$10$R5p3Z9VxJHq4K5F8uM.n.OqR7VxJHq4K5F8uM.n.OqR7VxJHq4K5F8u', 'Juma Kimaro', '+255 723 456 789', 'landlord', true),
('admin@dalali.tz', '$2a$10$R5p3Z9VxJHq4K5F8uM.n.OqR7VxJHq4K5F8uM.n.OqR7VxJHq4K5F8u', 'System Admin', '+255 734 567 890', 'admin', true);

-- Insert sample properties
INSERT INTO properties (title, description, price, location, address, bedrooms, bathrooms, area_sqm, category_id, landlord_id, status, is_featured, images, amenities) VALUES
(
  'Modern 3-Bedroom House in Mikocheni',
  'Spacious 3-bedroom house with modern amenities, secure compound, and parking space. Close to shopping malls and public transport.',
  1200000.00,
  'Mikocheni, Dar es Salaam',
  'Plot 45, Mikocheni B, Dar es Salaam',
  3,
  2,
  250.00,
  (SELECT id FROM categories WHERE slug = 'houses'),
  (SELECT id FROM users WHERE email = 'juma@dalali.tz'),
  'available',
  true,
  ARRAY['https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600', 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=600'],
  ARRAY['Parking', 'Security', 'Garden', 'AC', 'WiFi']
),
(
  'Luxury Apartment in Masaki',
  'Modern 2-bedroom apartment in prime Masaki location. Features swimming pool, gym, and 24/7 security.',
  850000.00,
  'Masaki, Dar es Salaam',
  'Tower B, Masaki Peninsula, Plot 78',
  2,
  2,
  120.00,
  (SELECT id FROM categories WHERE slug = 'apartments'),
  (SELECT id FROM users WHERE email = 'juma@dalali.tz'),
  'available',
  true,
  ARRAY['https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=600'],
  ARRAY['Swimming Pool', 'Gym', 'Security', 'Backup Power', 'AC']
),
(
  'Commercial Office Space - CBD',
  'Prime commercial office space in Dar es Salaam CBD. Ideal for businesses, features reception area, conference room, and parking.',
  2500000.00,
  'CBD, Dar es Salaam',
  'Kivukoni Front, Plot 12, Ilala',
  0,
  3,
  350.00,
  (SELECT id FROM categories WHERE slug = 'commercial'),
  (SELECT id FROM users WHERE email = 'juma@dalali.tz'),
  'available',
  false,
  ARRAY['https://images.pexels.com/photos/1486946/pexels-photo-1486946.jpeg?auto=compress&cs=tinysrgb&w=600'],
  ARRAY['Parking', 'Security', 'Conference Room', 'AC', 'Elevator']
),
(
  'Cozy Single Room - Kariakoo',
  'Affordable single room in shared house. Great for students and young professionals. Walking distance to Kariakoo market.',
  150000.00,
  'Kariakoo, Dar es Salaam',
  'Kariakoo Street, Plot 23',
  1,
  1,
  25.00,
  (SELECT id FROM categories WHERE slug = 'rooms'),
  (SELECT id FROM users WHERE email = 'juma@dalali.tz'),
  'available',
  false,
  ARRAY['https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600'],
  ARRAY['Security', 'Shared Kitchen']
);

-- Insert sample invoices
INSERT INTO invoices (tenant_id, landlord_id, property_id, amount, due_date, status, description) VALUES
(
  (SELECT id FROM users WHERE email = 'asha@dalali.tz'),
  (SELECT id FROM users WHERE email = 'juma@dalali.tz'),
  (SELECT id FROM properties WHERE title LIKE '%Mikocheni%'),
  1200000.00,
  CURRENT_DATE + INTERVAL '30 days',
  'pending',
  'Monthly rent for January 2025'
);