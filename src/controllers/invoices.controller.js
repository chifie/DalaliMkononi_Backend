import { supabase } from '../db/supabase.js';

export const getMyInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = supabase
      .from('invoices')
      .select('*, property:properties(id, title, location, images), tenant:users!invoices_tenant_id_fkey(id, full_name, phone), landlord:users!invoices_landlord_id_fkey(id, full_name, phone)', { count: 'exact' });

    if (req.user.role === 'tenant') {
      query = query.eq('tenant_id', req.user.id);
    } else if (req.user.role === 'landlord') {
      query = query.eq('landlord_id', req.user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: invoices, error, count } = await query;

    if (error) throw error;

    res.json({
      invoices,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, property:properties(id, title, location, images, address), tenant:users!invoices_tenant_id_fkey(id, full_name, phone, email), landlord:users!invoices_landlord_id_fkey(id, full_name, phone, email)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (req.user.role === 'tenant' && invoice.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    if (req.user.role === 'landlord' && invoice.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    res.json({ invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { tenant_id, property_id, amount, due_date, description } = req.body;

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to create invoice for this property' });
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id,
        landlord_id: req.user.id,
        property_id,
        amount,
        due_date,
        description,
        status: 'pending',
      })
      .select('*, property:properties(id, title), tenant:users!invoices_tenant_id_fkey(id, full_name)')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const payInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_reference } = req.body;

    const { data: invoice, error: findError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (req.user.role === 'tenant' && invoice.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to pay this invoice' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Invoice has been cancelled' });
    }

    const { data: updatedInvoice, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        payment_method,
        payment_reference,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, property:properties(id, title), tenant:users!invoices_tenant_id_fkey(id, full_name)')
      .single();

    if (error) throw error;

    res.json({
      message: 'Payment successful',
      invoice: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data: invoice, error: findError } = await supabase
      .from('invoices')
      .select('landlord_id')
      .eq('id', id)
      .single();

    if (findError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (req.user.role === 'landlord' && invoice.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this invoice' });
    }

    const { data: updatedInvoice, error } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, property:properties(id, title)')
      .single();

    if (error) throw error;

    res.json({
      message: 'Invoice status updated',
      invoice: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: invoice, error: findError } = await supabase
      .from('invoices')
      .select('landlord_id, status')
      .eq('id', id)
      .single();

    if (findError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this invoice' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid invoice' });
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};
