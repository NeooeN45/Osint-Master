/**
 * Test rapide des modules sociaux étendus
 * Usage: npx ts-node src/scripts/test_social_ext.ts [moduleId] [target]
 */
import {
  BlueskyModule, MastodonModule, ThreadsModule, TwitchModule, TikTokModule,
  VKModule, PinterestModule, KeybaseModule, HackerNewsModule, GitLabModule, DevToModule,
} from "../services/socialMediaExtended";
import { GravatarModule, SIRENEModule, OpenCorporatesModule, GitHubSearchByNameModule } from "../services/nameIntelPro";

const MODULES: Record<string, any> = {
  bluesky: BlueskyModule, mastodon: MastodonModule, threads: ThreadsModule,
  twitch: TwitchModule, tiktok: TikTokModule, vk: VKModule, pinterest: PinterestModule,
  keybase: KeybaseModule, hn: HackerNewsModule, gitlab: GitLabModule, devto: DevToModule,
  gravatar: GravatarModule, insee: SIRENEModule, opencorp: OpenCorporatesModule,
  ghname: GitHubSearchByNameModule,
};

const moduleId = process.argv[2] || "bluesky";
const target = process.argv[3] || "dhh";

async function main() {
  const mod = MODULES[moduleId];
  if (!mod) {
    console.log(`Unknown. Available: ${Object.keys(MODULES).join(", ")}`);
    process.exit(1);
  }
  console.log(`=== ${mod.name} ===`);
  console.log(`Target: ${target}\n`);

  const emit = (e: any) => e.data?.message && console.log("  LOG:", e.data.message);
  const start = Date.now();
  const result = await mod.execute(target, emit, {});
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Success: ${result.success} | ${Date.now() - start}ms`);
  console.log(`Data: ${JSON.stringify(result.data)}`);
  console.log(`Entités: ${result.entities.length}\n`);
  result.entities.slice(0, 8).forEach((e: any) => {
    console.log(`  [${e.type}] ${e.confidence}% — ${String(e.value).slice(0, 80)}`);
    console.log(`      ${JSON.stringify(e.metadata).slice(0, 150)}`);
  });
}
main().catch(console.error);
