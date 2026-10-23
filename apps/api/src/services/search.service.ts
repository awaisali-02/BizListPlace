import { FilterQuery, Types } from 'mongoose';
import { Business, IBusinessDocument } from '../modules/businesses/business.model';
import { BusinessLocation } from '../modules/businesses/businessLocation.model';
import { Category } from '../modules/categories/category.model';
import { ISearchFilters, IPaginatedResult, IBusiness } from '@bizpockethub/shared';

export class SearchService {
  static async search(
    filters: ISearchFilters,
    includeUnpublished = false
  ): Promise<IPaginatedResult<IBusiness>> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 12));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IBusinessDocument> = {};

    // 1. Status Filter
    if (!includeUnpublished) {
      query.listingStatus = 'published';
    }

    // 2. Keyword Search
    if (filters.q && filters.q.trim()) {
      const sanitized = filters.q.trim();
      // Try text search or regex fallback
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { shortDescription: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { serviceAreas: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // 3. Category Filter
    if (filters.category && filters.category.trim()) {
      const categorySlug = filters.category.trim().toLowerCase();
      const cat = await Category.findOne({
        $or: [
          { slug: categorySlug },
          ...(Types.ObjectId.isValid(categorySlug) ? [{ _id: categorySlug }] : []),
        ],
      });
      if (cat) {
        query.categoryIds = cat._id;
      }
    }

    // 4. Strict Country / City Location Filter
    if (filters.country || filters.city) {
      const locQuery: Record<string, unknown> = {};
      let countryCodes: string[] = [];

      if (filters.country) {
        const raw = filters.country.trim().toUpperCase();
        if (raw === 'UK' || raw === 'GB' || raw === 'UNITED-KINGDOM' || raw === 'UNITED KINGDOM') {
          countryCodes = ['GB', 'UK'];
        } else if (raw === 'US' || raw === 'USA' || raw === 'UNITED-STATES' || raw === 'UNITED STATES') {
          countryCodes = ['US', 'USA'];
        } else if (raw === 'PK' || raw === 'PAKISTAN') {
          countryCodes = ['PK'];
        } else {
          countryCodes = [raw];
        }
        locQuery.countryCode = { $in: countryCodes };
      }

      if (filters.city) {
        locQuery.city = { $regex: new RegExp(`^${filters.city.trim()}$`, 'i') };
      }

      const matchingLocations = await BusinessLocation.find(locQuery).select('businessId');
      const businessIds = matchingLocations.map((l) => l.businessId);

      query.$and = query.$and || [];

      if (countryCodes.length > 0 && filters.city) {
        // Both country and city specified: must match location ID
        query.$and.push({ _id: { $in: businessIds } });
      } else if (countryCodes.length > 0) {
        // Country specified: match either business countryCode or location in that country
        query.$and.push({
          $or: [
            { countryCode: { $in: countryCodes } },
            { _id: { $in: businessIds } },
          ],
        });
      } else {
        // City only
        query.$and.push({ _id: { $in: businessIds } });
      }
    }

    // 5. Verification status
    if (filters.verifiedOnly) {
      query.verificationStatus = 'verified';
    }

    // 6. Business Type
    if (filters.businessType) {
      query.businessType = filters.businessType;
    }

    // 7. Sorting
    let sortOptions: Record<string, 1 | -1> = { isFeatured: -1, createdAt: -1 };
    if (filters.sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (filters.sort === 'rating') {
      sortOptions = { ratingAverage: -1, reviewCount: -1 };
    } else if (filters.sort === 'name_asc') {
      sortOptions = { name: 1 };
    }

    const total = await Business.countDocuments(query);
    const businesses = await Business.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('categoryIds')
      .lean();

    // Fetch primary locations for found businesses
    const bIds = businesses.map((b) => b._id);
    const locations = await BusinessLocation.find({ businessId: { $in: bIds } }).lean();

    const formattedData: IBusiness[] = businesses.map((b: any) => {
      const bizLocations = locations.filter(
        (l) => l.businessId.toString() === b._id.toString()
      );
      const primaryLoc =
        bizLocations.find((l) => l.isPrimary) || bizLocations[0] || undefined;

      return {
        ...b,
        _id: b._id.toString(),
        ownerId: b.ownerId ? b.ownerId.toString() : undefined,
        categoryIds: b.categoryIds as unknown as IBusiness['categoryIds'],
        locations: bizLocations as unknown as IBusiness['locations'],
        primaryLocation: primaryLoc as unknown as IBusiness['primaryLocation'],
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt),
        updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : String(b.updatedAt),
        publishedAt: b.publishedAt ? (b.publishedAt instanceof Date ? b.publishedAt.toISOString() : String(b.publishedAt)) : undefined,
      } as unknown as IBusiness;
    });

    return {
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}
