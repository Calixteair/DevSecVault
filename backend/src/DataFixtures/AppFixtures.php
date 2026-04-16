<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\Concept;
use App\Entity\Snippet;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

/**
 * Idempotent fixtures: safe to run repeatedly without duplicating data.
 * Removes the existing demo concept (and its snippets via cascade) before re-creating it.
 */
class AppFixtures extends Fixture
{
    private const DEMO_USER_KEYCLOAK_ID = 'system-demo-user';
    private const PREFERRED_OWNER_USERNAME = 'calixteair';
    private const DEMO_CONCEPT_TITLE = 'Tri Fusion';
    private const TEMPLATE_CONCEPT_TITLE = 'Port Scanner';

    public function load(ObjectManager $manager): void
    {
        $owner = $this->resolveOwner($manager);
        $this->removeExistingDemoConcept($manager, $owner);

        $this->loadTriFusion($manager, $owner);
        $this->loadPortScanner($manager, $owner);
    }

    private function loadTriFusion(ObjectManager $manager, User $owner): void
    {
        $concept = new Concept();
        $concept->setOwner($owner);
        $concept->setTitle(self::DEMO_CONCEPT_TITLE);
        $concept->setDescription('Algorithme de tri fusion (merge sort) — diviser pour regner, complexite O(n log n).');
        $concept->setVisibility('public');

        $pythonSnippet = new Snippet();
        $pythonSnippet->setLanguage('python');
        $pythonSnippet->setSortOrder(0);
        $pythonSnippet->setCode(<<<'PYTHON'
def tri_fusion(arr):
    if len(arr) <= 1:
        return arr

    milieu = len(arr) // 2
    gauche = tri_fusion(arr[:milieu])
    droite = tri_fusion(arr[milieu:])

    return fusionner(gauche, droite)


def fusionner(gauche, droite):
    resultat = []
    i = j = 0

    while i < len(gauche) and j < len(droite):
        if gauche[i] <= droite[j]:
            resultat.append(gauche[i])
            i += 1
        else:
            resultat.append(droite[j])
            j += 1

    resultat.extend(gauche[i:])
    resultat.extend(droite[j:])
    return resultat


if __name__ == "__main__":
    print(tri_fusion([5, 2, 8, 1, 9, 3]))
PYTHON);
        $concept->addSnippet($pythonSnippet);

        $cSnippet = new Snippet();
        $cSnippet->setLanguage('c');
        $cSnippet->setSortOrder(1);
        $cSnippet->setCode(<<<'C'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void fusionner(int *arr, int gauche, int milieu, int droite) {
    int n1 = milieu - gauche + 1;
    int n2 = droite - milieu;

    int *L = malloc(n1 * sizeof(int));
    int *R = malloc(n2 * sizeof(int));

    memcpy(L, arr + gauche, n1 * sizeof(int));
    memcpy(R, arr + milieu + 1, n2 * sizeof(int));

    int i = 0, j = 0, k = gauche;
    while (i < n1 && j < n2) {
        arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
    }
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];

    free(L);
    free(R);
}

void tri_fusion(int *arr, int gauche, int droite) {
    if (gauche < droite) {
        int milieu = gauche + (droite - gauche) / 2;
        tri_fusion(arr, gauche, milieu);
        tri_fusion(arr, milieu + 1, droite);
        fusionner(arr, gauche, milieu, droite);
    }
}

int main(void) {
    int arr[] = {5, 2, 8, 1, 9, 3};
    int n = sizeof(arr) / sizeof(arr[0]);
    tri_fusion(arr, 0, n - 1);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
C);
        $concept->addSnippet($cSnippet);

        $manager->persist($concept);
        $manager->flush();
    }

    /**
     * Concept avec variables {{VAR}} pour tester la substitution live cote client.
     * Rien n'est chiffre ni execute cote serveur — ce sont des snippets pedagogiques.
     */
    private function loadPortScanner(ObjectManager $manager, User $owner): void
    {
        $concept = new Concept();
        $concept->setOwner($owner);
        $concept->setTitle(self::TEMPLATE_CONCEPT_TITLE);
        $concept->setDescription('Scanner de ports TCP avec variables de template : {{TARGET}}, {{START_PORT}}, {{END_PORT}}. Remplis les champs puis clique sur Copy Code.');
        $concept->setVisibility('public');

        $pythonSnippet = new Snippet();
        $pythonSnippet->setLanguage('python');
        $pythonSnippet->setSortOrder(0);
        $pythonSnippet->setCode(<<<'PYTHON'
#!/usr/bin/env python3
# Python Port Scanner
# Variables: {{TARGET}}, {{START_PORT}}, {{END_PORT}}

import socket

target = '{{TARGET}}'
start_port = {{START_PORT}}
end_port = {{END_PORT}}

print(f"Scanning {target} ports {start_port}-{end_port}...")
for port in range(start_port, end_port + 1):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    if s.connect_ex((target, port)) == 0:
        print(f"  [+] Port {port} open")
    s.close()
PYTHON);
        $concept->addSnippet($pythonSnippet);

        $bashSnippet = new Snippet();
        $bashSnippet->setLanguage('bash');
        $bashSnippet->setSortOrder(1);
        $bashSnippet->setCode(<<<'BASH'
#!/usr/bin/env bash
# Bash Port Scanner (pur, sans nmap)
# Variables: {{TARGET}}, {{START_PORT}}, {{END_PORT}}

TARGET="{{TARGET}}"
START={{START_PORT}}
END={{END_PORT}}

echo "Scanning $TARGET ports $START-$END..."
for ((port=START; port<=END; port++)); do
    (echo >/dev/tcp/"$TARGET"/"$port") >/dev/null 2>&1 \
        && echo "  [+] Port $port open"
done
BASH);
        $concept->addSnippet($bashSnippet);

        $manager->persist($concept);
        $manager->flush();
    }

    /**
     * Pick the owner for the demo concept:
     * 1. Prefer the real user "calixteair" if already provisioned by Keycloak
     * 2. Otherwise fall back to a "demo" placeholder user (for fresh clones)
     */
    private function resolveOwner(ObjectManager $manager): User
    {
        $preferred = $manager->getRepository(User::class)->findOneBy([
            'username' => self::PREFERRED_OWNER_USERNAME,
        ]);

        if ($preferred !== null) {
            return $preferred;
        }

        return $this->ensureDemoUser($manager);
    }

    private function ensureDemoUser(ObjectManager $manager): User
    {
        $user = $manager->getRepository(User::class)->findOneBy([
            'keycloakId' => self::DEMO_USER_KEYCLOAK_ID,
        ]);

        if ($user !== null) {
            return $user;
        }

        $user = new User();
        $user->setKeycloakId(self::DEMO_USER_KEYCLOAK_ID);
        $user->setEmail('demo@devsecvault.local');
        $user->setUsername('demo');
        $user->setRole('ROLE_USER');

        $manager->persist($user);
        $manager->flush();

        return $user;
    }

    /**
     * Remove any existing demo concept (regardless of owner) so the fixture
     * is fully idempotent — even when the preferred owner changes between runs.
     */
    private function removeExistingDemoConcept(ObjectManager $manager, User $owner): void
    {
        $titles = [self::DEMO_CONCEPT_TITLE, self::TEMPLATE_CONCEPT_TITLE];
        $removed = 0;

        foreach ($titles as $title) {
            $existing = $manager->getRepository(Concept::class)->findBy(['title' => $title]);
            foreach ($existing as $concept) {
                $manager->remove($concept);
                $removed++;
            }
        }

        if ($removed > 0) {
            $manager->flush();
        }
    }
}
