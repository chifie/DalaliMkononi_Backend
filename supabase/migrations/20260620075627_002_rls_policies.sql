-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, no write via API (managed by migrations)
CREATE POLICY "categories_select_public" ON categories FOR SELECT
  USING (true);

-- Users: Read own profile, update own profile, admins can read all
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "users_select_admin" ON users FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users FOR INSERT
  WITH CHECK (true);

-- Properties: Public read available properties, landlords manage their own
CREATE POLICY "properties_select_public" ON properties FOR SELECT
  USING (true);

CREATE POLICY "properties_insert_landlord" ON properties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "properties_update_landlord" ON properties FOR UPDATE
  TO authenticated USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "properties_delete_landlord" ON properties FOR DELETE
  TO authenticated USING (auth.uid() = landlord_id);

-- Invoices: Tenants see their invoices, landlords see/create for their properties
CREATE POLICY "invoices_select_tenant" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = tenant_id);

CREATE POLICY "invoices_select_landlord" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = landlord_id);

CREATE POLICY "invoices_insert_landlord" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "invoices_update_tenant" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "invoices_delete_landlord" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = landlord_id);

-- Bookings: Tenants manage their bookings, landlords view for their properties
CREATE POLICY "bookings_select_tenant" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = tenant_id);

CREATE POLICY "bookings_select_landlord" ON bookings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND landlord_id = auth.uid())
  );

CREATE POLICY "bookings_insert_tenant" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "bookings_update_tenant" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "bookings_delete_tenant" ON bookings FOR DELETE
  TO authenticated USING (auth.uid() = tenant_id);