// Historical Tour de Outback books (2023-2026), normalized from Dave's
// "TdO P&L Statements" Google Sheet with corrections applied during import:
//  - 2023 expenses now include the $239.58 Square processing fee (the sheet total
//    started at row 4 and skipped it), so 2023 net = $7,392.25.
//  - 2023 opening balance derived as $1,473.81 so the running balance opens 2024 at
//    the known-correct $8,866.06 and chains cleanly year over year.
//  - Every income line carries a standardized Category; Registration income is GROSS
//    (processing fees / refunds live as expense lines).
//  - Category labels standardized: "Grant"->"Grants", "Food Sales"->"Sales".
//  - 2024's two Postage lines moved from a stray "Sponsorship" expense category to
//    "Administrative Expense" (there is no Sponsorship expense bucket).
//  - 2026 is the live, in-progress year (expenses still being entered).
// Line "count" & "unit" are kept only where they reconcile to "amount".
// openingBalance is set only on the earliest year; later years chain from the prior
// year's closing balance (computed by the app).
module.exports = [
  {
    "year": 2023,
    "openingBalance": 1473.81,
    "revenue": [
      {
        "name": "Early Reg",
        "category": "Registration",
        "amount": 3705.0,
        "paid": false,
        "count": 57.0,
        "unit": 65.0
      },
      {
        "name": "General Reg",
        "category": "Registration",
        "amount": 2175.0,
        "paid": false,
        "count": 29.0,
        "unit": 75.0
      },
      {
        "name": "Late Reg",
        "category": "Registration",
        "amount": 1190.0,
        "paid": false,
        "count": 14.0,
        "unit": 85.0
      },
      {
        "name": "Travel Southern Oregon",
        "category": "Grants",
        "amount": 6500.0,
        "paid": false
      },
      {
        "name": "Dr Davis",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": false
      },
      {
        "name": "Les Schwab",
        "category": "Sponsorship",
        "amount": 1000.0,
        "paid": false
      },
      {
        "name": "County",
        "category": "Grants",
        "amount": 2000.0,
        "paid": false
      },
      {
        "name": "Town of Lakeview (2500 pledged)",
        "category": "Grants",
        "amount": 2000.0,
        "paid": false
      },
      {
        "name": "Commissioners",
        "category": "Grants",
        "amount": 2000.0,
        "paid": false
      },
      {
        "name": "Skyline Motor Lodge",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": false
      },
      {
        "name": "Lake District Hospital",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": false
      },
      {
        "name": "Howard's Drug",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": false
      },
      {
        "name": "Warner Mtn Medical (check in mail)",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": false
      },
      {
        "name": "Honker Realty",
        "category": "Sponsorship",
        "amount": 50.0,
        "paid": false
      },
      {
        "name": "Favell Utley",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": false
      },
      {
        "name": "Harlan's Furniture",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": false
      },
      {
        "name": "Rotary",
        "category": "Sponsorship",
        "amount": 0.0,
        "paid": false
      }
    ],
    "expenses": [
      {
        "name": "Square Transactions",
        "category": "Registration",
        "amount": 239.58,
        "paid": true
      },
      {
        "name": "Senior Center Shuttle",
        "category": "Administrative Expense",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "BBWHTF Donation",
        "category": "Beneficiary",
        "amount": 3157.0,
        "paid": false
      },
      {
        "name": "Instagram Ads (Marie paid)",
        "category": "Marketing",
        "amount": 59.83,
        "paid": false
      },
      {
        "name": "Google Ads (Marie Paid)",
        "category": "Marketing",
        "amount": 508.0,
        "paid": false
      },
      {
        "name": "Domain Renewal (Donna Paid)",
        "category": "Administrative Expense",
        "amount": 42.34,
        "paid": false
      },
      {
        "name": "LCRI",
        "category": "Administrative Expense",
        "amount": 750.0,
        "paid": false
      },
      {
        "name": "Chamber Dues*",
        "category": "Administrative Expense",
        "amount": 1200.0,
        "paid": false
      },
      {
        "name": "Mail",
        "category": "Administrative Expense",
        "amount": 100.0,
        "paid": false
      },
      {
        "name": "Music (6 or 7pm - 10pm)",
        "category": "After Party",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Search & Rescue",
        "category": "Administrative Expense",
        "amount": 200.0,
        "paid": false
      },
      {
        "name": "REFUNDS: Early Reg",
        "category": "Registration",
        "amount": 195.0,
        "paid": false,
        "count": 3.0,
        "unit": 65.0
      },
      {
        "name": "REFUNDS: General Reg",
        "category": "Registration",
        "amount": 150.0,
        "paid": true,
        "count": 2.0,
        "unit": 75.0
      },
      {
        "name": "REFUNDS: Late Reg",
        "category": "Registration",
        "amount": 0.0,
        "paid": true,
        "count": 0.0,
        "unit": 85.0
      },
      {
        "name": "Drinks",
        "category": "After Party",
        "amount": 308.0,
        "paid": true,
        "count": 77.0,
        "unit": 4.0
      },
      {
        "name": "Dinner (Riders)",
        "category": "After Party",
        "amount": 1771.0,
        "paid": true,
        "count": 77.0,
        "unit": 23.0
      },
      {
        "name": "Dinner (Committee)",
        "category": "After Party",
        "amount": 265.0,
        "paid": true
      },
      {
        "name": "Lunch",
        "category": "Aid Stations",
        "amount": 770.0,
        "paid": true,
        "count": 77.0,
        "unit": 10.0
      },
      {
        "name": "Aid Stations",
        "category": "Aid Stations",
        "amount": 400.0,
        "paid": true,
        "count": 4.0,
        "unit": 100.0
      },
      {
        "name": "SAR Trucks",
        "category": "Administrative Expense",
        "amount": 200.0,
        "paid": false,
        "count": 2.0,
        "unit": 100.0
      },
      {
        "name": "Aid Station Food",
        "category": "Aid Stations",
        "amount": 400.0,
        "paid": false,
        "count": 4.0,
        "unit": 100.0
      },
      {
        "name": "Bibs",
        "category": "Administrative Expense",
        "amount": 98.93,
        "paid": false
      },
      {
        "name": "T Shirts",
        "category": "SWAG",
        "amount": 2142.0,
        "paid": false,
        "count": 119.0,
        "unit": 18.0
      },
      {
        "name": "Porta Pottie",
        "category": "Administrative Expense",
        "amount": 525.0,
        "paid": true,
        "count": 7.0,
        "unit": 75.0
      },
      {
        "name": "Porta Pottie Mileage",
        "category": "Administrative Expense",
        "amount": 512.0,
        "paid": false,
        "count": 1.0,
        "unit": 512.0
      },
      {
        "name": "Banner (5x10)",
        "category": "Assets",
        "amount": 90.99,
        "paid": false,
        "count": 1.0,
        "unit": 90.99
      },
      {
        "name": "Stickers (125)",
        "category": "SWAG",
        "amount": 78.78,
        "paid": true
      },
      {
        "name": "Cowbells (24)",
        "category": "SWAG",
        "amount": 31.99,
        "paid": true
      },
      {
        "name": "Car Magnets",
        "category": "Assets",
        "amount": 75.99,
        "paid": true
      },
      {
        "name": "Wristbands",
        "category": "Administrative Expense",
        "amount": 23.96,
        "paid": true
      },
      {
        "name": "Hi my name is Donna Stickers",
        "category": "Administrative Expense",
        "amount": 8.99,
        "paid": true
      },
      {
        "name": "Hats (Donna Paid)",
        "category": "Assets",
        "amount": 176.0,
        "paid": true,
        "count": 10.0,
        "unit": 17.6
      },
      {
        "name": "Oranges (Donna Paid)",
        "category": "Aid Stations",
        "amount": 62.93,
        "paid": false,
        "count": 7.0,
        "unit": 8.99
      },
      {
        "name": "Stamps",
        "category": "Administrative Expense",
        "amount": 150.0,
        "paid": false
      },
      {
        "name": "Tulip Blossoms (Donna Paid)",
        "category": "Administrative Expense",
        "amount": 25.2,
        "paid": false,
        "count": 2.0,
        "unit": 12.6
      },
      {
        "name": "SAG Driver",
        "category": "Administrative Expense",
        "amount": 25.0,
        "paid": false
      },
      {
        "name": "Postage (T-Shirts/Thank Yous)",
        "category": "Administrative Expense",
        "amount": 84.24,
        "paid": false
      }
    ],
    "status": "final",
    "note": "Square processing fee now included in expenses (fix); opening balance derived so 2024 opens at $8,866.06."
  },
  {
    "year": 2024,
    "openingBalance": null,
    "revenue": [
      {
        "name": "Registration",
        "category": "Registration",
        "amount": 13395.0,
        "paid": true
      },
      {
        "name": "Harland's Furniture",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Favell Utley",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "KORV",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "Anderson Engineering",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Nolte Fuller",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "Les Schwab",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Warner Mountain Medical",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Holiday Jewelry",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Travel Southern Oregon",
        "category": "Grants",
        "amount": 5000.0,
        "paid": true
      },
      {
        "name": "Collins McDonald Trust Fund",
        "category": "Grants",
        "amount": 1600.0,
        "paid": true
      },
      {
        "name": "T Shirt Sales",
        "category": "Sales",
        "amount": 60.0,
        "paid": true
      },
      {
        "name": "Food Sold",
        "category": "Sales",
        "amount": 185.04,
        "paid": true
      }
    ],
    "expenses": [
      {
        "name": "Square Transactions",
        "category": "Registration",
        "amount": 460.81,
        "paid": true
      },
      {
        "name": "Refunds",
        "category": "Registration",
        "amount": 460.0,
        "paid": true
      },
      {
        "name": "Fiver",
        "category": "Marketing",
        "amount": 34.15,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 70.35,
        "paid": true
      },
      {
        "name": "Facebook",
        "category": "Marketing",
        "amount": 69.05,
        "paid": true
      },
      {
        "name": "Facebook",
        "category": "Marketing",
        "amount": 3.84,
        "paid": true
      },
      {
        "name": "Sticker Decals (decals.com)",
        "category": "SWAG",
        "amount": 195.68,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 25.6,
        "paid": true
      },
      {
        "name": "Google",
        "category": "Marketing",
        "amount": 60.8,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Marketing",
        "amount": 22.24,
        "paid": true
      },
      {
        "name": "Facebook",
        "category": "Marketing",
        "amount": 113.98,
        "paid": true
      },
      {
        "name": "Facebook",
        "category": "Marketing",
        "amount": 3.68,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 5.7,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 8.3,
        "paid": true
      },
      {
        "name": "Start/Finish Line",
        "category": "Assets",
        "amount": 169.0,
        "paid": true
      },
      {
        "name": "Tall Town Bike & Camp",
        "category": "After Party",
        "amount": 259.95,
        "paid": true
      },
      {
        "name": "Dollar General",
        "category": "Aid Stations",
        "amount": 11.0,
        "paid": true
      },
      {
        "name": "Dollar General",
        "category": "Assets",
        "amount": 2.27,
        "paid": true
      },
      {
        "name": "Wal Mart",
        "category": "Aid Stations",
        "amount": 49.48,
        "paid": true
      },
      {
        "name": "Costco",
        "category": "Aid Stations",
        "amount": 500.24,
        "paid": true
      },
      {
        "name": "Dollar General",
        "category": "Assets",
        "amount": 10.0,
        "paid": true
      },
      {
        "name": "Lake County Chamber Dues",
        "category": "Administrative Expense",
        "amount": 525.0,
        "paid": true
      },
      {
        "name": "Lake County Chamber Website",
        "category": "Marketing",
        "amount": 282.0,
        "paid": true
      },
      {
        "name": "Wal Mart",
        "category": "Aid Stations",
        "amount": 53.21,
        "paid": true
      },
      {
        "name": "Wal Mart",
        "category": "Aid Stations",
        "amount": 46.8,
        "paid": true
      },
      {
        "name": "Fran's Bakery",
        "category": "Aid Stations",
        "amount": 41.53,
        "paid": true
      },
      {
        "name": "Chef Store",
        "category": "Aid Stations",
        "amount": 198.17,
        "paid": true
      },
      {
        "name": "Chef Store",
        "category": "Aid Stations",
        "amount": 33.69,
        "paid": true
      },
      {
        "name": "Road Cones",
        "category": "Assets",
        "amount": 28.47,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 60.76,
        "paid": true
      },
      {
        "name": "Facebook",
        "category": "Marketing",
        "amount": 108.5,
        "paid": true
      },
      {
        "name": "Facebook",
        "category": "Marketing",
        "amount": 3.51,
        "paid": true
      },
      {
        "name": "Cowbells",
        "category": "Assets",
        "amount": 10.02,
        "paid": true
      },
      {
        "name": "Electrolite Drinks",
        "category": "Aid Stations",
        "amount": 119.95,
        "paid": true
      },
      {
        "name": "Feather Flags (x4)",
        "category": "Assets",
        "amount": 1048.22,
        "paid": true
      },
      {
        "name": "Adel Store",
        "category": "After Party",
        "amount": 565.0,
        "paid": true
      },
      {
        "name": "Music (Marty & Band)",
        "category": "After Party",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "T Shirts",
        "category": "SWAG",
        "amount": 3600.0,
        "paid": true
      },
      {
        "name": "Additional T Shirts",
        "category": "SWAG",
        "amount": 54.0,
        "paid": true
      },
      {
        "name": "Lakeview Sanitiation",
        "category": "Administrative Expense",
        "amount": 1037.0,
        "paid": true
      },
      {
        "name": "Adel School Rental",
        "category": "Administrative Expense",
        "amount": 200.0,
        "paid": true
      },
      {
        "name": "SAR Aid Stations",
        "category": "Administrative Expense",
        "amount": 600.0,
        "paid": true
      },
      {
        "name": "SAR Truck Service",
        "category": "Administrative Expense",
        "amount": 200.0,
        "paid": true
      },
      {
        "name": "SAR Donation",
        "category": "Beneficiary",
        "amount": 3000.0,
        "paid": true
      },
      {
        "name": "Parking (Sandy Taylor)",
        "category": "Administrative Expense",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Pop Up Tents",
        "category": "Assets",
        "amount": 575.96,
        "paid": true
      }
    ],
    "status": "final",
    "note": "Two Postage lines recategorized from Sponsorship to Administrative Expense (fix)."
  },
  {
    "year": 2025,
    "openingBalance": null,
    "revenue": [
      {
        "name": "January Registration Income",
        "category": "Registration",
        "amount": 5670.0,
        "paid": true
      },
      {
        "name": "February Registration Income",
        "category": "Registration",
        "amount": 1485.0,
        "paid": true
      },
      {
        "name": "March Registration Income",
        "category": "Registration",
        "amount": 2250.0,
        "paid": true
      },
      {
        "name": "April Registration Income",
        "category": "Registration",
        "amount": 2980.0,
        "paid": true
      },
      {
        "name": "May Registration Income",
        "category": "Registration",
        "amount": 3375.0,
        "paid": true
      },
      {
        "name": "June Registration Income",
        "category": "Registration",
        "amount": 3005.0,
        "paid": true
      },
      {
        "name": "Travel Southern Oregon",
        "category": "Grants",
        "amount": 3500.0,
        "paid": true
      },
      {
        "name": "Hall Motor Company",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Ace Hardware",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "FHN Engineering",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "KORV",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "Rotary",
        "category": "Grants",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Lesa Cahill FNP",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Dr Graham",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Eco Materials",
        "category": "Sponsorship",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "Howards",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "Harlans",
        "category": "Sponsorship",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Favell Utley",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "Nolte Fuller Insurance",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "Les Schwab",
        "category": "Sponsorship",
        "amount": 1000.0,
        "paid": true
      },
      {
        "name": "Ed Staub",
        "category": "Sponsorship",
        "amount": 100.0,
        "paid": true
      },
      {
        "name": "TLT Grant",
        "category": "Grants",
        "amount": 3000.0,
        "paid": true
      },
      {
        "name": "BBQ Lunches (8 @ $20)",
        "category": "Sales",
        "amount": 160.0,
        "paid": true
      },
      {
        "name": "Aid Station Buy Back",
        "category": "Sales",
        "amount": 125.09,
        "paid": true
      }
    ],
    "expenses": [
      {
        "name": "Checks",
        "category": "Administrative Expense",
        "amount": 13.34,
        "paid": true
      },
      {
        "name": "Zoom (Yearly)",
        "category": "Administrative Expense",
        "amount": 159.9,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 60.74,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 60.32,
        "paid": true
      },
      {
        "name": "Costco Black Storage Boxes",
        "category": "Assets",
        "amount": 63.92,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 60.19,
        "paid": true
      },
      {
        "name": "SquareSpace Email Blasts",
        "category": "Marketing",
        "amount": 168.0,
        "paid": true
      },
      {
        "name": "Amazon Card Reader",
        "category": "Assets",
        "amount": 9.99,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 59.59,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 10.69,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 2.99,
        "paid": true
      },
      {
        "name": "SquareSpace",
        "category": "Marketing",
        "amount": 1.48,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 58.23,
        "paid": true
      },
      {
        "name": "BikeReg Highlighted Events",
        "category": "Marketing",
        "amount": 75.0,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 88.18,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 2.96,
        "paid": true
      },
      {
        "name": "Clasp Envelopes (Amazon)",
        "category": "Administrative Expense",
        "amount": 20.89,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 6.95,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 12.25,
        "paid": true
      },
      {
        "name": "SquareSpace Hosting Renewal",
        "category": "Marketing",
        "amount": 276.0,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 6.95,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 57.93,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 19.29,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 80.0,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 2.9,
        "paid": true
      },
      {
        "name": "Square Fee (Eco Materials Sp)",
        "category": "Administrative Expense",
        "amount": 14.8,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 4.38,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 3.15,
        "paid": true
      },
      {
        "name": "Postage",
        "category": "Administrative Expense",
        "amount": 6.95,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 60.6,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 3.05,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 88.03,
        "paid": true
      },
      {
        "name": "Amazon Collapsible Boxes",
        "category": "Assets",
        "amount": 107.98,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 58.0,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 88.65,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 3.07,
        "paid": true
      },
      {
        "name": "Chef Store",
        "category": "Aid Stations",
        "amount": 68.95,
        "paid": true
      },
      {
        "name": "Coolers (5 @ $109.99)",
        "category": "Assets",
        "amount": 549.95,
        "paid": true
      },
      {
        "name": "Mist Fans (2 @ $129.00",
        "category": "Assets",
        "amount": 258.0,
        "paid": true
      },
      {
        "name": "Water Cooler 5 gal (2 @ $64.99)",
        "category": "Assets",
        "amount": 129.98,
        "paid": true
      },
      {
        "name": "Walmart",
        "category": "Aid Stations",
        "amount": 35.44,
        "paid": true
      },
      {
        "name": "Ladybug Creations (Hats) Ord 1",
        "category": "SWAG",
        "amount": 2240.0,
        "paid": true
      },
      {
        "name": "Ladybug Creations (Hats) Ord 2",
        "category": "SWAG",
        "amount": 752.0,
        "paid": true
      },
      {
        "name": "Jilly's Adel Store (Meal Down Pmt)",
        "category": "After Party",
        "amount": 1400.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Hammer Nutrition",
        "category": "Aid Stations",
        "amount": 140.78,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 60.83,
        "paid": true
      },
      {
        "name": "Dollar General",
        "category": "Aid Stations",
        "amount": 15.5,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 89.63,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 3.02,
        "paid": true
      },
      {
        "name": "Lake County Chamber",
        "category": "After Party",
        "amount": 20.0,
        "paid": true
      },
      {
        "name": "Costco",
        "category": "Aid Stations",
        "amount": 165.76,
        "paid": true
      },
      {
        "name": "Safeway",
        "category": "Aid Stations",
        "amount": 17.06,
        "paid": true
      },
      {
        "name": "Dollar General",
        "category": "Aid Stations",
        "amount": 5.0,
        "paid": true
      },
      {
        "name": "Downtown Bakery (22 Pizzas)",
        "category": "Pre Party",
        "amount": 572.0,
        "paid": true
      },
      {
        "name": "Julia Browdey (Tall Town Sound)",
        "category": "Pre Party",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Mam's Munchies",
        "category": "Aid Stations",
        "amount": 20.0,
        "paid": true
      },
      {
        "name": "Safeway",
        "category": "Aid Stations",
        "amount": 19.64,
        "paid": true
      },
      {
        "name": "Square Fee (BBQ Lunches)",
        "category": "After Party",
        "amount": 4.76,
        "paid": true
      },
      {
        "name": "Lake County Chamber Dues",
        "category": "Administrative Expense",
        "amount": 125.0,
        "paid": true
      },
      {
        "name": "Jilly's Adel Store (Meal Payment)",
        "category": "After Party",
        "amount": 1400.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 110.09,
        "paid": true
      },
      {
        "name": "Facebook Ads",
        "category": "Marketing",
        "amount": 36.8,
        "paid": true
      },
      {
        "name": "Sandy Taylor (Parking)",
        "category": "Administrative Expense",
        "amount": 250.0,
        "paid": true
      },
      {
        "name": "Adel School",
        "category": "Administrative Expense",
        "amount": 200.0,
        "paid": true
      },
      {
        "name": "SAR",
        "category": "Beneficiary",
        "amount": 3000.0,
        "paid": true
      },
      {
        "name": "SAR Aid Stations",
        "category": "Aid Stations",
        "amount": 500.0,
        "paid": true
      },
      {
        "name": "SAR Missing Radio",
        "category": "Administrative Expense",
        "amount": 1000.0,
        "paid": true
      },
      {
        "name": "Lakeview Sanitation",
        "category": "Administrative Expense",
        "amount": 990.0,
        "paid": true
      },
      {
        "name": "Serving Tongs",
        "category": "After Party",
        "amount": 5.0,
        "paid": true
      },
      {
        "name": "Google",
        "category": "Marketing",
        "amount": 6.0,
        "paid": true
      },
      {
        "name": "Google Ads",
        "category": "Marketing",
        "amount": 110.43,
        "paid": true
      }
    ],
    "status": "final",
    "note": "Income categories standardized (Grant->Grants, Food Sales->Sales)."
  },
  {
    "year": 2026,
    "openingBalance": null,
    "revenue": [
      {
        "name": "January Registration Income",
        "category": "Registration",
        "amount": 8578.0,
        "paid": true
      },
      {
        "name": "January Camping Income",
        "category": "Camping",
        "amount": 1854.5,
        "paid": true
      },
      {
        "name": "Town of Lakeview TLT Grant",
        "category": "Grants",
        "amount": 7500.0,
        "paid": true
      },
      {
        "name": "February Registration Income",
        "category": "Registration",
        "amount": 3034.0,
        "paid": true
      },
      {
        "name": "February Camping Income",
        "category": "Camping",
        "amount": 375.0,
        "paid": true
      },
      {
        "name": "March Registration Income",
        "category": "Registration",
        "amount": 1220.0,
        "paid": true
      },
      {
        "name": "March Camping Income",
        "category": "Camping",
        "amount": 210.0,
        "paid": true
      },
      {
        "name": "April Registration Income",
        "category": "Registration",
        "amount": 1862.5,
        "paid": true
      },
      {
        "name": "April Camping Income",
        "category": "Camping",
        "amount": 120.0,
        "paid": true
      },
      {
        "name": "May Registration Income",
        "category": "Registration",
        "amount": 1987.5,
        "paid": true
      },
      {
        "name": "May Camping Income",
        "category": "Camping",
        "amount": 155.0,
        "paid": true
      },
      {
        "name": "June 15th Reg Income",
        "category": "Registration",
        "amount": 1645.5,
        "paid": true
      },
      {
        "name": "June 15th Camping Income",
        "category": "Camping",
        "amount": 210.0,
        "paid": true
      },
      {
        "name": "June 22nd Reg Income",
        "category": "Registration",
        "amount": 865.0,
        "paid": true
      },
      {
        "name": "June 22nd Camping Income",
        "category": "Camping",
        "amount": -90.0,
        "paid": true
      },
      {
        "name": "Registration Sales",
        "category": "Sales",
        "amount": 105.0,
        "paid": true
      },
      {
        "name": "June 29th Reg Income",
        "category": "Registration",
        "amount": 870.0,
        "paid": true
      },
      {
        "name": "June 29th Camping Income",
        "category": "Camping",
        "amount": 90.0,
        "paid": true
      }
    ],
    "expenses": [
      {
        "name": "Zoom Workspace",
        "category": "Administrative Expense",
        "amount": 159.9,
        "paid": true
      },
      {
        "name": "Banners x3",
        "category": "Assets",
        "amount": 202.96,
        "paid": true
      },
      {
        "name": "Tent",
        "category": "Administrative Expense",
        "amount": 1040.0,
        "paid": true
      },
      {
        "name": "BikeReg Highlighted Events",
        "category": "Marketing",
        "amount": 224.0,
        "paid": true
      },
      {
        "name": "SquareSpace Email Campaigns",
        "category": "Marketing",
        "amount": 168.0,
        "paid": true
      },
      {
        "name": "TrailForks Map Advertisement",
        "category": "Marketing",
        "amount": 77.0,
        "paid": true
      },
      {
        "name": "Canva Yearly Subscription",
        "category": "Marketing",
        "amount": 210.0,
        "paid": true
      },
      {
        "name": "Adult Games",
        "category": "Assets",
        "amount": 222.0,
        "paid": true
      }
    ],
    "status": "in-progress",
    "note": "Live year \u2014 expenses still being entered; net profit & balance are partial."
  }
];
