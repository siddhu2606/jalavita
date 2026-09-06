const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const CORE_PATH = path.join(
  process.env.APPDATA, 'npm', 'node_modules', '@bubblewrap', 'cli', 'node_modules', '@bubblewrap', 'core'
);
const { TwaManifest, TwaGenerator } = require(CORE_PATH);
const JDK_PATH = 'C:/Users/Siddhesh/jalavita/android/tools/jdk-17.0.20.1+1';

const TARGET_DIR = 'C:/Users/Siddhesh/jalavita/android/wayfinder-app';
const MANIFEST_URL = 'https://books-camcorders-earned-speakers.trycloudflare.com/app/manifest.json';
const KEYSTORE_PASSWORD = 'jalavita2026';
const KEY_PASSWORD = 'jalavita2026';

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const twaManifest = await TwaManifest.fromWebManifest(MANIFEST_URL);
  twaManifest.packageId = 'com.jalavita.wayfinder';
  twaManifest.name = 'Jalavita Wayfinder';
  twaManifest.launcherName = 'Jalavita';
  twaManifest.appVersionCode = 1;
  twaManifest.appVersionName = '1.0';
  twaManifest.signingKey = {
    path: path.join(TARGET_DIR, 'android.keystore'),
    alias: 'android',
  };

  const manifestFile = path.join(TARGET_DIR, 'twa-manifest.json');
  await twaManifest.saveToFile(manifestFile);

  console.log('Generating Android project...');
  const twaGenerator = new TwaGenerator();
  await twaGenerator.createTwaProject(TARGET_DIR, twaManifest, undefined, () => {});

  // Matches generateManifestChecksumFile() in bubblewrap's cli/shared.js
  const manifestContents = fs.readFileSync(manifestFile);
  const sum = crypto.createHash('sha1').update(manifestContents).digest('hex');
  fs.writeFileSync(path.join(TARGET_DIR, 'manifest-checksum.txt'), sum);

  console.log('Generating signing key...');
  const keytoolExe = path.join(JDK_PATH, 'bin', 'keytool.exe');
  const dname = 'cn=Jalavita Team, ou=Engineering, o=Jalavita, c=IN';
  execFileSync(keytoolExe, [
    '-genkeypair',
    '-dname', dname,
    '-alias', twaManifest.signingKey.alias,
    '-keypass', KEY_PASSWORD,
    '-keystore', twaManifest.signingKey.path,
    '-storepass', KEYSTORE_PASSWORD,
    '-validity', '20000',
    '-keyalg', 'RSA',
  ], { stdio: 'inherit' });

  console.log('DONE. Project at', TARGET_DIR);
}

main().catch((e) => { console.error(e); process.exit(1); });
