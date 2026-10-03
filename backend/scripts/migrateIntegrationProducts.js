/**
 * Migration: Add integration_categories and integration_products tables,
 * used by the client "Integrazione" tab and the admin catalog editor.
 *
 * Seeds the catalog with the initial product list only if the tables are empty,
 * so this is safe to run multiple times.
 *
 * Run with: node backend/scripts/migrateIntegrationProducts.js
 */

const { createDatabase } = require('../utils/database');

const SEED_CATEGORIES = [
  {
    name: 'Amminoacidi essenziali',
    products: [
      {
        name: 'Amino Advantage+',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/hc4/h2a/8891697791006/IMAGE_product-image_800_800_126754_IT.jpg',
        productUrl: 'https://www.amway.it/it/Amino-Advantage%2B-/p/126754?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
    ],
  },
  {
    name: 'Proteine in polvere',
    products: [
      {
        name: 'Hydrolyzed Whey Protein Powder — Cioccolato',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h0e/h55/11562589618206/product-image_800_800_121606_new.jpg_30d89cbf-fbab-435c-8d04-ba6155688b97_rcv_IMAGE_product-image_600_600',
        productUrl: 'https://www.amway.it/it/Hydrolyzed-Whey-Protein-Powder---Gusto-Cioccolato-/p/121606?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
    ],
  },
  {
    name: 'Creatina',
    products: [
      {
        name: 'Creatine+',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h43/hbf/9382198640670/IMAGE_product-image_800_800_128619.jpg',
        productUrl: 'https://www.amway.it/it/Creatine%2B/p/128619?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
    ],
  },
  {
    name: 'Multivitaminici',
    products: [
      {
        name: 'Multivitaminico Masticabile',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h4e/hae/8893938860062/IMAGE_product-image_800_800_100930_IT_new.jpg',
        productUrl: 'https://www.amway.it/it/Multivitaminico-Masticabile/p/100930?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'Daily',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h86/h81/12278256730142/125166_IT_IMAGE_product-image_800_800.jpg',
        productUrl: 'https://www.amway.it/it/Daily-/p/125166?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'Daily',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/hfe/hbb/12278259744798/125167_IT_IMAGE_product-image_800_800.jpg',
        productUrl: 'https://www.amway.it/it/Daily/p/125167?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'Vitamina C Plus',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h06/h08/9344885653534/IMAGE_product-image_800_800_109741_IT_new.jpg',
        productUrl: 'https://www.amway.it/it/Vitamina-C-Plus-/p/109741?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'Vitamina C Plus (Formato Famiglia)',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h72/h30/8862683922462/IMAGE_product-image_800_800_109743_IT_new.jpg',
        productUrl: 'https://www.amway.it/it/Vitamina-C-Plus-%28Formato-Famiglia%29-/p/109743?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'Vitamina D',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h35/h52/8862691098654/IMAGE_product-image_800_800_119797_IT_new.jpg',
        productUrl: 'https://www.amway.it/it/Vitamina-D-/p/119797?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'Cal Mag D Plus',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h1a/h37/8862688247838/IMAGE_product-image_800_800_110606_IT_new.jpg',
        productUrl: 'https://www.amway.it/it/Cal-Mag-D-Plus/p/110606?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
    ],
  },
  {
    name: 'Omega 3',
    products: [
      {
        name: 'Omega-3 Triple Strength',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h6d/h14/9344864583710/IMAGE_product-image_800_800_126132_IT.jpg',
        productUrl: 'https://www.amway.it/it/Omega-3-Triple-Strength-/p/126132?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
    ],
  },
  {
    name: 'Barrette proteiche',
    products: [
      {
        name: 'High Protein Energy Bar — Cioccolato Fondente',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h80/hf6/9391395307550/IMAGE_product-image_800_800_127730_2026_IT.jpg',
        productUrl: 'https://www.amway.it/it/High-Protein-Energy-Bar-Cioccolato-Fondente/p/127730?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'High Protein Energy Bar — Caffè',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h38/h56/9391591063582/IMAGE_product-image_600_600_341520_IT.jpg',
        productUrl: 'https://www.amway.it/it/High-Protein-Energy-Bar-%E2%80%93-Caff%C3%A8/p/341520?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
      {
        name: 'High Protein Energy Bar — Cocco',
        imageUrl: 'https://media.mlp.amway.eu/sys-master/images/h95/hbb/9391399665694/IMAGE_product-image_600_600_127731_2026_IT.jpg',
        productUrl: 'https://www.amway.it/it/High-Protein-Energy-Bar-Cocco/p/127731?aboSponsor=7028327210&utm_source=creators_app&utm_medium=product_share&utm_campaign=it_it_7028327210_136570004',
      },
    ],
  },
];

async function run() {
  const db = createDatabase();

  console.log('Starting migrateIntegrationProducts migration...');

  await new Promise((resolve, reject) => {
    db.runCallback(
      `CREATE TABLE IF NOT EXISTS integration_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      [],
      (err) => (err ? reject(err) : resolve())
    );
  });
  console.log('✓ integration_categories table ready');

  await new Promise((resolve, reject) => {
    db.runCallback(
      `CREATE TABLE IF NOT EXISTS integration_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        image_url TEXT,
        product_url TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES integration_categories(id) ON DELETE CASCADE
      )`,
      [],
      (err) => (err ? reject(err) : resolve())
    );
  });
  console.log('✓ integration_products table ready');

  const existingCount = await new Promise((resolve, reject) => {
    db.getCallback('SELECT COUNT(*) as c FROM integration_categories', [], (err, row) => (err ? reject(err) : resolve(row.c)));
  });

  if (existingCount > 0) {
    console.log(`Catalog already has ${existingCount} categories — skipping seed.`);
    db.close();
    console.log('Migration complete.');
    return;
  }

  console.log('Seeding initial catalog...');
  let catOrder = 0;
  for (const cat of SEED_CATEGORIES) {
    const catResult = await new Promise((resolve, reject) => {
      db.runCallback(
        'INSERT INTO integration_categories (name, order_index) VALUES (?, ?)',
        [cat.name, catOrder++],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    let prodOrder = 0;
    for (const prod of cat.products) {
      await new Promise((resolve, reject) => {
        db.runCallback(
          'INSERT INTO integration_products (category_id, name, image_url, product_url, order_index) VALUES (?, ?, ?, ?, ?)',
          [catResult, prod.name, prod.imageUrl, prod.productUrl, prodOrder++],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }
  }

  console.log(`✓ Seeded ${SEED_CATEGORIES.length} categories`);
  db.close();
  console.log('Migration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
