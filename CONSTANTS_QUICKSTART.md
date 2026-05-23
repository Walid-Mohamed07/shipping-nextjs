# Quick Start: Constants Management

## 5-Minute Setup

### Step 1: Start Your Application

```bash
cd d:\NEXT JS\Shipping
npm run dev
# or
pnpm dev
```

### Step 2: Access Admin Dashboard

1. Login as an admin user
2. Navigate to: `http://localhost:3000/admin/dashboard`

### Step 3: Manage Categories

1. Click **"Categories"** in the left sidebar
2. Click **"Add Category"** button
3. Enter category name (e.g., "Electronics & Technology")
4. Add description (optional)
5. Click **"Create"**

### Step 4: Configure Cost Pricing

1. Click **"Cost Criteria"** in the left sidebar
2. Click **"Edit Criteria"** button
3. Add category rates:
   - Category: "Electronics & Technology"
   - Base Rate: "50.00"
   - Click the **"+"** button to add
4. Adjust multipliers if needed
5. Click **"Save Changes"**

### Step 5: Test in New Request Form

1. Navigate to: `http://localhost:3000/new-request`
2. Try to create a new request
3. Select the category you just created in step 3
4. Observe the cost calculation uses your new base rate
5. Try selecting "Urgent" delivery to see surcharge applied

---

## First-Time Questions Answered

### Q: Where do I access the admin panel?

A: Login as admin → `/admin/dashboard` → Select "Categories" or "Cost Criteria"

### Q: Can I edit categories after creation?

A: Yes! Click the category, then click "Edit", modify, and click "Update"

### Q: Will my changes affect existing requests?

A: No. Only new requests created after the change will use new criteria.

### Q: How do I see previous pricing versions?

A: Go to Cost Criteria → Click "History (vN)" button at top

### Q: What if something goes wrong?

A: Use History to restore previous version, or create new criteria with old values

### Q: Do categories have to match the hardcoded list?

A: No! Your database categories override the hardcoded ones. You can use anything.

### Q: Can regular users see this?

A: No, only admin users (role: "admin") can access these features

---

## Common Tasks

### Task: Change a Price

```
1. Dashboard → Cost Criteria
2. Click "Edit Criteria"
3. Find the category in the list
4. Update the base rate number
5. Click "Save Changes"
6. Done! New pricing active immediately
```

### Task: Add a New Shipping Category

```
1. Dashboard → Categories
2. Click "Add Category"
3. Name: "My New Category"
4. Description: Why this category exists
5. Click "Create"
6. Now go to Cost Criteria → Edit → Add rate for it
```

### Task: Apply a 20% Price Increase

```
1. Dashboard → Cost Criteria
2. Click "Edit Criteria"
3. For each category:
   - Old rate: $50
   - New rate: $60 (50 × 1.2)
4. Click "Save Changes"
5. All shipments now 20% more expensive
```

### Task: Adjust Weight Pricing

```
1. Dashboard → Cost Criteria
2. Click "Edit Criteria"
3. Find "Weight Multiplier" field
4. Change from 1 to 2 (doubles weight impact)
5. Save
6. Now a 10kg vs 5kg item costs double
```

### Task: Set Emergency/Peak Pricing

```
1. Dashboard → Cost Criteria
2. Click "Edit Criteria"
3. Increase "Urgent Delivery Surcharge" from 1.25 to 1.5
4. Save
5. Urgent orders now cost 50% more instead of 25%
```

---

## Important URLs

| Page            | URL                              | Who Can Access               |
| --------------- | -------------------------------- | ---------------------------- |
| Admin Dashboard | `/admin/dashboard`               | Admin, Operator              |
| Categories      | `/admin/dashboard/categories`    | Admin only                   |
| Cost Criteria   | `/admin/dashboard/cost-criteria` | Admin only                   |
| New Request     | `/new-request`                   | Everyone (uses dynamic data) |

---

## Default Values (if Database Empty)

If no cost criteria exists, system uses:

```
- Weight Multiplier: 1.0
- Quantity Multiplier: 1.0
- Same Location: 1.0x
- Different Location: 1.5x
- Urgent Delivery: 1.25x (25% extra)
- Min Price: $0
- Max Price: Unlimited
```

And these hardcoded category rates:

```
- Electronics: $20
- Clothing: $10
- Books: $8
- Furniture: $30
- Food & Beverages: $12
- Cosmetics: $15
- Jewelry: $25
- Documents: $5
- Other: $10
```

Once you add to database, database values override hardcoded ones.

---

## Troubleshooting

| Issue                          | Solution                                             |
| ------------------------------ | ---------------------------------------------------- |
| "Unauthorized" error           | Make sure you're logged in as admin                  |
| Categories not showing in form | Refresh page, wait 5 seconds                         |
| Old prices still showing       | Browser cache - clear cache or hard refresh          |
| Can't create category          | Name might already exist, try different name         |
| Cost not updating              | Check cost criteria is saved and set as active       |
| 404 on admin pages             | Make sure you're admin user (check role in database) |

---

## Sample Test Data

### Categories to Create:

```
1. Electronics & Technology (base: $20)
2. Clothing & Fashion (base: $10)
3. Furniture & Decor (base: $30)
4. Food & Groceries (base: $12)
5. Industrial & Machinery (base: $40)
```

### Cost Criteria to Set:

```
- All category rates as above
- Weight Multiplier: 1.0
- Quantity Multiplier: 1.0
- Urgent Delivery: 1.25 (25% extra)
- Min Price: $5
- Max Price: $500
```

### Test Request:

```
User creates request:
- Category: Electronics & Technology
- Weight: 2kg
- Quantity: 2
- Different location: ✓
- Urgent: ✓

Expected Cost:
($20 × 1 × 2 × 1 × 1.5) × 1.25 = $75
```

---

## Next Steps

After setup, consider:

1. **Add your categories**
   - Think about how you classify shipments
   - Add helpful descriptions
   - Use consistent naming

2. **Set realistic prices**
   - Research market rates
   - Account for shipping costs
   - Include profit margin

3. **Configure multipliers**
   - Test different weight multipliers
   - Adjust distance surcharges
   - Tune urgent delivery pricing

4. **Monitor usage**
   - Check which categories users select
   - Track if prices are competitive
   - Adjust based on demand

5. **Create backup version**
   - Click "History" to view versions
   - Know how to restore if needed
   - Document your changes

---

## API Examples

### Fetch All Categories (for developers)

```bash
curl http://localhost:3000/api/admin/categories
```

### Create Category (with body)

```bash
curl -X POST http://localhost:3000/api/admin/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Category","description":"Testing"}'
```

### Get Cost Criteria

```bash
curl http://localhost:3000/api/admin/cost-criteria
```

### View Cost History

```bash
curl http://localhost:3000/api/admin/cost-criteria/history?limit=10
```

---

## Need Help?

1. **Check the documentation**: Read `CONSTANTS_MANAGEMENT_GUIDE.md`
2. **Review the implementation**: Check `CONSTANTS_IMPLEMENTATION_SUMMARY.md`
3. **Inspect database**: Use MongoDB Compass or shell
4. **Check browser console**: Look for JavaScript errors
5. **Check API responses**: Use browser DevTools Network tab

---

## You're All Set! 🎉

Start managing your categories and pricing without touching the code!
