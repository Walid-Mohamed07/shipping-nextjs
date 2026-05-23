# Constants Management - Admin Dashboard Guide

## Overview

This guide explains how to use the new Constants Management section in the Admin Dashboard to manage system categories and cost calculation criteria. These features allow admins to dynamically update prices and item categories without changing the code.

## Features

### 1. Categories Management

Manage shipping item categories that users select when creating requests.

**Location:** Admin Dashboard → Categories

#### Operations:

- **View All**: See all active categories
- **Add Category**: Create new category with optional description
- **Edit Category**: Modify existing category name/description
- **Delete Category**: Remove a category from the system
- **Search**: Filter categories by name or description

#### How It Works:

- Categories are fetched from the database in the New Request Form
- Users can select from dynamically updated categories (no code changes needed)
- Each category can have an optional description for clarity

#### API Endpoints:

```
GET    /api/admin/categories           # List all categories
POST   /api/admin/categories           # Create new category
PUT    /api/admin/categories/[id]      # Update category
DELETE /api/admin/categories/[id]      # Delete category
```

---

### 2. Cost Criteria Management

Define cost calculation rules, multipliers, and surcharges for the entire system.

**Location:** Admin Dashboard → Cost Criteria

#### Key Components:

##### A. Category Rates

Base prices for different categories:

- **Example:** Electronics = $20, Furniture = $30, etc.
- Add/remove categories and their base rates
- New category rates are immediately used in cost calculations

##### B. Multipliers & Surcharges

Configure how different factors affect pricing:

1. **Weight Multiplier** (default: 1)
   - Affects how weight impacts cost
   - Example: 2 = cost doubles for 1kg more weight

2. **Quantity Multiplier** (default: 1)
   - Affects how quantity impacts cost
   - Example: 1.5 = 50% increase per unit

3. **Distance Multipliers**
   - **Same Location** (default: 1)
     - Applied when source & destination are same
   - **Different Location** (default: 1.5)
     - Applied when source & destination differ
     - Example: Same = $100, Different = $150

4. **Urgent Delivery Surcharge** (default: 1.25)
   - Multiplier for urgent/fast deliveries
   - Example: 1.25 = 25% extra charge for urgent

5. **Price Limits**
   - **Minimum Price**: Lowest possible charge
   - **Maximum Price**: Highest possible charge (optional)
   - Example: Min=$5, Max=$500

#### Cost Calculation Formula:

```
Base Price = (Base Rate × Weight Multiplier × Quantity Multiplier) × Distance Multiplier
Final Price = Base Price × Urgent Surcharge (if applicable)
Final Price = Clamp(Final Price, Min Price, Max Price)
```

#### Version Control

- Every time you update cost criteria, a new version is created
- Old versions are archived for history/audit purposes
- Track changes with timestamps
- View version history to see what changed and when

#### API Endpoints:

```
GET    /api/admin/cost-criteria          # Get active cost criteria
POST   /api/admin/cost-criteria          # Create/update cost criteria
GET    /api/admin/cost-criteria/history  # View version history
```

---

## Integration with New Request Form

The New Request Form automatically uses:

1. **Dynamic Categories**
   - Fetches latest categories from `/api/admin/categories`
   - Falls back to hardcoded categories if API fails
   - Users see whatever categories the admin defines

2. **Dynamic Cost Calculation**
   - Uses cost criteria from `/api/admin/cost-criteria`
   - Recalculates instantly when admin updates criteria
   - Multipliers and surcharges applied automatically
   - Real-time cost preview as user fills form

#### Example Flow:

```
User creates request:
1. Selects Electronics category ($20 base rate)
2. Enters 5kg weight
3. Selects different location (1.5× multiplier)
4. Chooses urgent delivery (1.25× surcharge)

Cost = ($20 × 1 × 5 × 1 × 1.5) × 1.25 = $187.50
```

---

## Best Practices

### For Categories:

1. **Keep Names Consistent**: Use same format for all category names
2. **Add Descriptions**: Help users understand what items fit each category
3. **Archive, Don't Delete**: Consider renaming old categories instead of deleting
4. **Monitor Usage**: Check which categories users select most

### For Cost Criteria:

1. **Test Changes**: Update criteria and verify costs in New Request Form before finalizing
2. **Document Changes**: Note why changes were made (seasonal, market price, etc.)
3. **Use Version History**: Refer to history if you need to revert to previous rates
4. **Regular Reviews**: Periodically audit rates to ensure profitability
5. **Gradual Adjustments**: Small increases more frequently than large sudden changes

---

## Troubleshooting

### Issue: New categories not appearing in New Request Form

- **Check**: Ensure category status is "Active"
- **Solution**: Refresh the form page or browser cache
- **Wait**: Give 5-10 seconds for API to respond

### Issue: Cost calculations seem wrong

- **Check**: Verify all multipliers are correct
- **Check**: Review weight and quantity values
- **Debug**: Use browser console to see actual cost values
- **Reset**: Create new cost criteria version to restart

### Issue: Can't add new category rate

- **Check**: Category name must be unique
- **Check**: All required fields filled
- **Check**: No duplicate entries in the form

### Issue: Old cost criteria still in use

- **Solution**: Deactivate old version explicitly
- **Verify**: Current version shows as "Active"
- **Refresh**: Restart the application to pick up new criteria

---

## Example Scenarios

### Scenario 1: Seasonal Price Increase

**Situation:** Holiday season, higher demand
**Action:**

1. Go to Cost Criteria
2. Edit Category Rates - increase all base rates by 15%
3. Increase Urgent Surcharge from 1.25 to 1.5
4. Set max price limit to prevent overcharging
5. Save and verify in New Request Form

### Scenario 2: New Product Category

**Situation:** Start handling international documents
**Action:**

1. Go to Categories
2. Add "International Documents" with high detail description
3. Go to Cost Criteria
4. Add category rate: "International Documents" = $75
5. Users can now select this new category

### Scenario 3: Special Event Promotion

**Situation:** Weekend discounts
**Action:**

1. Create special category rates for weekend shipments
2. Consider this as part of workflow logic (not just system rates)
3. Use cost criteria as baseline and adjust business logic if needed

---

## Database Schema

### Category Collection

```javascript
{
  _id: ObjectId,
  name: String (unique),
  description: String (optional),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### CostCriteria Collection

```javascript
{
  _id: ObjectId,
  categoryRates: [
    {
      category: String,
      baseRate: Number
    }
  ],
  weightMultiplier: Number,
  quantityMultiplier: Number,
  sameLocationMultiplier: Number,
  differentLocationMultiplier: Number,
  urgentDeliverySurcharge: Number,
  minPrice: Number,
  maxPrice: Number (optional),
  isActive: Boolean,
  version: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Access Control

- **Admin Only**: Both features require admin role (`user.role === "admin"`)
- **API Protection**: Endpoints check authorization headers
- **Audit Trail**: All changes logged with timestamps
- **Admin Dashboard Nav**: Only visible to admin users

---

## Performance Notes

- Cost calculations are debounced (250ms) to prevent excessive recalculations
- Category list cached during form session
- Cost criteria cached per application lifetime
- Refresh page to pick up latest criteria from database

---

## Future Enhancements

Potential improvements:

- Time-based pricing rules (time of day, day of week)
- Geographic pricing (different rates per location)
- Volume discounts (lower rates for bulk shipments)
- Customer tier pricing (different rates per customer)
- Dynamic category suggestions based on item description
- Profit margin analysis and alerts
- A/B testing different price points

---

## Support

For issues or questions:

1. Check the Troubleshooting section
2. Review database logs in MongoDB
3. Check API response in browser DevTools Network tab
4. Review version history to understand recent changes
