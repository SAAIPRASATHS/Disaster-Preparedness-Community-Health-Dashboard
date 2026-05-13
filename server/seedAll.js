/**
 * Unified seed script — inserts all Coimbatore resource data into Neon PostgreSQL
 *
 * Usage:  node seedAll.js
 */

require('dotenv').config();
const db = require('./db');

const ALL_RESOURCES = [
  // ═══ HOSPITALS ═══
  { name: "Coimbatore Medical College Hospital", type: "hospital", address: "Trichy Road, Gopalapuram, Coimbatore - 641018", contact: "0422-2301393", lat: 11.0113, lng: 76.9725 },
  { name: "Kovai Medical Center Hospital (KMCH)", type: "hospital", address: "Avinashi Road, Coimbatore", contact: "0422-2827784", lat: 11.0254, lng: 77.0106 },
  { name: "P.S.G. Medical College Hospital", type: "hospital", address: "Peelamedu, Coimbatore", contact: "0422-2827784", lat: 11.0233, lng: 77.0419 },
  { name: "G Kuppusamy Naidu Hospital", type: "hospital", address: "P.N.Palayam, Coimbatore", contact: "0422-2211000", lat: 11.0044, lng: 76.9598 },
  { name: "Ramakrishna Hospital", type: "hospital", address: "P.N.Palayam, Coimbatore", contact: "0422-2210075", lat: 11.0059, lng: 76.9601 },
  { name: "K.G. Hospital", type: "hospital", address: "Arts College Road, Coimbatore", contact: "0422-2212121", lat: 11.0098, lng: 76.9617 },
  { name: "Aravind Eye Hospital", type: "hospital", address: "Avinashi Road, Coimbatore", contact: "0422-4333500", lat: 11.0165, lng: 77.0228 },
  { name: "Sankara Eye Hospital", type: "hospital", address: "Sathy Road, Ganapathy, Coimbatore", contact: "0422-2866450", lat: 11.0370, lng: 76.9605 },
  { name: "Ayurveda Hospital", type: "hospital", address: "Ramanathapuram, Coimbatore", contact: "0422-2313188", lat: 11.0172, lng: 76.9481 },
  { name: "ESI Hospital Karumathampatti", type: "hospital", address: "Karumathampatti, Coimbatore", contact: "108", lat: 11.0982, lng: 77.1040 },
  { name: "Prema Hospital", type: "hospital", address: "Karumathampatti area", contact: "N/A", lat: 11.1000, lng: 77.0940 },

  // ═══ FIRE STATIONS ═══
  { name: "Peelamedu Fire Station", type: "fire_station", address: "Peelamedu, Coimbatore", contact: "0422-2595101", lat: 11.0195, lng: 77.0384 },
  { name: "Coimbatore South Fire Station", type: "fire_station", address: "Coimbatore South", contact: "0422-2300101", lat: 11.0006, lng: 76.9630 },
  { name: "Kavundampalayam Fire Station", type: "fire_station", address: "Kavundampalayam, Coimbatore", contact: "0422-2450101", lat: 11.0396, lng: 76.9531 },
  { name: "Ganapathy Fire Station", type: "fire_station", address: "Ganapathy, Coimbatore", contact: "0422-2511001", lat: 11.0360, lng: 76.9537 },
  { name: "Mettupalayam Fire Station", type: "fire_station", address: "Mettupalayam, Coimbatore", contact: "0422-222299", lat: 11.2990, lng: 76.9358 },
  { name: "Palladam Fire Station", type: "fire_station", address: "Palladam, Coimbatore", contact: "253110", lat: 10.9912, lng: 77.2862 },
  { name: "Karumathampatti Fire Station", type: "fire_station", address: "Karumathampatti, Coimbatore", contact: "0422-2450101", lat: 11.0968, lng: 77.1062 },

  // ═══ POLICE STATIONS ═══
  { name: "Karumathampatti Police Station", type: "police_station", address: "Karumathampatti, Coimbatore", contact: "N/A", lat: 11.0950, lng: 77.1030 },
  { name: "Arasur Police Station", type: "police_station", address: "Arasur, Coimbatore", contact: "100", lat: 11.0972, lng: 77.0885 },
  { name: "DSP Office Karumathampatti", type: "police_station", address: "Somanur Road, Karumathampatti", contact: "N/A", lat: 11.0935, lng: 77.1040 },
  { name: "Town Hall Police Station", type: "police_station", address: "Town Hall, Coimbatore", contact: "0422-2394050", lat: 11.0013, lng: 76.9614 },
  { name: "RS Puram Police Station", type: "police_station", address: "RS Puram, Coimbatore", contact: "0422-2548555", lat: 11.0052, lng: 76.9537 },
  { name: "Saibaba Colony Police Station", type: "police_station", address: "Saibaba Colony, Coimbatore", contact: "0422-2456910", lat: 11.0183, lng: 76.9677 },
  { name: "Race Course Police Station", type: "police_station", address: "Race Course, Coimbatore", contact: "0422-2222100", lat: 11.0019, lng: 76.9734 },
  { name: "Peelamedu Police Station", type: "police_station", address: "Peelamedu, Coimbatore", contact: "0422-2590933", lat: 11.0191, lng: 77.0350 },
  { name: "Singanallur Police Station", type: "police_station", address: "Singanallur, Coimbatore", contact: "0422-2431010", lat: 10.9950, lng: 77.0290 },
  { name: "Kuniyamuthur Police Station", type: "police_station", address: "Kuniyamuthur, Coimbatore", contact: "0422-2605400", lat: 10.9610, lng: 76.9500 },
  { name: "Sulur Police Station", type: "police_station", address: "Sulur, Coimbatore", contact: "0422-2680222", lat: 11.0370, lng: 77.1280 },

  // ═══ GOVERNMENT OFFICES ═══
  { name: "Coimbatore District Collectorate", type: "government_office", address: "State Bank Road, Coimbatore - 641018", contact: "0422-2301114", lat: 11.0082, lng: 76.9712 },
  { name: "Coimbatore Corporation Office", type: "government_office", address: "Big Bazaar St, Town Hall, Coimbatore - 641001", contact: "0422-2390261", lat: 11.0015, lng: 76.9614 },
  { name: "North Taluk Office", type: "government_office", address: "Balasundaram Road, Coimbatore - 641018", contact: "0422-2217831", lat: 11.0090, lng: 76.9680 },
  { name: "South Taluk Office", type: "government_office", address: "Huzur Road, Coimbatore - 641018", contact: "0422-2214225", lat: 11.0040, lng: 76.9690 },
  { name: "Revenue Divisional Office", type: "government_office", address: "Collectorate Complex, Coimbatore", contact: "0422-2300424", lat: 11.0080, lng: 76.9715 },
  { name: "District Industries Centre", type: "government_office", address: "No.2, Raja Street, Coimbatore", contact: "0422-2397311", lat: 11.0040, lng: 76.9630 },
  { name: "Small Industries Service Institute", type: "government_office", address: "386, Patel Road, Ram Nagar, Coimbatore", contact: "0422-2230426", lat: 11.0150, lng: 76.9520 },
  { name: "Public Relations Office", type: "government_office", address: "Collectorate, Coimbatore", contact: "0422-2301060", lat: 11.0084, lng: 76.9710 },

  // ═══ WATER BODIES ═══
  { name: "Singanallur Tank", type: "water_body", address: "Singanallur, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 10.9960, lng: 77.0210 },
  { name: "Valankulam Tank", type: "water_body", address: "Sungam, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 11.0040, lng: 76.9830 },
  { name: "Ukkadam Periyakulam Tank", type: "water_body", address: "Ukkadam, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 10.9880, lng: 76.9610 },
  { name: "Selvampathy Tank", type: "water_body", address: "Kumaraswamy Nagar, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 11.0300, lng: 76.9390 },
  { name: "Narasampathi Tank", type: "water_body", address: "Vadavalli Road, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 11.0260, lng: 76.9030 },
  { name: "Krishnampathi Tank", type: "water_body", address: "Seeranaickenpalayam, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 11.0510, lng: 76.9340 },
  { name: "Selvachinthamani Tank", type: "water_body", address: "Thadagam Road, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 11.0420, lng: 76.9140 },
  { name: "Kumaraswami Tank", type: "water_body", address: "Muthannan Kulam, Coimbatore", contact: "Managed by Coimbatore Corporation", lat: 11.0140, lng: 76.9690 },

  // ═══ FOOD POINTS ═══
  { name: "Sam Mess", type: "food_point", address: "Karumathampatti", contact: "N/A", lat: 11.0956, lng: 77.1001 },
  { name: "Sri Haries Hotel", type: "food_point", address: "Karumathampatti / Neelambur", contact: "N/A", lat: 11.0940, lng: 77.0980 },
  { name: "Aavin Milk Booth - Karumathampatti", type: "food_point", address: "Near Karumathampatti Bus Stand", contact: "N/A", lat: 11.0949, lng: 77.1022 },
  { name: "Annapoorani Restaurant", type: "food_point", address: "Gandhipuram, Coimbatore", contact: "0422-2490234", lat: 11.0168, lng: 76.9668 },
  { name: "Saravana Bhavan - RS Puram", type: "food_point", address: "RS Puram, Coimbatore", contact: "0422-2541555", lat: 11.0050, lng: 76.9530 },
  { name: "Hot Chips - Gandhipuram", type: "food_point", address: "Gandhipuram, Coimbatore", contact: "0422-2498765", lat: 11.0175, lng: 76.9678 },

  // ═══ HOTELS / SHELTERS ═══
  { name: "The Residency Towers", type: "hotel", address: "Avinashi Road, Coimbatore", contact: "0422-2242424", lat: 11.0164, lng: 77.0200 },
  { name: "Hotel City Tower", type: "hotel", address: "Sivasamy Road, Coimbatore", contact: "0422-2230681", lat: 11.0040, lng: 76.9630 },
  { name: "Hotel Vijay Park", type: "hotel", address: "Sathy Road, Coimbatore", contact: "0422-2547555", lat: 11.0320, lng: 76.9600 },
  { name: "Le Meridien Coimbatore", type: "hotel", address: "Neelambur, Coimbatore", contact: "0422-6677777", lat: 11.0690, lng: 77.0640 },

  // ═══ RESCUE CENTERS ═══
  { name: "SDRF Coimbatore", type: "rescue_center", address: "Coimbatore", contact: "1077", lat: 11.0168, lng: 76.9558 },
  { name: "NDRF 4th Battalion", type: "rescue_center", address: "Arakkonam (nearest to Coimbatore)", contact: "011-23438252", lat: 11.0600, lng: 77.0100 },
];

async function seed() {
  try {
    console.log('🚀 Seeding all resources into Neon PostgreSQL...\n');

    let added = 0, skipped = 0;

    for (const r of ALL_RESOURCES) {
      // Check if already exists
      const { rows: existing } = await db.query(
        'SELECT id FROM resources WHERE name = $1',
        [r.name]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.query(
        `INSERT INTO resources (name, type, lat, lng, address, contact, food_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.name, r.type, r.lat, r.lng, r.address, r.contact || '', r.type === 'food_point']
      );
      added++;
      console.log(`✅ ${r.type.padEnd(18)} ${r.name}`);
    }

    console.log(`\n🎉 Done! Added ${added}, skipped ${skipped} (already existed)`);
    console.log(`📊 Total resources in DB now: ${added + skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
