import { supabase } from '../index.js';

export const getAllProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('properties')
      .select('*, category:categories(id, name, slug), landlord:users!properties_landlord_id_fkey(id, full_name, phone, avatar_url)', { count: 'exact' });

    if (req.query.category) {
      query = query.eq('category_id', req.query.category);
    }

    if (req.query.category_slug) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', req.query.category_slug)
        .single();

      if (category) {
        query = query.eq('category_id', category.id);
      }
    }

    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }

    if (req.query.min_price) {
      query = query.gte('price', parseFloat(req.query.min_price));
    }

    if (req.query.max_price) {
      query = query.lte('price', parseFloat(req.query.max_price));
    }

    if (req.query.location) {
      query = query.ilike('location', `%${req.query.location}%`);
    }

    if (req.query.bedrooms) {
      query = query.gte('bedrooms', parseInt(req.query.bedrooms));
    }

    if (req.query.is_featured) {
      query = query.eq('is_featured', true);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: properties, error, count } = await query;

    if (error) throw error;

    res.json({
      properties,
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

export const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: property, error } = await supabase
      .from('properties')
      .select('*, category:categories(id, name, slug), landlord:users!properties_landlord_id_fkey(id, full_name, phone, avatar_url, email)')
      .eq('id', id)
      .single();

    if (error || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ property });
  } catch (error) {
    next(error);
  }
};

export const createProperty = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      location,
      address,
      bedrooms,
      bathrooms,
      area_sqm,
      category_id,
      images,
      amenities,
      is_featured
    } = req.body;

    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        title,
        description,
        price,
        location,
        address,
        bedrooms,
        bathrooms,
        area_sqm,
        category_id,
        landlord_id: req.user.id,
        images: images || [],
        amenities: amenities || [],
        is_featured: is_featured || false
      })
      .select('*, category:categories(id, name, slug)')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Property created successfully',
      property
    });
  } catch (error) {
    next(error);
  }
};

export const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      location,
      address,
      bedrooms,
      bathrooms,
      area_sqm,
      category_id,
      status,
      images,
      amenities,
      is_featured
    } = req.body;

    const { data: existingProperty, error: findError } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', id)
      .single();

    if (findError || !existingProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (existingProperty.landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (location !== undefined) updateData.location = location;
    if (address !== undefined) updateData.address = address;
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms;
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms;
    if (area_sqm !== undefined) updateData.area_sqm = area_sqm;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (status !== undefined) updateData.status = status;
    if (images !== undefined) updateData.images = images;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (is_featured !== undefined) updateData.is_featured = is_featured;

    const { data: property, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select('*, category:categories(id, name, slug)')
      .single();

    if (error) throw error;

    res.json({
      message: 'Property updated successfully',
      property
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existingProperty, error: findError } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', id)
      .single();

    if (findError || !existingProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (existingProperty.landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this property' });
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMyProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: properties, error, count } = await supabase
      .from('properties')
      .select('*, category:categories(id, name, slug)', { count: 'exact' })
      .eq('landlord_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      properties,
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

export const getFeaturedProperties = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const { data: properties, error } = await supabase
      .from('properties')
      .select('*, category:categories(id, name, slug), landlord:users!properties_landlord_id_fkey(id, full_name, phone, avatar_url)')
      .eq('is_featured', true)
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ properties });
  } catch (error) {
    next(error);
  }
};
