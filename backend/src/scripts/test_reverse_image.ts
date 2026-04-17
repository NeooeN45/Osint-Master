/**
 * Test reverse_image_search module
 * Usage: npx ts-node src/scripts/test_reverse_image.ts [image_url]
 */
import { NewModulesExtra } from "../services/newModulesExtra";

const IMG_URL = process.argv[2] ||
  "https://pbs.twimg.com/profile_images/1683899100922511378/5lY42eHs_400x400.jpg";

async function main() {
  const mod = NewModulesExtra.find(m => m.id === "reverse_image_search");
  if (!mod) { console.error("Module reverse_image_search non trouvé"); process.exit(1); }

  const ok = await mod.isAvailable();
  console.log(`Module: ${mod.name}`);
  console.log(`Available: ${ok}`);
  console.log(`Image: ${IMG_URL}\n`);

  const emit = (e: any) => {
    if (e.data?.message) console.log("  LOG:", e.data.message);
  };

  const result = await (mod as any).execute(IMG_URL, emit);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Résultat: success=${result.success}`);
  console.log(`Data: ${JSON.stringify(result.data)}`);
  console.log(`Entités trouvées: ${result.entities.length}`);
  console.log(`${"─".repeat(60)}`);

  for (const e of result.entities) {
    const meta = JSON.stringify(e.metadata || {}).slice(0, 80);
    console.log(`  [${e.type}] ${e.confidence}%  ${e.value.slice(0, 80)}`);
    console.log(`         ${meta}`);
  }
}

main().catch(console.error);
