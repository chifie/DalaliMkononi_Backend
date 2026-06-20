import { supabase } from '../index.js';

export const createBooking = async (req, res, next) => {
  try {
    const { property_id, scheduled_at, notes } = req.body;

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, status')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.status !== 'available') {
      return res.status(400).json({ error: 'Property is not available for viewing' });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        property_id,
        tenant_id: req.user.id,
        scheduled_at,
        notes,
        status: 'pending'
      })
      .select('*, property:properties(id, title, location, images), tenant:users(id, full_name, phone)')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = supabase
      .from('bookings')
      .select('*, property:properties(id, title, location, images, landlord:users!properties_landlord_id_fkey(id, full_name, phone))', { count: 'exact' });

    if (req.user.role === 'tenant') {
      query = query.eq('tenant_id', req.user.id);
    } else if (req.user.role === 'landlord') {
      query = query.in('property_id',
        (await supabase.from('properties').select('id').eq('landlord_id', req.user.id)).data?.map(p => p.id) || []
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) throw error;

    res.json({
      bookings,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, property:properties(id, title, location, images, address, landlord:users!properties_landlord_id_fkey(id, full_name, phone, email)), tenant:users(id, full_name, phone, email)')
      .eq('id', id)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    const isLandlord = booking.property?.landlord?.id === req.user.id;

    if (req.user.role === 'landlord' && !isLandlord) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    res.json({ booking });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('*, property:properties(landlord_id)')
      .eq('id', id)
      .single();

    if (findError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isLandlord = booking.property?.landlord_id === req.user.id;
    const isTenant = booking.tenant_id === req.user.id;

    if (!isLandlord && !isTenant) {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, property:properties(id, title, location), tenant:users(id, full_name, phone)')
      .single();

    if (error) throw error;

    res.json({
      message: 'Booking status updated',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('tenant_id, status')
      .eq('id', id)
      .single();

    if (findError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
};
